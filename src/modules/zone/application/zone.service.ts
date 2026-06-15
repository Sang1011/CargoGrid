import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { ZoneEntity } from '../domain/zone.entity';
import { ZoneRepository } from '../infrastructure/zone.repository';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ZoneType } from 'src/common/enums';

@Injectable()
export class ZoneService extends BaseService<ZoneEntity, CreateZoneDto, UpdateZoneDto> {
    constructor(private readonly zoneRepo: ZoneRepository) {
        super(zoneRepo);
    }

    protected get entityName() {
        return 'Zone';
    }

    findAllFiltered(filters: { warehouseId?: string; zoneType?: ZoneType; isActive?: boolean }): Promise<ZoneEntity[]> {
        return this.zoneRepo.findAllWithFilters(filters);
    }

    create(dto: CreateZoneDto): Promise<ZoneEntity> {
        return this.repo.create({
            warehouseId: dto.warehouseId,
            name: dto.name,
            code: dto.code,
            zoneType: dto.zoneType,
            localX: dto.localX,
            localY: dto.localY,
            width: dto.width,
            depth: dto.depth,
            tempMin: dto.tempMin ?? null,
            tempMax: dto.tempMax ?? null,
            maxWeightKg: dto.maxWeightKg ?? null,
            maxVolumeM3: dto.maxVolumeM3 ?? null,
            gridColStart: dto.gridColStart ?? 0,
            gridRowStart: dto.gridRowStart ?? 0,
            gridCols: dto.gridCols ?? 1,
            gridRows: dto.gridRows ?? 1,
            isActive: dto.isActive ?? true,
        });
    }

    async update(id: string, dto: UpdateZoneDto): Promise<ZoneEntity> {
        await this.findOne(id);
        const data: any = {};
        if (dto.warehouseId !== undefined) data.warehouseId = dto.warehouseId;
        if (dto.name !== undefined) data.name = dto.name;
        if (dto.code !== undefined) data.code = dto.code;
        if (dto.zoneType !== undefined) data.zoneType = dto.zoneType;
        if (dto.localX !== undefined) data.localX = dto.localX;
        if (dto.localY !== undefined) data.localY = dto.localY;
        if (dto.width !== undefined) data.width = dto.width;
        if (dto.depth !== undefined) data.depth = dto.depth;
        if (dto.tempMin !== undefined) data.tempMin = dto.tempMin;
        if (dto.tempMax !== undefined) data.tempMax = dto.tempMax;
        if (dto.maxWeightKg !== undefined) data.maxWeightKg = dto.maxWeightKg;
        if (dto.maxVolumeM3 !== undefined) data.maxVolumeM3 = dto.maxVolumeM3;
        if (dto.gridColStart !== undefined) data.gridColStart = dto.gridColStart;
        if (dto.gridRowStart !== undefined) data.gridRowStart = dto.gridRowStart;
        if (dto.gridCols !== undefined) data.gridCols = dto.gridCols;
        if (dto.gridRows !== undefined) data.gridRows = dto.gridRows;
        if (dto.isActive !== undefined) data.isActive = dto.isActive;
        return this.repo.update(id, data);
    }
}
