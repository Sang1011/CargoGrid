import { CargoItemStatus } from "src/common/enums";

export interface CargoItemProps {
    id: string;
    productId: string;
    scenarioId: string;
    barcode: string | null;
    serialNumber: string | null;
    batchNumber: string | null;
    actualWeightKg: number | null;
    actualVolumeM3: number | null;
    actualWidthM: number | null;
    actualDepthM: number | null;
    actualHeightM: number | null;
    status: CargoItemStatus;
    currentSlotId: string | null;
    currentWarehouseId: string | null;
    currentTempC: number | null;
    lastTempCheckAt: Date | null;
    manufactureDate: Date | null;
    expiryDate: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class CargoItemEntity {
    readonly id!: string;
    readonly productId!: string;
    readonly scenarioId!: string;
    readonly barcode!: string | null;
    readonly serialNumber!: string | null;
    readonly batchNumber!: string | null;
    readonly actualWeightKg!: number | null;
    readonly actualVolumeM3!: number | null;
    readonly actualWidthM!: number | null;
    readonly actualDepthM!: number | null;
    readonly actualHeightM!: number | null;
    readonly status!: CargoItemStatus;
    readonly currentSlotId!: string | null;
    readonly currentWarehouseId!: string | null;
    readonly currentTempC!: number | null;
    readonly lastTempCheckAt!: Date | null;
    readonly manufactureDate!: Date | null;
    readonly expiryDate!: Date | null;
    readonly notes!: string | null;
    readonly createdAt!: Date;
    readonly updatedAt!: Date;

    constructor(props: CargoItemProps) {
        Object.assign(this, props);
    }
}
