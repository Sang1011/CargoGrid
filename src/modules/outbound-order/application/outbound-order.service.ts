import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { OutboundOrderEntity } from '../domain/outbound-order.entity';
import { OutboundOrderRepository } from '../infrastructure/outbound-order.repository';
import { CreateOutboundOrderDto } from './dto/create-outbound-order.dto';
import { UpdateOutboundOrderDto } from './dto/update-outbound-order.dto';
import { OutboundDestinationType, OutboundOrderStatus, PriorityLevel } from 'src/common/enums';

@Injectable()
export class OutboundOrderService extends BaseService<OutboundOrderEntity, CreateOutboundOrderDto, UpdateOutboundOrderDto> {
    constructor(private readonly orderRepo: OutboundOrderRepository) {
        super(orderRepo);
    }

    protected get entityName() {
        return 'OutboundOrder';
    }

    findAllFiltered(filters: { scenarioId?: string; status?: OutboundOrderStatus; destinationType?: OutboundDestinationType }): Promise<OutboundOrderEntity[]> {
        return this.orderRepo.findAllWithFilters(filters);
    }

    create(dto: CreateOutboundOrderDto): Promise<OutboundOrderEntity> {
        return this.repo.create({
            scenarioId: dto.scenarioId,
            code: dto.code,
            status: dto.status ?? OutboundOrderStatus.DRAFT,
            priority: dto.priority ?? PriorityLevel.MEDIUM,
            destinationType: dto.destinationType,
            destinationName: dto.destinationName ?? null,
            exitNodeId: dto.exitNodeId ?? null,
            requestedAt: new Date(),
            deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : null,
            totalItems: dto.totalItems ?? 0,
            pickedItems: 0,
            deliveredItems: 0,
            notes: dto.notes ?? null,
        });
    }

    async update(id: string, dto: UpdateOutboundOrderDto): Promise<OutboundOrderEntity> {
        await this.findOne(id);
        const data: any = {};
        if (dto.scenarioId !== undefined) data.scenarioId = dto.scenarioId;
        if (dto.code !== undefined) data.code = dto.code;
        if (dto.status !== undefined) data.status = dto.status;
        if (dto.priority !== undefined) data.priority = dto.priority;
        if (dto.destinationType !== undefined) data.destinationType = dto.destinationType;
        if (dto.destinationName !== undefined) data.destinationName = dto.destinationName;
        if (dto.exitNodeId !== undefined) data.exitNodeId = dto.exitNodeId;
        if (dto.deadlineAt !== undefined) data.deadlineAt = dto.deadlineAt ? new Date(dto.deadlineAt) : null;
        if (dto.totalItems !== undefined) data.totalItems = dto.totalItems;
        if (dto.notes !== undefined) data.notes = dto.notes;
        return this.repo.update(id, data);
    }

    async confirm(id: string): Promise<OutboundOrderEntity> {
        await this.findOne(id);
        return this.orderRepo.updateStatus(id, OutboundOrderStatus.CONFIRMED);
    }

    async complete(id: string): Promise<OutboundOrderEntity> {
        await this.findOne(id);
        return this.orderRepo.updateStatus(id, OutboundOrderStatus.COMPLETED);
    }

    async cancel(id: string): Promise<OutboundOrderEntity> {
        await this.findOne(id);
        return this.orderRepo.updateStatus(id, OutboundOrderStatus.CANCELLED);
    }
}
