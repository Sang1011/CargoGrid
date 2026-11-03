import { CargoItemStatus, MovementType } from 'src/common/enums';

export interface CargoSnapshot {
    status: CargoItemStatus;
    currentSlotId: string | null;
    currentWarehouseId: string | null;
}

export interface Load {
    weightKg: number;
    volumeM3: number;
}

export interface SlotLoad extends Load {
    slotId: string;
    warehouseId: string;
}

/** Cargo status a movement type requires before it may be requested (BR-05). */
const REQUIRED_CARGO_STATUS: Record<MovementType, CargoItemStatus> = {
    [MovementType.WAREHOUSE_TRANSFER]: CargoItemStatus.STORED,
    [MovementType.INTERNAL_TRANSFER]: CargoItemStatus.STORED,
    [MovementType.PORT_EXIT]: CargoItemStatus.STORED,
    [MovementType.PORT_ENTRY]: CargoItemStatus.IN_TRANSIT_INBOUND,
};

const NEEDS_SOURCE = new Set([MovementType.WAREHOUSE_TRANSFER, MovementType.INTERNAL_TRANSFER, MovementType.PORT_EXIT]);
const NEEDS_DESTINATION = new Set([MovementType.WAREHOUSE_TRANSFER, MovementType.INTERNAL_TRANSFER, MovementType.PORT_ENTRY]);

export const needsSource = (type: MovementType): boolean => NEEDS_SOURCE.has(type);
export const needsDestination = (type: MovementType): boolean => NEEDS_DESTINATION.has(type);

/** Returns why this cargo cannot be moved this way, or null when it can. */
export function checkCargoEligibility(type: MovementType, cargo: CargoSnapshot): string | null {
    const required = REQUIRED_CARGO_STATUS[type];
    if (cargo.status !== required) {
        return `Cargo is '${cargo.status}'; a ${type} needs it to be '${required}'`;
    }
    if (needsSource(type) && !cargo.currentSlotId) {
        return 'Cargo has no current slot to move from';
    }
    return null;
}

/** Returns why the from/to combination is wrong for this movement type, or null when it is fine. */
export function checkRoute(
    type: MovementType,
    source: { slotId: string; warehouseId: string } | null,
    destination: { slotId: string; warehouseId: string } | null,
): string | null {
    if (needsDestination(type) && !destination) return `A ${type} needs a destination slot`;
    if (!needsDestination(type) && destination) return `A ${type} must not have a destination slot`;

    if (source && destination) {
        if (source.slotId === destination.slotId) return 'Source and destination are the same slot';
        if (type === MovementType.INTERNAL_TRANSFER && source.warehouseId !== destination.warehouseId) {
            return 'An internal transfer must stay inside one warehouse';
        }
        if (type === MovementType.WAREHOUSE_TRANSFER && source.warehouseId === destination.warehouseId) {
            return 'A warehouse transfer must change warehouse; use an internal transfer instead';
        }
    }
    return null;
}

// ─── Capacity ─────────────────────────────────────────────────────────────────

// Weights are stored with 3 decimals and volumes with 4; compare on a shared 1e-4 grid so that
// 0.1 + 0.2 style float noise never decides whether something fits.
const grid = (n: number): number => Math.round(n * 10_000);

export function remainingCapacity(
    slot: { maxWeightKg: number; currentWeightKg: number; maxVolumeM3: number; currentVolumeM3: number },
    reserved: Load,
): Load {
    return {
        weightKg: (grid(slot.maxWeightKg) - grid(slot.currentWeightKg) - grid(reserved.weightKg)) / 10_000,
        volumeM3: (grid(slot.maxVolumeM3) - grid(slot.currentVolumeM3) - grid(reserved.volumeM3)) / 10_000,
    };
}

export function fits(remaining: Load, need: Load): boolean {
    return grid(need.weightKg) <= grid(remaining.weightKg) && grid(need.volumeM3) <= grid(remaining.volumeM3);
}

// ─── What each step changes ──────────────────────────────────────────────────

export interface LoadDelta {
    id: string;
    weightKg: number;
    volumeM3: number;
}

export interface CompletionEffects {
    cargoStatus: CargoItemStatus;
    cargoSlotId: string | null;
    cargoWarehouseId: string | null;
    slotDeltas: LoadDelta[];
    warehouseDeltas: LoadDelta[];
}

/**
 * The bookkeeping a completed movement performs, as data. The service applies it in one
 * transaction; keeping it pure lets the totals be tested without a database.
 */
export function completionEffects(
    type: MovementType,
    load: Load,
    source: { slotId: string; warehouseId: string } | null,
    destination: { slotId: string; warehouseId: string } | null,
): CompletionEffects {
    const slotDeltas: LoadDelta[] = [];
    const warehouseDeltas: LoadDelta[] = [];

    if (source) {
        slotDeltas.push({ id: source.slotId, weightKg: -load.weightKg, volumeM3: -load.volumeM3 });
    }
    if (destination) {
        slotDeltas.push({ id: destination.slotId, weightKg: load.weightKg, volumeM3: load.volumeM3 });
    }

    // A warehouse's total only changes when cargo enters or leaves it.
    if (source && source.warehouseId !== destination?.warehouseId) {
        warehouseDeltas.push({ id: source.warehouseId, weightKg: -load.weightKg, volumeM3: -load.volumeM3 });
    }
    if (destination && destination.warehouseId !== source?.warehouseId) {
        warehouseDeltas.push({ id: destination.warehouseId, weightKg: load.weightKg, volumeM3: load.volumeM3 });
    }

    if (type === MovementType.PORT_EXIT) {
        return { cargoStatus: CargoItemStatus.DELIVERED, cargoSlotId: null, cargoWarehouseId: null, slotDeltas, warehouseDeltas };
    }
    return {
        cargoStatus: CargoItemStatus.STORED,
        cargoSlotId: destination!.slotId,
        cargoWarehouseId: destination!.warehouseId,
        slotDeltas,
        warehouseDeltas,
    };
}

/** Cargo status while a movement of this type is on the road. */
export function inTransitCargoStatus(type: MovementType): CargoItemStatus {
    switch (type) {
        case MovementType.PORT_EXIT:
            return CargoItemStatus.IN_TRANSIT_OUTBOUND;
        case MovementType.PORT_ENTRY:
            return CargoItemStatus.IN_TRANSIT_INBOUND;
        default:
            return CargoItemStatus.IN_TRANSIT_TRANSFER;
    }
}

/** Cargo status to restore when a started movement is cancelled. */
export function statusAfterCancel(type: MovementType): CargoItemStatus {
    return type === MovementType.PORT_ENTRY ? CargoItemStatus.IN_TRANSIT_INBOUND : CargoItemStatus.STORED;
}
