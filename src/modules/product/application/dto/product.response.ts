import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductEntity } from '../../domain/product.entity';
import { PriorityLevel, ProductCategory, VehicleType, ZoneType } from 'src/common/enums';

class NodeRef {
    @ApiProperty() id!: string;
    @ApiProperty() code!: string;
    @ApiProperty() name!: string;
}

export class ProductResponse {
    @ApiProperty() id!: string;
    @ApiProperty() scenarioId!: string;
    @ApiProperty() name!: string;
    @ApiPropertyOptional() sku!: string | null;
    @ApiProperty({ enum: ProductCategory }) category!: ProductCategory;
    @ApiProperty() weightKg!: number;
    @ApiProperty() volumeM3!: number;
    @ApiPropertyOptional() widthM!: number | null;
    @ApiPropertyOptional() depthM!: number | null;
    @ApiPropertyOptional() heightM!: number | null;
    @ApiPropertyOptional({ enum: ZoneType }) requiredZone!: ZoneType | null;
    @ApiPropertyOptional() requiredTempMin!: number | null;
    @ApiPropertyOptional() requiredTempMax!: number | null;
    @ApiProperty() demandFrequency!: number;
    @ApiProperty({ enum: PriorityLevel }) priority!: PriorityLevel;
    @ApiProperty({ enum: VehicleType }) vehicleType!: VehicleType;
    @ApiPropertyOptional() preferredEntryNodeId!: string | null;
    @ApiPropertyOptional() preferredExitNodeId!: string | null;
    @ApiPropertyOptional() notes!: string | null;
    @ApiProperty() createdAt!: Date;
    @ApiPropertyOptional() preferredEntryNode?: NodeRef;
    @ApiPropertyOptional() preferredExitNode?: NodeRef;

    static fromEntity(entity: ProductEntity, relations?: { preferredEntryNode?: any; preferredExitNode?: any }): ProductResponse {
        const res = new ProductResponse();
        res.id = entity.id;
        res.scenarioId = entity.scenarioId;
        res.name = entity.name;
        res.sku = entity.sku;
        res.category = entity.category;
        res.weightKg = entity.weightKg;
        res.volumeM3 = entity.volumeM3;
        res.widthM = entity.widthM;
        res.depthM = entity.depthM;
        res.heightM = entity.heightM;
        res.requiredZone = entity.requiredZone;
        res.requiredTempMin = entity.requiredTempMin;
        res.requiredTempMax = entity.requiredTempMax;
        res.demandFrequency = entity.demandFrequency;
        res.priority = entity.priority;
        res.vehicleType = entity.vehicleType;
        res.preferredEntryNodeId = entity.preferredEntryNodeId;
        res.preferredExitNodeId = entity.preferredExitNodeId;
        res.notes = entity.notes;
        res.createdAt = entity.createdAt;
        if (relations?.preferredEntryNode) res.preferredEntryNode = relations.preferredEntryNode;
        if (relations?.preferredExitNode) res.preferredExitNode = relations.preferredExitNode;
        return res;
    }
}
