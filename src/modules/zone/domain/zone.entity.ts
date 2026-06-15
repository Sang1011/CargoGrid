import { ZoneType } from "src/common/enums";

export interface ZoneProps {
    id: string;
    warehouseId: string;
    name: string;
    code: string;
    zoneType: ZoneType;
    localX: number;
    localY: number;
    width: number;
    depth: number;
    tempMin: number | null;
    tempMax: number | null;
    maxWeightKg: number | null;
    currentWeightKg: number;
    maxVolumeM3: number | null;
    currentVolumeM3: number;
    gridColStart: number;
    gridRowStart: number;
    gridCols: number;
    gridRows: number;
    isActive: boolean;
}

export class ZoneEntity {
    readonly id!: string;
    readonly warehouseId!: string;
    readonly name!: string;
    readonly code!: string;
    readonly zoneType!: ZoneType;
    readonly localX!: number;
    readonly localY!: number;
    readonly width!: number;
    readonly depth!: number;
    readonly tempMin!: number | null;
    readonly tempMax!: number | null;
    readonly maxWeightKg!: number | null;
    readonly currentWeightKg!: number;
    readonly maxVolumeM3!: number | null;
    readonly currentVolumeM3!: number;
    readonly gridColStart!: number;
    readonly gridRowStart!: number;
    readonly gridCols!: number;
    readonly gridRows!: number;
    readonly isActive!: boolean;

    constructor(props: ZoneProps) {
        Object.assign(this, props);
    }
}
