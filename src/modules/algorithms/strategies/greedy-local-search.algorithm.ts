import { Injectable } from '@nestjs/common';
import { IOptimizationAlgorithm } from './algorithm.interface';
import { OptimizationContext, OptimizationResult } from '../domain/types/optimization-context.type';
import { AlgorithmType } from 'src/common/enums';
import { ScoringService } from '../scoring/scoring.service';
import { buildResult, contextRng, greedyPlacement } from './placement';
import { improvePlacement } from './search';

/** Greedy, then hill climbing: keep a move or swap only when it raises the total score. */
@Injectable()
export class GreedyLocalSearchAlgorithm implements IOptimizationAlgorithm {
    readonly type = AlgorithmType.GREEDY_LOCAL_SEARCH;

    constructor(private readonly scoringService: ScoringService) { }

    async run(context: OptimizationContext): Promise<OptimizationResult> {
        const startedAt = Date.now();
        const start = greedyPlacement(context, this.scoringService);
        const placement = improvePlacement(context, this.scoringService, start, contextRng(context), {
            iterations: Math.min(4000, 40 * context.products.length + 200),
            accept: delta => delta > 1e-9,
        });
        return buildResult(context, placement, this.scoringService, startedAt);
    }
}
