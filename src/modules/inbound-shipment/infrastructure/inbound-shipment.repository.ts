import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { InboundShipmentEntity } from '../domain/inbound-shipment.entity';
import { ShipmentStatus } from 'src/common/enums';
import { Prisma } from '@prisma/client';

const shipmentInclude = {
    entryNode: { select: { id: true, code: true, name: true } },
    _count: { select: { shipmentItems: true } },
} satisfies Prisma.InboundShipmentInclude;

@Injectable()
export class InboundShipmentRepository extends BaseRepository<InboundShipmentEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.inboundShipment);
    }

    protected toEntity(raw: any): InboundShipmentEntity {
        return new InboundShipmentEntity({
            id: raw.id,
            scenarioId: raw.scenarioId,
            code: raw.code,
            sourceType: raw.sourceType,
            sourceName: raw.sourceName ?? null,
            entryNodeId: raw.entryNodeId ?? null,
            status: raw.status as ShipmentStatus,
            arrivedAt: raw.arrivedAt ?? null,
            dispatchingStartedAt: raw.dispatchingStartedAt ?? null,
            completedAt: raw.completedAt ?? null,
            totalItems: raw.totalItems,
            assignedItems: raw.assignedItems,
            failedItems: raw.failedItems,
            notes: raw.notes ?? null,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }

    findAllWithFilters(filters: { scenarioId?: string; status?: ShipmentStatus }): Promise<InboundShipmentEntity[]> {
        const where: any = {};
        if (filters.scenarioId) where.scenarioId = filters.scenarioId;
        if (filters.status) where.status = filters.status;
        return this.findAll(where);
    }

    async findByIdWithRelations(id: string): Promise<(InboundShipmentEntity & { entryNode?: any; shipmentItemCount?: number }) | null> {
        const row = await (this as any).delegate.findUnique({
            where: { id },
            include: shipmentInclude,
        });
        if (!row) return null;
        const entity = this.toEntity(row);
        return Object.assign(entity, {
            entryNode: row.entryNode,
            shipmentItemCount: row._count?.shipmentItems ?? 0,
        });
    }

    async updateStatus(id: string, status: ShipmentStatus, extra?: Record<string, any>): Promise<InboundShipmentEntity> {
        const row = await (this as any).delegate.update({
            where: { id },
            data: { status, ...extra },
        });
        return this.toEntity(row);
    }
}
