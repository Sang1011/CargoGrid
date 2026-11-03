import {
    ConflictException,
    HttpException,
    Injectable,
    Logger,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from 'src/common/audit/audit.service';
import {
    CargoEventType,
    CargoItemStatus,
    IncidentSeverity,
    IncidentStatus,
    MovementStatus,
    MovementType,
    PriorityLevel,
    ReservationStatus,
    VehicleType,
    ZoneType,
} from 'src/common/enums';
import { Page } from 'src/common/pagination/paginate';
import { ScoringService } from 'src/modules/algorithms/scoring/scoring.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MovementEntity } from '../domain/movement.entity';
import {
    InvalidMovementTransitionError,
    assertTransition,
} from '../domain/movement-state-machine';
import {
    checkCargoEligibility,
    checkRoute,
    completionEffects,
    fits,
    inTransitCargoStatus,
    needsDestination,
    needsSource,
    remainingCapacity,
    statusAfterCancel,
} from '../domain/movement-rules';
import { MovementRepository } from '../infrastructure/movement.repository';
import { CreateMovementDto } from './dto/create-movement.dto';
import { MovementQueryDto } from './dto/movement-query.dto';

type Tx = Prisma.TransactionClient;

/** Who is doing this and how to trace it; copied onto the ledger, audit and outbox rows. */
export interface ActorContext {
    actorId?: string | null;
    actorEmail?: string | null;
    correlationId?: string | null;
}

interface LockedSlot {
    id: string;
    warehouseId: string;
    isBlocked: boolean;
    isActive: boolean;
    maxWeightKg: number;
    currentWeightKg: number;
    maxVolumeM3: number;
    currentVolumeM3: number;
}

// Many movements can queue behind one hot slot; give them room before Prisma gives up on the transaction.
const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 } as const;

export const reservationTtlMinutes = (): number => Number(process.env.MOVEMENT_RESERVATION_TTL_MINUTES) || 30;

@Injectable()
export class MovementService {
    private readonly logger = new Logger(MovementService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly repo: MovementRepository,
        private readonly scoring: ScoringService,
        private readonly audit: AuditService,
    ) { }

    // ─── Reads ──────────────────────────────────────────────────────────────────

    list(query: MovementQueryDto): Promise<Page<MovementEntity>> {
        return this.repo.findPage(query);
    }

    async findOne(id: string): Promise<MovementEntity> {
        const movement = await this.repo.findWithReservation(id);
        if (!movement) throw new NotFoundException(`Movement ${id} not found`);
        return movement;
    }

    // ─── create = created + reserved, atomically ────────────────────────────────

    async create(dto: CreateMovementDto, ctx: ActorContext = {}): Promise<MovementEntity> {
        let id: string;
        try {
            id = await this.prisma.$transaction(tx => this.createInTx(tx, dto, ctx), TX_OPTIONS);
        } catch (err) {
            // The partial unique index is the backstop for two requests racing past the check below.
            if (isUniqueViolation(err)) throw new ConflictException('This cargo already has an open movement');
            throw err;
        }
        return this.findOne(id);
    }

    /**
     * Creates several movements as one unit: either every one is created and reserved, or none is.
     * `after` runs in the same transaction (the allocation uses it to mark its proposal confirmed).
     * Destination slots are locked up front in id order, so two overlapping batches cannot deadlock.
     */
    async createBatch(
        dtos: CreateMovementDto[],
        ctx: ActorContext = {},
        after?: (tx: Tx, movementIds: string[]) => Promise<void>,
    ): Promise<string[]> {
        try {
            return await this.prisma.$transaction(
                async tx => {
                    await this.lockSlots(tx, dtos.map(d => d.toSlotId));
                    const ids: string[] = [];
                    for (const dto of dtos) {
                        try {
                            ids.push(await this.createInTx(tx, dto, ctx));
                        } catch (err) {
                            // Say which cargo item stopped the batch; keep the original status code.
                            if (err instanceof HttpException) {
                                const message = `Cargo ${dto.cargoItemId}: ${err.message}`;
                                if (err instanceof ConflictException) throw new ConflictException(message);
                                if (err instanceof NotFoundException) throw new NotFoundException(message);
                                if (err instanceof UnprocessableEntityException) throw new UnprocessableEntityException(message);
                                throw new HttpException(message, err.getStatus());
                            }
                            throw err;
                        }
                    }
                    if (after) await after(tx, ids);
                    return ids;
                },
                { ...TX_OPTIONS, timeout: TX_OPTIONS.timeout + dtos.length * 250 },
            );
        } catch (err) {
            if (isUniqueViolation(err)) throw new ConflictException('A cargo item in this batch already has an open movement');
            throw err;
        }
    }

