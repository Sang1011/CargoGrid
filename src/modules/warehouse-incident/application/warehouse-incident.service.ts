import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { WarehouseIncidentEntity } from '../domain/warehouse-incident.entity';
import { WarehouseIncidentRepository } from '../infrastructure/warehouse-incident.repository';
import { CreateWarehouseIncidentDto } from './dto/create-warehouse-incident.dto';
import { UpdateWarehouseIncidentDto } from './dto/update-warehouse-incident.dto';
import { IncidentSeverity, IncidentStatus } from 'src/common/enums';

@Injectable()
export class WarehouseIncidentService extends BaseService<WarehouseIncidentEntity, CreateWarehouseIncidentDto, UpdateWarehouseIncidentDto> {
    constructor(private readonly incidentRepo: WarehouseIncidentRepository) {
        super(incidentRepo);
    }

    protected get entityName() {
        return 'WarehouseIncident';
    }

    findAllFiltered(filters: { warehouseId?: string; status?: IncidentStatus; severity?: IncidentSeverity }): Promise<WarehouseIncidentEntity[]> {
        return this.incidentRepo.findAllWithFilters(filters);
    }

    create(dto: CreateWarehouseIncidentDto): Promise<WarehouseIncidentEntity> {
        return this.repo.create({
            warehouseId: dto.warehouseId,
            incidentType: dto.incidentType,
            severity: dto.severity,
            status: dto.status ?? IncidentStatus.OPEN,
            title: dto.title,
            description: dto.description ?? null,
            affectedTempC: dto.affectedTempC ?? null,
            safeDurationMinutes: dto.safeDurationMinutes ?? null,
            occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
            estimatedDowntimeHours: dto.estimatedDowntimeHours ?? null,
            reportedBy: dto.reportedBy ?? null,
            notes: dto.notes ?? null,
        });
    }

    async update(id: string, dto: UpdateWarehouseIncidentDto): Promise<WarehouseIncidentEntity> {
        await this.findOne(id);
        const data: any = {};
        if (dto.warehouseId !== undefined) data.warehouseId = dto.warehouseId;
        if (dto.incidentType !== undefined) data.incidentType = dto.incidentType;
        if (dto.severity !== undefined) data.severity = dto.severity;
        if (dto.status !== undefined) data.status = dto.status;
        if (dto.title !== undefined) data.title = dto.title;
        if (dto.description !== undefined) data.description = dto.description;
        if (dto.affectedTempC !== undefined) data.affectedTempC = dto.affectedTempC;
        if (dto.safeDurationMinutes !== undefined) data.safeDurationMinutes = dto.safeDurationMinutes;
        if (dto.occurredAt !== undefined) data.occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : null;
        if (dto.estimatedDowntimeHours !== undefined) data.estimatedDowntimeHours = dto.estimatedDowntimeHours;
        if (dto.reportedBy !== undefined) data.reportedBy = dto.reportedBy;
        if (dto.notes !== undefined) data.notes = dto.notes;
        return this.repo.update(id, data);
    }

    async resolve(id: string): Promise<WarehouseIncidentEntity> {
        await this.findOne(id);
        return this.incidentRepo.updateStatus(id, IncidentStatus.RESOLVED, { resolvedAt: new Date() });
    }

    async close(id: string): Promise<WarehouseIncidentEntity> {
        await this.findOne(id);
        return this.incidentRepo.updateStatus(id, IncidentStatus.CLOSED);
    }
}
