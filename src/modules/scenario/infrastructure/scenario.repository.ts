import { Injectable } from '@nestjs/common';
import { ScenarioEntity } from '../domain/scenario.entity';
import { ScenarioStatus } from 'src/common/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';

@Injectable()
export class ScenarioRepository extends BaseRepository<ScenarioEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.scenario);
    }

    protected toEntity(raw: any): ScenarioEntity {
        return new ScenarioEntity({
            id: raw.id,
            name: raw.name,
            description: raw.description ?? null,
            status: raw.status as ScenarioStatus,
            tags: raw.tags,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }

    // Custom query ngoài base
    findByStatus(status: ScenarioStatus): Promise<ScenarioEntity[]> {
        return this.findAll({ status });
    }
}