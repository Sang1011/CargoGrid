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
import { IncidentSeverity, IncidentStatus, IncidentType } from 'src/common/enums';

export class CreateWarehouseIncidentDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    warehouseId!: string;

    @ApiProperty({ enum: IncidentType })
    @IsEnum(IncidentType)
    incidentType!: IncidentType;

    @ApiProperty({ enum: IncidentSeverity })
    @IsEnum(IncidentSeverity)
    severity!: IncidentSeverity;

    @ApiPropertyOptional({ enum: IncidentStatus, default: IncidentStatus.OPEN })
    @IsEnum(IncidentStatus)
    @IsOptional()
    status?: IncidentStatus;

    @ApiProperty({ example: 'Cooling system failure in cold zone' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title!: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    affectedTempC?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Min(0)
    safeDurationMinutes?: number;

    @ApiPropertyOptional()
    @IsDateString()
    @IsOptional()
    occurredAt?: string;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Min(0)
    estimatedDowntimeHours?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @MaxLength(100)
    reportedBy?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    notes?: string;
}
