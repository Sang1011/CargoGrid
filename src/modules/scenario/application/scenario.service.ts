import { Injectable } from '@nestjs/common';
import { ScenarioRepository } from '../infrastructure/scenario.repository';
import { ScenarioEntity } from '../domain/scenario.entity';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { BaseService } from 'src/common/base/base.service';
import { ScenarioStatus } from 'src/common/enums';

@Injectable()
export class ScenarioService extends BaseService<ScenarioEntity, CreateScenarioDto, UpdateScenarioDto> {
    constructor(private readonly scenarioRepo: ScenarioRepository) {
        super(scenarioRepo);
    }

    protected get entityName() {
        return 'Scenario';
    }

    // Override findAll để support filter by status
    findAll(status?: ScenarioStatus): Promise<ScenarioEntity[]> {
        return status
            ? this.scenarioRepo.findByStatus(status)
            : this.repo.findAll();
    }

    create(dto: CreateScenarioDto): Promise<ScenarioEntity> {
        return this.repo.create({
            name: dto.name,
            description: dto.description,
            status: dto.status ?? ScenarioStatus.ACTIVE,
            tags: dto.tags ?? [],
        });
    }

    async update(id: string, dto: UpdateScenarioDto): Promise<ScenarioEntity> {
        await this.findOne(id);
        return this.repo.update(id, {
            ...(dto.name && { name: dto.name }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.status && { status: dto.status }),
            ...(dto.tags && { tags: dto.tags }),
        });
    }

    async archive(id: string): Promise<ScenarioEntity> {
        await this.findOne(id);
        return this.repo.update(id, { status: ScenarioStatus.ARCHIVED });
    }

    async activate(id: string): Promise<ScenarioEntity> {
        await this.findOne(id);
        return this.repo.update(id, { status: ScenarioStatus.ACTIVE });
    }
}