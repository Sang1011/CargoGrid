import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransferOrderEntity } from '../../domain/transfer-order.entity';
import { PriorityLevel, TransferOrderStatus } from 'src/common/enums';

class WarehouseRef {
    @ApiProperty() id!: string;
    @ApiProperty() code!: string;
    @ApiProperty() name!: string;
}

class IncidentRef {
    @ApiProperty() id!: string;
    @ApiProperty() title!: string;
}

export class TransferOrderResponse {
    @ApiProperty() id!: string;
    @ApiProperty() scenarioId!: string;
    @ApiPropertyOptional() incidentId!: string | null;
    @ApiProperty() code!: string;
    @ApiProperty({ enum: TransferOrderStatus }) status!: TransferOrderStatus;
    @ApiProperty({ enum: PriorityLevel }) priority!: PriorityLevel;
    @ApiProperty() fromWarehouseId!: string;
    @ApiPropertyOptional() reason!: string | null;
    @ApiProperty() isEmergency!: boolean;
    @ApiProperty() totalItems!: number;
    @ApiProperty() transferredItems!: number;
    @ApiProperty() failedItems!: number;
    @ApiPropertyOptional() runId!: string | null;
    @ApiPropertyOptional() confirmedAt!: Date | null;
    @ApiPropertyOptional() completedAt!: Date | null;
    @ApiProperty() createdAt!: Date;
    @ApiProperty() updatedAt!: Date;
    @ApiPropertyOptional() fromWarehouse?: WarehouseRef;
    @ApiPropertyOptional() incident?: IncidentRef;
    @ApiPropertyOptional() itemCount?: number;

    static fromEntity(entity: TransferOrderEntity, relations?: { fromWarehouse?: any; incident?: any; itemCount?: number }): TransferOrderResponse {
        const res = new TransferOrderResponse();
        res.id = entity.id;
        res.scenarioId = entity.scenarioId;
        res.incidentId = entity.incidentId;
        res.code = entity.code;
        res.status = entity.status;
        res.priority = entity.priority;
        res.fromWarehouseId = entity.fromWarehouseId;
        res.reason = entity.reason;
        res.isEmergency = entity.isEmergency;
        res.totalItems = entity.totalItems;
        res.transferredItems = entity.transferredItems;
        res.failedItems = entity.failedItems;
        res.runId = entity.runId;
        res.confirmedAt = entity.confirmedAt;
        res.completedAt = entity.completedAt;
        res.createdAt = entity.createdAt;
        res.updatedAt = entity.updatedAt;
        if (relations?.fromWarehouse) res.fromWarehouse = relations.fromWarehouse;
        if (relations?.incident) res.incident = relations.incident;
        if (relations?.itemCount !== undefined) res.itemCount = relations.itemCount;
        return res;
    }
}
