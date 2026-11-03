import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from 'src/common/base/base.repository';
import { MovementStatus, MovementType, PriorityLevel, ReservationStatus } from 'src/common/enums';
import { Page, buildOrderBy } from 'src/common/pagination/paginate';
import { PrismaService } from 'src/prisma/prisma.service';
import { MovementQueryDto } from '../application/dto/movement-query.dto';
import { MovementEntity } from '../domain/movement.entity';

@Injectable()
export class MovementRepository extends BaseRepository<MovementEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.movement);
    }

    protected toEntity(raw: any): MovementEntity {
        return new MovementEntity({
            id: raw.id,
            scenarioId: raw.scenarioId,
            cargoItemId: raw.cargoItemId,
            type: raw.type as MovementType,
            status: raw.status as MovementStatus,
            fromWarehouseId: raw.fromWarehouseId ?? null,
            fromSlotId: raw.fromSlotId ?? null,
            toWarehouseId: raw.toWarehouseId ?? null,
            toSlotId: raw.toSlotId ?? null,
            vehicleId: raw.vehicleId ?? null,
            weightKg: Number(raw.weightKg),
            volumeM3: Number(raw.volumeM3),
            reason: raw.reason ?? null,
            priority: (raw.priority ?? 'medium') as PriorityLevel,
            cancelReason: raw.cancelReason ?? null,
            requestedById: raw.requestedById ?? null,
            correlationId: raw.correlationId ?? null,
            version: raw.version,
            startedAt: raw.startedAt ?? null,
            completedAt: raw.completedAt ?? null,
            cancelledAt: raw.cancelledAt ?? null,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            reservation: raw.reservation
                ? { status: raw.reservation.status as ReservationStatus, expiresAt: raw.reservation.expiresAt ?? null }
                : null,
        });
    }

    async findWithReservation(id: string): Promise<MovementEntity | null> {
        const row = await (this as any).delegate.findUnique({ where: { id }, include: { reservation: true } });
        return row ? this.toEntity(row) : null;
    }

    findPage(query: MovementQueryDto): Promise<Page<MovementEntity>> {
        const where: Prisma.MovementWhereInput = {};
        if (query.scenarioId) where.scenarioId = query.scenarioId;
        if (query.cargoItemId) where.cargoItemId = query.cargoItemId;
        if (query.status) where.status = query.status;
        if (query.type) where.type = query.type;
        if (query.warehouseId) {
            where.OR = [{ fromWarehouseId: query.warehouseId }, { toWarehouseId: query.warehouseId }];
        }
        if (query.slotId) {
            where.AND = [{ OR: [{ fromSlotId: query.slotId }, { toSlotId: query.slotId }] }];
        }
        return this.findPaged({
            where,
            orderBy: buildOrderBy(query.sortBy, query.sortOrder, ['createdAt', 'status', 'type'], { createdAt: 'desc' }),
            page: query.page,
            limit: query.limit,
            include: { reservation: true },
        });
    }
}
