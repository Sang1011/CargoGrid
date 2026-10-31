import { ProductCandidate, SlotCandidate } from './candidate.type';
import { ScoringWeights } from './scoring-weights.type';
import { OptimizationContextType } from 'src/common/enums';

export interface OptimizationContext {
    scenarioId: string;
    contextType: OptimizationContextType;
    contextId?: string;
    products: ProductCandidate[];
    slots: SlotCandidate[];
    weights: ScoringWeights;
    maxDistanceM: number;
}

export interface OptimizationResult {
    assignments: AssignmentResult[];
    metrics: OptimizationMetrics;
}

export interface AssignmentResult {
    productId: string;
    slotId: string | null;
    warehouseId: string | null;
    score: number | null;
    capacityFitScore: number | null;
    movementCostScore: number | null;
    categoryMatchScore: number | null;
    vehicleAccessScore: number | null;
    demandPriorityScore: number | null;
    congestionScore: number | null;
    reasons: string[];
    rejectedCandidates: RejectedCandidateInfo[];
}

export interface RejectedCandidateInfo {
    slotId: string;
    score: number;
    reasons: string[];
}

export interface OptimizationMetrics {
    productsTotal: number;
    productsAssigned: number;
    productsUnassigned: number;
    hardViolations: number;
    totalMovementCost: number;
    avgRetrievalCost: number;
    spaceUtilization: number;
    congestionScore: number;
    runtimeMs: number;
    optimizationScore: number;
}
