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
        expect(result.assignments[0].reasons).toEqual(['No valid slot available']);
        expect(result.metrics.hardViolations).toBe(1);
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
