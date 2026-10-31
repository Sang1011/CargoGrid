import { Injectable } from '@nestjs/common';
import { AlgorithmType } from 'src/common/enums';
import { IOptimizationAlgorithm } from './algorithm.interface';
import { RandomAlgorithm } from './random.algorithm';
import { GreedyAlgorithm } from './greedy.algorithm';
import { GreedyLocalSearchAlgorithm } from './greedy-local-search.algorithm';
import { SimulatedAnnealingAlgorithm } from './simulated-annealing.algorithm';

@Injectable()
export class AlgorithmFactory {
    constructor(
        private readonly random: RandomAlgorithm,
        private readonly greedy: GreedyAlgorithm,
        private readonly greedyLocalSearch: GreedyLocalSearchAlgorithm,
        private readonly simulatedAnnealing: SimulatedAnnealingAlgorithm,
    ) {}

    get(type: AlgorithmType): IOptimizationAlgorithm {
        switch (type) {
            case AlgorithmType.RANDOM:
                return this.random;
            case AlgorithmType.GREEDY:
                return this.greedy;
            case AlgorithmType.GREEDY_LOCAL_SEARCH:
                return this.greedyLocalSearch;
            case AlgorithmType.SIMULATED_ANNEALING:
                return this.simulatedAnnealing;
            default:
                throw new Error(`Unknown algorithm type: ${type}`);
        }
    }
}
