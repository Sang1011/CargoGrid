import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementStatus, MovementType, ReservationStatus } from 'src/common/enums';
import { MovementEntity } from '../../domain/movement.entity';

class ReservationResponse {
    @ApiProperty({ enum: ReservationStatus }) status!: ReservationStatus;
    @ApiPropertyOptional({ description: 'Null once the movement has started' }) expiresAt!: Date | null;
}

export class MovementResponse {
    @ApiProperty() id!: string;
    @ApiProperty() scenarioId!: string;
    @ApiProperty() cargoItemId!: string;
    @ApiProperty({ enum: MovementType }) type!: MovementType;
    @ApiProperty({ enum: MovementStatus }) status!: MovementStatus;
    @ApiPropertyOptional() fromWarehouseId!: string | null;
    @ApiPropertyOptional() fromSlotId!: string | null;
    @ApiPropertyOptional() toWarehouseId!: string | null;
    @ApiPropertyOptional() toSlotId!: string | null;
    @ApiPropertyOptional() vehicleId!: string | null;
    @ApiProperty() weightKg!: number;
    @ApiProperty() volumeM3!: number;
    @ApiPropertyOptional() reason!: string | null;
    @ApiPropertyOptional() cancelReason!: string | null;
    @ApiPropertyOptional() requestedById!: string | null;
    @ApiProperty() version!: number;
    @ApiPropertyOptional() startedAt!: Date | null;
    @ApiPropertyOptional() completedAt!: Date | null;
    @ApiPropertyOptional() cancelledAt!: Date | null;
    @ApiProperty() createdAt!: Date;
    @ApiPropertyOptional({ type: ReservationResponse }) reservation!: ReservationResponse | null;

    static fromEntity(e: MovementEntity): MovementResponse {
        const r = new MovementResponse();
        r.id = e.id;
        r.scenarioId = e.scenarioId;
        r.cargoItemId = e.cargoItemId;
        r.type = e.type;
        r.status = e.status;
        r.fromWarehouseId = e.fromWarehouseId;
        r.fromSlotId = e.fromSlotId;
        r.toWarehouseId = e.toWarehouseId;
        r.toSlotId = e.toSlotId;
        r.vehicleId = e.vehicleId;
        r.weightKg = e.weightKg;
        r.volumeM3 = e.volumeM3;
        r.reason = e.reason;
        r.cancelReason = e.cancelReason;
        r.requestedById = e.requestedById;
        r.version = e.version;
        r.startedAt = e.startedAt;
        r.completedAt = e.completedAt;
        r.cancelledAt = e.cancelledAt;
        r.createdAt = e.createdAt;
        r.reservation = e.reservation;
        return r;
    }
}
