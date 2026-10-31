import { Injectable } from '@nestjs/common';
import { IOptimizationAlgorithm } from './algorithm.interface';
import { OptimizationContext, OptimizationResult, AssignmentResult } from '../domain/types/optimization-context.type';
import { AlgorithmType } from 'src/common/enums';
import { ScoringService } from '../scoring/scoring.service';

@Injectable()
export class RandomAlgorithm implements IOptimizationAlgorithm {
    readonly type = AlgorithmType.RANDOM;

    constructor(private readonly scoringService: ScoringService) {}

    async run(context: OptimizationContext): Promise<OptimizationResult> {
        const startTime = Date.now();
        const assignments: AssignmentResult[] = [];
        let hardViolations = 0;
        let totalMovementCost = 0;

        for (const product of context.products) {
            const validSlots = context.slots.filter(slot => {
                const { violated } = this.scoringService.isHardViolation(product, slot);
                return !violated;
            });

            if (validSlots.length === 0) {
                hardViolations++;
                assignments.push({
                    productId: product.id,
                    slotId: null,
                    warehouseId: null,
                    score: null,
                    capacityFitScore: null,
                    movementCostScore: null,
                    categoryMatchScore: null,
                    vehicleAccessScore: null,
                    demandPriorityScore: null,
                    congestionScore: null,
                    reasons: ['No valid slot available'],
                    rejectedCandidates: [],
                });
                continue;
            }

            const randomIndex = Math.floor(Math.random() * validSlots.length);
            const chosenSlot = validSlots[randomIndex];

            const score = this.scoringService.scoreCandidate(product, chosenSlot, context.weights);
            totalMovementCost += chosenSlot.distanceFromEntryM;

            assignments.push({
                productId: product.id,
                slotId: chosenSlot.id,
                warehouseId: chosenSlot.warehouseId,
                score: score.finalScore,
                capacityFitScore: score.capacityFitScore,
                movementCostScore: score.movementCostScore,
                categoryMatchScore: score.categoryMatchScore,
                vehicleAccessScore: score.vehicleAccessScore,
                demandPriorityScore: score.demandPriorityScore,
                congestionScore: score.congestionScore,
                reasons: this.scoringService.explainSelection(product, chosenSlot),
                rejectedCandidates: [],
            });
        }

        const assigned = assignments.filter(a => a.slotId !== null);
        const totalScore = assigned.reduce((sum, a) => sum + (a.score ?? 0), 0);

        const spaceUtilization = context.slots.length > 0
            ? assigned.length / context.slots.length
            : 0;

        return {
            assignments,
            metrics: {
                productsTotal: context.products.length,
                productsAssigned: assigned.length,
                productsUnassigned: context.products.length - assigned.length,
                hardViolations,
                totalMovementCost,
                avgRetrievalCost: assigned.length > 0 ? totalMovementCost / assigned.length : 0,
                spaceUtilization,
                congestionScore: 0,
                runtimeMs: Date.now() - startTime,
                optimizationScore: assigned.length > 0 ? totalScore / assigned.length : 0,
            },
        };
    }
}
