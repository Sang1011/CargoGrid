import { IncidentSeverity, IncidentStatus, IncidentType } from "src/common/enums";

export interface WarehouseIncidentProps {
    id: string;
    warehouseId: string;
    incidentType: IncidentType;
    severity: IncidentSeverity;
    status: IncidentStatus;
    title: string;
    description: string | null;
    affectedTempC: number | null;
    safeDurationMinutes: number | null;
    occurredAt: Date;
    resolvedAt: Date | null;
    estimatedDowntimeHours: number | null;
    reportedBy: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class WarehouseIncidentEntity {
    readonly id!: string;
    readonly warehouseId!: string;
    readonly incidentType!: IncidentType;
    readonly severity!: IncidentSeverity;
    readonly status!: IncidentStatus;
    readonly title!: string;
    readonly description!: string | null;
    readonly affectedTempC!: number | null;
    readonly safeDurationMinutes!: number | null;
    readonly occurredAt!: Date;
    readonly resolvedAt!: Date | null;
    readonly estimatedDowntimeHours!: number | null;
    readonly reportedBy!: string | null;
    readonly notes!: string | null;
    readonly createdAt!: Date;
    readonly updatedAt!: Date;

    constructor(props: WarehouseIncidentProps) {
        Object.assign(this, props);
    }
}
