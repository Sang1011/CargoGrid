import { LocationNodeType } from "src/common/enums";

export interface LocationNodeProps {
    id: string;
    scenarioId: string;
    name: string;
    code: string;
    nodeType: LocationNodeType;
    geoLat: number | null;
    geoLng: number | null;
    localX: number | null;
    localY: number | null;
    warehouseId: string | null;
    slotId: string | null;
    isActive: boolean;
    metadata: any | null;
}

export class LocationNodeEntity {
    readonly id!: string;
    readonly scenarioId!: string;
    readonly name!: string;
    readonly code!: string;
    readonly nodeType!: LocationNodeType;
    readonly geoLat!: number | null;
    readonly geoLng!: number | null;
    readonly localX!: number | null;
    readonly localY!: number | null;
    readonly warehouseId!: string | null;
    readonly slotId!: string | null;
    readonly isActive!: boolean;
    readonly metadata!: any | null;

    constructor(props: LocationNodeProps) {
        Object.assign(this, props);
    }
}
