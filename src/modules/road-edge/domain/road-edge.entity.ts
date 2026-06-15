import { RoadDirection } from "src/common/enums";

export interface RoadEdgeProps {
    id: string;
    scenarioId: string;
    fromNodeId: string;
    toNodeId: string;
    distanceM: number;
    direction: RoadDirection;
    widthM: number | null;
    congestionLevel: number;
    isBlocked: boolean;
    notes: string | null;
}

export class RoadEdgeEntity {
    readonly id!: string;
    readonly scenarioId!: string;
    readonly fromNodeId!: string;
    readonly toNodeId!: string;
    readonly distanceM!: number;
    readonly direction!: RoadDirection;
    readonly widthM!: number | null;
    readonly congestionLevel!: number;
    readonly isBlocked!: boolean;
    readonly notes!: string | null;

    constructor(props: RoadEdgeProps) {
        Object.assign(this, props);
    }
}
