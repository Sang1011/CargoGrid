import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { ScenarioStatus } from 'src/common/enums';

export class CreateScenarioDto {
    @ApiProperty({ example: 'Cold Chain Export Q1' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;

    @ApiPropertyOptional({ example: 'Simulate cold chain cargo from port to export gate' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ enum: ScenarioStatus, default: ScenarioStatus.ACTIVE })
    @IsEnum(ScenarioStatus)
    @IsOptional()
    status?: ScenarioStatus;

    @ApiPropertyOptional({ example: ['cold-chain', 'export', 'q1'] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    tags?: string[];
}