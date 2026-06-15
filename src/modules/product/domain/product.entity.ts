import { PriorityLevel, ProductCategory, VehicleType, ZoneType } from "src/common/enums";

export interface ProductProps {
    id: string;
    scenarioId: string;
    name: string;
    sku: string | null;
    category: ProductCategory;
    weightKg: number;
    volumeM3: number;
    widthM: number | null;
    depthM: number | null;
    heightM: number | null;
    requiredZone: ZoneType | null;
    requiredTempMin: number | null;
    requiredTempMax: number | null;
    demandFrequency: number;
    priority: PriorityLevel;
    vehicleType: VehicleType;
    preferredEntryNodeId: string | null;
    preferredExitNodeId: string | null;
    notes: string | null;
    createdAt: Date;
}

export class ProductEntity {
    readonly id!: string;
    readonly scenarioId!: string;
    readonly name!: string;
    readonly sku!: string | null;
    readonly category!: ProductCategory;
    readonly weightKg!: number;
    readonly volumeM3!: number;
    readonly widthM!: number | null;
    readonly depthM!: number | null;
    readonly heightM!: number | null;
    readonly requiredZone!: ZoneType | null;
    readonly requiredTempMin!: number | null;
    readonly requiredTempMax!: number | null;
    readonly demandFrequency!: number;
    readonly priority!: PriorityLevel;
    readonly vehicleType!: VehicleType;
    readonly preferredEntryNodeId!: string | null;
    readonly preferredExitNodeId!: string | null;
    readonly notes!: string | null;
    readonly createdAt!: Date;

    constructor(props: ProductProps) {
        Object.assign(this, props);
    }
}
