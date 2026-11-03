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
    /** Makes Random / Local Search / Annealing reproducible; benchmarks always set it. */
    seed?: number;
    /** Human-readable facts about how the context was built (route fallback, excluded slots...). */
    notes?: string[];
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
    routeCost: number | null;
    routeDistanceM: number | null;
    routePath: string[] | null;
    routeWarnings: string[];
}

/** A slot that was not chosen, and exactly why. */
export interface RejectedCandidateInfo {
    slotId: string;
    warehouseId: string;
    /** null when the slot breaks a hard constraint and was never scored. */
    score: number | null;
    /** false = breaks a hard constraint; true = allowed, but another slot scored better. */
    feasible: boolean;
    reasons: string[];
}

export interface OptimizationMetrics {
    productsTotal: number;
    productsAssigned: number;
    productsUnassigned: number;
    /** Placements that break a hard constraint, counted by an independent check of the final plan. */
    hardViolations: number;
    totalMovementCost: number;
    avgRetrievalCost: number;
    spaceUtilization: number;
    congestionScore: number;
    runtimeMs: number;
    optimizationScore: number;
}
