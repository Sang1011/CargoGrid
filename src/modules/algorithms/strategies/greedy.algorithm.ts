import { Injectable } from '@nestjs/common';
import { IOptimizationAlgorithm } from './algorithm.interface';
import {
    OptimizationContext,
    OptimizationResult,
    AssignmentResult,
    RejectedCandidateInfo,
} from '../domain/types/optimization-context.type';
import { AlgorithmType, PriorityLevel } from 'src/common/enums';
import { ScoringService } from '../scoring/scoring.service';
import { SlotCandidate, CandidateScore } from '../domain/types/candidate.type';

@Injectable()
export class GreedyAlgorithm implements IOptimizationAlgorithm {
    readonly type = AlgorithmType.GREEDY;

    constructor(protected readonly scoringService: ScoringService) { }

    async run(context: OptimizationContext): Promise<OptimizationResult> {
        const startTime = Date.now();

        const slotStates = context.slots.map(s => ({
            ...s,
            currentWeightKg: s.currentWeightKg,
            currentVolumeM3: s.currentVolumeM3,
        }));

        const sortedProducts = [...context.products].sort((a, b) => {
            const priorityOrder: Record<PriorityLevel, number> = {
                [PriorityLevel.URGENT]: 4,
                [PriorityLevel.HIGH]: 3,
                [PriorityLevel.MEDIUM]: 2,
                [PriorityLevel.LOW]: 1,
            };
            const pDiff = (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0);
            if (pDiff !== 0) return pDiff;
            return b.demandFrequency - a.demandFrequency;
        });

        const assignments: AssignmentResult[] = [];
        let hardViolations = 0;
        let totalMovementCost = 0;

        for (const product of sortedProducts) {
            const candidateSlots: { slot: SlotCandidate; score: CandidateScore; reasons: string[] }[] = [];

            for (const slot of slotStates) {
                const { violated, reasons } = this.scoringService.isHardViolation(product, slot);
                if (violated) {
                    if (reasons.some(r => r.includes('exceeds remaining slot capacity'))) {
                        continue;
                    }
                    continue;
                }

                const score = this.scoringService.scoreCandidate(product, slot, context.weights);
                candidateSlots.push({ slot, score, reasons: [] });
            }

            candidateSlots.sort((a, b) => b.score.finalScore - a.score.finalScore);

            const rejectedCandidates: RejectedCandidateInfo[] = [];
            if (candidateSlots.length > 0) {
                const best = candidateSlots[0];
                for (let i = 1; i < Math.min(4, candidateSlots.length); i++) {
                    rejectedCandidates.push({
                        slotId: candidateSlots[i].slot.id,
                        score: candidateSlots[i].score.finalScore,
                        reasons: ['Lower score than best candidate'],
                    });
                }

                const chosenSlot = best.slot;
                const reasons = this.scoringService.explainSelection(product, chosenSlot);
                chosenSlot.currentWeightKg += product.weightKg;
                chosenSlot.currentVolumeM3 += product.volumeM3;
                totalMovementCost += chosenSlot.distanceFromEntryM;

                assignments.push({
                    productId: product.id,
                    slotId: chosenSlot.id,
                    warehouseId: chosenSlot.warehouseId,
                    score: best.score.finalScore,
                    capacityFitScore: best.score.capacityFitScore,
                    movementCostScore: best.score.movementCostScore,
                    categoryMatchScore: best.score.categoryMatchScore,
                    vehicleAccessScore: best.score.vehicleAccessScore,
                    demandPriorityScore: best.score.demandPriorityScore,
                    congestionScore: best.score.congestionScore,
                    reasons,
                    rejectedCandidates,
                });
            } else {
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
            }
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