    private async createInTx(tx: Tx, dto: CreateMovementDto, ctx: ActorContext): Promise<string> {
        const type = dto.type;

        const cargo = await tx.cargoItem.findUnique({ where: { id: dto.cargoItemId }, include: { product: true } });
        if (!cargo) throw new NotFoundException(`Cargo item ${dto.cargoItemId} not found`);

        const notEligible = checkCargoEligibility(type, {
            status: cargo.status as CargoItemStatus,
            currentSlotId: cargo.currentSlotId,
            currentWarehouseId: cargo.currentWarehouseId,
        });
        if (notEligible) throw new ConflictException(notEligible);

        const open = await tx.movement.findFirst({
            where: { cargoItemId: cargo.id, status: { in: ['created', 'reserved', 'in_transit'] } },
            select: { id: true },
        });
        if (open) throw new ConflictException(`Cargo already has an open movement (${open.id})`);

        const source = needsSource(type) ? { slotId: cargo.currentSlotId!, warehouseId: cargo.currentWarehouseId! } : null;

        let destination: { slotId: string; warehouseId: string } | null = null;
        if (needsDestination(type)) {
            if (!dto.toSlotId) throw new UnprocessableEntityException(`A ${type} needs toSlotId`);
            const slot = await tx.storageSlot.findUnique({
                where: { id: dto.toSlotId },
                select: { id: true, warehouseId: true, warehouse: { select: { scenarioId: true } } },
            });
            if (!slot) throw new NotFoundException(`Slot ${dto.toSlotId} not found`);
            if (slot.warehouse.scenarioId !== cargo.scenarioId) {
                throw new UnprocessableEntityException('Destination slot belongs to a different scenario');
            }
            destination = { slotId: slot.id, warehouseId: slot.warehouseId };
        } else if (dto.toSlotId) {
            throw new UnprocessableEntityException(`A ${type} must not have toSlotId`);
        }

        const routeError = checkRoute(type, source, destination);
        if (routeError) throw new UnprocessableEntityException(routeError);

        if (dto.vehicleId) {
            const vehicle = await tx.vehicle.findUnique({ where: { id: dto.vehicleId }, select: { scenarioId: true } });
            if (!vehicle) throw new NotFoundException(`Vehicle ${dto.vehicleId} not found`);
            if (vehicle.scenarioId !== cargo.scenarioId) throw new UnprocessableEntityException('Vehicle belongs to a different scenario');
        }

        const weightKg = Number(cargo.actualWeightKg ?? cargo.product.weightKg);
        const volumeM3 = Number(cargo.actualVolumeM3 ?? cargo.product.volumeM3);

        // Take the slot lock before inserting anything that references the slot; otherwise two requests
        // can each hold a foreign-key share lock on the other's slot and deadlock.
        const lockedDestination = destination ? (await this.lockSlots(tx, [destination.slotId]))[0] : null;

        const movement = await tx.movement.create({
            data: {
                scenarioId: cargo.scenarioId,
                cargoItemId: cargo.id,
                type,
                status: MovementStatus.CREATED,
                fromWarehouseId: source?.warehouseId ?? null,
                fromSlotId: source?.slotId ?? null,
                toWarehouseId: destination?.warehouseId ?? null,
                toSlotId: destination?.slotId ?? null,
                vehicleId: dto.vehicleId ?? null,
                weightKg,
                volumeM3,
                reason: dto.reason ?? null,
                priority: dto.priority ?? PriorityLevel.MEDIUM,
                requestedById: ctx.actorId ?? null,
                correlationId: ctx.correlationId ?? null,
            },
        });
        await this.ledger(tx, movement, CargoEventType.MOVEMENT_CREATED, ctx, dto.reason ?? null);

        // ── reserve ──
        assertTransitionOrConflict(MovementStatus.CREATED, MovementStatus.RESERVED);
        let reservationExpiresAt: Date | null = null;

        if (destination) {
            const slot = lockedDestination!;
            await this.assertDestinationUsable(tx, slot);

            const reserved = await this.activeReservedLoad(tx, slot.id);
            const left = remainingCapacity(slot, reserved);
            if (!fits(left, { weightKg, volumeM3 })) {
                throw new ConflictException(
                    `Slot ${slot.id} does not have enough free capacity (free ${left.weightKg} kg / ${left.volumeM3} m3, needed ${weightKg} kg / ${volumeM3} m3)`,
                );
            }

            await this.assertProductFits(tx, cargo.product, slot.id);

            reservationExpiresAt = new Date(Date.now() + reservationTtlMinutes() * 60_000);
            await tx.slotReservation.create({
                data: { slotId: slot.id, movementId: movement.id, weightKg, volumeM3, expiresAt: reservationExpiresAt },
            });
            await tx.storageSlot.update({ where: { id: slot.id }, data: { version: { increment: 1 } } });
        }

        await this.advance(tx, movement.id, movement.version, { status: MovementStatus.RESERVED });
        await this.ledger(tx, movement, CargoEventType.SLOT_RESERVED, ctx, dto.reason ?? null);
        await this.record(tx, movement, 'reserve', { status: null }, { status: MovementStatus.RESERVED, toSlotId: destination?.slotId ?? null }, ctx);
        await this.emit(tx, movement.id, 'MovementReserved', { cargoItemId: cargo.id, type, toSlotId: destination?.slotId ?? null, expiresAt: reservationExpiresAt, priority: dto.priority ?? PriorityLevel.MEDIUM }, ctx);

        return movement.id;
    }

