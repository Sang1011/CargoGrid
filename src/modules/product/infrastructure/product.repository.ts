import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { ProductEntity } from '../domain/product.entity';
import { ProductCategory, PriorityLevel, VehicleType, ZoneType } from 'src/common/enums';

@Injectable()
export class ProductRepository extends BaseRepository<ProductEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.product);
    }

    protected toEntity(raw: any): ProductEntity {
        return new ProductEntity({
            id: raw.id,
            scenarioId: raw.scenarioId,
            name: raw.name,
            sku: raw.sku ?? null,
            category: raw.category as ProductCategory,
            weightKg: Number(raw.weightKg),
            volumeM3: Number(raw.volumeM3),
            widthM: raw.widthM ? Number(raw.widthM) : null,
            depthM: raw.depthM ? Number(raw.depthM) : null,
            heightM: raw.heightM ? Number(raw.heightM) : null,
            requiredZone: raw.requiredZone as ZoneType | null,
            requiredTempMin: raw.requiredTempMin ? Number(raw.requiredTempMin) : null,
            requiredTempMax: raw.requiredTempMax ? Number(raw.requiredTempMax) : null,
            demandFrequency: raw.demandFrequency,
            priority: raw.priority as PriorityLevel,
            vehicleType: raw.vehicleType as VehicleType,
            preferredEntryNodeId: raw.preferredEntryNodeId ?? null,
            preferredExitNodeId: raw.preferredExitNodeId ?? null,
            notes: raw.notes ?? null,
            createdAt: raw.createdAt,
        });
    }

    findAllWithFilters(filters: {
        scenarioId?: string;
        category?: ProductCategory;
        requiredZone?: ZoneType;
    }): Promise<ProductEntity[]> {
        const where: any = {};
        if (filters.scenarioId) where.scenarioId = filters.scenarioId;
        if (filters.category) where.category = filters.category;
        if (filters.requiredZone) where.requiredZone = filters.requiredZone;
        return this.findAll(where);
    }

    async findByIdWithRelations(id: string): Promise<ProductEntity | null> {
        const row = await (this as any).delegate.findUnique({
            where: { id },
            include: {
                preferredEntryNode: { select: { id: true, code: true, name: true } },
                preferredExitNode: { select: { id: true, code: true, name: true } },
            },
        });
        return row ? this.toEntity(row) : null;
    }
}
