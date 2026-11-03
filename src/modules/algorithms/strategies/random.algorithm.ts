import { Injectable } from '@nestjs/common';
import { IOptimizationAlgorithm } from './algorithm.interface';
import { OptimizationContext, OptimizationResult } from '../domain/types/optimization-context.type';
import { AlgorithmType } from 'src/common/enums';
import { ScoringService } from '../scoring/scoring.service';
import { Placement, PlacementState, buildResult, contextRng } from './placement';

/**
 * Baseline: products in random order, each into a random slot that still satisfies the hard
 * constraints. It is valid but blind to quality, which is what the benchmark measures against.
 */
@Injectable()
export class RandomAlgorithm implements IOptimizationAlgorithm {
    readonly type = AlgorithmType.RANDOM;

    constructor(private readonly scoringService: ScoringService) { }

    async run(context: OptimizationContext): Promise<OptimizationResult> {
        const startedAt = Date.now();
        const rng = contextRng(context);
        const state = new PlacementState(context.slots, this.scoringService);
        const placement: Placement = new Map();

        const order = [...context.products];
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }

        for (const p of order) {
            const open = context.slots.filter(s => state.violations(p, s.id).length === 0);
            const slotId = open.length > 0 ? open[Math.floor(rng() * open.length)].id : null;
            placement.set(p.id, slotId);
            if (slotId) state.place(p, slotId);
        }
        return buildResult(context, placement, this.scoringService, startedAt);
    }
}
