import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OutboundOrderEntity } from '../../domain/outbound-order.entity';
import { OutboundDestinationType, OutboundOrderStatus, PriorityLevel } from 'src/common/enums';

class NodeRef {
    @ApiProperty() id!: string;
    @ApiProperty() code!: string;
    @ApiProperty() name!: string;
}

export class OutboundOrderResponse {
    @ApiProperty() id!: string;
    @ApiProperty() scenarioId!: string;
    @ApiProperty() code!: string;
    @ApiProperty({ enum: OutboundOrderStatus }) status!: OutboundOrderStatus;
    @ApiProperty({ enum: PriorityLevel }) priority!: PriorityLevel;
    @ApiProperty({ enum: OutboundDestinationType }) destinationType!: OutboundDestinationType;
    @ApiPropertyOptional() destinationName!: string | null;
    @ApiPropertyOptional() exitNodeId!: string | null;
    @ApiProperty() requestedAt!: Date;
    @ApiPropertyOptional() deadlineAt!: Date | null;
    @ApiProperty() totalItems!: number;
    @ApiProperty() pickedItems!: number;
    @ApiProperty() deliveredItems!: number;
    @ApiPropertyOptional() notes!: string | null;
    @ApiProperty() createdAt!: Date;
    @ApiProperty() updatedAt!: Date;
    @ApiPropertyOptional() exitNode?: NodeRef;
    @ApiPropertyOptional() itemCount?: number;

    static fromEntity(entity: OutboundOrderEntity, relations?: { exitNode?: any; itemCount?: number }): OutboundOrderResponse {
        const res = new OutboundOrderResponse();
        res.id = entity.id;
        res.scenarioId = entity.scenarioId;
        res.code = entity.code;
        res.status = entity.status;
        res.priority = entity.priority;
        res.destinationType = entity.destinationType;
        res.destinationName = entity.destinationName;
        res.exitNodeId = entity.exitNodeId;
        res.requestedAt = entity.requestedAt;
        res.deadlineAt = entity.deadlineAt;
        res.totalItems = entity.totalItems;
        res.pickedItems = entity.pickedItems;
        res.deliveredItems = entity.deliveredItems;
        res.notes = entity.notes;
        res.createdAt = entity.createdAt;
        res.updatedAt = entity.updatedAt;
        if (relations?.exitNode) res.exitNode = relations.exitNode;
        if (relations?.itemCount !== undefined) res.itemCount = relations.itemCount;
        return res;
    }
}
