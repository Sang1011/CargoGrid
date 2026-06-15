import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ZoneEntity } from '../../domain/zone.entity';
import { ZoneType } from 'src/common/enums';

class WarehouseRef {
    @ApiProperty() id!: string;
    @ApiProperty() code!: string;
    @ApiProperty() name!: string;
    @ApiProperty() type!: string;
}

export class ZoneResponse {
    @ApiProperty() id!: string;
    @ApiProperty() warehouseId!: string;
    @ApiProperty() name!: string;
    @ApiProperty() code!: string;
    @ApiProperty({ enum: ZoneType }) zoneType!: ZoneType;
    @ApiProperty() localX!: number;
    @ApiProperty() localY!: number;
    @ApiProperty() width!: number;
    @ApiProperty() depth!: number;
    @ApiPropertyOptional() tempMin!: number | null;
    @ApiPropertyOptional() tempMax!: number | null;
    @ApiPropertyOptional() maxWeightKg!: number | null;
    @ApiProperty() currentWeightKg!: number;
    @ApiPropertyOptional() maxVolumeM3!: number | null;
    @ApiProperty() currentVolumeM3!: number;
    @ApiProperty() gridColStart!: number;
    @ApiProperty() gridRowStart!: number;
    @ApiProperty() gridCols!: number;
    @ApiProperty() gridRows!: number;
    @ApiProperty() isActive!: boolean;
    @ApiPropertyOptional() warehouse?: WarehouseRef;

    static fromEntity(entity: ZoneEntity, relations?: { warehouse?: any }): ZoneResponse {
        const res = new ZoneResponse();
        res.id = entity.id;
        res.warehouseId = entity.warehouseId;
        res.name = entity.name;
        res.code = entity.code;
        res.zoneType = entity.zoneType;
        res.localX = entity.localX;
        res.localY = entity.localY;
        res.width = entity.width;
        res.depth = entity.depth;
        res.tempMin = entity.tempMin;
        res.tempMax = entity.tempMax;
        res.maxWeightKg = entity.maxWeightKg;
        res.currentWeightKg = entity.currentWeightKg;
        res.maxVolumeM3 = entity.maxVolumeM3;
        res.currentVolumeM3 = entity.currentVolumeM3;
        res.gridColStart = entity.gridColStart;
        res.gridRowStart = entity.gridRowStart;
        res.gridCols = entity.gridCols;
        res.gridRows = entity.gridRows;
        res.isActive = entity.isActive;
        if (relations?.warehouse) res.warehouse = relations.warehouse;
        return res;
    }
}
