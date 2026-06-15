import { ShipmentStatus } from "src/common/enums";

export interface InboundShipmentProps {
    id: string;
    scenarioId: string;
    code: string;
    sourceType: string;
    sourceName: string | null;
    entryNodeId: string | null;
    status: ShipmentStatus;
    arrivedAt: Date | null;
    dispatchingStartedAt: Date | null;
    completedAt: Date | null;
    totalItems: number;
    assignedItems: number;
    failedItems: number;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class InboundShipmentEntity {
    readonly id!: string;
    readonly scenarioId!: string;
    readonly code!: string;
    readonly sourceType!: string;
    readonly sourceName!: string | null;
    readonly entryNodeId!: string | null;
    readonly status!: ShipmentStatus;
    readonly arrivedAt!: Date | null;
    readonly dispatchingStartedAt!: Date | null;
    readonly completedAt!: Date | null;
    readonly totalItems!: number;
    readonly assignedItems!: number;
    readonly failedItems!: number;
    readonly notes!: string | null;
    readonly createdAt!: Date;
    readonly updatedAt!: Date;

    constructor(props: InboundShipmentProps) {
        Object.assign(this, props);
    }
}
