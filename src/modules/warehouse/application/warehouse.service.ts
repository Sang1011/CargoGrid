import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { WarehouseEntity } from '../domain/warehouse.entity';
import { WarehouseRepository } from '../infrastructure/warehouse.repository';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseType } from 'src/common/enums';

@Injectable()
export class WarehouseService extends BaseService<WarehouseEntity, CreateWarehouseDto, UpdateWarehouseDto> {
    constructor(private readonly warehouseRepo: WarehouseRepository) {
        super(warehouseRepo);
    }

    protected get entityName() {
        return 'Warehouse';
    }

    findAllFiltered(filters: { scenarioId?: string; type?: WarehouseType; isActive?: boolean }): Promise<WarehouseEntity[]> {
        return this.warehouseRepo.findAllWithFilters(filters);
    }

    create(dto: CreateWarehouseDto): Promise<WarehouseEntity> {
        const { allowedVehicles, ...whData } = dto;
        return this.warehouseRepo.createWithAllowedVehicles({
            warehouseData: {
                scenarioId: whData.scenarioId,
                name: whData.name,
                code: whData.code,
                type: whData.type,
                geoLat: whData.geoLat ?? null,
                geoLng: whData.geoLng ?? null,
                localX: whData.localX ?? null,
                localY: whData.localY ?? null,
                totalAreaSqm: whData.totalAreaSqm ?? null,
                tempMin: whData.tempMin ?? null,
                tempMax: whData.tempMax ?? null,
                doorCount: whData.doorCount ?? 1,
                doorWidthM: whData.doorWidthM ?? null,
                doorHeightM: whData.doorHeightM ?? null,
                maxWeightKg: whData.maxWeightKg ?? null,
                maxVolumeM3: whData.maxVolumeM3 ?? null,
                gridCols: whData.gridCols ?? null,
                gridRows: whData.gridRows ?? null,
                gridCellWidthM: whData.gridCellWidthM ?? null,
                gridCellDepthM: whData.gridCellDepthM ?? null,
                isActive: whData.isActive ?? true,
                notes: whData.notes ?? null,
            },
            allowedVehicles: allowedVehicles ?? [],
        });
    }

    async update(id: string, dto: UpdateWarehouseDto): Promise<WarehouseEntity> {
        await this.findOne(id);
        const { allowedVehicles, ...whData } = dto;
        const data: any = {};
        if (whData.name !== undefined) data.name = whData.name;
        if (whData.code !== undefined) data.code = whData.code;
        if (whData.type !== undefined) data.type = whData.type;
        if (whData.geoLat !== undefined) data.geoLat = whData.geoLat;
        if (whData.geoLng !== undefined) data.geoLng = whData.geoLng;
        if (whData.localX !== undefined) data.localX = whData.localX;
        if (whData.localY !== undefined) data.localY = whData.localY;
        if (whData.totalAreaSqm !== undefined) data.totalAreaSqm = whData.totalAreaSqm;
        if (whData.tempMin !== undefined) data.tempMin = whData.tempMin;
        if (whData.tempMax !== undefined) data.tempMax = whData.tempMax;
        if (whData.doorCount !== undefined) data.doorCount = whData.doorCount;
        if (whData.doorWidthM !== undefined) data.doorWidthM = whData.doorWidthM;
        if (whData.doorHeightM !== undefined) data.doorHeightM = whData.doorHeightM;
        if (whData.maxWeightKg !== undefined) data.maxWeightKg = whData.maxWeightKg;
        if (whData.maxVolumeM3 !== undefined) data.maxVolumeM3 = whData.maxVolumeM3;
        if (whData.gridCols !== undefined) data.gridCols = whData.gridCols;
        if (whData.gridRows !== undefined) data.gridRows = whData.gridRows;
        if (whData.gridCellWidthM !== undefined) data.gridCellWidthM = whData.gridCellWidthM;
        if (whData.gridCellDepthM !== undefined) data.gridCellDepthM = whData.gridCellDepthM;
        if (whData.isActive !== undefined) data.isActive = whData.isActive;
        if (whData.notes !== undefined) data.notes = whData.notes;
        return this.repo.update(id, data);
    }

    async deactivate(id: string): Promise<WarehouseEntity> {
        await this.findOne(id);
        return this.warehouseRepo.toggleActive(id, false);
    }

    async activate(id: string): Promise<WarehouseEntity> {
        await this.findOne(id);
        return this.warehouseRepo.toggleActive(id, true);
    }
}
