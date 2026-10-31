import { Injectable } from '@nestjs/common';
import { IOptimizationAlgorithm } from './algorithm.interface';
import { OptimizationContext, OptimizationResult, AssignmentResult } from '../domain/types/optimization-context.type';
import { AlgorithmType } from 'src/common/enums';
import { ScoringService } from '../scoring/scoring.service';
import { GreedyAlgorithm } from './greedy.algorithm';

@Injectable()
export class GreedyLocalSearchAlgorithm implements IOptimizationAlgorithm {
    readonly type = AlgorithmType.GREEDY_LOCAL_SEARCH;

    private readonly MAX_ITERATIONS = 100;
    private readonly NO_IMPROVEMENT_LIMIT = 20;

    constructor(private readonly scoringService: ScoringService) {}

    async run(context: OptimizationContext): Promise<OptimizationResult> {
        const startTime = Date.now();
        const greedy = new GreedyAlgorithm(this.scoringService);
        const baseline = await greedy.run(context);

        let bestAssignments = [...baseline.assignments];
        let bestScore = this.totalScore(bestAssignments);
        let noImprovement = 0;

        for (let iter = 0; iter < this.MAX_ITERATIONS; iter++) {
            const currentAssignments = [...bestAssignments];
            const assigned = currentAssignments.filter(a => a.slotId !== null);

            if (assigned.length < 2) break;

            const idx1 = Math.floor(Math.random() * assigned.length);
            let idx2 = Math.floor(Math.random() * assigned.length);
            while (idx2 === idx1) {
                idx2 = Math.floor(Math.random() * assigned.length);
            }

            const a1 = assigned[idx1];
            const a2 = assigned[idx2];

            const product1 = context.products.find(p => p.id === a1.productId);
            const product2 = context.products.find(p => p.id === a2.productId);
            if (!product1 || !product2) continue;

            const slot1 = context.slots.find(s => s.id === a1.slotId);
            const slot2 = context.slots.find(s => s.id === a2.slotId);
            if (!slot1 || !slot2) continue;

            const swapValid1 = !this.scoringService.isHardViolation(product1, slot2).violated;
            const swapValid2 = !this.scoringService.isHardViolation(product2, slot1).violated;

            if (!swapValid1 || !swapValid2) continue;

            const newScore1 = this.scoringService.scoreCandidate(product1, slot2, context.weights);
            const newScore2 = this.scoringService.scoreCandidate(product2, slot1, context.weights);
            const oldScore1 = this.scoringService.scoreCandidate(product1, slot1, context.weights);
            const oldScore2 = this.scoringService.scoreCandidate(product2, slot2, context.weights);

            const delta = (newScore1.finalScore + newScore2.finalScore) - (oldScore1.finalScore + oldScore2.finalScore);

            if (delta > 0) {
                const globalA1 = currentAssignments.findIndex(a => a.productId === a1.productId);
                const globalA2 = currentAssignments.findIndex(a => a.productId === a2.productId);

                if (globalA1 !== -1) {
                    currentAssignments[globalA1] = {
                        ...currentAssignments[globalA1],
                        slotId: slot2.id,
                        warehouseId: slot2.warehouseId,
                        score: newScore1.finalScore,
                        capacityFitScore: newScore1.capacityFitScore,
                        movementCostScore: newScore1.movementCostScore,
                        categoryMatchScore: newScore1.categoryMatchScore,
                        vehicleAccessScore: newScore1.vehicleAccessScore,
                        demandPriorityScore: newScore1.demandPriorityScore,
                        congestionScore: newScore1.congestionScore,
                        reasons: this.scoringService.explainSelection(product1, slot2),
                    };
                }
                if (globalA2 !== -1) {
                    currentAssignments[globalA2] = {
                        ...currentAssignments[globalA2],
                        slotId: slot1.id,
                        warehouseId: slot1.warehouseId,
                        score: newScore2.finalScore,
                        capacityFitScore: newScore2.capacityFitScore,
                        movementCostScore: newScore2.movementCostScore,
                        categoryMatchScore: newScore2.categoryMatchScore,
                        vehicleAccessScore: newScore2.vehicleAccessScore,
                        demandPriorityScore: newScore2.demandPriorityScore,
                        congestionScore: newScore2.congestionScore,
                        reasons: this.scoringService.explainSelection(product2, slot1),
                    };
                }

                const newTotal = this.totalScore(currentAssignments);
                if (newTotal > bestScore) {
                    bestScore = newTotal;
                    bestAssignments = currentAssignments;
                    noImprovement = 0;
                }
            } else {
                noImprovement++;
            }

            if (noImprovement >= this.NO_IMPROVEMENT_LIMIT) break;
        }

        const now = Date.now();
        const assigned = bestAssignments.filter(a => a.slotId !== null);
        const totalMovementCost = assigned.reduce((sum, a) => {
            const slot = context.slots.find(s => s.id === a.slotId);
            return sum + (slot ? slot.distanceFromEntryM : 0);
        }, 0);

        return {
            assignments: bestAssignments,
            metrics: {
                productsTotal: context.products.length,
                productsAssigned: assigned.length,
                productsUnassigned: context.products.length - assigned.length,
                hardViolations: baseline.metrics.hardViolations,
                totalMovementCost,
                avgRetrievalCost: assigned.length > 0 ? totalMovementCost / assigned.length : 0,
                spaceUtilization: context.slots.length > 0 ? assigned.length / context.slots.length : 0,
                congestionScore: 0,
                runtimeMs: now - startTime,
                optimizationScore: assigned.length > 0 ? bestScore / assigned.length : 0,
            },
        };
    }

    private totalScore(assignments: AssignmentResult[]): number {
        return assignments
            .filter(a => a.score !== null)
            .reduce((sum, a) => sum + (a.score ?? 0), 0);
    }
}
