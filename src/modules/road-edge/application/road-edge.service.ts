import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { RoadEdgeEntity } from '../domain/road-edge.entity';
import { RoadEdgeRepository } from '../infrastructure/road-edge.repository';
import { CreateRoadEdgeDto } from './dto/create-road-edge.dto';
import { UpdateRoadEdgeDto } from './dto/update-road-edge.dto';
import { RoadDirection } from 'src/common/enums';

@Injectable()
export class RoadEdgeService extends BaseService<RoadEdgeEntity, CreateRoadEdgeDto, UpdateRoadEdgeDto> {
    constructor(private readonly edgeRepo: RoadEdgeRepository) {
        super(edgeRepo);
    }

    protected get entityName() {
        return 'RoadEdge';
    }

    findAllFiltered(filters: { scenarioId?: string; fromNodeId?: string; toNodeId?: string; isBlocked?: boolean }): Promise<RoadEdgeEntity[]> {
        return this.edgeRepo.findAllWithFilters(filters);
    }

    create(dto: CreateRoadEdgeDto): Promise<RoadEdgeEntity> {
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
        await this.findOne(id);
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
        return this.repo.update(id, data);
    }

    async block(id: string): Promise<RoadEdgeEntity> {
        await this.findOne(id);
        return this.edgeRepo.toggleBlocked(id, true);
    }

    async unblock(id: string): Promise<RoadEdgeEntity> {
        await this.findOne(id);
        return this.edgeRepo.toggleBlocked(id, false);
    }
}
