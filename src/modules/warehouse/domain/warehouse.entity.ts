import { WarehouseType } from "src/common/enums";

export interface WarehouseProps {
    id: string;
    scenarioId: string;
    name: string;
    code: string;
    type: WarehouseType;
    geoLat: number | null;
    geoLng: number | null;
    localX: number | null;
    localY: number | null;
    totalAreaSqm: number | null;
    tempMin: number | null;
    tempMax: number | null;
    doorCount: number;
    doorWidthM: number | null;
    doorHeightM: number | null;
    maxWeightKg: number | null;
    currentWeightKg: number;
    maxVolumeM3: number | null;
    currentVolumeM3: number;
    gridCols: number | null;
    gridRows: number | null;
    gridCellWidthM: number | null;
    gridCellDepthM: number | null;
    isActive: boolean;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class WarehouseEntity {
    readonly id!: string;
    readonly scenarioId!: string;
    readonly name!: string;
    readonly code!: string;
    readonly type!: WarehouseType;
    readonly geoLat!: number | null;
    readonly geoLng!: number | null;
    readonly localX!: number | null;
    readonly localY!: number | null;
    readonly totalAreaSqm!: number | null;
    readonly tempMin!: number | null;
    readonly tempMax!: number | null;
    readonly doorCount!: number;
    readonly doorWidthM!: number | null;
    readonly doorHeightM!: number | null;
    readonly maxWeightKg!: number | null;
    readonly currentWeightKg!: number;
    readonly maxVolumeM3!: number | null;
    readonly currentVolumeM3!: number;
    readonly gridCols!: number | null;
    readonly gridRows!: number | null;
    readonly gridCellWidthM!: number | null;
    readonly gridCellDepthM!: number | null;
    readonly isActive!: boolean;
    readonly notes!: string | null;
    readonly createdAt!: Date;
    readonly updatedAt!: Date;

    constructor(props: WarehouseProps) {
        Object.assign(this, props);
    }

    isActiveStatus(): boolean {
        return this.isActive;
    }
}
