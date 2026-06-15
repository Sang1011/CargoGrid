import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { ShipmentItemEntity } from '../domain/shipment-item.entity';
import { ShipmentItemRepository } from '../infrastructure/shipment-item.repository';
import { CreateShipmentItemDto } from './dto/create-shipment-item.dto';
import { UpdateShipmentItemDto } from './dto/update-shipment-item.dto';
import { ShipmentItemStatus } from 'src/common/enums';

@Injectable()
export class ShipmentItemService extends BaseService<ShipmentItemEntity, CreateShipmentItemDto, UpdateShipmentItemDto> {
    constructor(private readonly itemRepo: ShipmentItemRepository) {
        super(itemRepo);
    }

    protected get entityName() {
        return 'ShipmentItem';
    }

    findAllFiltered(filters: { shipmentId?: string; status?: ShipmentItemStatus }): Promise<ShipmentItemEntity[]> {
        return this.itemRepo.findAllWithFilters(filters);
    }

    create(dto: CreateShipmentItemDto): Promise<ShipmentItemEntity> {
        return this.repo.create({
            shipmentId: dto.shipmentId,
            cargoItemId: dto.cargoItemId,
            status: dto.status ?? ShipmentItemStatus.WAITING,
            assignedWarehouseId: dto.assignedWarehouseId ?? null,
            assignedSlotId: dto.assignedSlotId ?? null,
            assignmentScore: dto.assignmentScore ?? null,
            assignmentReasons: dto.assignmentReasons ?? [],
        });
    }

    async update(id: string, dto: UpdateShipmentItemDto): Promise<ShipmentItemEntity> {
        await this.findOne(id);
        const data: any = {};
        if (dto.shipmentId !== undefined) data.shipmentId = dto.shipmentId;
        if (dto.cargoItemId !== undefined) data.cargoItemId = dto.cargoItemId;
        if (dto.status !== undefined) data.status = dto.status;
        if (dto.assignedWarehouseId !== undefined) data.assignedWarehouseId = dto.assignedWarehouseId;
        if (dto.assignedSlotId !== undefined) data.assignedSlotId = dto.assignedSlotId;
        if (dto.assignmentScore !== undefined) data.assignmentScore = dto.assignmentScore;
        if (dto.assignmentReasons !== undefined) data.assignmentReasons = dto.assignmentReasons;
        return this.repo.update(id, data);
    }
}
