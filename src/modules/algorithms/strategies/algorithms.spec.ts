import { ScoringService } from '../scoring/scoring.service';
import { RandomAlgorithm } from './random.algorithm';
import { GreedyAlgorithm } from './greedy.algorithm';
import { GreedyLocalSearchAlgorithm } from './greedy-local-search.algorithm';
import { SimulatedAnnealingAlgorithm } from './simulated-annealing.algorithm';
import { IOptimizationAlgorithm } from './algorithm.interface';
import { makeContext, makeProduct, makeSlot } from '../test-fixtures';
import { PriorityLevel, ZoneType } from 'src/common/enums';

const scoring = new ScoringService();

const algorithms: [string, IOptimizationAlgorithm][] = [
    ['random', new RandomAlgorithm(scoring)],
    ['greedy', new GreedyAlgorithm(scoring)],
    ['greedy + local search', new GreedyLocalSearchAlgorithm(scoring)],
    ['simulated annealing', new SimulatedAnnealingAlgorithm(scoring)],
];

// Two cold products, one plain product, and a mix of cold / normal slots.
const buildContext = () =>
    makeContext(
        [
            makeProduct({ id: 'cold-1', requiredZone: ZoneType.COLD, requiredTempMin: -5, requiredTempMax: 5, priority: PriorityLevel.URGENT }),
            makeProduct({ id: 'cold-2', requiredTempMin: -5, requiredTempMax: 5 }),
            makeProduct({ id: 'plain-1' }),
        ],
        [
            makeSlot({ id: 'normal-a', zoneType: ZoneType.NORMAL, distanceFromEntryM: 5 }),
            makeSlot({ id: 'normal-b', zoneType: ZoneType.NORMAL, distanceFromEntryM: 30 }),
            makeSlot({ id: 'cold-a', zoneType: ZoneType.COLD, tempMin: -10, tempMax: 10, distanceFromEntryM: 15 }),
            makeSlot({ id: 'cold-b', zoneType: ZoneType.COLD, tempMin: -10, tempMax: 10, distanceFromEntryM: 25 }),
        ],
    );

describe.each(algorithms)('%s', (_name, algorithm) => {
    it('never puts a temperature-sensitive product in a slot without a temperature range', async () => {
        const context = buildContext();
        const result = await algorithm.run(context);

        for (const productId of ['cold-1', 'cold-2']) {
            const a = result.assignments.find(x => x.productId === productId)!;
            expect(a.slotId).not.toBeNull();
            expect(['cold-a', 'cold-b']).toContain(a.slotId);
        }
    });

    it('gives every assigned product a non-empty list of reasons', async () => {
        const result = await algorithm.run(buildContext());
        const assigned = result.assignments.filter(a => a.slotId !== null);

        expect(assigned.length).toBe(3);
        for (const a of assigned) {
            expect(a.reasons.length).toBeGreaterThan(0);
        }
    });

    it('leaves a product unassigned with a reason when no slot is valid', async () => {
        const context = makeContext(
            [makeProduct({ id: 'cold-x', requiredTempMin: -5, requiredTempMax: 5 })],
            [makeSlot({ id: 'normal-only' })],
        );
        const result = await algorithm.run(context);

        expect(result.assignments[0].slotId).toBeNull();
        expect(result.assignments[0].reasons[0]).toMatch(/^No slot can take this: .*temperature/);
        // Leaving it unplaced is not a violation; it is reported as unassigned.
        expect(result.metrics).toMatchObject({ hardViolations: 0, productsAssigned: 0, productsUnassigned: 1 });
    });
});

describe('local search / annealing keep reasons consistent after moving a product', () => {
    it('reasons of the final slot mention the right distance', async () => {
        for (const algorithm of [new GreedyLocalSearchAlgorithm(scoring), new SimulatedAnnealingAlgorithm(scoring)]) {
            const context = makeContext(
                [makeProduct({ id: 'a' }), makeProduct({ id: 'b', demandFrequency: 100 })],
                [
                    makeSlot({ id: 's-near', distanceFromEntryM: 2 }),
                    makeSlot({ id: 's-far', distanceFromEntryM: 90 }),
                ],
            );
            const result = await algorithm.run(context);

            for (const a of result.assignments) {
                const slot = context.slots.find(s => s.id === a.slotId)!;
                expect(a.reasons).toContain(`${slot.distanceFromEntryM.toFixed(1)} m from the entry point`);
            }
        }
    });
});

// ─── Properties that must hold for every algorithm ──────────────────────────

import { RouteTable } from '../domain/types/candidate.type';
import { OptimizationContext } from '../domain/types/optimization-context.type';

