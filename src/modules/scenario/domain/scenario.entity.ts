import { ScenarioStatus } from "src/common/enums";

export interface ScenarioProps {
    id: string;
    name: string;
    description: string | null;
    status: ScenarioStatus;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

export class ScenarioEntity {
    readonly id!: string;
    readonly name!: string;
    readonly description!: string | null;
    readonly status!: ScenarioStatus;
    readonly tags!: string[];
    readonly createdAt!: Date;
    readonly updatedAt!: Date;

    constructor(props: ScenarioProps) {
        Object.assign(this, props);
    }

    isActive(): boolean {
        return this.status === ScenarioStatus.ACTIVE;
    }

    isArchived(): boolean {
        return this.status === ScenarioStatus.ARCHIVED;
    }
}