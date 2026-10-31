import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OptimizationRunEntity } from '../../domain/optimization-run.entity';
import { AlgorithmType, OptimizationContextType } from 'src/common/enums';

export class OptimizationRunResponse {
    @ApiProperty() id!: string;
    @ApiProperty() scenarioId!: string;
    @ApiProperty({ enum: OptimizationContextType }) contextType!: OptimizationContextType;
    @ApiPropertyOptional() contextId!: string | null;
    @ApiProperty({ enum: AlgorithmType }) algorithm!: AlgorithmType;
    @ApiProperty() weightCapacityFit!: number;
    @ApiProperty() weightMovementCost!: number;
    @ApiProperty() weightCategoryMatch!: number;
    @ApiProperty() weightVehicleAccess!: number;
    @ApiProperty() weightDemandPriority!: number;
    @ApiProperty() weightCongestion!: number;
    @ApiPropertyOptional() productsTotal!: number | null;
    @ApiPropertyOptional() productsAssigned!: number | null;
    @ApiPropertyOptional() productsUnassigned!: number | null;
    @ApiPropertyOptional() hardViolations!: number | null;
    @ApiPropertyOptional() totalMovementCost!: number | null;
    @ApiPropertyOptional() avgRetrievalCost!: number | null;
    @ApiPropertyOptional() spaceUtilization!: number | null;
    @ApiPropertyOptional() congestionScore!: number | null;
    @ApiPropertyOptional() runtimeMs!: number | null;
    @ApiPropertyOptional() optimizationScore!: number | null;
    @ApiProperty() createdAt!: Date;

    static fromEntity(entity: OptimizationRunEntity): OptimizationRunResponse {
        const res = new OptimizationRunResponse();
        res.id = entity.id;
        res.scenarioId = entity.scenarioId;
        res.contextType = entity.contextType;
        res.contextId = entity.contextId;
        res.algorithm = entity.algorithm;
        res.weightCapacityFit = entity.weightCapacityFit;
        res.weightMovementCost = entity.weightMovementCost;
        res.weightCategoryMatch = entity.weightCategoryMatch;
        res.weightVehicleAccess = entity.weightVehicleAccess;
        res.weightDemandPriority = entity.weightDemandPriority;
        res.weightCongestion = entity.weightCongestion;
        res.productsTotal = entity.productsTotal;
        res.productsAssigned = entity.productsAssigned;
        res.productsUnassigned = entity.productsUnassigned;
        res.hardViolations = entity.hardViolations;
        res.totalMovementCost = entity.totalMovementCost;
        res.avgRetrievalCost = entity.avgRetrievalCost;
        res.spaceUtilization = entity.spaceUtilization;
        res.congestionScore = entity.congestionScore;
        res.runtimeMs = entity.runtimeMs;
        res.optimizationScore = entity.optimizationScore;
        res.createdAt = entity.createdAt;
        return res;
    }
}
