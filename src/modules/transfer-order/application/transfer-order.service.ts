import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { TransferOrderEntity } from '../domain/transfer-order.entity';
import { TransferOrderRepository } from '../infrastructure/transfer-order.repository';
import { CreateTransferOrderDto } from './dto/create-transfer-order.dto';
import { UpdateTransferOrderDto } from './dto/update-transfer-order.dto';
import { PriorityLevel, TransferOrderStatus } from 'src/common/enums';

@Injectable()
export class TransferOrderService extends BaseService<TransferOrderEntity, CreateTransferOrderDto, UpdateTransferOrderDto> {
    constructor(private readonly orderRepo: TransferOrderRepository) {
        super(orderRepo);
    }

    protected get entityName() {
        return 'TransferOrder';
    }

    findAllFiltered(filters: { scenarioId?: string; status?: TransferOrderStatus; fromWarehouseId?: string; isEmergency?: boolean }): Promise<TransferOrderEntity[]> {
        return this.orderRepo.findAllWithFilters(filters);
    }

    create(dto: CreateTransferOrderDto): Promise<TransferOrderEntity> {
        return this.repo.create({
            scenarioId: dto.scenarioId,
            incidentId: dto.incidentId ?? null,
            code: dto.code,
            status: dto.status ?? TransferOrderStatus.DRAFT,
            priority: dto.priority ?? PriorityLevel.MEDIUM,
            fromWarehouseId: dto.fromWarehouseId,
            reason: dto.reason ?? null,
            isEmergency: dto.isEmergency ?? false,
            totalItems: dto.totalItems ?? 0,
            transferredItems: 0,
            failedItems: 0,
        });
    }

    async update(id: string, dto: UpdateTransferOrderDto): Promise<TransferOrderEntity> {
        await this.findOne(id);
        const data: any = {};
        if (dto.scenarioId !== undefined) data.scenarioId = dto.scenarioId;
        if (dto.incidentId !== undefined) data.incidentId = dto.incidentId;
        if (dto.code !== undefined) data.code = dto.code;
        if (dto.status !== undefined) data.status = dto.status;
        if (dto.priority !== undefined) data.priority = dto.priority;
        if (dto.fromWarehouseId !== undefined) data.fromWarehouseId = dto.fromWarehouseId;
        if (dto.reason !== undefined) data.reason = dto.reason;
        if (dto.isEmergency !== undefined) data.isEmergency = dto.isEmergency;
        if (dto.totalItems !== undefined) data.totalItems = dto.totalItems;
        return this.repo.update(id, data);
    }

    async confirm(id: string): Promise<TransferOrderEntity> {
        await this.findOne(id);
        return this.orderRepo.updateStatus(id, TransferOrderStatus.CONFIRMED, { confirmedAt: new Date() });
    }

    async complete(id: string): Promise<TransferOrderEntity> {
        await this.findOne(id);
        return this.orderRepo.updateStatus(id, TransferOrderStatus.COMPLETED, { completedAt: new Date() });
    }

    async cancel(id: string): Promise<TransferOrderEntity> {
        await this.findOne(id);
        return this.orderRepo.updateStatus(id, TransferOrderStatus.CANCELLED);
    }
}
