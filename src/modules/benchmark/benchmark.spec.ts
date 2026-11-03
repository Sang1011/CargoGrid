import { AlgorithmType } from 'src/common/enums';
import { ScoringService } from 'src/modules/algorithms/scoring/scoring.service';
import { GreedyAlgorithm } from 'src/modules/algorithms/strategies/greedy.algorithm';
import { GreedyLocalSearchAlgorithm } from 'src/modules/algorithms/strategies/greedy-local-search.algorithm';
import { RandomAlgorithm } from 'src/modules/algorithms/strategies/random.algorithm';
import { SimulatedAnnealingAlgorithm } from 'src/modules/algorithms/strategies/simulated-annealing.algorithm';
import { DATASET_NAMES, buildDataset } from './benchmark-datasets';
import { BENCHMARK_ALGORITHMS, BenchmarkRow, runBenchmark } from './benchmark-runner';

const scoring = new ScoringService();
const algorithms = {
    [AlgorithmType.RANDOM]: new RandomAlgorithm(scoring),
    [AlgorithmType.GREEDY]: new GreedyAlgorithm(scoring),
    [AlgorithmType.GREEDY_LOCAL_SEARCH]: new GreedyLocalSearchAlgorithm(scoring),
    [AlgorithmType.SIMULATED_ANNEALING]: new SimulatedAnnealingAlgorithm(scoring),
};
const get = (t: AlgorithmType) => algorithms[t as keyof typeof algorithms];

describe('benchmark datasets', () => {
    let rows: BenchmarkRow[];
    beforeAll(async () => { rows = await runBenchmark(get, { seed: 42 }); }, 120_000);

    it('covers 5 datasets x 4 algorithms', () => {
        expect(rows).toHaveLength(DATASET_NAMES.length * BENCHMARK_ALGORITHMS.length);
    });

    it.each(DATASET_NAMES)('%s: Greedy, Greedy+LS and SA produce 0 hard violations', dataset => {
        for (const algorithm of [AlgorithmType.GREEDY, AlgorithmType.GREEDY_LOCAL_SEARCH, AlgorithmType.SIMULATED_ANNEALING]) {
            const row = rows.find(r => r.dataset === dataset && r.algorithm === algorithm)!;
            expect({ algorithm, hardViolations: row.hardViolations }).toEqual({ algorithm, hardViolations: 0 });
        }
    });

    it.each(DATASET_NAMES.filter(d => d !== 'heavy-cargo'))('%s: every product finds a slot', dataset => {
        for (const algorithm of [AlgorithmType.GREEDY, AlgorithmType.GREEDY_LOCAL_SEARCH, AlgorithmType.SIMULATED_ANNEALING]) {
            expect(rows.find(r => r.dataset === dataset && r.algorithm === algorithm)!.unassigned).toBe(0);
        }
    });

    // heavy-cargo is packed so tightly that greedy ordering strands cargo; the optimisers must not strand more.
    it('heavy-cargo: Local Search and SA place at least as many products as Greedy', () => {
        const placed = (a: AlgorithmType) => rows.find(r => r.dataset === 'heavy-cargo' && r.algorithm === a)!.assigned;
        expect(placed(AlgorithmType.GREEDY_LOCAL_SEARCH)).toBeGreaterThanOrEqual(placed(AlgorithmType.GREEDY));
        expect(placed(AlgorithmType.SIMULATED_ANNEALING)).toBeGreaterThanOrEqual(placed(AlgorithmType.GREEDY));
    });

    it.each(DATASET_NAMES)('%s: Random also respects the hard constraints (it only ignores quality)', dataset => {
        expect(rows.find(r => r.dataset === dataset && r.algorithm === AlgorithmType.RANDOM)!.hardViolations).toBe(0);
    });

    it('the optimisers never do worse than the greedy start they improve on', () => {
        for (const dataset of DATASET_NAMES) {
            const score = (a: AlgorithmType) => rows.find(r => r.dataset === dataset && r.algorithm === a)!.score;
            expect(score(AlgorithmType.GREEDY_LOCAL_SEARCH)).toBeGreaterThanOrEqual(score(AlgorithmType.GREEDY) - 1e-9);
        }
    });

    it('is repeatable: the same seed gives the same plan quality', async () => {
        const again = await runBenchmark(get, { seed: 42, datasets: ['cold-chain'], algorithms: [AlgorithmType.SIMULATED_ANNEALING] });
        const first = rows.find(r => r.dataset === 'cold-chain' && r.algorithm === AlgorithmType.SIMULATED_ANNEALING)!;
        expect(again[0].score).toBe(first.score);
        expect(again[0].movementCost).toBe(first.movementCost);
    });

    it('congested-yard: no forklift cargo is sent to the warehouse its vehicles cannot reach', async () => {
        const ctx = buildDataset('congested-yard', 42);
        const result = await algorithms[AlgorithmType.GREEDY].run(ctx);
        const forklift = new Set(ctx.products.filter(p => p.vehicleType === 'forklift').map(p => p.id));
        const toClosed = result.assignments.filter(a => forklift.has(a.productId) && a.warehouseId === 'WH4');
        expect(toClosed).toHaveLength(0);
    });

    it('datasets are deterministic for a seed and differ between seeds', () => {
        const a = buildDataset('mixed-priority', 7).products.map(p => p.weightKg);
        expect(buildDataset('mixed-priority', 7).products.map(p => p.weightKg)).toEqual(a);
        expect(buildDataset('mixed-priority', 8).products.map(p => p.weightKg)).not.toEqual(a);
    });
});
