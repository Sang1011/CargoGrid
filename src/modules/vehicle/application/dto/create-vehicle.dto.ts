import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { VehicleScope, VehicleStatus, VehicleType } from 'src/common/enums';

export class CreateVehicleDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    scenarioId!: string;

    @ApiProperty({ example: 'VH-001' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    code!: string;

    @ApiPropertyOptional({ example: 'Forklift Alpha' })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    name?: string;

    @ApiProperty({ enum: VehicleType })
    @IsEnum(VehicleType)
    vehicleType!: VehicleType;

    @ApiProperty({ enum: VehicleScope })
    @IsEnum(VehicleScope)
    scope!: VehicleScope;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    homeWarehouseId?: string;

    @ApiPropertyOptional({ enum: VehicleStatus, default: VehicleStatus.AVAILABLE })
    @IsEnum(VehicleStatus)
    @IsOptional()
    status?: VehicleStatus;

    @ApiProperty({ example: 1500 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    maxLoadKg!: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 4 })
    @IsOptional()
    @Min(0)
    maxVolumeM3?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    widthM?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    heightM?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Min(0)
    speedRating?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    notes?: string;
}