/** Plan-level check, independent of the algorithms: capacity and static rules hold for the whole plan. */
function violationsOf(context: OptimizationContext, result: Awaited<ReturnType<IOptimizationAlgorithm['run']>>): string[] {
    const found: string[] = [];
    const load = new Map(context.slots.map(s => [s.id, { w: s.currentWeightKg, v: s.currentVolumeM3 }]));
    for (const a of result.assignments) {
        if (!a.slotId) continue;
        const p = context.products.find(x => x.id === a.productId)!;
        const s = context.slots.find(x => x.id === a.slotId)!;
        const l = load.get(s.id)!;
        l.w += p.weightKg;
        l.v += p.volumeM3;
        const statics = scoring.isHardViolation(p, { ...s, currentWeightKg: 0, currentVolumeM3: 0 }).reasons;
        found.push(...statics.map(r => `${p.id}@${s.id}: ${r}`));
    }
    for (const s of context.slots) {
        const l = load.get(s.id)!;
        if (l.w > s.maxWeightKg + 1e-9 || l.v > s.maxVolumeM3 + 1e-9) found.push(`${s.id} over capacity (${l.w} kg, ${l.v} m3)`);
    }
    return found;
}

describe.each(algorithms)('%s: whole-plan validity', (_name, algorithm) => {
    it('never loads a slot past its capacity, even when many products compete for little room', async () => {
        // Each slot holds 3 products by weight; 18 products for 6 slots leaves no slack.
        const products = Array.from({ length: 18 }, (_, i) => makeProduct({ id: `p${i}`, weightKg: 100, volumeM3: 1, demandFrequency: (i * 7) % 100 }));
        const slots = Array.from({ length: 6 }, (_, i) => makeSlot({ id: `s${i}`, maxWeightKg: 300, maxVolumeM3: 100, distanceFromEntryM: 5 + i * 15 }));
        const context = { ...makeContext(products, slots), seed: 42 };

        const result = await algorithm.run(context);

        expect(violationsOf(context, result)).toEqual([]);
        expect(result.metrics).toMatchObject({ hardViolations: 0, productsAssigned: 18, productsUnassigned: 0 });
    });

    it('honours load already in the slots', async () => {
        const products = Array.from({ length: 4 }, (_, i) => makeProduct({ id: `p${i}`, weightKg: 100 }));
        const slots = [
            makeSlot({ id: 'half', maxWeightKg: 300, currentWeightKg: 200 }),   // room for 1
            makeSlot({ id: 'open', maxWeightKg: 300, currentWeightKg: 0 }),     // room for 3
        ];
        const context = { ...makeContext(products, slots), seed: 1 };

        const result = await algorithm.run(context);

        expect(violationsOf(context, result)).toEqual([]);
        expect(result.assignments.filter(a => a.slotId === 'half').length).toBeLessThanOrEqual(1);
    });

    it('reports the product it could not place instead of overfilling', async () => {
        const products = Array.from({ length: 3 }, (_, i) => makeProduct({ id: `p${i}`, weightKg: 100 }));
        const context = { ...makeContext(products, [makeSlot({ id: 's', maxWeightKg: 200 })]), seed: 1 };

        const result = await algorithm.run(context);

        expect(result.metrics).toMatchObject({ hardViolations: 0, productsAssigned: 2, productsUnassigned: 1 });
        expect(violationsOf(context, result)).toEqual([]);
    });
});

describe('reproducibility', () => {
    it('the same seed gives the same plan; a different seed may differ', async () => {
        const products = Array.from({ length: 12 }, (_, i) => makeProduct({ id: `p${i}`, weightKg: 50, demandFrequency: (i * 13) % 100 }));
        const slots = Array.from({ length: 5 }, (_, i) => makeSlot({ id: `s${i}`, maxWeightKg: 200, distanceFromEntryM: 5 + i * 17 }));
        const plan = async (alg: IOptimizationAlgorithm, seed: number) =>
            (await alg.run({ ...makeContext(products, slots), seed })).assignments.map(a => `${a.productId}:${a.slotId}`).join(',');

        for (const alg of [new RandomAlgorithm(scoring), new GreedyLocalSearchAlgorithm(scoring), new SimulatedAnnealingAlgorithm(scoring)]) {
            expect(await plan(alg, 5)).toEqual(await plan(alg, 5));
        }
    });
});

describe('quality ordering', () => {
    it('local search and annealing never score below the greedy start', async () => {
        const products = Array.from({ length: 20 }, (_, i) => makeProduct({ id: `p${i}`, weightKg: 40 + (i % 5) * 10, volumeM3: 1, demandFrequency: (i * 11) % 100 }));
        const slots = Array.from({ length: 8 }, (_, i) => makeSlot({ id: `s${i}`, maxWeightKg: 250, maxVolumeM3: 10, distanceFromEntryM: 4 + i * 11, currentWeightKg: (i % 3) * 30 }));
        const context = { ...makeContext(products, slots), seed: 9 };

        const greedy = (await new GreedyAlgorithm(scoring).run(context)).metrics.optimizationScore;
        const ls = (await new GreedyLocalSearchAlgorithm(scoring).run(context)).metrics.optimizationScore;
        const sa = (await new SimulatedAnnealingAlgorithm(scoring).run(context)).metrics.optimizationScore;

        expect(ls).toBeGreaterThanOrEqual(greedy - 1e-9);
        expect(sa).toBeGreaterThanOrEqual(greedy - 1e-9);
    });
});

