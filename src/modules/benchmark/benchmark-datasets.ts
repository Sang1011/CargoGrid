/**
 * Five reproducible benchmark datasets, built in memory from a seed (no database needed), so the
 * same input can be handed to every algorithm and the results compared like for like.
 */
import { OptimizationContextType, PriorityLevel, VehicleType, ZoneType } from 'src/common/enums';
import { ProductCandidate, RouteInfo, RouteTable, SlotCandidate } from 'src/modules/algorithms/domain/types/candidate.type';
import { OptimizationContext } from 'src/modules/algorithms/domain/types/optimization-context.type';
import { DEFAULT_SCORING_WEIGHTS } from 'src/modules/algorithms/domain/types/scoring-weights.type';
import { makeRng } from 'src/modules/algorithms/strategies/placement';
import { RouteEdge, RouteGraph } from 'src/modules/route/domain/route-graph';

export const DATASET_NAMES = ['small', 'cold-chain', 'heavy-cargo', 'congested-yard', 'mixed-priority'] as const;
export type DatasetName = (typeof DATASET_NAMES)[number];

export const DATASET_DESCRIPTIONS: Record<DatasetName, string> = {
    'small': '10 plain products, 2 warehouses: a sanity check where every algorithm should do well',
    'cold-chain': '36 products, a third needing frozen or chilled slots; cold capacity is scarce and temperature ranges overlap',
    'heavy-cargo': '24 products of 0.5-2.4 t, some only reachable by container truck; heavy slots fill up quickly',
    'congested-yard': '40 products on a road graph with a jammed shortcut, a one-way road and a warehouse closed to forklifts',
    'mixed-priority': '60 products with mixed zones, priorities and demand across 3 warehouses with tight normal capacity',
};

const FORKLIFT = VehicleType.FORKLIFT;
const TRUCK = VehicleType.CONTAINER_TRUCK;

type Rng = () => number;
const between = (r: Rng, lo: number, hi: number, step = 1) => Math.round((lo + r() * (hi - lo)) / step) * step;
const pickWeighted = <T>(r: Rng, items: [T, number][]): T => {
    const total = items.reduce((s, [, w]) => s + w, 0);
    let x = r() * total;
    for (const [v, w] of items) { if ((x -= w) <= 0) return v; }
    return items[items.length - 1][0];
};

interface SlotSpec {
    warehouse: string;
    count: number;
    zone: ZoneType;
    temp?: [number, number];
    maxWeightKg: number;
    maxVolumeM3: number;
    /** Distance of the first slot from the entry point; each next slot is 2 m further. */
    baseDistanceM: number;
    vehicles?: VehicleType[];
    /** Prefix that keeps slot ids unique and readable. */
    tag: string;
}

function makeSlots(specs: SlotSpec[]): SlotCandidate[] {
    const slots: SlotCandidate[] = [];
    for (const s of specs) {
        for (let i = 0; i < s.count; i++) {
            slots.push({
                id: `${s.warehouse}-${s.tag}${String(i + 1).padStart(2, '0')}`,
                warehouseId: s.warehouse,
                zoneType: s.zone,
                tempMin: s.temp?.[0] ?? null,
                tempMax: s.temp?.[1] ?? null,
                maxWeightKg: s.maxWeightKg,
                currentWeightKg: 0,
                maxVolumeM3: s.maxVolumeM3,
                currentVolumeM3: 0,
                distanceFromEntryM: s.baseDistanceM + i * 2,
                isBlocked: false,
                allowedVehicleTypes: s.vehicles ?? [FORKLIFT],
            });
        }
    }
    return slots;
}

function product(id: string, over: Partial<ProductCandidate>): ProductCandidate {
    return {
        id,
        weightKg: 50,
        volumeM3: 0.5,
        requiredZone: null,
        requiredTempMin: null,
        requiredTempMax: null,
        demandFrequency: 50,
        priority: PriorityLevel.MEDIUM,
        vehicleType: FORKLIFT,
        ...over,
    };
}

