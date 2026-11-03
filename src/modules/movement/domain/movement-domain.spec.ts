import { CargoItemStatus, MovementStatus, MovementType } from 'src/common/enums';
import {
    InvalidMovementTransitionError,
    MOVEMENT_TRANSITIONS,
    assertTransition,
    canTransition,
    isOpen,
} from './movement-state-machine';
import {
    checkCargoEligibility,
    checkRoute,
    completionEffects,
    fits,
    inTransitCargoStatus,
    remainingCapacity,
    statusAfterCancel,
} from './movement-rules';

const ALL = Object.values(MovementStatus);

describe('movement state machine', () => {
    const legal: [MovementStatus, MovementStatus][] = [
        [MovementStatus.CREATED, MovementStatus.RESERVED],
        [MovementStatus.CREATED, MovementStatus.CANCELLED],
        [MovementStatus.RESERVED, MovementStatus.IN_TRANSIT],
        [MovementStatus.RESERVED, MovementStatus.CANCELLED],
        [MovementStatus.IN_TRANSIT, MovementStatus.COMPLETED],
        [MovementStatus.IN_TRANSIT, MovementStatus.CANCELLED],
    ];

    it.each(legal)('allows %s -> %s', (from, to) => {
        expect(canTransition(from, to)).toBe(true);
        expect(() => assertTransition(from, to)).not.toThrow();
    });

    // Every other pair in the 5x5 grid, including staying put.
    const illegal = ALL.flatMap(from => ALL.map(to => [from, to] as const)).filter(
        ([from, to]) => !legal.some(([f, t]) => f === from && t === to),
    );

    it('covers the whole grid', () => {
        expect(legal.length + illegal.length).toBe(ALL.length * ALL.length);
        expect(illegal).toHaveLength(19);
    });

    it.each(illegal)('rejects %s -> %s', (from, to) => {
        expect(canTransition(from, to)).toBe(false);
        expect(() => assertTransition(from, to)).toThrow(InvalidMovementTransitionError);
    });

    it('treats completed and cancelled as final', () => {
        expect(MOVEMENT_TRANSITIONS[MovementStatus.COMPLETED]).toEqual([]);
        expect(MOVEMENT_TRANSITIONS[MovementStatus.CANCELLED]).toEqual([]);
        expect(isOpen(MovementStatus.COMPLETED)).toBe(false);
        expect(isOpen(MovementStatus.CANCELLED)).toBe(false);
        expect(isOpen(MovementStatus.RESERVED)).toBe(true);
    });

    it('says which transition was refused', () => {
        expect(() => assertTransition(MovementStatus.COMPLETED, MovementStatus.CANCELLED)).toThrow(
            "Movement cannot go from 'completed' to 'cancelled'",
        );
    });
});

describe('cargo eligibility (BR-05)', () => {
    const cargo = (status: CargoItemStatus, slot: string | null = 's1') => ({ status, currentSlotId: slot, currentWarehouseId: slot ? 'w1' : null });

    it('lets stored cargo be transferred or exit', () => {
        for (const type of [MovementType.WAREHOUSE_TRANSFER, MovementType.INTERNAL_TRANSFER, MovementType.PORT_EXIT]) {
            expect(checkCargoEligibility(type, cargo(CargoItemStatus.STORED))).toBeNull();
        }
    });

    it('lets inbound cargo enter the port', () => {
        expect(checkCargoEligibility(MovementType.PORT_ENTRY, cargo(CargoItemStatus.IN_TRANSIT_INBOUND, null))).toBeNull();
    });

    it.each([CargoItemStatus.IN_TRANSIT_TRANSFER, CargoItemStatus.IN_TRANSIT_OUTBOUND, CargoItemStatus.DELIVERED, CargoItemStatus.LOST, CargoItemStatus.DAMAGED])(
        'refuses to move %s cargo',
        status => {
            expect(checkCargoEligibility(MovementType.WAREHOUSE_TRANSFER, cargo(status))).toMatch(/needs it to be 'stored'/);
        },
    );

    it('refuses to enter the port when already stored', () => {
        expect(checkCargoEligibility(MovementType.PORT_ENTRY, cargo(CargoItemStatus.STORED))).toMatch(/in_transit_inbound/);
    });

    it('refuses to move stored cargo that has no slot', () => {
        expect(checkCargoEligibility(MovementType.INTERNAL_TRANSFER, cargo(CargoItemStatus.STORED, null))).toMatch(/no current slot/);
    });
});

describe('route rules', () => {
    const a = { slotId: 'a', warehouseId: 'w1' };
    const b = { slotId: 'b', warehouseId: 'w1' };
    const c = { slotId: 'c', warehouseId: 'w2' };

    it('accepts well-formed routes', () => {
        expect(checkRoute(MovementType.INTERNAL_TRANSFER, a, b)).toBeNull();
        expect(checkRoute(MovementType.WAREHOUSE_TRANSFER, a, c)).toBeNull();
        expect(checkRoute(MovementType.PORT_ENTRY, null, a)).toBeNull();
        expect(checkRoute(MovementType.PORT_EXIT, a, null)).toBeNull();
    });

    it('rejects wrong shapes', () => {
        expect(checkRoute(MovementType.PORT_ENTRY, null, null)).toMatch(/needs a destination/);
        expect(checkRoute(MovementType.PORT_EXIT, a, b)).toMatch(/must not have a destination/);
        expect(checkRoute(MovementType.INTERNAL_TRANSFER, a, a)).toMatch(/same slot/);
        expect(checkRoute(MovementType.INTERNAL_TRANSFER, a, c)).toMatch(/inside one warehouse/);
        expect(checkRoute(MovementType.WAREHOUSE_TRANSFER, a, b)).toMatch(/must change warehouse/);
    });
});

