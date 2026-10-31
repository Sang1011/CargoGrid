import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { AssignmentEntity } from '../domain/assignment.entity';
import { AssignmentStatus } from 'src/common/enums';

interface CreateAssignmentInput {
    runId: string;
    productId: string;
    warehouseId?: string | null;
    slotId?: string | null;
    status: AssignmentStatus;
    finalScore?: number | null;
    capacityFitScore?: number | null;
    movementCostScore?: number | null;
    categoryMatchScore?: number | null;
    vehicleAccessScore?: number | null;
    demandPriorityScore?: number | null;
    congestionScore?: number | null;
    routePath?: Record<string, any> | null;
    routeCost?: number | null;
    reasons: string[];
    rejectedCandidates?: Record<string, any> | null;
}

@Injectable()
export class AssignmentRepository extends BaseRepository<AssignmentEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.assignment);
    }

    protected toEntity(raw: any): AssignmentEntity {
        return new AssignmentEntity({
            id: raw.id,
            runId: raw.runId,
            productId: raw.productId,
            warehouseId: raw.warehouseId ?? null,
            slotId: raw.slotId ?? null,
            status: raw.status as AssignmentStatus,
            finalScore: raw.finalScore ? Number(raw.finalScore) : null,
            capacityFitScore: raw.capacityFitScore ? Number(raw.capacityFitScore) : null,
            movementCostScore: raw.movementCostScore ? Number(raw.movementCostScore) : null,
            categoryMatchScore: raw.categoryMatchScore ? Number(raw.categoryMatchScore) : null,
            vehicleAccessScore: raw.vehicleAccessScore ? Number(raw.vehicleAccessScore) : null,
            demandPriorityScore: raw.demandPriorityScore ? Number(raw.demandPriorityScore) : null,
            congestionScore: raw.congestionScore ? Number(raw.congestionScore) : null,
            routePath: raw.routePath,
            routeCost: raw.routeCost ? Number(raw.routeCost) : null,
            reasons: raw.reasons,
            rejectedCandidates: raw.rejectedCandidates,
            createdAt: raw.createdAt,
        });
    }

    async findByRunId(runId: string): Promise<AssignmentEntity[]> {
        return this.findAll({ runId });
    }

    async bulkCreate(inputs: CreateAssignmentInput[]): Promise<void> {
        await this.prisma.assignment.createMany({
            data: inputs.map(i => ({
                runId: i.runId,
                productId: i.productId,
                warehouseId: i.warehouseId ?? null,
                slotId: i.slotId ?? null,
                status: i.status,
                finalScore: i.finalScore,
                capacityFitScore: i.capacityFitScore,
                movementCostScore: i.movementCostScore,
                categoryMatchScore: i.categoryMatchScore,
                vehicleAccessScore: i.vehicleAccessScore,
                demandPriorityScore: i.demandPriorityScore,
                congestionScore: i.congestionScore,
                routeCost: i.routeCost,
                reasons: i.reasons,
            }) as any),
        });
    }
}
