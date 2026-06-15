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
import { ZoneType } from 'src/common/enums';

class AllowedVehicleDto {
    @ApiProperty({ enum: ['forklift', 'pallet_jack', 'reach_truck', 'container_truck', 'electric_cart', 'manual'] })
    @IsString()
    @IsNotEmpty()
    vehicleType!: string;
}

export class CreateStorageSlotDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    zoneId!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    warehouseId!: string;

    @ApiProperty({ example: 'A-01' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name!: string;

    @ApiProperty()
    @IsNumber({ maxDecimalPlaces: 2 })
    localX!: number;

    @ApiProperty()
    @IsNumber({ maxDecimalPlaces: 2 })
    localY!: number;

    @ApiPropertyOptional({ default: 0 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    localZ?: number;

    @ApiProperty()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    widthM!: number;

    @ApiProperty()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    depthM!: number;

    @ApiProperty()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    heightM!: number;

    @ApiProperty()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    maxWeightKg!: number;

    @ApiProperty()
    @IsNumber({ maxDecimalPlaces: 4 })
    @Min(0)
    maxVolumeM3!: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    aisleWidthM?: number;

    @ApiProperty({ enum: ZoneType })
    @IsEnum(ZoneType)
    zoneType!: ZoneType;

    @ApiProperty()
    @IsNumber()
    rowIndex!: number;

    @ApiProperty()
    @IsNumber()
    colIndex!: number;

    @ApiPropertyOptional({ default: 1 })
    @IsNumber()
    @IsOptional()
    @Min(1)
    colSpan?: number;

    @ApiPropertyOptional({ default: 1 })
    @IsNumber()
    @IsOptional()
    @Min(1)
    rowSpan?: number;

    @ApiPropertyOptional({ default: 0 })
    @IsNumber()
    @IsOptional()
    rotationDeg?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @MaxLength(20)
    displayLabel?: string;

    @ApiPropertyOptional({ default: false })
    @IsBoolean()
    @IsOptional()
    isBlocked?: boolean;

    @ApiPropertyOptional({ default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional({ type: [AllowedVehicleDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AllowedVehicleDto)
    @IsOptional()
    allowedVehicles?: AllowedVehicleDto[];
}