    // ─── start ──────────────────────────────────────────────────────────────────

    async start(id: string, ctx: ActorContext = {}): Promise<MovementEntity> {
        await this.prisma.$transaction(async tx => {
            const movement = await this.loadForUpdate(tx, id);
            assertTransitionOrConflict(movement.status as MovementStatus, MovementStatus.IN_TRANSIT);

            const type = movement.type as MovementType;
            if (movement.toWarehouseId) await this.assertNoSeriousIncident(tx, movement.toWarehouseId);
            const reservation = await tx.slotReservation.findUnique({ where: { movementId: id } });
            if (needsDestination(type)) {
                if (!reservation || reservation.status !== ReservationStatus.ACTIVE) {
                    throw new ConflictException('The slot reservation is no longer active');
                }
                if (reservation.expiresAt && reservation.expiresAt.getTime() <= Date.now()) {
                    throw new ConflictException('The slot reservation has expired; create a new movement');
                }
            }

            const cargo = await tx.cargoItem.findUnique({ where: { id: movement.cargoItemId } });
            if (!cargo) throw new NotFoundException('Cargo item not found');
            const stillThere = needsSource(type)
                ? cargo.status === CargoItemStatus.STORED && cargo.currentSlotId === movement.fromSlotId
                : cargo.status === CargoItemStatus.IN_TRANSIT_INBOUND;
            if (!stillThere) throw new ConflictException('The cargo is no longer where this movement expects it');

            await this.advance(tx, id, movement.version, { status: MovementStatus.IN_TRANSIT, startedAt: new Date() });

            // Once the cargo is on the road its place at the destination no longer expires.
            if (reservation) await tx.slotReservation.update({ where: { id: reservation.id }, data: { expiresAt: null } });

            await this.advanceCargo(tx, cargo.id, cargo.version, { status: inTransitCargoStatus(type) });

            await this.ledger(tx, movement, CargoEventType.MOVEMENT_STARTED, ctx);
            await this.record(tx, movement, 'start', { status: movement.status }, { status: MovementStatus.IN_TRANSIT }, ctx);
            await this.emit(tx, id, 'MovementStarted', { cargoItemId: movement.cargoItemId, type }, ctx);
        }, TX_OPTIONS);

        return this.findOne(id);
    }

