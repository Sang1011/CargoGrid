import { MovementStatus, MovementType, ReservationStatus } from 'src/common/enums';

export interface ReservationView {
    status: ReservationStatus;
    expiresAt: Date | null;
}

export interface MovementProps {
    id: string;
    scenarioId: string;
    cargoItemId: string;
    type: MovementType;
    status: MovementStatus;
    fromWarehouseId: string | null;
    fromSlotId: string | null;
    toWarehouseId: string | null;
    toSlotId: string | null;
    vehicleId: string | null;
    weightKg: number;
    volumeM3: number;
    reason: string | null;
    cancelReason: string | null;
    requestedById: string | null;
    correlationId: string | null;
    version: number;
    startedAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    reservation: ReservationView | null;
}

export class MovementEntity {
    readonly id!: string;
    readonly scenarioId!: string;
    readonly cargoItemId!: string;
    readonly type!: MovementType;
    readonly status!: MovementStatus;
    readonly fromWarehouseId!: string | null;
    readonly fromSlotId!: string | null;
    readonly toWarehouseId!: string | null;
    readonly toSlotId!: string | null;
    readonly vehicleId!: string | null;
    readonly weightKg!: number;
    readonly volumeM3!: number;
    readonly reason!: string | null;
    readonly cancelReason!: string | null;
    readonly requestedById!: string | null;
    readonly correlationId!: string | null;
    readonly version!: number;
    readonly startedAt!: Date | null;
    readonly completedAt!: Date | null;
    readonly cancelledAt!: Date | null;
    readonly createdAt!: Date;
    readonly updatedAt!: Date;
    readonly reservation!: ReservationView | null;

    constructor(props: MovementProps) {
        Object.assign(this, props);
    }
}
