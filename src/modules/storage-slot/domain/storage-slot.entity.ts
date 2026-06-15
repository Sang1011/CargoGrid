import { ZoneType } from "src/common/enums";

export interface StorageSlotProps {
    id: string;
    zoneId: string;
    warehouseId: string;
    name: string;
    localX: number;
    localY: number;
    localZ: number;
    widthM: number;
    depthM: number;
    heightM: number;
    maxWeightKg: number;
    currentWeightKg: number;
    maxVolumeM3: number;
    currentVolumeM3: number;
    aisleWidthM: number | null;
    zoneType: ZoneType;
    rowIndex: number;
    colIndex: number;
    colSpan: number;
    rowSpan: number;
    rotationDeg: number;
    displayLabel: string | null;
    isBlocked: boolean;
    isActive: boolean;
}

export class StorageSlotEntity {
    readonly id!: string;
    readonly zoneId!: string;
    readonly warehouseId!: string;
    readonly name!: string;
    readonly localX!: number;
    readonly localY!: number;
    readonly localZ!: number;
    readonly widthM!: number;
    readonly depthM!: number;
    readonly heightM!: number;
    readonly maxWeightKg!: number;
    readonly currentWeightKg!: number;
    readonly maxVolumeM3!: number;
    readonly currentVolumeM3!: number;
    readonly aisleWidthM!: number | null;
    readonly zoneType!: ZoneType;
    readonly rowIndex!: number;
    readonly colIndex!: number;
    readonly colSpan!: number;
    readonly rowSpan!: number;
    readonly rotationDeg!: number;
    readonly displayLabel!: string | null;
    readonly isBlocked!: boolean;
    readonly isActive!: boolean;

    constructor(props: StorageSlotProps) {
        Object.assign(this, props);
    }
}
