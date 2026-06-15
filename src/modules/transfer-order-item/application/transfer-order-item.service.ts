import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { TransferOrderItemEntity } from '../domain/transfer-order-item.entity';
import { TransferOrderItemRepository } from '../infrastructure/transfer-order-item.repository';
import { CreateTransferOrderItemDto } from './dto/create-transfer-order-item.dto';
import { UpdateTransferOrderItemDto } from './dto/update-transfer-order-item.dto';

@Injectable()
export class TransferOrderItemService extends BaseService<TransferOrderItemEntity, CreateTransferOrderItemDto, UpdateTransferOrderItemDto> {
    constructor(private readonly itemRepo: TransferOrderItemRepository) {
        super(itemRepo);
    }

    protected get entityName() {
        return 'TransferOrderItem';
    }

    findAllFiltered(filters: { transferOrderId?: string; status?: string }): Promise<TransferOrderItemEntity[]> {
        return this.itemRepo.findAllWithFilters(filters);
    }

    create(dto: CreateTransferOrderItemDto): Promise<TransferOrderItemEntity> {
        return this.repo.create({
            transferOrderId: dto.transferOrderId,
            cargoItemId: dto.cargoItemId,
            fromSlotId: dto.fromSlotId ?? null,
            proposedWarehouseId: dto.proposedWarehouseId ?? null,
            proposedSlotId: dto.proposedSlotId ?? null,
            proposalScore: dto.proposalScore ?? null,
            proposalReasons: dto.proposalReasons ?? [],
            status: dto.status ?? 'pending',
        });
    }

    async update(id: string, dto: UpdateTransferOrderItemDto): Promise<TransferOrderItemEntity> {
        await this.findOne(id);
        const data: any = {};
        if (dto.transferOrderId !== undefined) data.transferOrderId = dto.transferOrderId;
        if (dto.cargoItemId !== undefined) data.cargoItemId = dto.cargoItemId;
        if (dto.fromSlotId !== undefined) data.fromSlotId = dto.fromSlotId;
        if (dto.proposedWarehouseId !== undefined) data.proposedWarehouseId = dto.proposedWarehouseId;
        if (dto.proposedSlotId !== undefined) data.proposedSlotId = dto.proposedSlotId;
        if (dto.proposalScore !== undefined) data.proposalScore = dto.proposalScore;
        if (dto.proposalReasons !== undefined) data.proposalReasons = dto.proposalReasons;
        if (dto.status !== undefined) data.status = dto.status;
        return this.repo.update(id, data);
    }
}
