import { Injectable } from '@nestjs/common';
import { IOptimizationAlgorithm } from './algorithm.interface';
import { OptimizationContext, OptimizationResult, AssignmentResult } from '../domain/types/optimization-context.type';
import { AlgorithmType } from 'src/common/enums';
import { ScoringService } from '../scoring/scoring.service';
import { GreedyAlgorithm } from './greedy.algorithm';

@Injectable()
export class SimulatedAnnealingAlgorithm implements IOptimizationAlgorithm {
    readonly type = AlgorithmType.SIMULATED_ANNEALING;

    private readonly T0 = 100;
    private readonly COOLING_RATE = 0.95;
    private readonly MIN_T = 1;
    private readonly MAX_ITERATIONS = 5000;

    constructor(private readonly scoringService: ScoringService) {}

    async run(context: OptimizationContext): Promise<OptimizationResult> {
        const startTime = Date.now();
        const greedy = new GreedyAlgorithm(this.scoringService);
        const baseline = await greedy.run(context);

        let currentAssignments: AssignmentResult[] = JSON.parse(JSON.stringify(baseline.assignments));
        let currentScore = this.totalScore(currentAssignments);

        let bestAssignments: AssignmentResult[] = JSON.parse(JSON.stringify(currentAssignments));
        let bestScore = currentScore;

        let T = this.T0;
        let iteration = 0;

        while (T > this.MIN_T && iteration < this.MAX_ITERATIONS) {
            const assigned = currentAssignments.filter(a => a.slotId !== null);
            if (assigned.length < 2) {
                T *= this.COOLING_RATE;
                iteration++;
                continue;
            }

            const idx1 = Math.floor(Math.random() * assigned.length);
            const a1 = assigned[idx1];
            const product1 = context.products.find(p => p.id === a1.productId);
            if (!product1) continue;

            const otherSlots = context.slots.filter(
                s => s.id !== a1.slotId && !this.scoringService.isHardViolation(product1, s).violated,
            );

            if (otherSlots.length === 0) {
                T *= this.COOLING_RATE;
                iteration++;
                continue;
            }

            const randomSlot = otherSlots[Math.floor(Math.random() * otherSlots.length)];
            const oldSlot = context.slots.find(s => s.id === a1.slotId);

            const oldScore = oldSlot
                ? this.scoringService.scoreCandidate(product1, oldSlot, context.weights).finalScore
                : 0;
            const newScore = this.scoringService.scoreCandidate(product1, randomSlot, context.weights);
            const newScoreVal = newScore.finalScore;
            const delta = newScoreVal - oldScore;

            if (delta > 0 || Math.random() < Math.exp(delta / T)) {
                const globalIdx = currentAssignments.findIndex(a => a.productId === a1.productId);
                if (globalIdx !== -1) {
                    currentAssignments[globalIdx] = {
                        ...currentAssignments[globalIdx],
                        slotId: randomSlot.id,
                        warehouseId: randomSlot.warehouseId,
                        score: newScoreVal,
                        capacityFitScore: newScore.capacityFitScore,
                        movementCostScore: newScore.movementCostScore,
                        categoryMatchScore: newScore.categoryMatchScore,
                        vehicleAccessScore: newScore.vehicleAccessScore,
                        demandPriorityScore: newScore.demandPriorityScore,
                        congestionScore: newScore.congestionScore,
                        reasons: this.scoringService.explainSelection(product1, randomSlot),
                    };
                }

                currentScore = this.totalScore(currentAssignments);

                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    bestAssignments = JSON.parse(JSON.stringify(currentAssignments));
                }
            }

            T *= this.COOLING_RATE;
            iteration++;
        }

        const now = Date.now();
        const assignedFinal = bestAssignments.filter(a => a.slotId !== null);
        const totalMovementCost = assignedFinal.reduce((sum, a) => {
            const slot = context.slots.find(s => s.id === a.slotId);
            return sum + (slot ? slot.distanceFromEntryM : 0);
        }, 0);

        return {
            assignments: bestAssignments,
            metrics: {
                productsTotal: context.products.length,
                productsAssigned: assignedFinal.length,
                productsUnassigned: context.products.length - assignedFinal.length,
                hardViolations: baseline.metrics.hardViolations,
                totalMovementCost,
                avgRetrievalCost: assignedFinal.length > 0 ? totalMovementCost / assignedFinal.length : 0,
                spaceUtilization: context.slots.length > 0 ? assignedFinal.length / context.slots.length : 0,
                congestionScore: 0,
                runtimeMs: now - startTime,
                optimizationScore: assignedFinal.length > 0 ? bestScore / assignedFinal.length : 0,
            },
        };
    }

    private totalScore(assignments: AssignmentResult[]): number {
        return assignments
            .filter(a => a.score !== null)
            .reduce((sum, a) => sum + (a.score ?? 0), 0);
    }
}
