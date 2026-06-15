import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InboundShipmentEntity } from '../../domain/inbound-shipment.entity';
import { ShipmentStatus } from 'src/common/enums';

class NodeRef {
    @ApiProperty() id!: string;
    @ApiProperty() code!: string;
    @ApiProperty() name!: string;
}

export class InboundShipmentResponse {
    @ApiProperty() id!: string;
    @ApiProperty() scenarioId!: string;
    @ApiProperty() code!: string;
    @ApiProperty() sourceType!: string;
    @ApiPropertyOptional() sourceName!: string | null;
    @ApiPropertyOptional() entryNodeId!: string | null;
    @ApiProperty({ enum: ShipmentStatus }) status!: ShipmentStatus;
    @ApiPropertyOptional() arrivedAt!: Date | null;
    @ApiPropertyOptional() dispatchingStartedAt!: Date | null;
    @ApiPropertyOptional() completedAt!: Date | null;
    @ApiProperty() totalItems!: number;
    @ApiProperty() assignedItems!: number;
    @ApiProperty() failedItems!: number;
    @ApiPropertyOptional() notes!: string | null;
    @ApiProperty() createdAt!: Date;
    @ApiProperty() updatedAt!: Date;
    @ApiPropertyOptional() entryNode?: NodeRef;
    @ApiPropertyOptional() shipmentItemCount?: number;

    static fromEntity(entity: InboundShipmentEntity, relations?: { entryNode?: any; shipmentItemCount?: number }): InboundShipmentResponse {
        const res = new InboundShipmentResponse();
        res.id = entity.id;
        res.scenarioId = entity.scenarioId;
        res.code = entity.code;
        res.sourceType = entity.sourceType;
        res.sourceName = entity.sourceName;
        res.entryNodeId = entity.entryNodeId;
        res.status = entity.status;
        res.arrivedAt = entity.arrivedAt;
        res.dispatchingStartedAt = entity.dispatchingStartedAt;
        res.completedAt = entity.completedAt;
        res.totalItems = entity.totalItems;
        res.assignedItems = entity.assignedItems;
        res.failedItems = entity.failedItems;
        res.notes = entity.notes;
        res.createdAt = entity.createdAt;
        res.updatedAt = entity.updatedAt;
        if (relations?.entryNode) res.entryNode = relations.entryNode;
        if (relations?.shipmentItemCount !== undefined) res.shipmentItemCount = relations.shipmentItemCount;
        return res;
    }
}
