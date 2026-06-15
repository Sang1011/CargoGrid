import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { WarehouseIncidentEntity } from '../domain/warehouse-incident.entity';
import { IncidentSeverity, IncidentStatus, IncidentType } from 'src/common/enums';
import { Prisma } from '@prisma/client';

const incidentInclude = {
    warehouse: { select: { id: true, code: true, name: true } },
} satisfies Prisma.WarehouseIncidentInclude;

@Injectable()
export class WarehouseIncidentRepository extends BaseRepository<WarehouseIncidentEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.warehouseIncident);
    }

    protected toEntity(raw: any): WarehouseIncidentEntity {
        return new WarehouseIncidentEntity({
            id: raw.id,
            warehouseId: raw.warehouseId,
            incidentType: raw.incidentType as IncidentType,
            severity: raw.severity as IncidentSeverity,
            status: raw.status as IncidentStatus,
            title: raw.title,
            description: raw.description ?? null,
            affectedTempC: raw.affectedTempC ? Number(raw.affectedTempC) : null,
            safeDurationMinutes: raw.safeDurationMinutes ?? null,
            occurredAt: raw.occurredAt,
            resolvedAt: raw.resolvedAt ?? null,
            estimatedDowntimeHours: raw.estimatedDowntimeHours ?? null,
            reportedBy: raw.reportedBy ?? null,
            notes: raw.notes ?? null,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }

    findAllWithFilters(filters: {
        warehouseId?: string;
        status?: IncidentStatus;
        severity?: IncidentSeverity;
    }): Promise<WarehouseIncidentEntity[]> {
        const where: any = {};
        if (filters.warehouseId) where.warehouseId = filters.warehouseId;
        if (filters.status) where.status = filters.status;
        if (filters.severity) where.severity = filters.severity;
        return this.findAll(where);
    }

    async findByIdWithWarehouse(id: string): Promise<(WarehouseIncidentEntity & { warehouse?: any }) | null> {
        const row = await (this as any).delegate.findUnique({
            where: { id },
            include: incidentInclude,
        });
        if (!row) return null;
        const entity = this.toEntity(row);
        return Object.assign(entity, { warehouse: row.warehouse });
    }

    async updateStatus(id: string, status: IncidentStatus, extra?: Record<string, any>): Promise<WarehouseIncidentEntity> {
        const row = await (this as any).delegate.update({
            where: { id },
            data: { status, ...extra },
        });
        return this.toEntity(row);
    }
}
