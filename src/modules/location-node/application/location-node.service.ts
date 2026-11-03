import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { LocationNodeEntity } from '../domain/location-node.entity';
import { LocationNodeRepository } from '../infrastructure/location-node.repository';
import { CreateLocationNodeDto } from './dto/create-location-node.dto';
import { UpdateLocationNodeDto } from './dto/update-location-node.dto';
import { LocationNodeType } from 'src/common/enums';
import { RouteService } from 'src/modules/route/application/route.service';

@Injectable()
export class LocationNodeService extends BaseService<LocationNodeEntity, CreateLocationNodeDto, UpdateLocationNodeDto> {
    constructor(private readonly nodeRepo: LocationNodeRepository, private readonly routes: RouteService) {
        super(nodeRepo);
    }

    protected get entityName() {
        return 'LocationNode';
    }

    findAllFiltered(filters: { scenarioId?: string; nodeType?: LocationNodeType; warehouseId?: string; isActive?: boolean }): Promise<LocationNodeEntity[]> {
        return this.nodeRepo.findAllWithFilters(filters);
    }

    async create(dto: CreateLocationNodeDto): Promise<LocationNodeEntity> {
        const created = await this.repo.create({
            scenarioId: dto.scenarioId,
            name: dto.name,
            code: dto.code,
            nodeType: dto.nodeType,
            geoLat: dto.geoLat ?? null,
            geoLng: dto.geoLng ?? null,
            localX: dto.localX ?? null,
            localY: dto.localY ?? null,
            warehouseId: dto.warehouseId ?? null,
            slotId: dto.slotId ?? null,
            isActive: dto.isActive ?? true,
            metadata: dto.metadata ?? null,
        });
        this.routes.invalidate(created.scenarioId);
        return created;
    }

    async update(id: string, dto: UpdateLocationNodeDto): Promise<LocationNodeEntity> {
        const before = await this.findOne(id);
        const data: any = {};
        if (dto.scenarioId !== undefined) data.scenarioId = dto.scenarioId;
        if (dto.name !== undefined) data.name = dto.name;
        if (dto.code !== undefined) data.code = dto.code;
        if (dto.nodeType !== undefined) data.nodeType = dto.nodeType;
        if (dto.geoLat !== undefined) data.geoLat = dto.geoLat;
        if (dto.geoLng !== undefined) data.geoLng = dto.geoLng;
        if (dto.localX !== undefined) data.localX = dto.localX;
        if (dto.localY !== undefined) data.localY = dto.localY;
        if (dto.warehouseId !== undefined) data.warehouseId = dto.warehouseId;
        if (dto.slotId !== undefined) data.slotId = dto.slotId;
        if (dto.isActive !== undefined) data.isActive = dto.isActive;
        if (dto.metadata !== undefined) data.metadata = dto.metadata;
        const updated = await this.repo.update(id, data);
        this.routes.invalidate(before.scenarioId);
        this.routes.invalidate(updated.scenarioId);
        return updated;
    }

    async remove(id: string): Promise<void> {
        const before = await this.findOne(id);
        await super.remove(id);
        this.routes.invalidate(before.scenarioId);
    }
}
