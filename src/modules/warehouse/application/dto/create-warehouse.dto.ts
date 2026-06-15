import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WarehouseType } from 'src/common/enums';

class AllowedVehicleDto {
    @ApiProperty({ enum: ['forklift', 'pallet_jack', 'reach_truck', 'container_truck', 'electric_cart', 'manual'] })
    @IsString()
    @IsNotEmpty()
    vehicleType!: string;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    @Min(0)
    maxLoadKg?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Min(0)
    speedRating?: number;
}

export class CreateWarehouseDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    scenarioId!: string;

    @ApiProperty({ example: 'Warehouse A' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;

    @ApiProperty({ example: 'WH-A' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    code!: string;

    @ApiProperty({ enum: WarehouseType })
    @IsEnum(WarehouseType)
    type!: WarehouseType;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 7 })
    @IsOptional()
    geoLat?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 7 })
    @IsOptional()
    geoLng?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    localX?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    localY?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    @Min(0)
    totalAreaSqm?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    tempMin?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    tempMax?: number;

    @ApiPropertyOptional({ default: 1 })
    @IsNumber()
    @IsOptional()
    @Min(1)
    doorCount?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    doorWidthM?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    doorHeightM?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    @Min(0)
    maxWeightKg?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 4 })
    @IsOptional()
    @Min(0)
    maxVolumeM3?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Min(0)
    gridCols?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Min(0)
    gridRows?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    gridCellWidthM?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    gridCellDepthM?: number;

    @ApiPropertyOptional({ default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiPropertyOptional({ type: [AllowedVehicleDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AllowedVehicleDto)
    @IsOptional()
    allowedVehicles?: AllowedVehicleDto[];
}
