import { Injectable } from '@nestjs/common';
import { IOptimizationAlgorithm } from './algorithm.interface';
import { OptimizationContext, OptimizationResult } from '../domain/types/optimization-context.type';
import { AlgorithmType } from 'src/common/enums';
import { ScoringService } from '../scoring/scoring.service';
import { buildResult, contextRng, greedyPlacement } from './placement';
import { improvePlacement } from './search';

/**
 * Greedy, then simulated annealing: early on, worse moves are sometimes kept to escape local
 * optima; the temperature falls geometrically to 0.1% of its start. The best plan seen is returned,
 * so the result is never worse than the greedy start.
 */
@Injectable()
export class SimulatedAnnealingAlgorithm implements IOptimizationAlgorithm {
    readonly type = AlgorithmType.SIMULATED_ANNEALING;

    /** Scores live in 0..1, so a move changing the total by ~0.05 is "large". */
    private readonly T0 = 0.05;
    private readonly END_RATIO = 0.001;

    constructor(private readonly scoringService: ScoringService) { }

    async run(context: OptimizationContext): Promise<OptimizationResult> {
        const startedAt = Date.now();
        const rng = contextRng(context);
        const iterations = Math.min(10000, 80 * context.products.length + 500);
        const start = greedyPlacement(context, this.scoringService);

        const placement = improvePlacement(context, this.scoringService, start, rng, {
            iterations,
            accept: (delta, step) => {
                if (delta > 0) return true;
                const t = this.T0 * Math.pow(this.END_RATIO, step / iterations);
                return rng() < Math.exp(delta / t);
            },
        });
        return buildResult(context, placement, this.scoringService, startedAt);
    }
}
