import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { ProductEntity } from '../domain/product.entity';
import { ProductRepository } from '../infrastructure/product.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductCategory, ZoneType } from 'src/common/enums';

@Injectable()
export class ProductService extends BaseService<ProductEntity, CreateProductDto, UpdateProductDto> {
    constructor(private readonly productRepo: ProductRepository) {
        super(productRepo);
    }

    protected get entityName() {
        return 'Product';
    }

    findAllFiltered(filters: { scenarioId?: string; category?: ProductCategory; requiredZone?: ZoneType }): Promise<ProductEntity[]> {
        return this.productRepo.findAllWithFilters(filters);
    }

    create(dto: CreateProductDto): Promise<ProductEntity> {
        return this.repo.create({
            scenarioId: dto.scenarioId,
            name: dto.name,
            sku: dto.sku ?? null,
            category: dto.category,
            weightKg: dto.weightKg,
            volumeM3: dto.volumeM3,
            widthM: dto.widthM ?? null,
            depthM: dto.depthM ?? null,
            heightM: dto.heightM ?? null,
            requiredZone: dto.requiredZone ?? null,
            requiredTempMin: dto.requiredTempMin ?? null,
            requiredTempMax: dto.requiredTempMax ?? null,
            demandFrequency: dto.demandFrequency ?? 50,
            priority: dto.priority ?? 'medium' as any,
            vehicleType: dto.vehicleType,
            preferredEntryNodeId: dto.preferredEntryNodeId ?? null,
            preferredExitNodeId: dto.preferredExitNodeId ?? null,
            notes: dto.notes ?? null,
        });
    }

    async update(id: string, dto: UpdateProductDto): Promise<ProductEntity> {
        await this.findOne(id);
        const data: any = {};
        if (dto.name !== undefined) data.name = dto.name;
        if (dto.sku !== undefined) data.sku = dto.sku;
        if (dto.category !== undefined) data.category = dto.category;
        if (dto.weightKg !== undefined) data.weightKg = dto.weightKg;
        if (dto.volumeM3 !== undefined) data.volumeM3 = dto.volumeM3;
        if (dto.widthM !== undefined) data.widthM = dto.widthM;
        if (dto.depthM !== undefined) data.depthM = dto.depthM;
        if (dto.heightM !== undefined) data.heightM = dto.heightM;
        if (dto.requiredZone !== undefined) data.requiredZone = dto.requiredZone;
        if (dto.requiredTempMin !== undefined) data.requiredTempMin = dto.requiredTempMin;
        if (dto.requiredTempMax !== undefined) data.requiredTempMax = dto.requiredTempMax;
        if (dto.demandFrequency !== undefined) data.demandFrequency = dto.demandFrequency;
        if (dto.priority !== undefined) data.priority = dto.priority;
        if (dto.vehicleType !== undefined) data.vehicleType = dto.vehicleType;
        if (dto.preferredEntryNodeId !== undefined) data.preferredEntryNodeId = dto.preferredEntryNodeId;
        if (dto.preferredExitNodeId !== undefined) data.preferredExitNodeId = dto.preferredExitNodeId;
        if (dto.notes !== undefined) data.notes = dto.notes;
        return this.repo.update(id, data);
    }
}
