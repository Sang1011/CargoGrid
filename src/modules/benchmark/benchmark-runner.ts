import { AlgorithmType } from 'src/common/enums';
import { IOptimizationAlgorithm } from 'src/modules/algorithms/strategies/algorithm.interface';
import { DATASET_NAMES, DatasetName, buildDataset } from './benchmark-datasets';

export const BENCHMARK_ALGORITHMS = [
    AlgorithmType.RANDOM,
    AlgorithmType.GREEDY,
    AlgorithmType.GREEDY_LOCAL_SEARCH,
    AlgorithmType.SIMULATED_ANNEALING,
] as const;

export interface BenchmarkRow {
    dataset: DatasetName;
    algorithm: AlgorithmType;
    products: number;
    assigned: number;
    unassigned: number;
    /** Placements breaking a hard constraint, counted by an independent check of the final plan. */
    hardViolations: number;
    movementCost: number;
    spaceUtilization: number;
    runtimeMs: number;
    score: number;
}

export interface BenchmarkOptions {
    datasets?: DatasetName[];
    algorithms?: AlgorithmType[];
    seed?: number;
}

/**
 * Every algorithm gets its own copy of every dataset built from the same seed, so all of them
 * see identical input and the run can be repeated exactly.
 */
export async function runBenchmark(
    getAlgorithm: (type: AlgorithmType) => IOptimizationAlgorithm,
    options: BenchmarkOptions = {},
): Promise<BenchmarkRow[]> {
    const seed = options.seed ?? 42;
    const rows: BenchmarkRow[] = [];
    for (const dataset of options.datasets ?? DATASET_NAMES) {
        for (const type of options.algorithms ?? BENCHMARK_ALGORITHMS) {
            const { metrics } = await getAlgorithm(type).run(buildDataset(dataset, seed));
            rows.push({
                dataset,
                algorithm: type,
                products: metrics.productsTotal,
                assigned: metrics.productsAssigned,
                unassigned: metrics.productsUnassigned,
                hardViolations: metrics.hardViolations,
                movementCost: round(metrics.totalMovementCost),
                spaceUtilization: round(metrics.spaceUtilization),
                runtimeMs: metrics.runtimeMs,
                score: round(metrics.optimizationScore),
            });
        }
    }
    return rows;
}

const round = (n: number) => Math.round(n * 100) / 100;
