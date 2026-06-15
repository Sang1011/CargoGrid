import { VehicleScope, VehicleStatus, VehicleType } from "src/common/enums";

export interface VehicleProps {
    id: string;
    scenarioId: string;
    code: string;
    name: string | null;
    vehicleType: VehicleType;
    scope: VehicleScope;
    homeWarehouseId: string | null;
    status: VehicleStatus;
    maxLoadKg: number;
    maxVolumeM3: number | null;
    widthM: number | null;
    heightM: number | null;
    speedRating: number | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class VehicleEntity {
    readonly id!: string;
    readonly scenarioId!: string;
    readonly code!: string;
    readonly name!: string | null;
    readonly vehicleType!: VehicleType;
    readonly scope!: VehicleScope;
    readonly homeWarehouseId!: string | null;
    readonly status!: VehicleStatus;
    readonly maxLoadKg!: number;
    readonly maxVolumeM3!: number | null;
    readonly widthM!: number | null;
    readonly heightM!: number | null;
    readonly speedRating!: number | null;
    readonly notes!: string | null;
    readonly createdAt!: Date;
    readonly updatedAt!: Date;

    constructor(props: VehicleProps) {
        Object.assign(this, props);
    }

    isAvailable(): boolean {
        return this.status === VehicleStatus.AVAILABLE;
    }
}
