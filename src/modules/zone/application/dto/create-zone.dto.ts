import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { ZoneType } from 'src/common/enums';

export class CreateZoneDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    warehouseId!: string;

    @ApiProperty({ example: 'Cold Zone 1' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;

    @ApiProperty({ example: 'CZ-01' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    code!: string;

    @ApiProperty({ enum: ZoneType })
    @IsEnum(ZoneType)
    zoneType!: ZoneType;

    @ApiProperty()
    @IsNumber({ maxDecimalPlaces: 2 })
    localX!: number;

    @ApiProperty()
    @IsNumber({ maxDecimalPlaces: 2 })
    localY!: number;

    @ApiProperty()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    width!: number;

    @ApiProperty()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    depth!: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    tempMin?: number;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    tempMax?: number;

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

    @ApiPropertyOptional({ default: 0 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    gridColStart?: number;

    @ApiPropertyOptional({ default: 0 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    gridRowStart?: number;

    @ApiPropertyOptional({ default: 1 })
    @IsNumber()
    @IsOptional()
    @Min(1)
    gridCols?: number;

    @ApiPropertyOptional({ default: 1 })
    @IsNumber()
    @IsOptional()
    @Min(1)
    gridRows?: number;

    @ApiPropertyOptional({ default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
