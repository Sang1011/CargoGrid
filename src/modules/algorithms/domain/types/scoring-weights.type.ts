export interface ScoringWeights {
    capacityFit: number;
    movementCost: number;
    categoryMatch: number;
    vehicleAccess: number;
    demandPriority: number;
    congestion: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
    capacityFit: 0.25,
    movementCost: 0.20,
    categoryMatch: 0.20,
    vehicleAccess: 0.15,
    demandPriority: 0.10,
    congestion: 0.10,
};
