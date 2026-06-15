import { OutboundDestinationType, OutboundOrderStatus, PriorityLevel } from "src/common/enums";

export interface OutboundOrderProps {
    id: string;
    scenarioId: string;
    code: string;
    status: OutboundOrderStatus;
    priority: PriorityLevel;
    destinationType: OutboundDestinationType;
    destinationName: string | null;
    exitNodeId: string | null;
    requestedAt: Date;
    deadlineAt: Date | null;
    totalItems: number;
    pickedItems: number;
    deliveredItems: number;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class OutboundOrderEntity {
    readonly id!: string;
    readonly scenarioId!: string;
    readonly code!: string;
    readonly status!: OutboundOrderStatus;
    readonly priority!: PriorityLevel;
    readonly destinationType!: OutboundDestinationType;
    readonly destinationName!: string | null;
    readonly exitNodeId!: string | null;
    readonly requestedAt!: Date;
    readonly deadlineAt!: Date | null;
    readonly totalItems!: number;
    readonly pickedItems!: number;
    readonly deliveredItems!: number;
    readonly notes!: string | null;
    readonly createdAt!: Date;
    readonly updatedAt!: Date;

    constructor(props: OutboundOrderProps) {
        Object.assign(this, props);
    }
}
