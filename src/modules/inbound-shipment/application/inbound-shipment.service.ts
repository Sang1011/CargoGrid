import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { InboundShipmentEntity } from '../domain/inbound-shipment.entity';
import { InboundShipmentRepository } from '../infrastructure/inbound-shipment.repository';
import { CreateInboundShipmentDto } from './dto/create-inbound-shipment.dto';
import { UpdateInboundShipmentDto } from './dto/update-inbound-shipment.dto';
import { ShipmentStatus } from 'src/common/enums';

@Injectable()
export class InboundShipmentService extends BaseService<InboundShipmentEntity, CreateInboundShipmentDto, UpdateInboundShipmentDto> {
    constructor(private readonly shipmentRepo: InboundShipmentRepository) {
        super(shipmentRepo);
    }

    protected get entityName() {
        return 'InboundShipment';
    }

    findAllFiltered(filters: { scenarioId?: string; status?: ShipmentStatus }): Promise<InboundShipmentEntity[]> {
        return this.shipmentRepo.findAllWithFilters(filters);
    }

    create(dto: CreateInboundShipmentDto): Promise<InboundShipmentEntity> {
        return this.repo.create({
            scenarioId: dto.scenarioId,
            code: dto.code,
            sourceType: dto.sourceType,
            sourceName: dto.sourceName ?? null,
            entryNodeId: dto.entryNodeId ?? null,
            status: dto.status ?? ShipmentStatus.PENDING,
            totalItems: dto.totalItems ?? 0,
            assignedItems: 0,
            failedItems: 0,
            notes: dto.notes ?? null,
        });
    }

    async update(id: string, dto: UpdateInboundShipmentDto): Promise<InboundShipmentEntity> {
        await this.findOne(id);
        const data: any = {};
        if (dto.scenarioId !== undefined) data.scenarioId = dto.scenarioId;
        if (dto.code !== undefined) data.code = dto.code;
        if (dto.sourceType !== undefined) data.sourceType = dto.sourceType;
        if (dto.sourceName !== undefined) data.sourceName = dto.sourceName;
        if (dto.entryNodeId !== undefined) data.entryNodeId = dto.entryNodeId;
        if (dto.status !== undefined) data.status = dto.status;
        if (dto.totalItems !== undefined) data.totalItems = dto.totalItems;
        if (dto.notes !== undefined) data.notes = dto.notes;
        return this.repo.update(id, data);
    }

    async arrive(id: string): Promise<InboundShipmentEntity> {
        await this.findOne(id);
        return this.shipmentRepo.updateStatus(id, ShipmentStatus.ARRIVED, { arrivedAt: new Date() });
    }

    async complete(id: string): Promise<InboundShipmentEntity> {
        await this.findOne(id);
        return this.shipmentRepo.updateStatus(id, ShipmentStatus.COMPLETED, { completedAt: new Date() });
    }

    async cancel(id: string): Promise<InboundShipmentEntity> {
        await this.findOne(id);
        return this.shipmentRepo.updateStatus(id, ShipmentStatus.CANCELLED);
    }
}
