import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CargoItemEntity } from '../../domain/cargo-item.entity';
import { CargoItemStatus } from 'src/common/enums';

class ProductRef {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
    @ApiProperty() sku!: string | null;
    @ApiProperty() category!: string;
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

export class CargoItemResponse {
    @ApiProperty() id!: string;
    @ApiProperty() productId!: string;
    @ApiProperty() scenarioId!: string;
    @ApiPropertyOptional() barcode!: string | null;
    @ApiPropertyOptional() serialNumber!: string | null;
    @ApiPropertyOptional() batchNumber!: string | null;
    @ApiPropertyOptional() actualWeightKg!: number | null;
    @ApiPropertyOptional() actualVolumeM3!: number | null;
    @ApiPropertyOptional() actualWidthM!: number | null;
    @ApiPropertyOptional() actualDepthM!: number | null;
    @ApiPropertyOptional() actualHeightM!: number | null;
    @ApiProperty({ enum: CargoItemStatus }) status!: CargoItemStatus;
    @ApiPropertyOptional() currentSlotId!: string | null;
    @ApiPropertyOptional() currentWarehouseId!: string | null;
    @ApiPropertyOptional() currentTempC!: number | null;
    @ApiPropertyOptional() lastTempCheckAt!: Date | null;
    @ApiPropertyOptional() manufactureDate!: Date | null;
    @ApiPropertyOptional() expiryDate!: Date | null;
    @ApiPropertyOptional() notes!: string | null;
    @ApiProperty() createdAt!: Date;
    @ApiProperty() updatedAt!: Date;
    @ApiPropertyOptional() product?: ProductRef;
    @ApiPropertyOptional() currentWarehouse?: WarehouseRef;
    @ApiPropertyOptional() currentSlot?: SlotRef;

    static fromEntity(entity: CargoItemEntity, relations?: { product?: any; currentWarehouse?: any; currentSlot?: any }): CargoItemResponse {
        const res = new CargoItemResponse();
        res.id = entity.id;
        res.productId = entity.productId;
        res.scenarioId = entity.scenarioId;
        res.barcode = entity.barcode;
        res.serialNumber = entity.serialNumber;
        res.batchNumber = entity.batchNumber;
        res.actualWeightKg = entity.actualWeightKg;
        res.actualVolumeM3 = entity.actualVolumeM3;
        res.actualWidthM = entity.actualWidthM;
        res.actualDepthM = entity.actualDepthM;
        res.actualHeightM = entity.actualHeightM;
        res.status = entity.status;
        res.currentSlotId = entity.currentSlotId;
        res.currentWarehouseId = entity.currentWarehouseId;
        res.currentTempC = entity.currentTempC;
        res.lastTempCheckAt = entity.lastTempCheckAt;
        res.manufactureDate = entity.manufactureDate;
        res.expiryDate = entity.expiryDate;
        res.notes = entity.notes;
        res.createdAt = entity.createdAt;
        res.updatedAt = entity.updatedAt;
        if (relations?.product) res.product = relations.product;
        if (relations?.currentWarehouse) res.currentWarehouse = relations.currentWarehouse;
        if (relations?.currentSlot) res.currentSlot = relations.currentSlot;
        return res;
    }
}
