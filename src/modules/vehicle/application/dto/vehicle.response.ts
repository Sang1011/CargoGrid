import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleEntity } from '../../domain/vehicle.entity';
import { VehicleScope, VehicleStatus, VehicleType } from 'src/common/enums';

class WarehouseRef {
    @ApiProperty() id!: string;
    @ApiProperty() code!: string;
    @ApiProperty() name!: string;
}

export class VehicleResponse {
    @ApiProperty() id!: string;
    @ApiProperty() scenarioId!: string;
    @ApiProperty() code!: string;
    @ApiPropertyOptional() name!: string | null;
    @ApiProperty({ enum: VehicleType }) vehicleType!: VehicleType;
    @ApiProperty({ enum: VehicleScope }) scope!: VehicleScope;
    @ApiPropertyOptional() homeWarehouseId!: string | null;
    @ApiProperty({ enum: VehicleStatus }) status!: VehicleStatus;
    @ApiProperty() maxLoadKg!: number;
    @ApiPropertyOptional() maxVolumeM3!: number | null;
    @ApiPropertyOptional() widthM!: number | null;
    @ApiPropertyOptional() heightM!: number | null;
    @ApiPropertyOptional() speedRating!: number | null;
    @ApiPropertyOptional() notes!: string | null;
    @ApiProperty() createdAt!: Date;
    @ApiProperty() updatedAt!: Date;
    @ApiPropertyOptional() homeWarehouse?: WarehouseRef;

    static fromEntity(entity: VehicleEntity, relations?: { homeWarehouse?: any }): VehicleResponse {
        const res = new VehicleResponse();
        res.id = entity.id;
        res.scenarioId = entity.scenarioId;
        res.code = entity.code;
        res.name = entity.name;
        res.vehicleType = entity.vehicleType;
        res.scope = entity.scope;
        res.homeWarehouseId = entity.homeWarehouseId;
        res.status = entity.status;
        res.maxLoadKg = entity.maxLoadKg;
        res.maxVolumeM3 = entity.maxVolumeM3;
        res.widthM = entity.widthM;
        res.heightM = entity.heightM;
        res.speedRating = entity.speedRating;
        res.notes = entity.notes;
        res.createdAt = entity.createdAt;
        res.updatedAt = entity.updatedAt;
        if (relations?.homeWarehouse) res.homeWarehouse = relations.homeWarehouse;
        return res;
    }
}
