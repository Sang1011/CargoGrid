import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { VehicleEntity } from '../domain/vehicle.entity';
import { VehicleScope, VehicleStatus, VehicleType } from 'src/common/enums';
import { Prisma } from '@prisma/client';

const vehicleInclude = {
    homeWarehouse: { select: { id: true, code: true, name: true } },
} satisfies Prisma.VehicleInclude;

@Injectable()
export class VehicleRepository extends BaseRepository<VehicleEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.vehicle);
    }

    protected toEntity(raw: any): VehicleEntity {
        return new VehicleEntity({
            id: raw.id,
            scenarioId: raw.scenarioId,
            code: raw.code,
            name: raw.name ?? null,
            vehicleType: raw.vehicleType as VehicleType,
            scope: raw.scope as VehicleScope,
            homeWarehouseId: raw.homeWarehouseId ?? null,
            status: raw.status as VehicleStatus,
            maxLoadKg: Number(raw.maxLoadKg),
            maxVolumeM3: raw.maxVolumeM3 ? Number(raw.maxVolumeM3) : null,
            widthM: raw.widthM ? Number(raw.widthM) : null,
            heightM: raw.heightM ? Number(raw.heightM) : null,
            speedRating: raw.speedRating ?? null,
            notes: raw.notes ?? null,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }

    findAllWithFilters(filters: {
        scenarioId?: string;
        vehicleType?: VehicleType;
        scope?: VehicleScope;
        status?: VehicleStatus;
    }): Promise<VehicleEntity[]> {
        const where: any = {};
        if (filters.scenarioId) where.scenarioId = filters.scenarioId;
        if (filters.vehicleType) where.vehicleType = filters.vehicleType;
        if (filters.scope) where.scope = filters.scope;
        if (filters.status) where.status = filters.status;
        return this.findAll(where);
    }

    async findByIdWithHomeWarehouse(id: string): Promise<VehicleEntity & { homeWarehouse?: any } | null> {
        const row = await (this as any).delegate.findUnique({
            where: { id },
            include: vehicleInclude,
        });
        if (!row) return null;
        const entity = this.toEntity(row);
        return Object.assign(entity, { homeWarehouse: row.homeWarehouse });
    }

    async updateStatus(id: string, status: VehicleStatus): Promise<VehicleEntity> {
        const row = await (this as any).delegate.update({
            where: { id },
            data: { status },
        });
        return this.toEntity(row);
    }
}
