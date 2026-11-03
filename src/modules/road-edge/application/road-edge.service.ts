import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { RoadEdgeEntity } from '../domain/road-edge.entity';
import { RoadEdgeRepository } from '../infrastructure/road-edge.repository';
import { CreateRoadEdgeDto } from './dto/create-road-edge.dto';
import { UpdateRoadEdgeDto } from './dto/update-road-edge.dto';
import { RoadDirection } from 'src/common/enums';
import { RouteService } from 'src/modules/route/application/route.service';

@Injectable()
export class RoadEdgeService extends BaseService<RoadEdgeEntity, CreateRoadEdgeDto, UpdateRoadEdgeDto> {
    constructor(private readonly edgeRepo: RoadEdgeRepository, private readonly routes: RouteService) {
        super(edgeRepo);
    }

    protected get entityName() {
        return 'RoadEdge';
    }

    findAllFiltered(filters: { scenarioId?: string; fromNodeId?: string; toNodeId?: string; isBlocked?: boolean }): Promise<RoadEdgeEntity[]> {
        return this.edgeRepo.findAllWithFilters(filters);
    }

    async create(dto: CreateRoadEdgeDto): Promise<RoadEdgeEntity> {
        const created = await this.createEdge(dto);
        this.routes.invalidate(created.scenarioId);
        return created;
    }

    private createEdge(dto: CreateRoadEdgeDto): Promise<RoadEdgeEntity> {
        const { allowedVehicles, ...edgeData } = dto;
        return this.edgeRepo.createWithAllowedVehicles({
            edgeData: {
                scenarioId: edgeData.scenarioId,
                fromNodeId: edgeData.fromNodeId,
                toNodeId: edgeData.toNodeId,
                distanceM: edgeData.distanceM,
                direction: edgeData.direction ?? RoadDirection.TWO_WAY,
                widthM: edgeData.widthM ?? null,
                congestionLevel: edgeData.congestionLevel ?? 0,
                isBlocked: edgeData.isBlocked ?? false,
                notes: edgeData.notes ?? null,
            },
            allowedVehicles: allowedVehicles ?? [],
        });
    }

    async update(id: string, dto: UpdateRoadEdgeDto): Promise<RoadEdgeEntity> {
        const before = await this.findOne(id);
        const data: any = {};
        if (dto.scenarioId !== undefined) data.scenarioId = dto.scenarioId;
        if (dto.fromNodeId !== undefined) data.fromNodeId = dto.fromNodeId;
        if (dto.toNodeId !== undefined) data.toNodeId = dto.toNodeId;
        if (dto.distanceM !== undefined) data.distanceM = dto.distanceM;
        if (dto.direction !== undefined) data.direction = dto.direction;
        if (dto.widthM !== undefined) data.widthM = dto.widthM;
        if (dto.congestionLevel !== undefined) data.congestionLevel = dto.congestionLevel;
        if (dto.isBlocked !== undefined) data.isBlocked = dto.isBlocked;
        if (dto.notes !== undefined) data.notes = dto.notes;
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

    async block(id: string): Promise<RoadEdgeEntity> {
        const before = await this.findOne(id);
        const updated = await this.edgeRepo.toggleBlocked(id, true);
        this.routes.invalidate(before.scenarioId);
        return updated;
    }

    async unblock(id: string): Promise<RoadEdgeEntity> {
        const before = await this.findOne(id);
        const updated = await this.edgeRepo.toggleBlocked(id, false);
        this.routes.invalidate(before.scenarioId);
        return updated;
    }
}
