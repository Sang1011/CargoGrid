import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentItemEntity } from '../../domain/shipment-item.entity';
import { ShipmentItemStatus } from 'src/common/enums';

class CargoItemRef {
    @ApiProperty() id!: string;
    @ApiProperty() barcode!: string | null;
    @ApiProperty() status!: string;
}

class WarehouseRef {
    @ApiProperty() id!: string;
    @ApiProperty() code!: string;
    @ApiProperty() name!: string;
}

class SlotRef {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
}

export class ShipmentItemResponse {
    @ApiProperty() id!: string;
    @ApiProperty() shipmentId!: string;
    @ApiProperty() cargoItemId!: string;
    @ApiProperty({ enum: ShipmentItemStatus }) status!: ShipmentItemStatus;
    @ApiPropertyOptional() assignedWarehouseId!: string | null;
    @ApiPropertyOptional() assignedSlotId!: string | null;
    @ApiPropertyOptional() assignmentScore!: number | null;
    @ApiProperty() assignmentReasons!: string[];
    @ApiPropertyOptional() rejectedCandidates!: any | null;
    @ApiPropertyOptional() runId!: string | null;
    @ApiPropertyOptional() assignedAt!: Date | null;
    @ApiPropertyOptional() storedAt!: Date | null;
    @ApiPropertyOptional() cargoItem?: CargoItemRef;
    @ApiPropertyOptional() assignedWarehouse?: WarehouseRef;
    @ApiPropertyOptional() assignedSlot?: SlotRef;

    static fromEntity(entity: ShipmentItemEntity, relations?: { cargoItem?: any; assignedWarehouse?: any; assignedSlot?: any }): ShipmentItemResponse {
        const res = new ShipmentItemResponse();
        res.id = entity.id;
        res.shipmentId = entity.shipmentId;
        res.cargoItemId = entity.cargoItemId;
        res.status = entity.status;
        res.assignedWarehouseId = entity.assignedWarehouseId;
        res.assignedSlotId = entity.assignedSlotId;
        res.assignmentScore = entity.assignmentScore;
        res.assignmentReasons = entity.assignmentReasons;
        res.rejectedCandidates = entity.rejectedCandidates;
        res.runId = entity.runId;
        res.assignedAt = entity.assignedAt;
        res.storedAt = entity.storedAt;
        if (relations?.cargoItem) res.cargoItem = relations.cargoItem;
        if (relations?.assignedWarehouse) res.assignedWarehouse = relations.assignedWarehouse;
        if (relations?.assignedSlot) res.assignedSlot = relations.assignedSlot;
        return res;
    }
}
