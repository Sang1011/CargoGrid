import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { OptimizationRunEntity } from '../domain/optimization-run.entity';
import { AlgorithmType, OptimizationContextType } from 'src/common/enums';

interface RunFilters {
    algorithm?: AlgorithmType;
    contextType?: OptimizationContextType;
}

@Injectable()
export class OptimizationRunRepository extends BaseRepository<OptimizationRunEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.optimizationRun);
    }

    protected toEntity(raw: any): OptimizationRunEntity {
        return new OptimizationRunEntity({
            id: raw.id,
            scenarioId: raw.scenarioId,
            contextType: raw.contextType as OptimizationContextType,
            contextId: raw.contextId ?? null,
            algorithm: raw.algorithm as AlgorithmType,
            weightCapacityFit: Number(raw.weightCapacityFit),
            weightMovementCost: Number(raw.weightMovementCost),
            weightCategoryMatch: Number(raw.weightCategoryMatch),
            weightVehicleAccess: Number(raw.weightVehicleAccess),
            weightDemandPriority: Number(raw.weightDemandPriority),
            weightCongestion: Number(raw.weightCongestion),
            productsTotal: raw.productsTotal,
            productsAssigned: raw.productsAssigned,
            productsUnassigned: raw.productsUnassigned,
            hardViolations: raw.hardViolations,
            totalMovementCost: raw.totalMovementCost ? Number(raw.totalMovementCost) : null,
            avgRetrievalCost: raw.avgRetrievalCost ? Number(raw.avgRetrievalCost) : null,
            spaceUtilization: raw.spaceUtilization ? Number(raw.spaceUtilization) : null,
            congestionScore: raw.congestionScore ? Number(raw.congestionScore) : null,
            runtimeMs: raw.runtimeMs,
            optimizationScore: raw.optimizationScore ? Number(raw.optimizationScore) : null,
            resultSnapshot: raw.resultSnapshot,
            createdAt: raw.createdAt,
        });
    }

    async findByScenario(scenarioId: string, filters?: RunFilters): Promise<OptimizationRunEntity[]> {
        const where: Record<string, any> = { scenarioId };

        if (filters?.algorithm) {
            where.algorithm = filters.algorithm;
        }
        if (filters?.contextType) {
            where.contextType = filters.contextType;
        }

        return this.findAll(where);
    }

    async findByIdWithAssignments(id: string): Promise<{
        run: OptimizationRunEntity;
        assignments: any[];
    } | null> {
        const row = await this.prisma.optimizationRun.findUnique({
            where: { id },
            include: { assignments: true },
        });

        if (!row) return null;

        return {
            run: this.toEntity(row),
            assignments: row.assignments,
        };
    }
}
