import { ZoneType, VehicleType, PriorityLevel } from 'src/common/enums';

export interface ProductCandidate {
    id: string;
    weightKg: number;
    volumeM3: number;
    requiredZone: ZoneType | null;
    requiredTempMin: number | null;
    requiredTempMax: number | null;
    demandFrequency: number;
    priority: PriorityLevel;
    vehicleType: VehicleType;
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
