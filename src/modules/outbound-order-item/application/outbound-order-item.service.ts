import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { OutboundOrderItemEntity } from '../domain/outbound-order-item.entity';
import { OutboundOrderItemRepository } from '../infrastructure/outbound-order-item.repository';
import { CreateOutboundOrderItemDto } from './dto/create-outbound-order-item.dto';
import { UpdateOutboundOrderItemDto } from './dto/update-outbound-order-item.dto';

@Injectable()
export class OutboundOrderItemService extends BaseService<OutboundOrderItemEntity, CreateOutboundOrderItemDto, UpdateOutboundOrderItemDto> {
    constructor(private readonly itemRepo: OutboundOrderItemRepository) {
        super(itemRepo);
    }

    protected get entityName() {
        return 'OutboundOrderItem';
    }

    findAllFiltered(filters: { outboundOrderId?: string; status?: string }): Promise<OutboundOrderItemEntity[]> {
        return this.itemRepo.findAllWithFilters(filters);
    }

    create(dto: CreateOutboundOrderItemDto): Promise<OutboundOrderItemEntity> {
        return this.repo.create({
            outboundOrderId: dto.outboundOrderId,
            cargoItemId: dto.cargoItemId,
            fromSlotId: dto.fromSlotId ?? null,
            fromWarehouseId: dto.fromWarehouseId ?? null,
            routePath: dto.routePath ?? null,
            routeCost: dto.routeCost ?? null,
            vehicleType: dto.vehicleType ?? null,
            status: dto.status ?? 'pending',
        });
    }

    async update(id: string, dto: UpdateOutboundOrderItemDto): Promise<OutboundOrderItemEntity> {
        await this.findOne(id);
        const data: any = {};
        if (dto.outboundOrderId !== undefined) data.outboundOrderId = dto.outboundOrderId;
        if (dto.cargoItemId !== undefined) data.cargoItemId = dto.cargoItemId;
        if (dto.fromSlotId !== undefined) data.fromSlotId = dto.fromSlotId;
        if (dto.fromWarehouseId !== undefined) data.fromWarehouseId = dto.fromWarehouseId;
        if (dto.routePath !== undefined) data.routePath = dto.routePath;
        if (dto.routeCost !== undefined) data.routeCost = dto.routeCost;
        if (dto.vehicleType !== undefined) data.vehicleType = dto.vehicleType;
        if (dto.status !== undefined) data.status = dto.status;
        return this.repo.update(id, data);
    }
}
