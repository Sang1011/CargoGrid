import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from 'src/common/audit/audit.service';
import { AlgorithmType, OptimizationContextType, PriorityLevel } from 'src/common/enums';
import { AllocationView } from 'src/modules/allocation/application/allocation.response';
import { Actor, AllocationService } from 'src/modules/allocation/application/allocation.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    EvacuationCargo, UnmovableReason, classifyUnplaced, evacuationOrder, scheduleEvacuation,
} from '../domain/evacuation-plan';
import { EvacuationPlanDto } from './dto/evacuation-plan.dto';

const OPEN_MOVEMENT = ['created', 'reserved', 'in_transit'] as const;
const LIVE_ORDER = ['draft', 'proposed', 'confirmed', 'in_progress'] as const;

export interface UnmovableItem {
    cargoItemId: string;
    barcode: string | null;
    productName: string | null;
    reason: UnmovableReason;
    detail: string;
}

export interface EvacuationStep {
    cargoItemId: string;
    order: number;
    priority: string;
    temperatureSensitive: boolean;
    slotId: string;
    warehouseId: string | null;
    crew: number;
    startMinute: number;
    finishMinute: number;
}

export interface EvacuationReport {
    incidentId: string;
    warehouseId: string;
    summary: {
        inWarehouse: number;
        movable: number;
        unmovable: number;
        safeMinutes: number | null;
        estimatedMinutes: number;
        crews: number;
        temperatureFirst: boolean;
    };
    steps: EvacuationStep[];
    unmovable: UnmovableItem[];
    notes: string[];
}

export interface EvacuationView extends EvacuationReport {
    transferOrderId: string | null;
    allocationId: string | null;
    allocation: AllocationView | null;
}

/**
 * Plans the removal of everything stored in a warehouse with an incident (FR-INC-02, BR-14).
 * It creates an emergency transfer order and an allocation proposal over the cargo that can be moved;
 * confirming that proposal (the normal `allocation.confirm` step) creates the urgent movements.
 * Cargo that cannot be moved is not hidden: each item is listed with the reason.
 */
