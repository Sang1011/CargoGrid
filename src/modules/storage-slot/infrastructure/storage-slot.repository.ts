import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { StorageSlotEntity } from '../domain/storage-slot.entity';
import { ZoneType } from 'src/common/enums';
import { Prisma } from '@prisma/client';

const slotInclude = {
    zone: { select: { id: true, code: true, name: true } },
    warehouse: { select: { id: true, code: true, name: true } },
    allowedVehicles: { select: { vehicleType: true } },
} satisfies Prisma.StorageSlotInclude;

@Injectable()
export class StorageSlotRepository extends BaseRepository<StorageSlotEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.storageSlot);
    }

    protected toEntity(raw: any): StorageSlotEntity {
        return new StorageSlotEntity({
            id: raw.id,
            zoneId: raw.zoneId,
            warehouseId: raw.warehouseId,
            name: raw.name,
            localX: Number(raw.localX),
            localY: Number(raw.localY),
            localZ: Number(raw.localZ),
            widthM: Number(raw.widthM),
            depthM: Number(raw.depthM),
            heightM: Number(raw.heightM),
            maxWeightKg: Number(raw.maxWeightKg),
            currentWeightKg: Number(raw.currentWeightKg),
            maxVolumeM3: Number(raw.maxVolumeM3),
            currentVolumeM3: Number(raw.currentVolumeM3),
            aisleWidthM: raw.aisleWidthM ? Number(raw.aisleWidthM) : null,
            zoneType: raw.zoneType as ZoneType,
            rowIndex: raw.rowIndex,
            colIndex: raw.colIndex,
            colSpan: raw.colSpan,
            rowSpan: raw.rowSpan,
            rotationDeg: raw.rotationDeg,
            displayLabel: raw.displayLabel ?? null,
            isBlocked: raw.isBlocked,
            isActive: raw.isActive,
        });
    }

    findAllWithFilters(filters: {
        warehouseId?: string;
        zoneId?: string;
        zoneType?: ZoneType;
        isBlocked?: boolean;
        isActive?: boolean;
    }): Promise<StorageSlotEntity[]> {
        const where: any = {};
        if (filters.warehouseId) where.warehouseId = filters.warehouseId;
        if (filters.zoneId) where.zoneId = filters.zoneId;
        if (filters.zoneType) where.zoneType = filters.zoneType;
        if (filters.isBlocked !== undefined) where.isBlocked = filters.isBlocked;
        if (filters.isActive !== undefined) where.isActive = filters.isActive;
        return this.findAll(where);
    }

    async findByIdWithRelations(id: string): Promise<(StorageSlotEntity & { zone?: any; warehouse?: any; allowedVehicles?: any[] }) | null> {
        const row = await (this as any).delegate.findUnique({
            where: { id },
            include: slotInclude,
        });
        if (!row) return null;
        const entity = this.toEntity(row);
        return Object.assign(entity, {
            zone: row.zone,
            warehouse: row.warehouse,
            allowedVehicles: row.allowedVehicles,
        });
    }

    async createWithAllowedVehicles(data: {
        slotData: Record<string, any>;
        allowedVehicles: { vehicleType: string }[];
    }): Promise<StorageSlotEntity & { allowedVehicles?: any[] }> {
        const row = await (this as any).delegate.create({
            data: {
                ...data.slotData,
                allowedVehicles: {
                    create: data.allowedVehicles.map(av => ({
                        vehicleType: av.vehicleType,
                    })),
                },
            },
            include: slotInclude,
        });
        const entity = this.toEntity(row);
        return Object.assign(entity, {
            zone: row.zone,
            warehouse: row.warehouse,
            allowedVehicles: row.allowedVehicles,
        });
    }

    async toggleBlocked(id: string, isBlocked: boolean): Promise<StorageSlotEntity> {
        const row = await (this as any).delegate.update({
            where: { id },
            data: { isBlocked },
        });
        return this.toEntity(row);
    }
}
