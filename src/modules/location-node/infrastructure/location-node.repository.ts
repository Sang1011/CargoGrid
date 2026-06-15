import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { LocationNodeEntity } from '../domain/location-node.entity';
import { LocationNodeType } from 'src/common/enums';
import { Prisma } from '@prisma/client';

const nodeInclude = {
    warehouse: { select: { id: true, code: true, name: true } },
    slot: { select: { id: true, name: true } },
} satisfies Prisma.LocationNodeInclude;

@Injectable()
export class LocationNodeRepository extends BaseRepository<LocationNodeEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.locationNode);
    }

    protected toEntity(raw: any): LocationNodeEntity {
        return new LocationNodeEntity({
            id: raw.id,
            scenarioId: raw.scenarioId,
            name: raw.name,
            code: raw.code,
            nodeType: raw.nodeType as LocationNodeType,
            geoLat: raw.geoLat ? Number(raw.geoLat) : null,
            geoLng: raw.geoLng ? Number(raw.geoLng) : null,
            localX: raw.localX ? Number(raw.localX) : null,
            localY: raw.localY ? Number(raw.localY) : null,
            warehouseId: raw.warehouseId ?? null,
            slotId: raw.slotId ?? null,
            isActive: raw.isActive,
            metadata: raw.metadata,
        });
    }

    findAllWithFilters(filters: {
        scenarioId?: string;
        nodeType?: LocationNodeType;
        warehouseId?: string;
        isActive?: boolean;
    }): Promise<LocationNodeEntity[]> {
        const where: any = {};
        if (filters.scenarioId) where.scenarioId = filters.scenarioId;
        if (filters.nodeType) where.nodeType = filters.nodeType;
        if (filters.warehouseId) where.warehouseId = filters.warehouseId;
        if (filters.isActive !== undefined) where.isActive = filters.isActive;
        return this.findAll(where);
    }

    async findByIdWithRelations(id: string): Promise<(LocationNodeEntity & { warehouse?: any; slot?: any }) | null> {
        const row = await (this as any).delegate.findUnique({
            where: { id },
            include: nodeInclude,
        });
        if (!row) return null;
        const entity = this.toEntity(row);
        return Object.assign(entity, {
            warehouse: row.warehouse,
            slot: row.slot,
        });
    }
}
