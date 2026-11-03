import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

// Where a cargo is, and whether it is in transit, stored or delivered, is not editable here:
// only a Movement changes it (BR-01). A new cargo item starts as in_transit_inbound with no location.
export class CreateCargoItemDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    productId!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    scenarioId!: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @MaxLength(100)
    barcode?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @MaxLength(100)
    serialNumber?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @MaxLength(50)
    batchNumber?: string;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    actualWeightKg?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 4 })
    @IsOptional()
    @Min(0)
    actualVolumeM3?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    actualWidthM?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    actualDepthM?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @IsOptional()
    @Min(0)
    actualHeightM?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    currentTempC?: number;

    @ApiPropertyOptional()
    @IsDateString()
    @IsOptional()
    manufactureDate?: string;

    @ApiPropertyOptional()
    @IsDateString()
    @IsOptional()
    expiryDate?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    notes?: string;
}
