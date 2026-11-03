import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsEnum, IsNotEmpty, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { AlgorithmType, OptimizationContextType } from 'src/common/enums';
import { Type } from 'class-transformer';

class PartialWeights {
    @ApiPropertyOptional()
    @IsOptional()
    capacityFit?: number;

    @ApiPropertyOptional()
    @IsOptional()
    movementCost?: number;

    @ApiPropertyOptional()
    @IsOptional()
    categoryMatch?: number;

    @ApiPropertyOptional()
    @IsOptional()
    vehicleAccess?: number;

    @ApiPropertyOptional()
    @IsOptional()
    demandPriority?: number;

    @ApiPropertyOptional()
    @IsOptional()
    congestion?: number;
}

export class CompareOptimizationDto {
    @ApiProperty({ example: 'uuid' })
    @IsUUID()
    @IsNotEmpty()
    scenarioId!: string;

    @ApiProperty({ enum: AlgorithmType, isArray: true })
    @IsArray()
    @IsEnum(AlgorithmType, { each: true })
    @IsNotEmpty()
    algorithms!: AlgorithmType[];

    @ApiProperty({ enum: OptimizationContextType })
    @IsEnum(OptimizationContextType)
    @IsNotEmpty()
    contextType!: OptimizationContextType;

    @ApiPropertyOptional({ type: PartialWeights })
    @IsOptional()
    @ValidateNested()
    @Type(() => PartialWeights)
    weights?: PartialWeights;

    @ApiPropertyOptional({ description: 'Inbound shipment or transfer order to allocate; omit to use the whole product catalogue' })
    @IsUUID()
    @IsOptional()
    contextId?: string;

    @ApiPropertyOptional({ description: 'Seed for Random / Local Search / Annealing so a run can be repeated exactly' })
    @IsInt()
    @IsOptional()
    seed?: number;
}
