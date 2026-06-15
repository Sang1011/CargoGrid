import { VehicleType } from "src/common/enums";

export interface OutboundOrderItemProps {
    id: string;
    outboundOrderId: string;
    cargoItemId: string;
    fromSlotId: string | null;
    fromWarehouseId: string | null;
    vehicleId: string | null;
    routePath: any | null;
    routeCost: number | null;
    vehicleType: VehicleType | null;
    status: string;
    pickedAt: Date | null;
    deliveredAt: Date | null;
}

export class OutboundOrderItemEntity {
    readonly id!: string;
    readonly outboundOrderId!: string;
    readonly cargoItemId!: string;
    readonly fromSlotId!: string | null;
    readonly fromWarehouseId!: string | null;
    readonly vehicleId!: string | null;
    readonly routePath!: any | null;
    readonly routeCost!: number | null;
    readonly vehicleType!: VehicleType | null;
    readonly status!: string;
    readonly pickedAt!: Date | null;
    readonly deliveredAt!: Date | null;

    constructor(props: OutboundOrderItemProps) {
        Object.assign(this, props);
    }
}
