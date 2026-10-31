import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { AlgorithmType, OptimizationContextType } from 'src/common/enums';
import { Type } from 'class-transformer';

class PartialWeights {
    @ApiPropertyOptional({ example: 0.25 })
    @IsOptional()
    capacityFit?: number;

    @ApiPropertyOptional({ example: 0.20 })
    @IsOptional()
    movementCost?: number;

    @ApiPropertyOptional({ example: 0.20 })
    @IsOptional()
    categoryMatch?: number;

    @ApiPropertyOptional({ example: 0.15 })
    @IsOptional()
    vehicleAccess?: number;

    @ApiPropertyOptional({ example: 0.10 })
    @IsOptional()
    demandPriority?: number;

    @ApiPropertyOptional({ example: 0.10 })
    @IsOptional()
    congestion?: number;
}

export class RunOptimizationDto {
    @ApiProperty({ example: 'uuid' })
    @IsUUID()
    @IsNotEmpty()
    scenarioId!: string;

    @ApiProperty({ enum: AlgorithmType })
    @IsEnum(AlgorithmType)
    @IsNotEmpty()
    algorithm!: AlgorithmType;

    @ApiProperty({ enum: OptimizationContextType })
    @IsEnum(OptimizationContextType)
    @IsNotEmpty()
    contextType!: OptimizationContextType;

    @ApiPropertyOptional()
    @IsUUID()
    @IsOptional()
    contextId?: string;

    @ApiPropertyOptional({ type: PartialWeights })
    @IsOptional()
    @ValidateNested()
    @Type(() => PartialWeights)
    weights?: PartialWeights;
}