function context(name: DatasetName, seed: number, products: ProductCandidate[], slots: SlotCandidate[], notes: string[] = []): OptimizationContext {
    return {
        scenarioId: `benchmark-${name}`,
        contextType: OptimizationContextType.BENCHMARK,
        products,
        slots,
        weights: { ...DEFAULT_SCORING_WEIGHTS },
        maxDistanceM: 150,
        seed,
        notes,
    };
}

// ─── datasets ───────────────────────────────────────────────────────────────

function small(seed: number): OptimizationContext {
    const r = makeRng(seed);
    const products = Array.from({ length: 10 }, (_, i) =>
        product(`small-p${i + 1}`, { weightKg: between(r, 20, 120, 5), volumeM3: between(r, 0.2, 1.5, 0.1), demandFrequency: between(r, 10, 95, 5) }));
    const slots = makeSlots([
        { warehouse: 'w1', tag: 's', count: 6, zone: ZoneType.NORMAL, maxWeightKg: 500, maxVolumeM3: 5, baseDistanceM: 10 },
        { warehouse: 'w2', tag: 's', count: 6, zone: ZoneType.NORMAL, maxWeightKg: 500, maxVolumeM3: 5, baseDistanceM: 40 },
    ]);
    return context('small', seed, products, slots);
}

function coldChain(seed: number): OptimizationContext {
    const r = makeRng(seed);
    const products: ProductCandidate[] = [];
    for (let i = 0; i < 10; i++) {
        products.push(product(`frozen-${i + 1}`, {
            weightKg: between(r, 40, 100, 5), volumeM3: between(r, 0.3, 0.9, 0.1),
            requiredZone: ZoneType.COLD, requiredTempMin: -25, requiredTempMax: -15,
            priority: PriorityLevel.HIGH, demandFrequency: between(r, 40, 90, 5),
        }));
    }
    for (let i = 0; i < 14; i++) {
        products.push(product(`chilled-${i + 1}`, {
            weightKg: between(r, 30, 90, 5), volumeM3: between(r, 0.3, 0.8, 0.1),
            requiredZone: ZoneType.COLD, requiredTempMin: -5, requiredTempMax: 5,
            demandFrequency: between(r, 20, 90, 5),
        }));
    }
    for (let i = 0; i < 12; i++) {
        products.push(product(`ambient-${i + 1}`, { weightKg: between(r, 30, 120, 5), volumeM3: between(r, 0.3, 1.0, 0.1), demandFrequency: between(r, 10, 80, 5) }));
    }
    const slots: SlotCandidate[] = [];
    ['w1', 'w2', 'w3'].forEach((w, k) => {
        slots.push(...makeSlots([
            { warehouse: w, tag: 'f', count: 3, zone: ZoneType.COLD, temp: [-30, -10], maxWeightKg: 300, maxVolumeM3: 3, baseDistanceM: 15 + k * 25 },
            { warehouse: w, tag: 'c', count: 4, zone: ZoneType.COLD, temp: [-10, 8], maxWeightKg: 300, maxVolumeM3: 3, baseDistanceM: 25 + k * 25 },
            { warehouse: w, tag: 'n', count: 8, zone: ZoneType.NORMAL, maxWeightKg: 400, maxVolumeM3: 4, baseDistanceM: 10 + k * 25 },
        ]));
    });
    return context('cold-chain', seed, products, slots);
}

