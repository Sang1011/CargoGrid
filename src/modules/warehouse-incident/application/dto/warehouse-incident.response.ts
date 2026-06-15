import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WarehouseIncidentEntity } from '../../domain/warehouse-incident.entity';
import { IncidentSeverity, IncidentStatus, IncidentType } from 'src/common/enums';

class WarehouseRef {
    @ApiProperty() id!: string;
    @ApiProperty() code!: string;
    @ApiProperty() name!: string;
}

export class WarehouseIncidentResponse {
    @ApiProperty() id!: string;
    @ApiProperty() warehouseId!: string;
    @ApiProperty({ enum: IncidentType }) incidentType!: IncidentType;
    @ApiProperty({ enum: IncidentSeverity }) severity!: IncidentSeverity;
    @ApiProperty({ enum: IncidentStatus }) status!: IncidentStatus;
    @ApiProperty() title!: string;
    @ApiPropertyOptional() description!: string | null;
    @ApiPropertyOptional() affectedTempC!: number | null;
    @ApiPropertyOptional() safeDurationMinutes!: number | null;
    @ApiProperty() occurredAt!: Date;
    @ApiPropertyOptional() resolvedAt!: Date | null;
    @ApiPropertyOptional() estimatedDowntimeHours!: number | null;
    @ApiPropertyOptional() reportedBy!: string | null;
    @ApiPropertyOptional() notes!: string | null;
    @ApiProperty() createdAt!: Date;
    @ApiProperty() updatedAt!: Date;
    @ApiPropertyOptional() warehouse?: WarehouseRef;

    static fromEntity(entity: WarehouseIncidentEntity, relations?: { warehouse?: any }): WarehouseIncidentResponse {
        const res = new WarehouseIncidentResponse();
        res.id = entity.id;
        res.warehouseId = entity.warehouseId;
        res.incidentType = entity.incidentType;
        res.severity = entity.severity;
        res.status = entity.status;
        res.title = entity.title;
        res.description = entity.description;
        res.affectedTempC = entity.affectedTempC;
        res.safeDurationMinutes = entity.safeDurationMinutes;
        res.occurredAt = entity.occurredAt;
        res.resolvedAt = entity.resolvedAt;
        res.estimatedDowntimeHours = entity.estimatedDowntimeHours;
        res.reportedBy = entity.reportedBy;
        res.notes = entity.notes;
        res.createdAt = entity.createdAt;
        res.updatedAt = entity.updatedAt;
        if (relations?.warehouse) res.warehouse = relations.warehouse;
        return res;
    }
}
