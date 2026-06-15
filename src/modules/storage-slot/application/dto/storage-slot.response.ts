import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StorageSlotEntity } from '../../domain/storage-slot.entity';
import { ZoneType } from 'src/common/enums';

class ZoneRef {
    @ApiProperty() id!: string;
    @ApiProperty() code!: string;
    @ApiProperty() name!: string;
}

class WarehouseRef {
    @ApiProperty() id!: string;
    @ApiProperty() code!: string;
    @ApiProperty() name!: string;
}

class AllowedVehicleRef {
    @ApiProperty() vehicleType!: string;
}

export class StorageSlotResponse {
    @ApiProperty() id!: string;
    @ApiProperty() zoneId!: string;
    @ApiProperty() warehouseId!: string;
    @ApiProperty() name!: string;
    @ApiProperty() localX!: number;
    @ApiProperty() localY!: number;
    @ApiProperty() localZ!: number;
    @ApiProperty() widthM!: number;
    @ApiProperty() depthM!: number;
    @ApiProperty() heightM!: number;
    @ApiProperty() maxWeightKg!: number;
    @ApiProperty() currentWeightKg!: number;
    @ApiProperty() maxVolumeM3!: number;
    @ApiProperty() currentVolumeM3!: number;
    @ApiPropertyOptional() aisleWidthM!: number | null;
    @ApiProperty({ enum: ZoneType }) zoneType!: ZoneType;
    @ApiProperty() rowIndex!: number;
    @ApiProperty() colIndex!: number;
    @ApiProperty() colSpan!: number;
    @ApiProperty() rowSpan!: number;
    @ApiProperty() rotationDeg!: number;
    @ApiPropertyOptional() displayLabel!: string | null;
    @ApiProperty() isBlocked!: boolean;
    @ApiProperty() isActive!: boolean;
    @ApiPropertyOptional() zone?: ZoneRef;
    @ApiPropertyOptional() warehouse?: WarehouseRef;
    @ApiPropertyOptional({ type: [AllowedVehicleRef] }) allowedVehicles?: AllowedVehicleRef[];

    static fromEntity(entity: StorageSlotEntity, relations?: { zone?: any; warehouse?: any; allowedVehicles?: any[] }): StorageSlotResponse {
        const res = new StorageSlotResponse();
        res.id = entity.id;
        res.zoneId = entity.zoneId;
        res.warehouseId = entity.warehouseId;
        res.name = entity.name;
        res.localX = entity.localX;
        res.localY = entity.localY;
        res.localZ = entity.localZ;
        res.widthM = entity.widthM;
        res.depthM = entity.depthM;
        res.heightM = entity.heightM;
        res.maxWeightKg = entity.maxWeightKg;
        res.currentWeightKg = entity.currentWeightKg;
        res.maxVolumeM3 = entity.maxVolumeM3;
        res.currentVolumeM3 = entity.currentVolumeM3;
        res.aisleWidthM = entity.aisleWidthM;
        res.zoneType = entity.zoneType;
        res.rowIndex = entity.rowIndex;
        res.colIndex = entity.colIndex;
        res.colSpan = entity.colSpan;
        res.rowSpan = entity.rowSpan;
        res.rotationDeg = entity.rotationDeg;
        res.displayLabel = entity.displayLabel;
        res.isBlocked = entity.isBlocked;
        res.isActive = entity.isActive;
        if (relations?.zone) res.zone = relations.zone;
        if (relations?.warehouse) res.warehouse = relations.warehouse;
        if (relations?.allowedVehicles) res.allowedVehicles = relations.allowedVehicles;
        return res;
    }
}