describe('capacity', () => {
    const slot = { maxWeightKg: 100, currentWeightKg: 40, maxVolumeM3: 10, currentVolumeM3: 4 };

    it('subtracts load and reservations', () => {
        expect(remainingCapacity(slot, { weightKg: 10, volumeM3: 1 })).toEqual({ weightKg: 50, volumeM3: 5 });
    });

    it('accepts an exact fit and rejects one gram over', () => {
        const left = remainingCapacity(slot, { weightKg: 0, volumeM3: 0 });
        expect(fits(left, { weightKg: 60, volumeM3: 6 })).toBe(true);
        expect(fits(left, { weightKg: 60.001, volumeM3: 6 })).toBe(false);
        expect(fits(left, { weightKg: 60, volumeM3: 6.0001 })).toBe(false);
    });

    it('is not fooled by floating point noise', () => {
        const left = remainingCapacity({ maxWeightKg: 0.3, currentWeightKg: 0.1, maxVolumeM3: 1, currentVolumeM3: 0 }, { weightKg: 0, volumeM3: 0 });
        expect(fits(left, { weightKg: 0.2, volumeM3: 0 })).toBe(true); // 0.3 - 0.1 = 0.19999999999999998 in raw floats
    });
});

describe('completionEffects', () => {
    const load = { weightKg: 25, volumeM3: 2 };
    const src = { slotId: 's1', warehouseId: 'w1' };

    it('moves load between slots of the same warehouse without touching the warehouse total', () => {
        const fx = completionEffects(MovementType.INTERNAL_TRANSFER, load, src, { slotId: 's2', warehouseId: 'w1' });
        expect(fx.slotDeltas).toEqual([
            { id: 's1', weightKg: -25, volumeM3: -2 },
            { id: 's2', weightKg: 25, volumeM3: 2 },
        ]);
        expect(fx.warehouseDeltas).toEqual([]);
        expect(fx).toMatchObject({ cargoStatus: CargoItemStatus.STORED, cargoSlotId: 's2', cargoWarehouseId: 'w1' });
    });

    it('moves the warehouse total with a warehouse transfer', () => {
        const fx = completionEffects(MovementType.WAREHOUSE_TRANSFER, load, src, { slotId: 's9', warehouseId: 'w2' });
        expect(fx.warehouseDeltas).toEqual([
            { id: 'w1', weightKg: -25, volumeM3: -2 },
            { id: 'w2', weightKg: 25, volumeM3: 2 },
        ]);
    });

    it('adds load on port entry and removes it on port exit', () => {
        const entry = completionEffects(MovementType.PORT_ENTRY, load, null, src);
        expect(entry.slotDeltas).toEqual([{ id: 's1', weightKg: 25, volumeM3: 2 }]);
        expect(entry.warehouseDeltas).toEqual([{ id: 'w1', weightKg: 25, volumeM3: 2 }]);

        const exit = completionEffects(MovementType.PORT_EXIT, load, src, null);
        expect(exit.slotDeltas).toEqual([{ id: 's1', weightKg: -25, volumeM3: -2 }]);
        expect(exit.warehouseDeltas).toEqual([{ id: 'w1', weightKg: -25, volumeM3: -2 }]);
        expect(exit).toMatchObject({ cargoStatus: CargoItemStatus.DELIVERED, cargoSlotId: null, cargoWarehouseId: null });
    });

    it('never creates or destroys load on a transfer', () => {
        const fx = completionEffects(MovementType.WAREHOUSE_TRANSFER, load, src, { slotId: 's9', warehouseId: 'w2' });
        expect(fx.slotDeltas.reduce((s, d) => s + d.weightKg, 0)).toBe(0);
        expect(fx.warehouseDeltas.reduce((s, d) => s + d.weightKg, 0)).toBe(0);
    });
});

describe('transit status', () => {
    it('maps each type to its on-the-road status and back', () => {
        expect(inTransitCargoStatus(MovementType.WAREHOUSE_TRANSFER)).toBe(CargoItemStatus.IN_TRANSIT_TRANSFER);
        expect(inTransitCargoStatus(MovementType.PORT_EXIT)).toBe(CargoItemStatus.IN_TRANSIT_OUTBOUND);
        expect(inTransitCargoStatus(MovementType.PORT_ENTRY)).toBe(CargoItemStatus.IN_TRANSIT_INBOUND);
        expect(statusAfterCancel(MovementType.PORT_ENTRY)).toBe(CargoItemStatus.IN_TRANSIT_INBOUND);
        expect(statusAfterCancel(MovementType.PORT_EXIT)).toBe(CargoItemStatus.STORED);
    });
});
