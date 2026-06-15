import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { CargoItemEntity } from '../domain/cargo-item.entity';
import { CargoItemRepository } from '../infrastructure/cargo-item.repository';
import { CreateCargoItemDto } from './dto/create-cargo-item.dto';
import { UpdateCargoItemDto } from './dto/update-cargo-item.dto';
import { CargoItemStatus } from 'src/common/enums';

@Injectable()
export class CargoItemService extends BaseService<CargoItemEntity, CreateCargoItemDto, UpdateCargoItemDto> {
    constructor(private readonly cargoItemRepo: CargoItemRepository) {
        super(cargoItemRepo);
    }

    protected get entityName() {
        return 'CargoItem';
    }

    findAllFiltered(filters: { scenarioId?: string; productId?: string; status?: CargoItemStatus; currentWarehouseId?: string }): Promise<CargoItemEntity[]> {
        return this.cargoItemRepo.findAllWithFilters(filters);
    }

    create(dto: CreateCargoItemDto): Promise<CargoItemEntity> {
        return this.repo.create({
            productId: dto.productId,
            scenarioId: dto.scenarioId,
            barcode: dto.barcode ?? null,
            serialNumber: dto.serialNumber ?? null,
            batchNumber: dto.batchNumber ?? null,
            actualWeightKg: dto.actualWeightKg ?? null,
            actualVolumeM3: dto.actualVolumeM3 ?? null,
            actualWidthM: dto.actualWidthM ?? null,
            actualDepthM: dto.actualDepthM ?? null,
            actualHeightM: dto.actualHeightM ?? null,
            status: dto.status ?? CargoItemStatus.IN_TRANSIT_INBOUND,
            currentSlotId: dto.currentSlotId ?? null,
            currentWarehouseId: dto.currentWarehouseId ?? null,
            currentTempC: dto.currentTempC ?? null,
            manufactureDate: dto.manufactureDate ? new Date(dto.manufactureDate) : null,
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
            notes: dto.notes ?? null,
        });
    }

    async update(id: string, dto: UpdateCargoItemDto): Promise<CargoItemEntity> {
        await this.findOne(id);
        const data: any = {};
        if (dto.productId !== undefined) data.productId = dto.productId;
        if (dto.barcode !== undefined) data.barcode = dto.barcode;
        if (dto.serialNumber !== undefined) data.serialNumber = dto.serialNumber;
        if (dto.batchNumber !== undefined) data.batchNumber = dto.batchNumber;
        if (dto.actualWeightKg !== undefined) data.actualWeightKg = dto.actualWeightKg;
        if (dto.actualVolumeM3 !== undefined) data.actualVolumeM3 = dto.actualVolumeM3;
        if (dto.actualWidthM !== undefined) data.actualWidthM = dto.actualWidthM;
        if (dto.actualDepthM !== undefined) data.actualDepthM = dto.actualDepthM;
        if (dto.actualHeightM !== undefined) data.actualHeightM = dto.actualHeightM;
        if (dto.status !== undefined) data.status = dto.status;
        if (dto.currentSlotId !== undefined) data.currentSlotId = dto.currentSlotId;
        if (dto.currentWarehouseId !== undefined) data.currentWarehouseId = dto.currentWarehouseId;
        if (dto.currentTempC !== undefined) data.currentTempC = dto.currentTempC;
        if (dto.manufactureDate !== undefined) data.manufactureDate = dto.manufactureDate ? new Date(dto.manufactureDate) : null;
        if (dto.expiryDate !== undefined) data.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
        if (dto.notes !== undefined) data.notes = dto.notes;
        return this.repo.update(id, data);
    }
}
