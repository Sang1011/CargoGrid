import { AssignmentStatus } from 'src/common/enums';

export interface AssignmentProps {
    id: string;
    runId: string;
    productId: string;
    warehouseId: string | null;
    slotId: string | null;
    status: AssignmentStatus;
    finalScore: number | null;
    capacityFitScore: number | null;
    movementCostScore: number | null;
    categoryMatchScore: number | null;
    vehicleAccessScore: number | null;
    demandPriorityScore: number | null;
    congestionScore: number | null;
    routePath: Record<string, any> | null;
    routeCost: number | null;
    reasons: string[];
    rejectedCandidates: Record<string, any> | null;
    createdAt: Date;
}

export class AssignmentEntity {
    readonly id!: string;
    readonly runId!: string;
    readonly productId!: string;
    readonly warehouseId!: string | null;
    readonly slotId!: string | null;
    readonly status!: AssignmentStatus;
    readonly finalScore!: number | null;
    readonly capacityFitScore!: number | null;
    readonly movementCostScore!: number | null;
    readonly categoryMatchScore!: number | null;
    readonly vehicleAccessScore!: number | null;
    readonly demandPriorityScore!: number | null;
    readonly congestionScore!: number | null;
    readonly routePath!: Record<string, any> | null;
    readonly routeCost!: number | null;
    readonly reasons!: string[];
    readonly rejectedCandidates!: Record<string, any> | null;
    readonly createdAt!: Date;

    constructor(props: AssignmentProps) {
        Object.assign(this, props);
    }
}
