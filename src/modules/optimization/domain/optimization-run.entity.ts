import { AlgorithmType, OptimizationContextType } from 'src/common/enums';

export interface OptimizationRunProps {
    id: string;
    scenarioId: string;
    contextType: OptimizationContextType;
    contextId: string | null;
    algorithm: AlgorithmType;
    weightCapacityFit: number;
    weightMovementCost: number;
    weightCategoryMatch: number;
    weightVehicleAccess: number;
    weightDemandPriority: number;
    weightCongestion: number;
    productsTotal: number | null;
    productsAssigned: number | null;
    productsUnassigned: number | null;
    hardViolations: number | null;
    totalMovementCost: number | null;
    avgRetrievalCost: number | null;
    spaceUtilization: number | null;
    congestionScore: number | null;
    runtimeMs: number | null;
    optimizationScore: number | null;
    resultSnapshot: Record<string, any> | null;
    createdAt: Date;
}

export class OptimizationRunEntity {
    readonly id!: string;
    readonly scenarioId!: string;
    readonly contextType!: OptimizationContextType;
    readonly contextId!: string | null;
    readonly algorithm!: AlgorithmType;
    readonly weightCapacityFit!: number;
    readonly weightMovementCost!: number;
    readonly weightCategoryMatch!: number;
    readonly weightVehicleAccess!: number;
    readonly weightDemandPriority!: number;
    readonly weightCongestion!: number;
    readonly productsTotal!: number | null;
    readonly productsAssigned!: number | null;
    readonly productsUnassigned!: number | null;
    readonly hardViolations!: number | null;
    readonly totalMovementCost!: number | null;
    readonly avgRetrievalCost!: number | null;
    readonly spaceUtilization!: number | null;
    readonly congestionScore!: number | null;
    readonly runtimeMs!: number | null;
    readonly optimizationScore!: number | null;
    readonly resultSnapshot!: Record<string, any> | null;
    readonly createdAt!: Date;

    constructor(props: OptimizationRunProps) {
        Object.assign(this, props);
    }
}