    // ─── complete: the one transaction that changes where cargo is ──────────────

    async complete(id: string, ctx: ActorContext = {}): Promise<MovementEntity> {
        await this.prisma.$transaction(async tx => {
            const movement = await this.loadForUpdate(tx, id);
            assertTransitionOrConflict(movement.status as MovementStatus, MovementStatus.COMPLETED);

            const type = movement.type as MovementType;
            const source = movement.fromSlotId ? { slotId: movement.fromSlotId, warehouseId: movement.fromWarehouseId! } : null;
            const destination = movement.toSlotId ? { slotId: movement.toSlotId, warehouseId: movement.toWarehouseId! } : null;

            // Lock every slot we touch, in id order, so two completions can never wait on each other.
            const locked = await this.lockSlots(tx, [source?.slotId, destination?.slotId]);
            const destinationSlot = destination ? locked.find(s => s.id === destination.slotId) : undefined;
            if (destinationSlot && (destinationSlot.isBlocked || !destinationSlot.isActive)) {
                throw new ConflictException('The destination slot is blocked or inactive; cancel this movement or wait');
            }
            if (destination) await this.assertNoSeriousIncident(tx, destination.warehouseId);

            const cargo = await tx.cargoItem.findUnique({ where: { id: movement.cargoItemId } });
            if (!cargo) throw new NotFoundException('Cargo item not found');
            if (needsSource(type) && cargo.currentSlotId !== movement.fromSlotId) {
                throw new ConflictException('The cargo is no longer in the source slot');
            }

            const load = { weightKg: Number(movement.weightKg), volumeM3: Number(movement.volumeM3) };
            const fx = completionEffects(type, load, source, destination);

            await this.advance(tx, id, movement.version, { status: MovementStatus.COMPLETED, completedAt: new Date() });

            for (const d of fx.slotDeltas) {
                await tx.storageSlot.update({
                    where: { id: d.id },
                    data: {
                        currentWeightKg: { increment: d.weightKg },
                        currentVolumeM3: { increment: d.volumeM3 },
                        version: { increment: 1 },
                    },
                });
            }
            for (const d of fx.warehouseDeltas) {
                await tx.warehouse.update({
                    where: { id: d.id },
                    data: { currentWeightKg: { increment: d.weightKg }, currentVolumeM3: { increment: d.volumeM3 } },
                });
            }

            await this.advanceCargo(tx, cargo.id, cargo.version, {
                status: fx.cargoStatus,
                currentSlotId: fx.cargoSlotId,
                currentWarehouseId: fx.cargoWarehouseId,
            });

            await tx.slotReservation.updateMany({
                where: { movementId: id, status: ReservationStatus.ACTIVE },
                data: { status: ReservationStatus.CONSUMED, closedAt: new Date() },
            });

            await this.ledger(tx, movement, CargoEventType.MOVEMENT_COMPLETED, ctx);
            await this.record(
                tx,
                movement,
                'complete',
                { status: movement.status, slotId: movement.fromSlotId },
                { status: MovementStatus.COMPLETED, slotId: fx.cargoSlotId },
                ctx,
            );
            await this.emit(
                tx,
                id,
                'MovementCompleted',
                { cargoItemId: movement.cargoItemId, type, fromSlotId: movement.fromSlotId, toSlotId: movement.toSlotId },
                ctx,
            );
        }, TX_OPTIONS);

        return this.findOne(id);
    }

