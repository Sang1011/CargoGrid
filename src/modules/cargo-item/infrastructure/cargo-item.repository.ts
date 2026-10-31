import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/base/base.repository';
import { CargoItemEntity } from '../domain/cargo-item.entity';
import { CargoItemStatus } from 'src/common/enums';
import { Prisma } from '@prisma/client';
import { Page, buildOrderBy } from 'src/common/pagination/paginate';
import { CargoItemQueryDto } from '../application/dto/cargo-item-query.dto';

const cargoInclude = {
    product: { select: { id: true, name: true, sku: true, category: true } },
    currentWarehouse: { select: { id: true, code: true, name: true } },
    currentSlot: { select: { id: true, name: true } },
} satisfies Prisma.CargoItemInclude;

@Injectable()
export class CargoItemRepository extends BaseRepository<CargoItemEntity> {
    constructor(prisma: PrismaService) {
        super(prisma, prisma.cargoItem);
    }

    protected toEntity(raw: any): CargoItemEntity {
        return new CargoItemEntity({
            id: raw.id,
            productId: raw.productId,
            scenarioId: raw.scenarioId,
            barcode: raw.barcode ?? null,
            serialNumber: raw.serialNumber ?? null,
            batchNumber: raw.batchNumber ?? null,
            actualWeightKg: raw.actualWeightKg ? Number(raw.actualWeightKg) : null,
            actualVolumeM3: raw.actualVolumeM3 ? Number(raw.actualVolumeM3) : null,
            actualWidthM: raw.actualWidthM ? Number(raw.actualWidthM) : null,
            actualDepthM: raw.actualDepthM ? Number(raw.actualDepthM) : null,
            actualHeightM: raw.actualHeightM ? Number(raw.actualHeightM) : null,
            status: raw.status as CargoItemStatus,
            currentSlotId: raw.currentSlotId ?? null,
            currentWarehouseId: raw.currentWarehouseId ?? null,
            currentTempC: raw.currentTempC ? Number(raw.currentTempC) : null,
            lastTempCheckAt: raw.lastTempCheckAt ?? null,
            manufactureDate: raw.manufactureDate ?? null,
            expiryDate: raw.expiryDate ?? null,
            notes: raw.notes ?? null,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }

    findAllWithFilters(filters: {
        scenarioId?: string;
        productId?: string;
        status?: CargoItemStatus;
        currentWarehouseId?: string;
    }): Promise<CargoItemEntity[]> {
        const where: any = {};
        if (filters.scenarioId) where.scenarioId = filters.scenarioId;
        if (filters.productId) where.productId = filters.productId;
        if (filters.status) where.status = filters.status;
        if (filters.currentWarehouseId) where.currentWarehouseId = filters.currentWarehouseId;
        return this.findAll(where);
    }

    /** Default order is oldest first (longest in storage), which is what a yard planner scans for. */
    findPage(query: CargoItemQueryDto): Promise<Page<CargoItemEntity>> {
        const where: Prisma.CargoItemWhereInput = {};
        if (query.scenarioId) where.scenarioId = query.scenarioId;
        if (query.productId) where.productId = query.productId;
        if (query.status) where.status = query.status;
        if (query.currentWarehouseId) where.currentWarehouseId = query.currentWarehouseId;
        if (query.search) {
            where.OR = [
                { barcode: { contains: query.search, mode: 'insensitive' } },
                { serialNumber: { contains: query.search, mode: 'insensitive' } },
                { batchNumber: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        return this.findPaged({
            where,
            orderBy: buildOrderBy(query.sortBy, query.sortOrder, ['createdAt', 'updatedAt', 'status', 'barcode'], { createdAt: 'asc' }),
            page: query.page,
            limit: query.limit,
        });
    }

    async findByIdWithRelations(id: string): Promise<(CargoItemEntity & { product?: any; currentWarehouse?: any; currentSlot?: any }) | null> {
        const row = await (this as any).delegate.findUnique({
            where: { id },
            include: cargoInclude,
        });
        if (!row) return null;
        const entity = this.toEntity(row);
        return Object.assign(entity, {
            product: row.product,
            currentWarehouse: row.currentWarehouse,
            currentSlot: row.currentSlot,
        });
    }
}