function heavyCargo(seed: number): OptimizationContext {
    const r = makeRng(seed);
    const products: ProductCandidate[] = [];
    for (let i = 0; i < 24; i++) {
        const heavy = i < 17;
        const weightKg = heavy ? between(r, 900, 2400, 50) : between(r, 80, 400, 10);
        products.push(product(`cargo-${i + 1}`, {
            weightKg,
            volumeM3: heavy ? between(r, 1.5, 6, 0.5) : between(r, 0.3, 1.5, 0.1),
            requiredZone: heavy ? ZoneType.HEAVY : null,
            vehicleType: weightKg > 1800 ? TRUCK : FORKLIFT,
            priority: weightKg > 2000 ? PriorityLevel.HIGH : PriorityLevel.MEDIUM,
            demandFrequency: between(r, 10, 80, 5),
        }));
    }
    const slots = makeSlots([
        { warehouse: 'w1', tag: 'h', count: 8, zone: ZoneType.HEAVY, maxWeightKg: 3000, maxVolumeM3: 12, baseDistanceM: 20, vehicles: [FORKLIFT, TRUCK] },
        { warehouse: 'w2', tag: 'h', count: 6, zone: ZoneType.HEAVY, maxWeightKg: 3000, maxVolumeM3: 12, baseDistanceM: 45, vehicles: [FORKLIFT] },
        { warehouse: 'w1', tag: 'n', count: 3, zone: ZoneType.NORMAL, maxWeightKg: 1000, maxVolumeM3: 8, baseDistanceM: 10, vehicles: [FORKLIFT, TRUCK] },
        { warehouse: 'w2', tag: 'n', count: 4, zone: ZoneType.NORMAL, maxWeightKg: 1000, maxVolumeM3: 8, baseDistanceM: 35, vehicles: [FORKLIFT] },
    ]);
    return context('heavy-cargo', seed, products, slots);
}

/**
 * Entry GATE; WH1 is closest on the map but its road is jammed; WH2/WH3 are reached by free roads;
 * WH4 sits behind a one-way road that only container trucks may use, so forklifts cannot reach it.
 */
function congestedYard(seed: number): OptimizationContext {
    const r = makeRng(seed);
    const edge = (id: string, from: string, to: string, distanceM: number, congestion: number, extra: Partial<RouteEdge> = {}): RouteEdge =>
        ({ id, fromNodeId: from, toNodeId: to, distanceM, oneWay: false, congestion, blocked: false, allowedVehicles: [], ...extra });
    const graph = new RouteGraph(
        ['GATE', 'J1', 'J2', 'WH1', 'WH2', 'WH3', 'WH4'].map(id => ({ id, code: id })),
        [
            edge('gate-wh1', 'GATE', 'WH1', 30, 0.95),
            edge('gate-j1', 'GATE', 'J1', 60, 0.1),
            edge('j1-wh2', 'J1', 'WH2', 40, 0.05),
            edge('j1-wh3', 'J1', 'WH3', 70, 0.2),
            edge('gate-j2', 'GATE', 'J2', 50, 0.3),
            edge('j2-wh3', 'J2', 'WH3', 30, 0.1),
            edge('j2-wh4', 'J2', 'WH4', 90, 0.0, { oneWay: true, allowedVehicles: [TRUCK] }),
        ],
    );

    const slots = makeSlots([
        { warehouse: 'WH1', tag: 's', count: 10, zone: ZoneType.NORMAL, maxWeightKg: 400, maxVolumeM3: 4, baseDistanceM: 10, vehicles: [FORKLIFT, TRUCK] },
        { warehouse: 'WH2', tag: 's', count: 10, zone: ZoneType.NORMAL, maxWeightKg: 400, maxVolumeM3: 4, baseDistanceM: 12, vehicles: [FORKLIFT, TRUCK] },
        { warehouse: 'WH3', tag: 's', count: 10, zone: ZoneType.NORMAL, maxWeightKg: 400, maxVolumeM3: 4, baseDistanceM: 14, vehicles: [FORKLIFT, TRUCK] },
        { warehouse: 'WH4', tag: 's', count: 10, zone: ZoneType.NORMAL, maxWeightKg: 400, maxVolumeM3: 4, baseDistanceM: 16, vehicles: [FORKLIFT, TRUCK] },
    ]);
    const products = Array.from({ length: 40 }, (_, i) =>
        product(`yard-p${i + 1}`, {
            weightKg: between(r, 60, 220, 10), volumeM3: between(r, 0.4, 1.6, 0.1),
            vehicleType: i < 30 ? FORKLIFT : TRUCK,
            demandFrequency: between(r, 10, 95, 5),
            priority: pickWeighted(r, [[PriorityLevel.LOW, 2], [PriorityLevel.MEDIUM, 4], [PriorityLevel.HIGH, 3], [PriorityLevel.URGENT, 1]]),
        }));

    const tables = new Map<string, RouteTable>();
    for (const vehicle of [FORKLIFT, TRUCK]) {
        const tree = graph.from('GATE', vehicle)!;
        const bySlot = new Map<string, RouteInfo | null>();
        let scale = 0;
        for (const slot of slots) {
            const hop = tree.to(slot.warehouseId);
            if (!hop) { bySlot.set(slot.id, null); continue; }
            const info: RouteInfo = {
                costM: Math.round((hop.totalCost + slot.distanceFromEntryM) * 100) / 100,
                distanceM: Math.round((hop.distanceM + slot.distanceFromEntryM) * 100) / 100,
                path: hop.nodePath, warnings: hop.warnings,
            };
            bySlot.set(slot.id, info);
            scale = Math.max(scale, info.costM);
        }
        tables.set(vehicle, { bySlot, scale: scale || 1 });
    }
    for (const p of products) p.routes = tables.get(p.vehicleType);
    return context('congested-yard', seed, products, slots, ['Road graph: GATE->WH1 jammed (0.95), WH4 one-way and container-truck only']);
}