    // ─── cancel / expire ────────────────────────────────────────────────────────

    async cancel(id: string, reason: string | undefined, ctx: ActorContext = {}): Promise<MovementEntity> {
        await this.prisma.$transaction(async tx => {
            const movement = await this.loadForUpdate(tx, id);
            await this.cancelInTx(tx, movement, reason ?? null, false, ctx);
        }, TX_OPTIONS);
        return this.findOne(id);
    }

    /**
     * Cancels reserved movements whose reservation ran out (BR-08), freeing the slot.
     * Safe to run from several instances at once: each cancel is an optimistic update.
     */
    async expireOverdue(now: Date = new Date(), batchSize = 100): Promise<number> {
        const overdue = await this.prisma.slotReservation.findMany({
            where: { status: ReservationStatus.ACTIVE, expiresAt: { lte: now }, movement: { status: MovementStatus.RESERVED } },
            select: { movementId: true },
            orderBy: { expiresAt: 'asc' },
            take: batchSize,
        });

        let expired = 0;
        for (const { movementId } of overdue) {
            try {
                await this.prisma.$transaction(async tx => {
                    const movement = await this.loadForUpdate(tx, movementId);
                    await this.cancelInTx(tx, movement, 'Reservation expired', true, {});
                }, TX_OPTIONS);
                expired++;
            } catch (err) {
                // Lost a race with start/cancel: that movement is no longer ours to expire.
                if (!(err instanceof ConflictException)) this.logger.error(`Could not expire movement ${movementId}: ${(err as Error).message}`);
            }
        }
        return expired;
    }

    private async cancelInTx(tx: Tx, movement: Prisma.MovementGetPayload<object>, reason: string | null, expired: boolean, ctx: ActorContext): Promise<void> {
        const from = movement.status as MovementStatus;
        assertTransitionOrConflict(from, MovementStatus.CANCELLED);

        await this.advance(tx, movement.id, movement.version, {
            status: MovementStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelReason: reason,
        });

        await tx.slotReservation.updateMany({
            where: { movementId: movement.id, status: ReservationStatus.ACTIVE },
            data: { status: expired ? ReservationStatus.EXPIRED : ReservationStatus.RELEASED, closedAt: new Date(), expiresAt: null },
        });

        // Cargo only changed status once the movement started; put it back.
        if (from === MovementStatus.IN_TRANSIT) {
            const cargo = await tx.cargoItem.findUnique({ where: { id: movement.cargoItemId } });
            if (cargo) await this.advanceCargo(tx, cargo.id, cargo.version, { status: statusAfterCancel(movement.type as MovementType) });
        }

        await this.ledger(tx, movement, expired ? CargoEventType.RESERVATION_EXPIRED : CargoEventType.MOVEMENT_CANCELLED, ctx, reason);
        await this.record(tx, movement, expired ? 'expire' : 'cancel', { status: from }, { status: MovementStatus.CANCELLED }, ctx, reason);
        await this.emit(tx, movement.id, 'MovementCancelled', { cargoItemId: movement.cargoItemId, reason, expired }, ctx);
    }

    // ─── building blocks ────────────────────────────────────────────────────────

    private async loadForUpdate(tx: Tx, id: string) {
        const movement = await tx.movement.findUnique({ where: { id } });
        if (!movement) throw new NotFoundException(`Movement ${id} not found`);
        return movement;
    }

