import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransferOrderItemEntity } from '../../domain/transfer-order-item.entity';

class CargoItemRef {
    @ApiProperty() id!: string;
    @ApiProperty() barcode!: string | null;
}

class SlotRef {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
}

class WarehouseRef {
    @ApiProperty() id!: string;
    @ApiProperty() code!: string;
    @ApiProperty() name!: string;
}

export class TransferOrderItemResponse {
    @ApiProperty() id!: string;
    @ApiProperty() transferOrderId!: string;
    @ApiProperty() cargoItemId!: string;
    @ApiPropertyOptional() fromSlotId!: string | null;
    @ApiPropertyOptional() proposedWarehouseId!: string | null;
    @ApiPropertyOptional() proposedSlotId!: string | null;
    @ApiPropertyOptional() proposalScore!: number | null;
    @ApiProperty() proposalReasons!: string[];
    @ApiPropertyOptional() actualWarehouseId!: string | null;
    @ApiPropertyOptional() actualSlotId!: string | null;
    @ApiPropertyOptional() vehicleId!: string | null;
    @ApiProperty() status!: string;
    @ApiPropertyOptional() transferredAt!: Date | null;
    @ApiPropertyOptional() cargoItem?: CargoItemRef;
    @ApiPropertyOptional() fromSlot?: SlotRef;
    @ApiPropertyOptional() proposedWarehouse?: WarehouseRef;
    @ApiPropertyOptional() proposedSlot?: SlotRef;
    @ApiPropertyOptional() actualWarehouse?: WarehouseRef;
    @ApiPropertyOptional() actualSlot?: SlotRef;

    static fromEntity(entity: TransferOrderItemEntity, relations?: {
        cargoItem?: any; fromSlot?: any; proposedWarehouse?: any;
        proposedSlot?: any; actualWarehouse?: any; actualSlot?: any;
    }): TransferOrderItemResponse {
        const res = new TransferOrderItemResponse();
        res.id = entity.id;
        res.transferOrderId = entity.transferOrderId;
        res.cargoItemId = entity.cargoItemId;
        res.fromSlotId = entity.fromSlotId;
        res.proposedWarehouseId = entity.proposedWarehouseId;
        res.proposedSlotId = entity.proposedSlotId;
        res.proposalScore = entity.proposalScore;
        res.proposalReasons = entity.proposalReasons;
        res.actualWarehouseId = entity.actualWarehouseId;
        res.actualSlotId = entity.actualSlotId;
        res.vehicleId = entity.vehicleId;
        res.status = entity.status;
        res.transferredAt = entity.transferredAt;
        if (relations?.cargoItem) res.cargoItem = relations.cargoItem;
        if (relations?.fromSlot) res.fromSlot = relations.fromSlot;
        if (relations?.proposedWarehouse) res.proposedWarehouse = relations.proposedWarehouse;
        if (relations?.proposedSlot) res.proposedSlot = relations.proposedSlot;
        if (relations?.actualWarehouse) res.actualWarehouse = relations.actualWarehouse;
        if (relations?.actualSlot) res.actualSlot = relations.actualSlot;
        return res;
    }
}
