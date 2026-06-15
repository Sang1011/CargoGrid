import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDecimal,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { PriorityLevel, ProductCategory, VehicleType, ZoneType } from 'src/common/enums';

export class CreateProductDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    scenarioId!: string;

    @ApiProperty({ example: 'Cold Medicine Alpha' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name!: string;

    @ApiPropertyOptional({ example: 'MED-ALPHA-001' })
    @IsString()
    @IsOptional()
    @MaxLength(50)
    sku?: string;

    @ApiProperty({ enum: ProductCategory })
    @IsEnum(ProductCategory)
    category!: ProductCategory;

    @ApiProperty({ example: 1.5 })
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    weightKg!: number;

    @ApiProperty({ example: 0.05 })
    @IsNumber({ maxDecimalPlaces: 4 })
    @Min(0)
    volumeM3!: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    widthM?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    depthM?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    heightM?: number;

    @ApiPropertyOptional({ enum: ZoneType })
    @IsEnum(ZoneType)
    @IsOptional()
    requiredZone?: ZoneType;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    @Min(-99)
    requiredTempMin?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    @Min(-99)
    requiredTempMax?: number;

    @ApiPropertyOptional({ default: 50 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    demandFrequency?: number;

    @ApiPropertyOptional({ enum: PriorityLevel, default: PriorityLevel.MEDIUM })
    @IsEnum(PriorityLevel)
    @IsOptional()
    priority?: PriorityLevel;

    @ApiProperty({ enum: VehicleType })
    @IsEnum(VehicleType)
    vehicleType!: VehicleType;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    preferredEntryNodeId?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    preferredExitNodeId?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    notes?: string;
}
