import { OptimizationContext, OptimizationResult } from '../domain/types/optimization-context.type';
import { AlgorithmType } from 'src/common/enums';

export interface IOptimizationAlgorithm {
    readonly type: AlgorithmType;
    run(context: OptimizationContext): Promise<OptimizationResult>;
}
