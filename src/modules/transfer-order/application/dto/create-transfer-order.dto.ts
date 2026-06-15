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
import { PriorityLevel, TransferOrderStatus } from 'src/common/enums';

export class CreateTransferOrderDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    scenarioId!: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    incidentId?: string;

    @ApiProperty({ example: 'TO-2026-001' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    code!: string;

    @ApiPropertyOptional({ enum: TransferOrderStatus, default: TransferOrderStatus.DRAFT })
    @IsEnum(TransferOrderStatus)
    @IsOptional()
    status?: TransferOrderStatus;

    @ApiPropertyOptional({ enum: PriorityLevel, default: PriorityLevel.MEDIUM })
    @IsEnum(PriorityLevel)
    @IsOptional()
    priority?: PriorityLevel;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    fromWarehouseId!: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    reason?: string;

    @ApiPropertyOptional({ default: false })
    @IsBoolean()
    @IsOptional()
    isEmergency?: boolean;

    @ApiPropertyOptional({ default: 0 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    totalItems?: number;
}
