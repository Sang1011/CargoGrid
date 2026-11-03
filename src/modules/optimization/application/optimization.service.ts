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
import { AlgorithmType, AssignmentStatus } from 'src/common/enums';
import { BenchmarkDto } from './dto/benchmark.dto';
import { BenchmarkRow, runBenchmark } from 'src/modules/benchmark/benchmark-runner';
import { OptimizationContext, OptimizationResult } from 'src/modules/algorithms/domain/types/optimization-context.type';

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
        const context = await this.contextBuilder.build(dto.scenarioId, dto.contextType, { contextId: dto.contextId, seed: dto.seed });
        this.applyWeights(context, dto.weights);
        const { run } = await this.execute(context, dto.algorithm);
        return run;
    }

    /** Runs one algorithm on an already-built context and stores the run with its assignments. */
    async execute(context: OptimizationContext, algorithmType: AlgorithmType): Promise<{ run: OptimizationRunEntity; result: OptimizationResult }> {
        const algorithm = this.algorithmFactory.get(algorithmType);
        const result = await algorithm.run(context);

        const run = await this.runRepository.create({
            scenarioId: context.scenarioId,
            contextType: context.contextType,
            contextId: context.contextId ?? null,
            algorithm: algorithmType,
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
                algorithm: algorithmType,
                weights: context.weights,
                metrics: result.metrics,
                notes: context.notes ?? [],
                seed: context.seed ?? null,
            },
        });

        const productOf = new Map(context.products.map(p => [p.id, p.productId ?? p.id]));
        await this.assignmentRepository.bulkCreate(result.assignments.map(a => ({
            runId: run.id,
            productId: productOf.get(a.productId) ?? a.productId,
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
            routeCost: a.routeCost,
            routePath: a.routePath ? { nodes: a.routePath, distanceM: a.routeDistanceM, warnings: a.routeWarnings } : null,
            reasons: a.reasons,
            rejectedCandidates: a.rejectedCandidates.length > 0 ? { candidates: a.rejectedCandidates } : null,
        })));

        return { run, result };
    }

    applyWeights(context: OptimizationContext, weights?: Partial<ScoringWeights>): void {
        if (!weights) return;
        context.weights = {
            ...DEFAULT_SCORING_WEIGHTS,
            ...Object.fromEntries(Object.entries(weights).filter(([_, v]) => v !== undefined)),
        } as ScoringWeights;
    }

    async compare(dto: CompareOptimizationDto): Promise<OptimizationRunEntity[]> {
        // One context for every algorithm, so they are compared on identical input.
        const context = await this.contextBuilder.build(dto.scenarioId, dto.contextType, { contextId: dto.contextId, seed: dto.seed ?? 1 });
        this.applyWeights(context, dto.weights);

        const results: OptimizationRunEntity[] = [];
        for (const algoType of dto.algorithms) {
            results.push((await this.execute(context, algoType)).run);
        }
        return results;
    }

    /**
     * Runs the algorithms on the built-in benchmark datasets (generated in memory, nothing is stored)
     * and returns one row per dataset and algorithm.
     */
    benchmark(dto: BenchmarkDto): Promise<BenchmarkRow[]> {
        return runBenchmark(type => this.algorithmFactory.get(type), dto);
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
