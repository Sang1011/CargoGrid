import { Injectable, NotFoundException } from '@nestjs/common';
import { AlgorithmFactory } from 'src/modules/algorithms/strategies/algorithm.factory';
import { ScoringService } from 'src/modules/algorithms/scoring/scoring.service';
import { DEFAULT_SCORING_WEIGHTS, ScoringWeights } from 'src/modules/algorithms/domain/types/scoring-weights.type';
import { OptimizationRunRepository } from '../infrastructure/optimization-run.repository';
import { AssignmentRepository } from '../infrastructure/assignment.repository';
import { ContextBuilderService } from './context-builder.service';
import { RunOptimizationDto } from './dto/run-optimization.dto';
import { CompareOptimizationDto } from './dto/compare-optimization.dto';
import { OptimizationRunEntity } from '../domain/optimization-run.entity';
import { AssignmentStatus } from 'src/common/enums';

@Injectable()
export class OptimizationService {
    constructor(
        private readonly algorithmFactory: AlgorithmFactory,
        private readonly scoringService: ScoringService,
        private readonly contextBuilder: ContextBuilderService,
        private readonly runRepository: OptimizationRunRepository,
        private readonly assignmentRepository: AssignmentRepository,
    ) {}

    async run(dto: RunOptimizationDto): Promise<OptimizationRunEntity> {
        const context = await this.contextBuilder.build(dto.scenarioId, dto.contextType);

        if (dto.weights) {
            context.weights = {
                ...DEFAULT_SCORING_WEIGHTS,
                ...Object.fromEntries(
                    Object.entries(dto.weights).filter(([_, v]) => v !== undefined),
                ),
            } as ScoringWeights;
        }

        const algorithm = this.algorithmFactory.get(dto.algorithm);
        const result = await algorithm.run(context);

        const runRow = await this.runRepository.create({
            scenarioId: dto.scenarioId,
            contextType: dto.contextType,
            contextId: dto.contextId ?? null,
            algorithm: dto.algorithm,
            weightCapacityFit: context.weights.capacityFit,
            weightMovementCost: context.weights.movementCost,
            weightCategoryMatch: context.weights.categoryMatch,
            weightVehicleAccess: context.weights.vehicleAccess,
            weightDemandPriority: context.weights.demandPriority,
            weightCongestion: context.weights.congestion,
            productsTotal: result.metrics.productsTotal,
            productsAssigned: result.metrics.productsAssigned,
            productsUnassigned: result.metrics.productsUnassigned,
            hardViolations: result.metrics.hardViolations,
            totalMovementCost: result.metrics.totalMovementCost,
            avgRetrievalCost: result.metrics.avgRetrievalCost,
            spaceUtilization: result.metrics.spaceUtilization,
            congestionScore: result.metrics.congestionScore,
            runtimeMs: result.metrics.runtimeMs,
            optimizationScore: result.metrics.optimizationScore,
            resultSnapshot: {
                algorithm: dto.algorithm,
                weights: context.weights,
                metrics: result.metrics,
            },
        });

        const assignmentInputs = result.assignments.map(a => ({
            runId: runRow.id,
            productId: a.productId,
            warehouseId: a.warehouseId,
            slotId: a.slotId,
            status: a.slotId ? AssignmentStatus.ASSIGNED : AssignmentStatus.PENDING,
            finalScore: a.score,
            capacityFitScore: a.capacityFitScore,
            movementCostScore: a.movementCostScore,
            categoryMatchScore: a.categoryMatchScore,
            vehicleAccessScore: a.vehicleAccessScore,
            demandPriorityScore: a.demandPriorityScore,
            congestionScore: a.congestionScore,
            reasons: a.reasons,
            rejectedCandidates: a.rejectedCandidates.length > 0
                ? { candidates: a.rejectedCandidates }
                : null,
        }));

        await this.assignmentRepository.bulkCreate(assignmentInputs);

        return runRow;
    }

    async compare(dto: CompareOptimizationDto): Promise<OptimizationRunEntity[]> {
        const context = await this.contextBuilder.build(dto.scenarioId, dto.contextType);

        if (dto.weights) {
            context.weights = {
                ...DEFAULT_SCORING_WEIGHTS,
                ...Object.fromEntries(
                    Object.entries(dto.weights).filter(([_, v]) => v !== undefined),
                ),
            } as ScoringWeights;
        }

        const results: OptimizationRunEntity[] = [];

        for (const algoType of dto.algorithms) {
            const algorithm = this.algorithmFactory.get(algoType);
            const result = await algorithm.run(context);

            const runRow = await this.runRepository.create({
                scenarioId: dto.scenarioId,
                contextType: dto.contextType,
                contextId: null,
                algorithm: algoType,
                weightCapacityFit: context.weights.capacityFit,
                weightMovementCost: context.weights.movementCost,
                weightCategoryMatch: context.weights.categoryMatch,
                weightVehicleAccess: context.weights.vehicleAccess,
                weightDemandPriority: context.weights.demandPriority,
                weightCongestion: context.weights.congestion,
                productsTotal: result.metrics.productsTotal,
                productsAssigned: result.metrics.productsAssigned,
                productsUnassigned: result.metrics.productsUnassigned,
                hardViolations: result.metrics.hardViolations,
                totalMovementCost: result.metrics.totalMovementCost,
                avgRetrievalCost: result.metrics.avgRetrievalCost,
                spaceUtilization: result.metrics.spaceUtilization,
                congestionScore: result.metrics.congestionScore,
                runtimeMs: result.metrics.runtimeMs,
                optimizationScore: result.metrics.optimizationScore,
                resultSnapshot: {
                    algorithm: algoType,
                    weights: context.weights,
                    metrics: result.metrics,
                },
            });

            const assignmentInputs = result.assignments.map(a => ({
                runId: runRow.id,
                productId: a.productId,
                warehouseId: a.warehouseId,
                slotId: a.slotId,
                status: a.slotId ? AssignmentStatus.ASSIGNED : AssignmentStatus.PENDING,
                finalScore: a.score,
                capacityFitScore: a.capacityFitScore,
                movementCostScore: a.movementCostScore,
                categoryMatchScore: a.categoryMatchScore,
                vehicleAccessScore: a.vehicleAccessScore,
                demandPriorityScore: a.demandPriorityScore,
                congestionScore: a.congestionScore,
                reasons: a.reasons,
                rejectedCandidates: a.rejectedCandidates.length > 0
                    ? { candidates: a.rejectedCandidates }
                    : null,
            }));

            await this.assignmentRepository.bulkCreate(assignmentInputs);
            results.push(runRow);
        }

        return results;
    }

    async findByScenario(
        scenarioId: string,
        filters?: { algorithm?: string; contextType?: string },
    ): Promise<OptimizationRunEntity[]> {
        return this.runRepository.findByScenario(scenarioId, filters as any);
    }

    async findOne(id: string): Promise<{
        run: OptimizationRunEntity;
        assignments: any[];
    }> {
        const result = await this.runRepository.findByIdWithAssignments(id);
        if (!result) {
            throw new NotFoundException(`OptimizationRun ${id} not found`);
        }
        return result;
    }
}
