import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { RoadEdgeEntity } from '../domain/road-edge.entity';
import { RoadDirection } from 'src/common/enums';
import { Prisma } from '@prisma/client';

const edgeInclude = {
    fromNode: { select: { id: true, code: true, name: true, nodeType: true } },
    toNode: { select: { id: true, code: true, name: true, nodeType: true } },
    allowedVehicles: { select: { vehicleType: true } },
} satisfies Prisma.RoadEdgeInclude;

@Injectable()
export class RoadEdgeRepository extends BaseRepository<RoadEdgeEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.roadEdge);
    }

    protected toEntity(raw: any): RoadEdgeEntity {
        return new RoadEdgeEntity({
            id: raw.id,
            scenarioId: raw.scenarioId,
            fromNodeId: raw.fromNodeId,
            toNodeId: raw.toNodeId,
            distanceM: Number(raw.distanceM),
            direction: raw.direction as RoadDirection,
            widthM: raw.widthM ? Number(raw.widthM) : null,
            congestionLevel: Number(raw.congestionLevel),
            isBlocked: raw.isBlocked,
            notes: raw.notes ?? null,
        });
    }

    findAllWithFilters(filters: {
        scenarioId?: string;
        fromNodeId?: string;
        toNodeId?: string;
        isBlocked?: boolean;
    }): Promise<RoadEdgeEntity[]> {
        const where: any = {};
        if (filters.scenarioId) where.scenarioId = filters.scenarioId;
        if (filters.fromNodeId) where.fromNodeId = filters.fromNodeId;
        if (filters.toNodeId) where.toNodeId = filters.toNodeId;
        if (filters.isBlocked !== undefined) where.isBlocked = filters.isBlocked;
        return this.findAll(where);
    }

    async findByIdWithRelations(id: string): Promise<(RoadEdgeEntity & { fromNode?: any; toNode?: any; allowedVehicles?: any[] }) | null> {
        const row = await (this as any).delegate.findUnique({
            where: { id },
            include: edgeInclude,
        });
        if (!row) return null;
        const entity = this.toEntity(row);
        return Object.assign(entity, {
            fromNode: row.fromNode,
            toNode: row.toNode,
            allowedVehicles: row.allowedVehicles,
        });
    }

    async createWithAllowedVehicles(data: {
        edgeData: Record<string, any>;
        allowedVehicles: { vehicleType: string }[];
    }): Promise<RoadEdgeEntity & { allowedVehicles?: any[] }> {
        const row = await (this as any).delegate.create({
            data: {
                ...data.edgeData,
                allowedVehicles: {
                    create: data.allowedVehicles.map(av => ({
                        vehicleType: av.vehicleType,
                    })),
                },
            },
            include: edgeInclude,
        });
        const entity = this.toEntity(row);
        return Object.assign(entity, {
            fromNode: row.fromNode,
            toNode: row.toNode,
            allowedVehicles: row.allowedVehicles,
        });
    }

    async toggleBlocked(id: string, isBlocked: boolean): Promise<RoadEdgeEntity> {
        const row = await (this as any).delegate.update({
            where: { id },
            data: { isBlocked },
        });
        return this.toEntity(row);
    }
}
