import { Injectable } from '@nestjs/common';
import { ProductCandidate, SlotCandidate, CandidateScore } from '../domain/types/candidate.type';
import { ScoringWeights } from '../domain/types/scoring-weights.type';
import { PriorityLevel } from 'src/common/enums';

@Injectable()
export class ScoringService {

    scoreCandidate(
        product: ProductCandidate,
        slot: SlotCandidate,
        weights: ScoringWeights,
    ): CandidateScore {
        const capacityFitScore = this.calculateCapacityFitScore(product, slot);
        const movementCostScore = this.calculateMovementCostScore(slot);
        const categoryMatchScore = this.calculateCategoryMatchScore(product, slot);
        const vehicleAccessScore = this.calculateVehicleAccessScore(product, slot);
        const demandPriorityScore = this.calculateDemandPriorityScore(product);
        const congestionScore = this.calculateCongestionScore(slot);

        const finalScore =
            capacityFitScore * weights.capacityFit +
            movementCostScore * weights.movementCost +
            categoryMatchScore * weights.categoryMatch +
            vehicleAccessScore * weights.vehicleAccess +
            demandPriorityScore * weights.demandPriority +
            congestionScore * weights.congestion;

        return {
            capacityFitScore,
            movementCostScore,
            categoryMatchScore,
            vehicleAccessScore,
            demandPriorityScore,
            congestionScore,
            finalScore: Math.round(finalScore * 100) / 100,
        };
    }

    isHardViolation(
        product: ProductCandidate,
        slot: SlotCandidate,
    ): { violated: boolean; reasons: string[] } {
        const reasons: string[] = [];

        if (slot.isBlocked) {
            reasons.push('Slot is blocked');
        }

        if (product.weightKg > (slot.maxWeightKg - slot.currentWeightKg)) {
            reasons.push('Product weight exceeds remaining slot capacity');
        }

        if (product.volumeM3 > (slot.maxVolumeM3 - slot.currentVolumeM3)) {
            reasons.push('Product volume exceeds remaining slot capacity');
        }

        if (product.requiredZone && product.requiredZone !== slot.zoneType) {
            reasons.push(`Required zone ${product.requiredZone} does not match slot zone ${slot.zoneType}`);
        }

        const productNeedsTemp = product.requiredTempMin !== null || product.requiredTempMax !== null;
        const slotHasTemp = slot.tempMin !== null || slot.tempMax !== null;
        if (productNeedsTemp && !slotHasTemp) {
            reasons.push('Product requires a controlled temperature but slot has no temperature range');
        }

        if (product.requiredTempMin !== null && slot.tempMin !== null && product.requiredTempMin < slot.tempMin) {
            reasons.push(`Required temp min ${product.requiredTempMin} exceeds slot temp min ${slot.tempMin}`);
        }

        if (product.requiredTempMax !== null && slot.tempMax !== null && product.requiredTempMax > slot.tempMax) {
            reasons.push(`Required temp max ${product.requiredTempMax} exceeds slot temp max ${slot.tempMax}`);
        }

        if (!slot.allowedVehicleTypes.includes(product.vehicleType)) {
            reasons.push(`Vehicle type ${product.vehicleType} not allowed in this slot`);
        }

        return { violated: reasons.length > 0, reasons };
    }

    /**
     * Human-readable reasons why `slot` is a valid choice for `product`.
     * Call only for a pair that already passed `isHardViolation`, and call it
     * before the slot's current load is mutated.
     */
    explainSelection(product: ProductCandidate, slot: SlotCandidate): string[] {
        const reasons: string[] = [];

        if (product.requiredZone) {
            reasons.push(`Required zone ${product.requiredZone} matched`);
        }

        const productNeedsTemp = product.requiredTempMin !== null || product.requiredTempMax !== null;
        if (productNeedsTemp) {
            reasons.push('Temperature requirement is within the slot temperature range');
        }

        reasons.push('Enough remaining weight and volume capacity');
        reasons.push(`Vehicle type ${product.vehicleType} is allowed in this slot`);
        reasons.push(`${slot.distanceFromEntryM.toFixed(1)} m from the entry point`);

        return reasons;
    }

    private calculateCapacityFitScore(product: ProductCandidate, slot: SlotCandidate): number {
        const remainingWeight = slot.maxWeightKg - slot.currentWeightKg;
        const remainingVolume = slot.maxVolumeM3 - slot.currentVolumeM3;

        const weightRatio = product.weightKg / remainingWeight;
        const volumeRatio = product.volumeM3 / remainingVolume;

        const fitRatio = Math.max(weightRatio, volumeRatio);
        return Math.max(0, 1 - fitRatio);
    }

    private calculateMovementCostScore(slot: SlotCandidate): number {
        const maxDistance = 100;
        return Math.max(0, 1 - (slot.distanceFromEntryM / maxDistance));
    }

    private calculateCategoryMatchScore(product: ProductCandidate, slot: SlotCandidate): number {
        let score = 1;

        if (product.requiredZone) {
            if (product.requiredZone === slot.zoneType) {
                score *= 1;
            } else {
                score *= 0.5;
            }
        }

        if (product.requiredTempMin !== null || product.requiredTempMax !== null) {
            if (slot.tempMin !== null && slot.tempMax !== null) {
                const tempOk =
                    (product.requiredTempMin === null || product.requiredTempMin >= slot.tempMin) &&
                    (product.requiredTempMax === null || product.requiredTempMax <= slot.tempMax);
                if (!tempOk) {
                    score *= 0.5;
                }
            } else {
                score *= 0.5;
            }
        }

        return score;
    }

    private calculateVehicleAccessScore(product: ProductCandidate, slot: SlotCandidate): number {
        return slot.allowedVehicleTypes.includes(product.vehicleType) ? 1 : 0;
    }

    private calculateDemandPriorityScore(product: ProductCandidate): number {
        const demandNorm = product.demandFrequency / 100;

        const priorityMultiplier: Record<PriorityLevel, number> = {
            [PriorityLevel.URGENT]: 1.2,
            [PriorityLevel.HIGH]: 1.1,
            [PriorityLevel.MEDIUM]: 1.0,
            [PriorityLevel.LOW]: 0.9,
        };

        const mult = priorityMultiplier[product.priority] ?? 1.0;
        return Math.min(1, demandNorm * mult);
    }

    private calculateCongestionScore(slot: SlotCandidate): number {
        const weightUtilization = slot.maxWeightKg > 0
            ? slot.currentWeightKg / slot.maxWeightKg
            : 0;

        const volumeUtilization = slot.maxVolumeM3 > 0
            ? slot.currentVolumeM3 / slot.maxVolumeM3
            : 0;

        const avgUtilization = (weightUtilization + volumeUtilization) / 2;
        return Math.max(0, 1 - avgUtilization);
    }
}
