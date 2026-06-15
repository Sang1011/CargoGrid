import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { StorageSlotEntity } from '../domain/storage-slot.entity';
import { StorageSlotRepository } from '../infrastructure/storage-slot.repository';
import { CreateStorageSlotDto } from './dto/create-storage-slot.dto';
import { UpdateStorageSlotDto } from './dto/update-storage-slot.dto';
import { ZoneType } from 'src/common/enums';

@Injectable()
export class StorageSlotService extends BaseService<StorageSlotEntity, CreateStorageSlotDto, UpdateStorageSlotDto> {
    constructor(private readonly slotRepo: StorageSlotRepository) {
        super(slotRepo);
    }

    protected get entityName() {
        return 'StorageSlot';
    }

    findAllFiltered(filters: {
        warehouseId?: string;
        zoneId?: string;
        zoneType?: ZoneType;
        isBlocked?: boolean;
        isActive?: boolean;
    }): Promise<StorageSlotEntity[]> {
        return this.slotRepo.findAllWithFilters(filters);
    }

    create(dto: CreateStorageSlotDto): Promise<StorageSlotEntity> {
        const { allowedVehicles, ...slotData } = dto;
        return this.slotRepo.createWithAllowedVehicles({
            slotData: {
                zoneId: slotData.zoneId,
                warehouseId: slotData.warehouseId,
                name: slotData.name,
                localX: slotData.localX,
                localY: slotData.localY,
                localZ: slotData.localZ ?? 0,
                widthM: slotData.widthM,
                depthM: slotData.depthM,
                heightM: slotData.heightM,
                maxWeightKg: slotData.maxWeightKg,
                currentWeightKg: 0,
                maxVolumeM3: slotData.maxVolumeM3,
                currentVolumeM3: 0,
                aisleWidthM: slotData.aisleWidthM ?? null,
                zoneType: slotData.zoneType,
                rowIndex: slotData.rowIndex,
                colIndex: slotData.colIndex,
                colSpan: slotData.colSpan ?? 1,
                rowSpan: slotData.rowSpan ?? 1,
                rotationDeg: slotData.rotationDeg ?? 0,
                displayLabel: slotData.displayLabel ?? null,
                isBlocked: slotData.isBlocked ?? false,
                isActive: slotData.isActive ?? true,
            },
            allowedVehicles: allowedVehicles ?? [],
        });
    }

    async update(id: string, dto: UpdateStorageSlotDto): Promise<StorageSlotEntity> {
        await this.findOne(id);
        const data: any = {};
        if (dto.zoneId !== undefined) data.zoneId = dto.zoneId;
        if (dto.warehouseId !== undefined) data.warehouseId = dto.warehouseId;
        if (dto.name !== undefined) data.name = dto.name;
        if (dto.localX !== undefined) data.localX = dto.localX;
        if (dto.localY !== undefined) data.localY = dto.localY;
        if (dto.localZ !== undefined) data.localZ = dto.localZ;
        if (dto.widthM !== undefined) data.widthM = dto.widthM;
        if (dto.depthM !== undefined) data.depthM = dto.depthM;
        if (dto.heightM !== undefined) data.heightM = dto.heightM;
        if (dto.maxWeightKg !== undefined) data.maxWeightKg = dto.maxWeightKg;
        if (dto.maxVolumeM3 !== undefined) data.maxVolumeM3 = dto.maxVolumeM3;
        if (dto.aisleWidthM !== undefined) data.aisleWidthM = dto.aisleWidthM;
        if (dto.zoneType !== undefined) data.zoneType = dto.zoneType;
        if (dto.rowIndex !== undefined) data.rowIndex = dto.rowIndex;
        if (dto.colIndex !== undefined) data.colIndex = dto.colIndex;
        if (dto.colSpan !== undefined) data.colSpan = dto.colSpan;
        if (dto.rowSpan !== undefined) data.rowSpan = dto.rowSpan;
        if (dto.rotationDeg !== undefined) data.rotationDeg = dto.rotationDeg;
        if (dto.displayLabel !== undefined) data.displayLabel = dto.displayLabel;
        if (dto.isBlocked !== undefined) data.isBlocked = dto.isBlocked;
        if (dto.isActive !== undefined) data.isActive = dto.isActive;
        return this.repo.update(id, data);
    }

    async block(id: string): Promise<StorageSlotEntity> {
        await this.findOne(id);
        return this.slotRepo.toggleBlocked(id, true);
    }

    async unblock(id: string): Promise<StorageSlotEntity> {
        await this.findOne(id);
        return this.slotRepo.toggleBlocked(id, false);
    }
}
