import { PriorityLevel, TransferOrderStatus } from "src/common/enums";

export interface TransferOrderProps {
    id: string;
    scenarioId: string;
    incidentId: string | null;
    code: string;
    status: TransferOrderStatus;
    priority: PriorityLevel;
    fromWarehouseId: string;
    reason: string | null;
    isEmergency: boolean;
    totalItems: number;
    transferredItems: number;
    failedItems: number;
    runId: string | null;
    confirmedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export class TransferOrderEntity {
    readonly id!: string;
    readonly scenarioId!: string;
    readonly incidentId!: string | null;
    readonly code!: string;
    readonly status!: TransferOrderStatus;
    readonly priority!: PriorityLevel;
    readonly fromWarehouseId!: string;
    readonly reason!: string | null;
    readonly isEmergency!: boolean;
    readonly totalItems!: number;
    readonly transferredItems!: number;
    readonly failedItems!: number;
    readonly runId!: string | null;
    readonly confirmedAt!: Date | null;
    readonly completedAt!: Date | null;
    readonly createdAt!: Date;
    readonly updatedAt!: Date;

    constructor(props: TransferOrderProps) {
        Object.assign(this, props);
    }
}
