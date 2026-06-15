import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { CargoItemStatus } from 'src/common/enums';

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

    @ApiPropertyOptional({ enum: CargoItemStatus, default: CargoItemStatus.IN_TRANSIT_INBOUND })
    @IsEnum(CargoItemStatus)
    @IsOptional()
    status?: CargoItemStatus;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    currentSlotId?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    currentWarehouseId?: string;

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
