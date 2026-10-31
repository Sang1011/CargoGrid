import { PriorityLevel, VehicleType, ZoneType } from 'src/common/enums';
import { ProductCandidate, SlotCandidate } from './domain/types/candidate.type';
import { DEFAULT_SCORING_WEIGHTS } from './domain/types/scoring-weights.type';
import { OptimizationContext } from './domain/types/optimization-context.type';
import { OptimizationContextType } from 'src/common/enums';

/** Shared builders for algorithm unit tests. */
export const makeProduct = (over: Partial<ProductCandidate> = {}): ProductCandidate => ({
    id: 'p1',
    weightKg: 10,
    volumeM3: 1,
    requiredZone: null,
    requiredTempMin: null,
    requiredTempMax: null,
    demandFrequency: 50,
    priority: PriorityLevel.MEDIUM,
    vehicleType: VehicleType.FORKLIFT,
    ...over,
});

export const makeSlot = (over: Partial<SlotCandidate> = {}): SlotCandidate => ({
    id: 's1',
    warehouseId: 'w1',
    zoneType: ZoneType.NORMAL,
    tempMin: null,
    tempMax: null,
    maxWeightKg: 1000,
    currentWeightKg: 0,
    maxVolumeM3: 10,
    currentVolumeM3: 0,
    distanceFromEntryM: 20,
    isBlocked: false,
    allowedVehicleTypes: [VehicleType.FORKLIFT],
    ...over,
});

export const makeContext = (
    products: ProductCandidate[],
    slots: SlotCandidate[],
): OptimizationContext => ({
    scenarioId: 'sc1',
    contextType: OptimizationContextType.BENCHMARK,
    products,
    slots: slots.map(s => ({ ...s })),
    weights: DEFAULT_SCORING_WEIGHTS,
    maxDistanceM: 100,
});
