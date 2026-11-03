import { ZoneType, VehicleType, PriorityLevel } from 'src/common/enums';

/** One planned trip from the lot's entry point to a slot. */
export interface RouteInfo {
    /** Congestion-weighted cost, including the walk inside the warehouse. */
    costM: number;
    distanceM: number;
    /** Node ids along the yard graph (empty when the route is only the in-warehouse leg). */
    path: string[];
    warnings: string[];
}

/**
 * Routes for one vehicle type, by slot id. A slot that is missing, or mapped to null, cannot be
 * reached by that vehicle and is a hard violation (BR-10).
 */
export interface RouteTable {
    bySlot: ReadonlyMap<string, RouteInfo | null>;
    /** Largest reachable cost; normalises the movement-cost score to 0..1. */
    scale: number;
}

export interface ProductCandidate {
    /** The unit being allocated: a cargo item in a real lot, a product in legacy whole-catalogue runs. */
    id: string;
    /** The Product row, when `id` is a cargo item. */
    productId?: string;
    cargoItemId?: string;
    routes?: RouteTable;
    weightKg: number;
    volumeM3: number;
    requiredZone: ZoneType | null;
    requiredTempMin: number | null;
    requiredTempMax: number | null;
    demandFrequency: number;
    priority: PriorityLevel;
    vehicleType: VehicleType;
    /** Lower is placed first, ahead of priority and demand. Set by an evacuation to put cold cargo first. */
    rank?: number;
}

export interface SlotCandidate {
    id: string;
    warehouseId: string;
    zoneType: ZoneType;
    tempMin: number | null;
    tempMax: number | null;
    maxWeightKg: number;
    currentWeightKg: number;
    maxVolumeM3: number;
    currentVolumeM3: number;
    distanceFromEntryM: number;
    isBlocked: boolean;
    allowedVehicleTypes: VehicleType[];
}

export interface CandidateScore {
    capacityFitScore: number;
    movementCostScore: number;
    categoryMatchScore: number;
    vehicleAccessScore: number;
    demandPriorityScore: number;
    congestionScore: number;
    finalScore: number;
}

export interface ScoredSlotCandidate {
    slot: SlotCandidate;
    score: CandidateScore;
}

export interface AssignmentCandidate {
    productId: string;
    slotId: string | null;
    warehouseId: string | null;
    score: CandidateScore | null;
    reasons: string[];
}
