import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WarehouseEntity } from '../../domain/warehouse.entity';
import { WarehouseType } from 'src/common/enums';

class AllowedVehicleRef {
    @ApiProperty() vehicleType!: string;
    @ApiPropertyOptional() maxLoadKg!: number | null;
    @ApiPropertyOptional() speedRating!: number | null;
}

export class WarehouseResponse {
    @ApiProperty() id!: string;
    @ApiProperty() scenarioId!: string;
    @ApiProperty() name!: string;
    @ApiProperty() code!: string;
    @ApiProperty({ enum: WarehouseType }) type!: WarehouseType;
    @ApiPropertyOptional() geoLat!: number | null;
    @ApiPropertyOptional() geoLng!: number | null;
    @ApiPropertyOptional() localX!: number | null;
    @ApiPropertyOptional() localY!: number | null;
    @ApiPropertyOptional() totalAreaSqm!: number | null;
    @ApiPropertyOptional() tempMin!: number | null;
    @ApiPropertyOptional() tempMax!: number | null;
    @ApiProperty() doorCount!: number;
    @ApiPropertyOptional() doorWidthM!: number | null;
    @ApiPropertyOptional() doorHeightM!: number | null;
    @ApiPropertyOptional() maxWeightKg!: number | null;
    @ApiProperty() currentWeightKg!: number;
    @ApiPropertyOptional() maxVolumeM3!: number | null;
    @ApiProperty() currentVolumeM3!: number;
    @ApiPropertyOptional() gridCols!: number | null;
    @ApiPropertyOptional() gridRows!: number | null;
    @ApiPropertyOptional() gridCellWidthM!: number | null;
    @ApiPropertyOptional() gridCellDepthM!: number | null;
    @ApiProperty() isActive!: boolean;
    @ApiPropertyOptional() notes!: string | null;
    @ApiProperty() createdAt!: Date;
    @ApiProperty() updatedAt!: Date;
    @ApiPropertyOptional({ type: [AllowedVehicleRef] }) allowedVehicles?: AllowedVehicleRef[];

    static fromEntity(entity: WarehouseEntity, relations?: { allowedVehicles?: any[] }): WarehouseResponse {
        const res = new WarehouseResponse();
        res.id = entity.id;
        res.scenarioId = entity.scenarioId;
        res.name = entity.name;
        res.code = entity.code;
        res.type = entity.type;
        res.geoLat = entity.geoLat;
        res.geoLng = entity.geoLng;
        res.localX = entity.localX;
        res.localY = entity.localY;
        res.totalAreaSqm = entity.totalAreaSqm;
        res.tempMin = entity.tempMin;
        res.tempMax = entity.tempMax;
        res.doorCount = entity.doorCount;
        res.doorWidthM = entity.doorWidthM;
        res.doorHeightM = entity.doorHeightM;
        res.maxWeightKg = entity.maxWeightKg;
        res.currentWeightKg = entity.currentWeightKg;
        res.maxVolumeM3 = entity.maxVolumeM3;
        res.currentVolumeM3 = entity.currentVolumeM3;
        res.gridCols = entity.gridCols;
        res.gridRows = entity.gridRows;
        res.gridCellWidthM = entity.gridCellWidthM;
        res.gridCellDepthM = entity.gridCellDepthM;
        res.isActive = entity.isActive;
        res.notes = entity.notes;
        res.createdAt = entity.createdAt;
        res.updatedAt = entity.updatedAt;
        if (relations?.allowedVehicles) res.allowedVehicles = relations.allowedVehicles;
        return res;
    }
}
