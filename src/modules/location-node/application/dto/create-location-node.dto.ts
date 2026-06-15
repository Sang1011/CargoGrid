import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { LocationNodeType } from 'src/common/enums';

export class CreateLocationNodeDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    scenarioId!: string;

    @ApiProperty({ example: 'Gate A' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;

    @ApiProperty({ example: 'GATE-A' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    code!: string;

    @ApiProperty({ enum: LocationNodeType })
    @IsEnum(LocationNodeType)
    nodeType!: LocationNodeType;

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
    @IsString()
    @IsOptional()
    warehouseId?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    slotId?: string;

    @ApiPropertyOptional({ default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional()
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}
