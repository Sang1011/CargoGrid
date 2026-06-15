import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationNodeEntity } from '../../domain/location-node.entity';
import { LocationNodeType } from 'src/common/enums';

class WarehouseRef {
    @ApiProperty() id!: string;
    @ApiProperty() code!: string;
    @ApiProperty() name!: string;
}

class SlotRef {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
}

export class LocationNodeResponse {
    @ApiProperty() id!: string;
    @ApiProperty() scenarioId!: string;
    @ApiProperty() name!: string;
    @ApiProperty() code!: string;
    @ApiProperty({ enum: LocationNodeType }) nodeType!: LocationNodeType;
    @ApiPropertyOptional() geoLat!: number | null;
    @ApiPropertyOptional() geoLng!: number | null;
    @ApiPropertyOptional() localX!: number | null;
    @ApiPropertyOptional() localY!: number | null;
    @ApiPropertyOptional() warehouseId!: string | null;
    @ApiPropertyOptional() slotId!: string | null;
    @ApiProperty() isActive!: boolean;
    @ApiPropertyOptional() metadata!: any | null;
    @ApiPropertyOptional() warehouse?: WarehouseRef;
    @ApiPropertyOptional() slot?: SlotRef;

    static fromEntity(entity: LocationNodeEntity, relations?: { warehouse?: any; slot?: any }): LocationNodeResponse {
        const res = new LocationNodeResponse();
        res.id = entity.id;
        res.scenarioId = entity.scenarioId;
        res.name = entity.name;
        res.code = entity.code;
        res.nodeType = entity.nodeType;
        res.geoLat = entity.geoLat;
        res.geoLng = entity.geoLng;
        res.localX = entity.localX;
        res.localY = entity.localY;
        res.warehouseId = entity.warehouseId;
        res.slotId = entity.slotId;
        res.isActive = entity.isActive;
        res.metadata = entity.metadata;
        if (relations?.warehouse) res.warehouse = relations.warehouse;
        if (relations?.slot) res.slot = relations.slot;
        return res;
    }
}