// ─── Routes (BR-10) ────────────────────────────────────────────────────────

const routeTable = (entries: Record<string, number | null>): RouteTable => {
    const bySlot = new Map(Object.entries(entries).map(([id, cost]) => [id, cost === null ? null : { costM: cost, distanceM: cost, path: ['gate', id], warnings: [] }]));
    return { bySlot, scale: Math.max(...Object.values(entries).filter((c): c is number => c !== null), 1) };
};

describe.each(algorithms)('%s: routes', (_name, algorithm) => {
    it('never uses a slot the vehicle cannot reach, and says so', async () => {
        const routes = routeTable({ near: null, far: 80 });
        const context = {
            ...makeContext(
                [makeProduct({ id: 'p', routes })],
                [makeSlot({ id: 'near', distanceFromEntryM: 1 }), makeSlot({ id: 'far', distanceFromEntryM: 90 })],
            ),
            seed: 3,
        };

        const result = await algorithm.run(context);
        const a = result.assignments[0];

        expect(a.slotId).toBe('far');
        expect(a.routeCost).toBe(80);
        expect(a.routePath).toEqual(['gate', 'far']);
        const near = a.rejectedCandidates.find(c => c.slotId === 'near')!;
        expect(near).toMatchObject({ feasible: false, score: null });
        expect(near.reasons.join()).toMatch(/No valid route/);
    });

    it('leaves a product unassigned when no slot is reachable', async () => {
        const context = { ...makeContext([makeProduct({ id: 'p', routes: routeTable({ s: null }) })], [makeSlot({ id: 's' })]), seed: 3 };
        const result = await algorithm.run(context);
        expect(result.assignments[0].slotId).toBeNull();
        expect(result.assignments[0].reasons[0]).toMatch(/No valid route/);
    });
});

describe('greedy: route cost replaces straight-line distance', () => {
    it('prefers the slot with the cheaper route even when it is farther as the crow flies', async () => {
        // s-close is 5 m away in a straight line but the road to it is a 200 m detour.
        const routes = routeTable({ 's-close': 200, 's-far': 40 });
        const context = makeContext(
            [makeProduct({ id: 'p', routes })],
            [makeSlot({ id: 's-close', distanceFromEntryM: 5 }), makeSlot({ id: 's-far', distanceFromEntryM: 60 })],
        );
        const result = await new GreedyAlgorithm(scoring).run(context);
        expect(result.assignments[0].slotId).toBe('s-far');
        expect(result.metrics.totalMovementCost).toBe(40);
    });
});

// ─── Explanations (FR-ALC-07) ──────────────────────────────────────────────

describe('explanations', () => {
    it('gives each rejected slot its own concrete cause, not a generic sentence', async () => {
        const context = makeContext(
            [makeProduct({ id: 'cold', requiredZone: ZoneType.COLD, requiredTempMin: -5, requiredTempMax: 5, weightKg: 100 })],
            [
                makeSlot({ id: 'cold-near', zoneType: ZoneType.COLD, tempMin: -10, tempMax: 10, distanceFromEntryM: 5, maxWeightKg: 1000 }),
                makeSlot({ id: 'cold-far', zoneType: ZoneType.COLD, tempMin: -10, tempMax: 10, distanceFromEntryM: 80, maxWeightKg: 1000 }),
                makeSlot({ id: 'normal', zoneType: ZoneType.NORMAL, distanceFromEntryM: 1 }),
                makeSlot({ id: 'cold-full', zoneType: ZoneType.COLD, tempMin: -10, tempMax: 10, maxWeightKg: 1000, currentWeightKg: 950 }),
                makeSlot({ id: 'blocked', zoneType: ZoneType.COLD, tempMin: -10, tempMax: 10, isBlocked: true }),
            ],
        );

        const a = (await new GreedyAlgorithm(scoring).run(context)).assignments[0];
        expect(a.slotId).toBe('cold-near');

        const by = Object.fromEntries(a.rejectedCandidates.map(c => [c.slotId, c]));
        expect(by['cold-far']).toMatchObject({ feasible: true });
        expect(by['cold-far'].reasons[0]).toMatch(/lower than the chosen slot: weaker on movement cost/);
        expect(by['normal'].reasons.join()).toMatch(/Required zone cold does not match slot zone normal/);
        expect(by['cold-full'].reasons.join()).toMatch(/exceeds remaining slot capacity/);
        expect(by['blocked'].reasons).toContain('Slot is blocked');
        expect(a.rejectedCandidates.every(c => !c.reasons.includes('Lower score than best candidate'))).toBe(true);
    });

    it('says why nothing was placed, with how many slots each reason ruled out', async () => {
        const context = makeContext(
            [makeProduct({ id: 'heavy', weightKg: 5000 })],
            [makeSlot({ id: 'a' }), makeSlot({ id: 'b' })],
        );
        const a = (await new GreedyAlgorithm(scoring).run(context)).assignments[0];
        expect(a.reasons[0]).toMatch(/exceeds remaining slot capacity \(2\/2 slots\)/);
    });
});
