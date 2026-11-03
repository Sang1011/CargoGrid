import { Injectable } from '@nestjs/common';
import { IOptimizationAlgorithm } from './algorithm.interface';
import { OptimizationContext, OptimizationResult } from '../domain/types/optimization-context.type';
import { AlgorithmType } from 'src/common/enums';
import { ScoringService } from '../scoring/scoring.service';
import { buildResult, greedyPlacement } from './placement';

/** Most urgent product first, each into the best-scoring slot that still has room for it. */
@Injectable()
export class GreedyAlgorithm implements IOptimizationAlgorithm {
    readonly type = AlgorithmType.GREEDY;

    constructor(protected readonly scoringService: ScoringService) { }

    async run(context: OptimizationContext): Promise<OptimizationResult> {
        const startedAt = Date.now();
        const { placement } = greedyPlacement(context, this.scoringService);
        return buildResult(context, placement, this.scoringService, startedAt);
    }
}
