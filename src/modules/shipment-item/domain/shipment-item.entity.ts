import { ShipmentItemStatus } from "src/common/enums";

export interface ShipmentItemProps {
    id: string;
    shipmentId: string;
    cargoItemId: string;
    status: ShipmentItemStatus;
    assignedWarehouseId: string | null;
    assignedSlotId: string | null;
    assignmentScore: number | null;
    assignmentReasons: string[];
    rejectedCandidates: any | null;
    runId: string | null;
    assignedAt: Date | null;
    storedAt: Date | null;
}

export class ShipmentItemEntity {
    readonly id!: string;
    readonly shipmentId!: string;
    readonly cargoItemId!: string;
    readonly status!: ShipmentItemStatus;
    readonly assignedWarehouseId!: string | null;
    readonly assignedSlotId!: string | null;
    readonly assignmentScore!: number | null;
    readonly assignmentReasons!: string[];
    readonly rejectedCandidates!: any | null;
    readonly runId!: string | null;
    readonly assignedAt!: Date | null;
    readonly storedAt!: Date | null;

    constructor(props: ShipmentItemProps) {
        Object.assign(this, props);
    }
}
