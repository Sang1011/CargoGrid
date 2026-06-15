export interface TransferOrderItemProps {
    id: string;
    transferOrderId: string;
    cargoItemId: string;
    fromSlotId: string | null;
    proposedWarehouseId: string | null;
    proposedSlotId: string | null;
    proposalScore: number | null;
    proposalReasons: string[];
    actualWarehouseId: string | null;
    actualSlotId: string | null;
    vehicleId: string | null;
    status: string;
    transferredAt: Date | null;
}

export class TransferOrderItemEntity {
    readonly id!: string;
    readonly transferOrderId!: string;
    readonly cargoItemId!: string;
    readonly fromSlotId!: string | null;
    readonly proposedWarehouseId!: string | null;
    readonly proposedSlotId!: string | null;
    readonly proposalScore!: number | null;
    readonly proposalReasons!: string[];
    readonly actualWarehouseId!: string | null;
    readonly actualSlotId!: string | null;
    readonly vehicleId!: string | null;
    readonly status!: string;
    readonly transferredAt!: Date | null;

    constructor(props: TransferOrderItemProps) {
        Object.assign(this, props);
    }
}