function mixedPriority(seed: number): OptimizationContext {
    const r = makeRng(seed);
    const products: ProductCandidate[] = [];
    const priority = () => pickWeighted(r, [[PriorityLevel.LOW, 3], [PriorityLevel.MEDIUM, 5], [PriorityLevel.HIGH, 3], [PriorityLevel.URGENT, 1]]);
    for (let i = 0; i < 36; i++) products.push(product(`mix-n${i + 1}`, { weightKg: between(r, 20, 150, 5), volumeM3: between(r, 0.2, 1.2, 0.1), demandFrequency: between(r, 5, 100, 5), priority: priority() }));
    for (let i = 0; i < 9; i++) products.push(product(`mix-f${i + 1}`, { weightKg: between(r, 10, 60, 5), volumeM3: between(r, 0.2, 0.8, 0.1), requiredZone: ZoneType.FRAGILE, demandFrequency: between(r, 5, 100, 5), priority: priority() }));
    for (let i = 0; i < 6; i++) products.push(product(`mix-c${i + 1}`, { weightKg: between(r, 20, 80, 5), volumeM3: between(r, 0.2, 0.8, 0.1), requiredZone: ZoneType.COLD, requiredTempMin: -5, requiredTempMax: 5, demandFrequency: between(r, 5, 100, 5), priority: priority() }));
    for (let i = 0; i < 9; i++) products.push(product(`mix-h${i + 1}`, { weightKg: between(r, 600, 900, 50), volumeM3: between(r, 2, 4, 0.5), requiredZone: ZoneType.HEAVY, demandFrequency: between(r, 5, 100, 5), priority: priority() }));

    const slots: SlotCandidate[] = [];
    ['w1', 'w2', 'w3'].forEach((w, k) => {
        slots.push(...makeSlots([
            { warehouse: w, tag: 'n', count: 10, zone: ZoneType.NORMAL, maxWeightKg: 250, maxVolumeM3: 2.5, baseDistanceM: 10 + k * 30 },
            { warehouse: w, tag: 'f', count: 4, zone: ZoneType.FRAGILE, maxWeightKg: 120, maxVolumeM3: 2, baseDistanceM: 20 + k * 30 },
            { warehouse: w, tag: 'c', count: 3, zone: ZoneType.COLD, temp: [-10, 8], maxWeightKg: 200, maxVolumeM3: 2, baseDistanceM: 25 + k * 30 },
            { warehouse: w, tag: 'h', count: 3, zone: ZoneType.HEAVY, maxWeightKg: 2000, maxVolumeM3: 10, baseDistanceM: 30 + k * 30 },
        ]));
    });
    return context('mixed-priority', seed, products, slots);
}

const BUILDERS: Record<DatasetName, (seed: number) => OptimizationContext> = {
    'small': small,
    'cold-chain': coldChain,
    'heavy-cargo': heavyCargo,
    'congested-yard': congestedYard,
    'mixed-priority': mixedPriority,
};

/** A fresh context each call: algorithms mutate slot load while they work, so contexts are never shared. */
export function buildDataset(name: DatasetName, seed = 42): OptimizationContext {
    return BUILDERS[name](seed);
}
