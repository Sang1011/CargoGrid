import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoadEdgeEntity } from '../../domain/road-edge.entity';
import { RoadDirection } from 'src/common/enums';

class NodeRef {
    @ApiProperty() id!: string;
    @ApiProperty() code!: string;
    @ApiProperty() name!: string;
    @ApiProperty() nodeType!: string;
}

class AllowedVehicleRef {
    @ApiProperty() vehicleType!: string;
}

export class RoadEdgeResponse {
    @ApiProperty() id!: string;
    @ApiProperty() scenarioId!: string;
    @ApiProperty() fromNodeId!: string;
    @ApiProperty() toNodeId!: string;
    @ApiProperty() distanceM!: number;
    @ApiProperty({ enum: RoadDirection }) direction!: RoadDirection;
    @ApiPropertyOptional() widthM!: number | null;
    @ApiProperty() congestionLevel!: number;
    @ApiProperty() isBlocked!: boolean;
    @ApiPropertyOptional() notes!: string | null;
    @ApiPropertyOptional() fromNode?: NodeRef;
    @ApiPropertyOptional() toNode?: NodeRef;
    @ApiPropertyOptional({ type: [AllowedVehicleRef] }) allowedVehicles?: AllowedVehicleRef[];

    static fromEntity(entity: RoadEdgeEntity, relations?: { fromNode?: any; toNode?: any; allowedVehicles?: any[] }): RoadEdgeResponse {
        const res = new RoadEdgeResponse();
        res.id = entity.id;
        res.scenarioId = entity.scenarioId;
        res.fromNodeId = entity.fromNodeId;
        res.toNodeId = entity.toNodeId;
        res.distanceM = entity.distanceM;
        res.direction = entity.direction;
        res.widthM = entity.widthM;
        res.congestionLevel = entity.congestionLevel;
        res.isBlocked = entity.isBlocked;
        res.notes = entity.notes;
        if (relations?.fromNode) res.fromNode = relations.fromNode;
        if (relations?.toNode) res.toNode = relations.toNode;
        if (relations?.allowedVehicles) res.allowedVehicles = relations.allowedVehicles;
        return res;
    }
}
