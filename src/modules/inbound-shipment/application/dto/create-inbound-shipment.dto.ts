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
import { ShipmentStatus } from 'src/common/enums';

export class CreateInboundShipmentDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    scenarioId!: string;

    @ApiProperty({ example: 'SHIP-2026-001' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    code!: string;

    @ApiProperty({ example: 'supplier' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    sourceType!: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @MaxLength(100)
    sourceName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    entryNodeId?: string;

    @ApiPropertyOptional({ enum: ShipmentStatus, default: ShipmentStatus.PENDING })
    @IsEnum(ShipmentStatus)
    @IsOptional()
    status?: ShipmentStatus;

    @ApiPropertyOptional({ default: 0 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    totalItems?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    notes?: string;
}
