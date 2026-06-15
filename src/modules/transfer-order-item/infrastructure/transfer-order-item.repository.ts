import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { TransferOrderItemEntity } from '../domain/transfer-order-item.entity';
import { Prisma } from '@prisma/client';

const itemInclude = {
    cargoItem: { select: { id: true, barcode: true } },
    fromSlot: { select: { id: true, name: true } },
    proposedWarehouse: { select: { id: true, code: true, name: true } },
    proposedSlot: { select: { id: true, name: true } },
    actualWarehouse: { select: { id: true, code: true, name: true } },
    actualSlot: { select: { id: true, name: true } },
} satisfies Prisma.TransferOrderItemInclude;

@Injectable()
export class TransferOrderItemRepository extends BaseRepository<TransferOrderItemEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.transferOrderItem);
    }

    protected toEntity(raw: any): TransferOrderItemEntity {
        return new TransferOrderItemEntity({
            id: raw.id,
            transferOrderId: raw.transferOrderId,
            cargoItemId: raw.cargoItemId,
            fromSlotId: raw.fromSlotId ?? null,
            proposedWarehouseId: raw.proposedWarehouseId ?? null,
            proposedSlotId: raw.proposedSlotId ?? null,
            proposalScore: raw.proposalScore ? Number(raw.proposalScore) : null,
            proposalReasons: raw.proposalReasons,
            actualWarehouseId: raw.actualWarehouseId ?? null,
            actualSlotId: raw.actualSlotId ?? null,
            vehicleId: raw.vehicleId ?? null,
            status: raw.status,
            transferredAt: raw.transferredAt ?? null,
        });
    }

    findAllWithFilters(filters: { transferOrderId?: string; status?: string }): Promise<TransferOrderItemEntity[]> {
        const where: any = {};
        if (filters.transferOrderId) where.transferOrderId = filters.transferOrderId;
        if (filters.status) where.status = filters.status;
        return this.findAll(where);
    }

    async findByIdWithRelations(id: string): Promise<(
        TransferOrderItemEntity & {
            cargoItem?: any; fromSlot?: any; proposedWarehouse?: any;
            proposedSlot?: any; actualWarehouse?: any; actualSlot?: any;
        }) | null> {
        const row = await (this as any).delegate.findUnique({
            where: { id },
            include: itemInclude,
        });
        if (!row) return null;
        const entity = this.toEntity(row);
        return Object.assign(entity, {
            cargoItem: row.cargoItem,
            fromSlot: row.fromSlot,
            proposedWarehouse: row.proposedWarehouse,
            proposedSlot: row.proposedSlot,
            actualWarehouse: row.actualWarehouse,
            actualSlot: row.actualSlot,
        });
    }
}
