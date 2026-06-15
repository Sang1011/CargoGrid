import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { ZoneEntity } from '../domain/zone.entity';
import { ZoneType } from 'src/common/enums';
import { Prisma } from '@prisma/client';

const zoneInclude = {
    warehouse: { select: { id: true, code: true, name: true, type: true } },
} satisfies Prisma.ZoneInclude;

@Injectable()
export class ZoneRepository extends BaseRepository<ZoneEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.zone);
    }

    protected toEntity(raw: any): ZoneEntity {
        return new ZoneEntity({
            id: raw.id,
            warehouseId: raw.warehouseId,
            name: raw.name,
            code: raw.code,
            zoneType: raw.zoneType as ZoneType,
            localX: Number(raw.localX),
            localY: Number(raw.localY),
            width: Number(raw.width),
            depth: Number(raw.depth),
            tempMin: raw.tempMin ? Number(raw.tempMin) : null,
            tempMax: raw.tempMax ? Number(raw.tempMax) : null,
            maxWeightKg: raw.maxWeightKg ? Number(raw.maxWeightKg) : null,
            currentWeightKg: Number(raw.currentWeightKg),
            maxVolumeM3: raw.maxVolumeM3 ? Number(raw.maxVolumeM3) : null,
            currentVolumeM3: Number(raw.currentVolumeM3),
            gridColStart: raw.gridColStart,
            gridRowStart: raw.gridRowStart,
            gridCols: raw.gridCols,
            gridRows: raw.gridRows,
            isActive: raw.isActive,
        });
    }

    findAllWithFilters(filters: {
        warehouseId?: string;
        zoneType?: ZoneType;
        isActive?: boolean;
    }): Promise<ZoneEntity[]> {
        const where: any = {};
        if (filters.warehouseId) where.warehouseId = filters.warehouseId;
        if (filters.zoneType) where.zoneType = filters.zoneType;
        if (filters.isActive !== undefined) where.isActive = filters.isActive;
        return this.findAll(where);
    }

    async findByIdWithWarehouse(id: string): Promise<(ZoneEntity & { warehouse?: any }) | null> {
        const row = await (this as any).delegate.findUnique({
            where: { id },
            include: zoneInclude,
        });
        if (!row) return null;
        const entity = this.toEntity(row);
        return Object.assign(entity, { warehouse: row.warehouse });
    }
}
