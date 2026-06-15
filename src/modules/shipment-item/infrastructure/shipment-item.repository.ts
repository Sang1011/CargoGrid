import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { ShipmentItemEntity } from '../domain/shipment-item.entity';
import { ShipmentItemStatus } from 'src/common/enums';
import { Prisma } from '@prisma/client';

const itemInclude = {
    cargoItem: { select: { id: true, barcode: true, status: true } },
    assignedWarehouse: { select: { id: true, code: true, name: true } },
    assignedSlot: { select: { id: true, name: true } },
} satisfies Prisma.ShipmentItemInclude;

@Injectable()
export class ShipmentItemRepository extends BaseRepository<ShipmentItemEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.shipmentItem);
    }

    protected toEntity(raw: any): ShipmentItemEntity {
        return new ShipmentItemEntity({
            id: raw.id,
            shipmentId: raw.shipmentId,
            cargoItemId: raw.cargoItemId,
            status: raw.status as ShipmentItemStatus,
            assignedWarehouseId: raw.assignedWarehouseId ?? null,
            assignedSlotId: raw.assignedSlotId ?? null,
            assignmentScore: raw.assignmentScore ? Number(raw.assignmentScore) : null,
            assignmentReasons: raw.assignmentReasons,
            rejectedCandidates: raw.rejectedCandidates,
            runId: raw.runId ?? null,
            assignedAt: raw.assignedAt ?? null,
            storedAt: raw.storedAt ?? null,
        });
    }

    findAllWithFilters(filters: { shipmentId?: string; status?: ShipmentItemStatus }): Promise<ShipmentItemEntity[]> {
        const where: any = {};
        if (filters.shipmentId) where.shipmentId = filters.shipmentId;
        if (filters.status) where.status = filters.status;
        return this.findAll(where);
    }

    async findByIdWithRelations(id: string): Promise<(ShipmentItemEntity & { cargoItem?: any; assignedWarehouse?: any; assignedSlot?: any }) | null> {
        const row = await (this as any).delegate.findUnique({
            where: { id },
            include: itemInclude,
        });
        if (!row) return null;
        const entity = this.toEntity(row);
        return Object.assign(entity, {
            cargoItem: row.cargoItem,
            assignedWarehouse: row.assignedWarehouse,
            assignedSlot: row.assignedSlot,
        });
    }
}