    /**
     * `SELECT ... FOR UPDATE` on each slot, in id order. A second request for the same slot waits here
     * until the first commits, then reads the committed numbers.
     */
    private async lockSlots(tx: Tx, ids: (string | undefined)[]): Promise<LockedSlot[]> {
        const sorted = [...new Set(ids.filter((i): i is string => !!i))].sort();
        const locked: LockedSlot[] = [];
        for (const id of sorted) {
            const rows = await tx.$queryRaw<LockedSlot[]>`
                SELECT id::text AS id,
                       warehouse_id::text AS "warehouseId",
                       is_blocked AS "isBlocked",
                       is_active AS "isActive",
                       max_weight_kg::float8 AS "maxWeightKg",
                       current_weight_kg::float8 AS "currentWeightKg",
                       max_volume_m3::float8 AS "maxVolumeM3",
                       current_volume_m3::float8 AS "currentVolumeM3"
                FROM storage_slots
                WHERE id = ${id}::uuid
                FOR NO KEY UPDATE`;
            if (rows.length === 0) throw new NotFoundException(`Slot ${id} not found`);
            locked.push(rows[0]);
        }
        return locked;
    }

    /** Capacity currently promised to other movements; lapsed reservations no longer count. */
    private async activeReservedLoad(tx: Tx, slotId: string): Promise<{ weightKg: number; volumeM3: number }> {
        const rows = await tx.$queryRaw<{ weightKg: number; volumeM3: number }[]>`
            SELECT COALESCE(SUM(weight_kg), 0)::float8 AS "weightKg",
                   COALESCE(SUM(volume_m3), 0)::float8 AS "volumeM3"
            FROM slot_reservations
            WHERE slot_id = ${slotId}::uuid
              AND status = 'active'
              AND (expires_at IS NULL OR expires_at > now())`;
        return rows[0] ?? { weightKg: 0, volumeM3: 0 };
    }

    /** BR-07 (blocked / inactive) and BR-13 (open high-severity incident) for a destination. */
    private async assertDestinationUsable(tx: Tx, slot: LockedSlot): Promise<void> {
        if (slot.isBlocked || !slot.isActive) throw new ConflictException(`Slot ${slot.id} is blocked or inactive`);

        const warehouse = await tx.warehouse.findUnique({ where: { id: slot.warehouseId }, select: { isActive: true } });
        if (!warehouse?.isActive) throw new ConflictException('The destination warehouse is inactive');

        await this.assertNoSeriousIncident(tx, slot.warehouseId);
    }

    /** BR-13. Also re-checked when a movement starts or completes: an incident may have opened since it was reserved. */
    private async assertNoSeriousIncident(tx: Tx, warehouseId: string): Promise<void> {
        const incidents = await tx.warehouseIncident.count({
            where: {
                warehouseId,
                status: { in: [IncidentStatus.OPEN, IncidentStatus.RESOLVING] },
                severity: { in: [IncidentSeverity.HIGH, IncidentSeverity.CRITICAL] },
            },
        });
        if (incidents > 0) {
            throw new ConflictException('The destination warehouse has an open high-severity incident and is not accepting cargo; cancel this movement and plan again');
        }
    }

    /** Zone, temperature and vehicle rules: the same engine the optimizer uses (BR-09). */
    private async assertProductFits(
        tx: Tx,
        product: { weightKg: Prisma.Decimal; volumeM3: Prisma.Decimal; requiredZone: string | null; requiredTempMin: Prisma.Decimal | null; requiredTempMax: Prisma.Decimal | null; demandFrequency: number; priority: string; vehicleType: string },
        slotId: string,
    ): Promise<void> {
        const slot = await tx.storageSlot.findUniqueOrThrow({
            where: { id: slotId },
            include: { allowedVehicles: true, zone: { select: { tempMin: true, tempMax: true } } },
        });

        // Capacity was already settled under the lock, so only the compatibility rules are asked here.
        const verdict = this.scoring.isHardViolation(
            {
                id: 'cargo',
                weightKg: 0,
                volumeM3: 0,
                requiredZone: (product.requiredZone as ZoneType | null) ?? null,
                requiredTempMin: product.requiredTempMin != null ? Number(product.requiredTempMin) : null,
                requiredTempMax: product.requiredTempMax != null ? Number(product.requiredTempMax) : null,
                demandFrequency: product.demandFrequency,
                priority: product.priority as PriorityLevel,
                vehicleType: product.vehicleType as VehicleType,
            },
            {
                id: slot.id,
                warehouseId: slot.warehouseId,
                zoneType: slot.zoneType as ZoneType,
                tempMin: slot.zone?.tempMin != null ? Number(slot.zone.tempMin) : null,
                tempMax: slot.zone?.tempMax != null ? Number(slot.zone.tempMax) : null,
                maxWeightKg: Number(slot.maxWeightKg),
                currentWeightKg: 0,
                maxVolumeM3: Number(slot.maxVolumeM3),
                currentVolumeM3: 0,
                distanceFromEntryM: 0,
                isBlocked: false,
                allowedVehicleTypes: slot.allowedVehicles.map(v => v.vehicleType as VehicleType),
            },
        );
        if (verdict.violated) {
            throw new UnprocessableEntityException(`Cargo cannot be stored in this slot: ${verdict.reasons.join('; ')}`);
        }
    }

