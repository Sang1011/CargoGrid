import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { TransferOrderEntity } from '../domain/transfer-order.entity';
import { PriorityLevel, TransferOrderStatus } from 'src/common/enums';
import { Prisma } from '@prisma/client';

const orderInclude = {
    fromWarehouse: { select: { id: true, code: true, name: true } },
    incident: { select: { id: true, title: true } },
    _count: { select: { items: true } },
} satisfies Prisma.TransferOrderInclude;

@Injectable()
export class TransferOrderRepository extends BaseRepository<TransferOrderEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.transferOrder);
    }

    protected toEntity(raw: any): TransferOrderEntity {
        return new TransferOrderEntity({
            id: raw.id,
            scenarioId: raw.scenarioId,
            incidentId: raw.incidentId ?? null,
            code: raw.code,
            status: raw.status as TransferOrderStatus,
            priority: raw.priority as PriorityLevel,
            fromWarehouseId: raw.fromWarehouseId,
            reason: raw.reason ?? null,
            isEmergency: raw.isEmergency,
            totalItems: raw.totalItems,
            transferredItems: raw.transferredItems,
            failedItems: raw.failedItems,
            runId: raw.runId ?? null,
            confirmedAt: raw.confirmedAt ?? null,
            completedAt: raw.completedAt ?? null,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }

    findAllWithFilters(filters: {
        scenarioId?: string;
        status?: TransferOrderStatus;
        fromWarehouseId?: string;
        isEmergency?: boolean;
    }): Promise<TransferOrderEntity[]> {
        const where: any = {};
        if (filters.scenarioId) where.scenarioId = filters.scenarioId;
        if (filters.status) where.status = filters.status;
        if (filters.fromWarehouseId) where.fromWarehouseId = filters.fromWarehouseId;
        if (filters.isEmergency !== undefined) where.isEmergency = filters.isEmergency;
        return this.findAll(where);
    }

    async findByIdWithRelations(id: string): Promise<(TransferOrderEntity & { fromWarehouse?: any; incident?: any; itemCount?: number }) | null> {
        const row = await (this as any).delegate.findUnique({
            where: { id },
            include: orderInclude,
        });
        if (!row) return null;
        const entity = this.toEntity(row);
        return Object.assign(entity, {
            fromWarehouse: row.fromWarehouse,
            incident: row.incident,
            itemCount: row._count?.items ?? 0,
        });
    }

    async updateStatus(id: string, status: TransferOrderStatus, extra?: Record<string, any>): Promise<TransferOrderEntity> {
        const row = await (this as any).delegate.update({
            where: { id },
            data: { status, ...extra },
        });
        return this.toEntity(row);
    }
}