@Injectable()
export class EvacuationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly allocations: AllocationService,
        private readonly audit: AuditService,
    ) { }

    async plan(incidentId: string, dto: EvacuationPlanDto, ctx: Actor = {}): Promise<EvacuationView> {
        const incident = await this.prisma.warehouseIncident.findUnique({
            where: { id: incidentId },
            include: { warehouse: { select: { id: true, name: true, scenarioId: true } } },
        });
        if (!incident) throw new NotFoundException(`Incident ${incidentId} not found`);
        if (incident.status !== 'open' && incident.status !== 'resolving') {
            throw new ConflictException(`Incident is already ${incident.status}; there is nothing to evacuate`);
        }
        const live = await this.prisma.transferOrder.findFirst({
            where: { incidentId, isEmergency: true, status: { in: [...LIVE_ORDER] } },
            select: { id: true, status: true },
        });
        if (live) {
            throw new ConflictException(`This incident already has an evacuation (transfer order ${live.id}, ${live.status}); reject its plan before planning again`);
        }

        const scenarioId = incident.warehouse.scenarioId;
        const stored = await this.prisma.cargoItem.findMany({
            where: { scenarioId, currentWarehouseId: incident.warehouseId, status: 'stored' },
            include: { product: true },
            orderBy: { id: 'asc' },
        });
        if (stored.length === 0) throw new UnprocessableEntityException('No cargo is stored in this warehouse');

        const busy = new Set((await this.prisma.movement.findMany({
            where: { cargoItemId: { in: stored.map(c => c.id) }, status: { in: [...OPEN_MOVEMENT] } },
            select: { cargoItemId: true },
        })).map(m => m.cargoItemId));

        const byId = new Map(stored.map(c => [c.id, c]));
        const unmovable: UnmovableItem[] = [];
        const describe = (id: string, reason: UnmovableReason, detail: string): UnmovableItem => ({
            cargoItemId: id, barcode: byId.get(id)?.barcode ?? null, productName: byId.get(id)?.product.name ?? null, reason, detail,
        });
        for (const id of busy) unmovable.push(describe(id, 'open_movement', 'The cargo already has an open movement; finish or cancel it first'));

        const movable = stored.filter(c => !busy.has(c.id));
        const toCargo = (c: (typeof stored)[number]): EvacuationCargo => ({
            cargoItemId: c.id,
            priority: c.product.priority as PriorityLevel,
            demandFrequency: c.product.demandFrequency,
            temperatureSensitive: c.product.requiredTempMin !== null || c.product.requiredTempMax !== null || c.product.requiredZone === 'cold',
        });
        const ordered = evacuationOrder(movable.map(toCargo), incident.incidentType);
        const rank = new Map(ordered.map((c, i) => [c.cargoItemId, i]));
        const crews = dto.crews ?? 2;
        const safeMinutes = dto.safeMinutes ?? incident.safeDurationMinutes ?? null;
        const temperatureFirst = ['temperature_failure', 'power_outage'].includes(incident.incidentType);

        const base = {
            incidentId,
            warehouseId: incident.warehouseId,
        };
        const summaryOf = (movableCount: number, estimatedMinutes: number, unmovableCount: number): EvacuationReport['summary'] => ({
            inWarehouse: stored.length, movable: movableCount, unmovable: unmovableCount, safeMinutes, estimatedMinutes, crews, temperatureFirst,
        });

        if (ordered.length === 0) {
            return { ...base, transferOrderId: null, allocationId: null, allocation: null, summary: summaryOf(0, 0, unmovable.length), steps: [], unmovable, notes: ['Every cargo item already has an open movement'] };
        }

        // 1. The emergency transfer order that carries the plan.
        const order = await this.prisma.$transaction(async tx => {
            const created = await tx.transferOrder.create({
                data: {
                    scenarioId,
                    incidentId,
                    code: `EVAC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0')}`,
                    status: 'draft',
                    priority: incident.severity === 'critical' ? 'urgent' : 'high',
                    fromWarehouseId: incident.warehouseId,
                    reason: `Evacuation: ${incident.title}`,
                    isEmergency: true,
                    totalItems: ordered.length,
                    items: { create: ordered.map(c => ({ cargoItemId: c.cargoItemId, fromSlotId: byId.get(c.cargoItemId)!.currentSlotId, status: 'pending' })) },
                },
            });
            await this.audit.recordInTransaction(tx, {
                ...ctx, action: 'evacuation.plan', entityType: 'transfer-orders', entityId: created.id,
                newValue: { incidentId, items: ordered.length, unmovableAtStart: unmovable.length },
            });
            return created;
        });

        // 2. The placement itself is the ordinary allocation, in evacuation order, with the incident warehouse excluded.
        let proposal: AllocationView;
        try {
            proposal = await this.allocations.propose(
                { scenarioId, contextType: OptimizationContextType.TRANSFER, contextId: order.id, algorithm: dto.algorithm ?? AlgorithmType.GREEDY, seed: dto.seed },
                ctx,
                { cargoRank: rank },
            );
        } catch (err) {
            await this.prisma.transferOrder.update({ where: { id: order.id }, data: { status: 'cancelled' } });
            throw err;
        }

        // 3. Who fits, in what order, within the safe window.
        const items = proposal.items ?? [];
        const placed = items.filter(i => i.slotId).sort((a, b) => rank.get(a.cargoItemId)! - rank.get(b.cargoItemId)!);
        const distanceOf = (i: (typeof items)[number]) => Number((i.routePath as { distanceM?: number } | null)?.distanceM ?? 0);
        const schedule = scheduleEvacuation(placed.map(i => ({ cargoItemId: i.cargoItemId, distanceM: distanceOf(i) })), { crews, handlingMinutes: dto.handlingMinutes, safeMinutes });

        for (const i of items.filter(x => !x.slotId)) {
            const why = classifyUnplaced(i.rejectedCandidates as { feasible?: boolean; reasons: string[] }[]);
            unmovable.push(describe(i.cargoItemId, why.reason, why.detail));
        }
        for (const l of schedule.late) {
            unmovable.push(describe(l.cargoItemId, 'not_enough_time', `Would finish at minute ${l.wouldFinishMinute}, after the ${safeMinutes}-minute safe window`));
        }

        const slotOf = new Map(placed.map(i => [i.cargoItemId, i]));
        const steps: EvacuationStep[] = schedule.scheduled.map(s => {
            const item = slotOf.get(s.cargoItemId)!;
            const cargo = toCargo(byId.get(s.cargoItemId)!);
            return {
                cargoItemId: s.cargoItemId,
                order: rank.get(s.cargoItemId)! + 1,
                priority: cargo.priority,
                temperatureSensitive: cargo.temperatureSensitive,
                slotId: item.slotId!,
                warehouseId: item.warehouseId,
                crew: s.crew,
                startMinute: s.startMinute,
                finishMinute: s.finishMinute,
            };
        });

        const notes = [...(proposal.notes ?? [])];
        if (placed.some(i => !(i.routePath as { distanceM?: number } | null)?.distanceM)) {
            notes.push('Some routes have no road distance (no road graph for the source warehouse); their travel time is counted as zero');
        }
        const report: EvacuationReport = { ...base, summary: summaryOf(steps.length, schedule.totalMinutes, unmovable.length), steps, unmovable, notes };

        // 4. Keep only what can actually be moved in the plan, and store the report with the order.
        const dropIds = unmovable.filter(u => u.reason !== 'open_movement').map(u => u.cargoItemId);
        await this.prisma.$transaction(async tx => {
            if (dropIds.length > 0) {
                await tx.allocationProposalItem.deleteMany({ where: { proposalId: proposal.id, cargoItemId: { in: dropIds } } });
                await tx.transferOrderItem.deleteMany({ where: { transferOrderId: order.id, cargoItemId: { in: dropIds } } });
            }
            await tx.transferOrder.update({
                where: { id: order.id },
                data: { totalItems: steps.length, failedItems: unmovable.length, evacuationReport: report as unknown as Prisma.InputJsonValue },
            });
            const current = await tx.allocationProposal.findUnique({ where: { id: proposal.id }, select: { constraintsApplied: true } });
            await tx.allocationProposal.update({
                where: { id: proposal.id },
                data: { constraintsApplied: { ...((current?.constraintsApplied as object | null) ?? {}), evacuation: report.summary } as unknown as Prisma.InputJsonValue },
            });
            await this.audit.recordInTransaction(tx, {
                ...ctx, action: 'evacuation.report', entityType: 'transfer-orders', entityId: order.id,
                newValue: { movable: steps.length, unmovable: unmovable.length, estimatedMinutes: schedule.totalMinutes },
            });
        });

        if (steps.length === 0) {
            // Nothing can be moved: withdraw the plan (which also cancels the emergency order) but keep the report.
            await this.allocations.reject(proposal.id, 'Nothing could be evacuated', ctx);
            return { ...report, transferOrderId: order.id, allocationId: null, allocation: null };
        }
        return { ...report, transferOrderId: order.id, allocationId: proposal.id, allocation: await this.allocations.findOne(proposal.id) };
    }

    /** The latest evacuation plan of an incident, with its report and the allocation it produced. */
    async latest(incidentId: string): Promise<EvacuationView> {
        const order = await this.prisma.transferOrder.findFirst({
            where: { incidentId, isEmergency: true },
            orderBy: { createdAt: 'desc' },
        });
        if (!order) throw new NotFoundException(`Incident ${incidentId} has no evacuation plan`);
        const proposal = await this.prisma.allocationProposal.findFirst({
            where: { contextType: 'transfer', contextId: order.id, status: { not: 'rejected' } },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
        });
        const report = (order.evacuationReport ?? {}) as unknown as EvacuationReport;
        return {
            ...report,
            incidentId,
            transferOrderId: order.id,
            allocationId: proposal?.id ?? null,
            allocation: proposal ? await this.allocations.findOne(proposal.id) : null,
        };
    }
}
