import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OutboundOrderItemEntity } from '../../domain/outbound-order-item.entity';
import { VehicleType } from 'src/common/enums';

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

export class OutboundOrderItemResponse {
    @ApiProperty() id!: string;
    @ApiProperty() outboundOrderId!: string;
    @ApiProperty() cargoItemId!: string;
    @ApiPropertyOptional() fromSlotId!: string | null;
    @ApiPropertyOptional() fromWarehouseId!: string | null;
    @ApiPropertyOptional() vehicleId!: string | null;
    @ApiPropertyOptional() routePath!: any | null;
    @ApiPropertyOptional() routeCost!: number | null;
    @ApiPropertyOptional({ enum: VehicleType }) vehicleType!: VehicleType | null;
    @ApiProperty() status!: string;
    @ApiPropertyOptional() pickedAt!: Date | null;
    @ApiPropertyOptional() deliveredAt!: Date | null;
    @ApiPropertyOptional() cargoItem?: CargoItemRef;
    @ApiPropertyOptional() fromSlot?: SlotRef;
    @ApiPropertyOptional() fromWarehouse?: WarehouseRef;

    static fromEntity(entity: OutboundOrderItemEntity, relations?: { cargoItem?: any; fromSlot?: any; fromWarehouse?: any }): OutboundOrderItemResponse {
        const res = new OutboundOrderItemResponse();
        res.id = entity.id;
        res.outboundOrderId = entity.outboundOrderId;
        res.cargoItemId = entity.cargoItemId;
        res.fromSlotId = entity.fromSlotId;
        res.fromWarehouseId = entity.fromWarehouseId;
        res.vehicleId = entity.vehicleId;
        res.routePath = entity.routePath;
        res.routeCost = entity.routeCost;
        res.vehicleType = entity.vehicleType;
        res.status = entity.status;
        res.pickedAt = entity.pickedAt;
        res.deliveredAt = entity.deliveredAt;
        if (relations?.cargoItem) res.cargoItem = relations.cargoItem;
        if (relations?.fromSlot) res.fromSlot = relations.fromSlot;
        if (relations?.fromWarehouse) res.fromWarehouse = relations.fromWarehouse;
        return res;
    }
}
