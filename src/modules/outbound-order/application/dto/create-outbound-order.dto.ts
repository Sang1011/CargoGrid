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
import { OutboundDestinationType, OutboundOrderStatus, PriorityLevel } from 'src/common/enums';

export class CreateOutboundOrderDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    scenarioId!: string;

    @ApiProperty({ example: 'OUT-2026-001' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    code!: string;

    @ApiPropertyOptional({ enum: OutboundOrderStatus, default: OutboundOrderStatus.DRAFT })
    @IsEnum(OutboundOrderStatus)
    @IsOptional()
    status?: OutboundOrderStatus;

    @ApiPropertyOptional({ enum: PriorityLevel, default: PriorityLevel.MEDIUM })
    @IsEnum(PriorityLevel)
    @IsOptional()
    priority?: PriorityLevel;

    @ApiProperty({ enum: OutboundDestinationType })
    @IsEnum(OutboundDestinationType)
    destinationType!: OutboundDestinationType;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @MaxLength(100)
    destinationName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    exitNodeId?: string;

    @ApiPropertyOptional()
    @IsDateString()
    @IsOptional()
    deadlineAt?: string;

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
