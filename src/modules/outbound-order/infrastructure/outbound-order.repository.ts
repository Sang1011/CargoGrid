import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { OutboundOrderEntity } from '../domain/outbound-order.entity';
import { OutboundDestinationType, OutboundOrderStatus, PriorityLevel } from 'src/common/enums';
import { Prisma } from '@prisma/client';

const orderInclude = {
    exitNode: { select: { id: true, code: true, name: true } },
    _count: { select: { items: true } },
} satisfies Prisma.OutboundOrderInclude;

@Injectable()
export class OutboundOrderRepository extends BaseRepository<OutboundOrderEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.outboundOrder);
    }

    protected toEntity(raw: any): OutboundOrderEntity {
        return new OutboundOrderEntity({
            id: raw.id,
            scenarioId: raw.scenarioId,
            code: raw.code,
            status: raw.status as OutboundOrderStatus,
            priority: raw.priority as PriorityLevel,
            destinationType: raw.destinationType as OutboundDestinationType,
            destinationName: raw.destinationName ?? null,
            exitNodeId: raw.exitNodeId ?? null,
            requestedAt: raw.requestedAt,
            deadlineAt: raw.deadlineAt ?? null,
            totalItems: raw.totalItems,
            pickedItems: raw.pickedItems,
            deliveredItems: raw.deliveredItems,
            notes: raw.notes ?? null,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }

    findAllWithFilters(filters: {
        scenarioId?: string;
        status?: OutboundOrderStatus;
        destinationType?: OutboundDestinationType;
    }): Promise<OutboundOrderEntity[]> {
        const where: any = {};
        if (filters.scenarioId) where.scenarioId = filters.scenarioId;
        if (filters.status) where.status = filters.status;
        if (filters.destinationType) where.destinationType = filters.destinationType;
        return this.findAll(where);
    }

    async findByIdWithRelations(id: string): Promise<(OutboundOrderEntity & { exitNode?: any; itemCount?: number }) | null> {
        const row = await (this as any).delegate.findUnique({
            where: { id },
            include: orderInclude,
        });
        if (!row) return null;
        const entity = this.toEntity(row);
        return Object.assign(entity, {
            exitNode: row.exitNode,
            itemCount: row._count?.items ?? 0,
        });
    }

    async updateStatus(id: string, status: OutboundOrderStatus, extra?: Record<string, any>): Promise<OutboundOrderEntity> {
        const row = await (this as any).delegate.update({
            where: { id },
            data: { status, ...extra },
        });
        return this.toEntity(row);
    }
}
