import { Module } from '@nestjs/common';
import { ScoringService } from './scoring/scoring.service';
import { AlgorithmFactory } from './strategies/algorithm.factory';
import { RandomAlgorithm } from './strategies/random.algorithm';
import { GreedyAlgorithm } from './strategies/greedy.algorithm';
import { GreedyLocalSearchAlgorithm } from './strategies/greedy-local-search.algorithm';
import { SimulatedAnnealingAlgorithm } from './strategies/simulated-annealing.algorithm';

@Module({
    providers: [
        ScoringService,
        RandomAlgorithm,
        GreedyAlgorithm,
        GreedyLocalSearchAlgorithm,
        SimulatedAnnealingAlgorithm,
        AlgorithmFactory,
    ],
    exports: [AlgorithmFactory, ScoringService],
})
export class AlgorithmsModule {}
