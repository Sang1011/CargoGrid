import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { OutboundOrderItemEntity } from '../domain/outbound-order-item.entity';
import { VehicleType } from 'src/common/enums';
import { Prisma } from '@prisma/client';

const itemInclude = {
    cargoItem: { select: { id: true, barcode: true } },
    fromSlot: { select: { id: true, name: true } },
    fromWarehouse: { select: { id: true, code: true, name: true } },
} satisfies Prisma.OutboundOrderItemInclude;

@Injectable()
export class OutboundOrderItemRepository extends BaseRepository<OutboundOrderItemEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.outboundOrderItem);
    }

    protected toEntity(raw: any): OutboundOrderItemEntity {
        return new OutboundOrderItemEntity({
            id: raw.id,
            outboundOrderId: raw.outboundOrderId,
            cargoItemId: raw.cargoItemId,
            fromSlotId: raw.fromSlotId ?? null,
            fromWarehouseId: raw.fromWarehouseId ?? null,
            vehicleId: raw.vehicleId ?? null,
            routePath: raw.routePath,
            routeCost: raw.routeCost ? Number(raw.routeCost) : null,
            vehicleType: raw.vehicleType as VehicleType | null,
            status: raw.status,
            pickedAt: raw.pickedAt ?? null,
            deliveredAt: raw.deliveredAt ?? null,
        });
    }

    findAllWithFilters(filters: { outboundOrderId?: string; status?: string }): Promise<OutboundOrderItemEntity[]> {
        const where: any = {};
        if (filters.outboundOrderId) where.outboundOrderId = filters.outboundOrderId;
        if (filters.status) where.status = filters.status;
        return this.findAll(where);
    }

    async findByIdWithRelations(id: string): Promise<(OutboundOrderItemEntity & { cargoItem?: any; fromSlot?: any; fromWarehouse?: any }) | null> {
        const row = await (this as any).delegate.findUnique({
            where: { id },
            include: itemInclude,
        });
        if (!row) return null;
        const entity = this.toEntity(row);
        return Object.assign(entity, {
            cargoItem: row.cargoItem,
            fromSlot: row.fromSlot,
            fromWarehouse: row.fromWarehouse,
        });
    }
}
