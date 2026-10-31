import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentEntity } from '../../domain/assignment.entity';
import { AssignmentStatus } from 'src/common/enums';

export class AssignmentResponse {
    @ApiProperty() id!: string;
    @ApiProperty() runId!: string;
    @ApiProperty() productId!: string;
    @ApiPropertyOptional() warehouseId!: string | null;
    @ApiPropertyOptional() slotId!: string | null;
    @ApiProperty({ enum: AssignmentStatus }) status!: AssignmentStatus;
    @ApiPropertyOptional() finalScore!: number | null;
    @ApiPropertyOptional() capacityFitScore!: number | null;
    @ApiPropertyOptional() movementCostScore!: number | null;
    @ApiPropertyOptional() categoryMatchScore!: number | null;
    @ApiPropertyOptional() vehicleAccessScore!: number | null;
    @ApiPropertyOptional() demandPriorityScore!: number | null;
    @ApiPropertyOptional() congestionScore!: number | null;
    @ApiPropertyOptional() routeCost!: number | null;
    @ApiProperty() reasons!: string[];
    @ApiProperty() createdAt!: Date;

    static fromEntity(entity: AssignmentEntity): AssignmentResponse {
        const res = new AssignmentResponse();
        res.id = entity.id;
        res.runId = entity.runId;
        res.productId = entity.productId;
        res.warehouseId = entity.warehouseId;
        res.slotId = entity.slotId;
        res.status = entity.status;
        res.finalScore = entity.finalScore;
        res.capacityFitScore = entity.capacityFitScore;
        res.movementCostScore = entity.movementCostScore;
        res.categoryMatchScore = entity.categoryMatchScore;
        res.vehicleAccessScore = entity.vehicleAccessScore;
        res.demandPriorityScore = entity.demandPriorityScore;
        res.congestionScore = entity.congestionScore;
        res.routeCost = entity.routeCost;
        res.reasons = entity.reasons;
        res.createdAt = entity.createdAt;
        return res;
    }
}
