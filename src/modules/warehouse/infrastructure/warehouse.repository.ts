import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { WarehouseEntity } from '../domain/warehouse.entity';
import { WarehouseType } from 'src/common/enums';
import { Prisma } from '@prisma/client';

const warehouseInclude = {
    allowedVehicles: {
        select: { vehicleType: true, maxLoadKg: true, speedRating: true },
    },
} satisfies Prisma.WarehouseInclude;

@Injectable()
export class WarehouseRepository extends BaseRepository<WarehouseEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.warehouse);
    }

    protected toEntity(raw: any): WarehouseEntity {
        return new WarehouseEntity({
            id: raw.id,
            scenarioId: raw.scenarioId,
            name: raw.name,
            code: raw.code,
            type: raw.type as WarehouseType,
            geoLat: raw.geoLat ? Number(raw.geoLat) : null,
            geoLng: raw.geoLng ? Number(raw.geoLng) : null,
            localX: raw.localX ? Number(raw.localX) : null,
            localY: raw.localY ? Number(raw.localY) : null,
            totalAreaSqm: raw.totalAreaSqm ? Number(raw.totalAreaSqm) : null,
            tempMin: raw.tempMin ? Number(raw.tempMin) : null,
            tempMax: raw.tempMax ? Number(raw.tempMax) : null,
            doorCount: raw.doorCount,
            doorWidthM: raw.doorWidthM ? Number(raw.doorWidthM) : null,
            doorHeightM: raw.doorHeightM ? Number(raw.doorHeightM) : null,
            maxWeightKg: raw.maxWeightKg ? Number(raw.maxWeightKg) : null,
            currentWeightKg: Number(raw.currentWeightKg),
            maxVolumeM3: raw.maxVolumeM3 ? Number(raw.maxVolumeM3) : null,
            currentVolumeM3: Number(raw.currentVolumeM3),
            gridCols: raw.gridCols ?? null,
            gridRows: raw.gridRows ?? null,
            gridCellWidthM: raw.gridCellWidthM ? Number(raw.gridCellWidthM) : null,
            gridCellDepthM: raw.gridCellDepthM ? Number(raw.gridCellDepthM) : null,
            isActive: raw.isActive,
            notes: raw.notes ?? null,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }

    findAllWithFilters(filters: {
        scenarioId?: string;
        type?: WarehouseType;
        isActive?: boolean;
    }): Promise<WarehouseEntity[]> {
        const where: any = {};
        if (filters.scenarioId) where.scenarioId = filters.scenarioId;
        if (filters.type) where.type = filters.type;
        if (filters.isActive !== undefined) where.isActive = filters.isActive;
        return this.findAll(where);
    }

    async findByIdWithAllowedVehicles(id: string): Promise<(WarehouseEntity & { allowedVehicles?: any[] }) | null> {
        const row = await (this as any).delegate.findUnique({
            where: { id },
            include: warehouseInclude,
        });
        if (!row) return null;
        const entity = this.toEntity(row);
        return Object.assign(entity, { allowedVehicles: row.allowedVehicles });
    }

    async createWithAllowedVehicles(data: {
        warehouseData: Record<string, any>;
        allowedVehicles: { vehicleType: string; maxLoadKg?: number; speedRating?: number }[];
    }): Promise<WarehouseEntity & { allowedVehicles?: any[] }> {
        const row = await (this as any).delegate.create({
            data: {
                ...data.warehouseData,
                allowedVehicles: {
                    create: data.allowedVehicles.map(av => ({
                        vehicleType: av.vehicleType,
                        maxLoadKg: av.maxLoadKg ?? null,
                        speedRating: av.speedRating ?? null,
                    })),
                },
            },
            include: warehouseInclude,
        });
        const entity = this.toEntity(row);
        return Object.assign(entity, { allowedVehicles: row.allowedVehicles });
    }

    async toggleActive(id: string, isActive: boolean): Promise<WarehouseEntity> {
        const row = await (this as any).delegate.update({
            where: { id },
            data: { isActive },
        });
        return this.toEntity(row);
    }
}