    /** Optimistic update: succeeds only if nobody changed the movement since we read it. */
    private async advance(tx: Tx, id: string, version: number, data: Prisma.MovementUpdateManyMutationInput): Promise<void> {
        const { count } = await tx.movement.updateMany({
            where: { id, version },
            data: { ...data, version: { increment: 1 } },
        });
        if (count !== 1) throw new ConflictException('The movement was changed by someone else; reload and retry');
    }

    private async advanceCargo(
        tx: Tx,
        id: string,
        version: number,
        data: { status: CargoItemStatus; currentSlotId?: string | null; currentWarehouseId?: string | null },
    ): Promise<void> {
        const { count } = await tx.cargoItem.updateMany({
            where: { id, version },
            data: { ...data, version: { increment: 1 } },
        });
        if (count !== 1) throw new ConflictException('The cargo item was changed by someone else; reload and retry');
    }

    /** Append to the cargo ledger. Same transaction as the change it describes. */
    private ledger(
        tx: Tx,
        movement: Prisma.MovementGetPayload<object>,
        eventType: CargoEventType,
        ctx: ActorContext,
        reason: string | null = null,
    ) {
        return tx.cargoItemEvent.create({
            data: {
                cargoItemId: movement.cargoItemId,
                movementId: movement.id,
                eventType,
                fromSlotId: movement.fromSlotId,
                toSlotId: movement.toSlotId,
                fromWarehouseId: movement.fromWarehouseId,
                toWarehouseId: movement.toWarehouseId,
                vehicleId: movement.vehicleId,
                actorId: ctx.actorId ?? null,
                reason,
                correlationId: ctx.correlationId ?? null,
            },
        });
    }

    private record(
        tx: Tx,
        movement: Prisma.MovementGetPayload<object>,
        step: string,
        oldValue: unknown,
        newValue: unknown,
        ctx: ActorContext,
        reason: string | null = null,
    ) {
        return this.audit.recordInTransaction(tx, {
            actorId: ctx.actorId,
            actorEmail: ctx.actorEmail,
            action: `movement.${step}`,
            entityType: 'movements',
            entityId: movement.id,
            oldValue,
            newValue,
            reason,
            correlationId: ctx.correlationId,
            statusCode: 200,
        });
    }

    private emit(tx: Tx, movementId: string, eventType: string, payload: Record<string, unknown>, ctx: ActorContext) {
        return tx.outboxEvent.create({
            data: {
                aggregateType: 'movement',
                aggregateId: movementId,
                eventType,
                payload: JSON.parse(JSON.stringify(payload)),
                correlationId: ctx.correlationId ?? null,
            },
        });
    }
}

function assertTransitionOrConflict(from: MovementStatus, to: MovementStatus): void {
    try {
        assertTransition(from, to);
    } catch (err) {
        if (err instanceof InvalidMovementTransitionError) throw new ConflictException(err.message);
        throw err;
    }
}

function isUniqueViolation(err: unknown): boolean {
    return (err as { code?: string })?.code === 'P2002';
}

