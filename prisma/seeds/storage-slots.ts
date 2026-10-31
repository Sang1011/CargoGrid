import { PrismaClient } from '@prisma/client';
import type { WarehouseSeed } from './warehouses';
import type { ZoneSeed } from './zones';

export async function seedStorageSlots(
  prisma: PrismaClient,
  warehouses: WarehouseSeed,
  zones: ZoneSeed,
) {
  const slots: Record<string, any> = {};

  slots.slot1 = await prisma.storageSlot.create({
    data: {
      zoneId: zones.zone1.id,
      warehouseId: warehouses.warehouse1.id,
      name: 'A1-01',
      localX: 0,
      localY: 0,
      localZ: 0,
      widthM: 1.2,
      depthM: 1.0,
      heightM: 1.5,
      maxWeightKg: 500,
      currentWeightKg: 250,
      maxVolumeM3: 1.8,
      currentVolumeM3: 0.5,
      aisleWidthM: 2.5,
      zoneType: 'normal',
      rowIndex: 0,
      colIndex: 0,
      colSpan: 1,
      rowSpan: 1,
      rotationDeg: 0,
      displayLabel: 'A-01',
      isBlocked: false,
      isActive: true,
      allowedVehicles: {
        create: [
          { vehicleType: 'forklift' },
          { vehicleType: 'pallet_jack' },
        ],
      },
    },
  });

  slots.slot2 = await prisma.storageSlot.create({
    data: {
      zoneId: zones.zone1.id,
      warehouseId: warehouses.warehouse1.id,
      name: 'A1-02',
      localX: 1.2,
      localY: 0,
      localZ: 0,
      widthM: 1.2,
      depthM: 1.0,
      heightM: 1.5,
      maxWeightKg: 500,
      currentWeightKg: 500,
      maxVolumeM3: 1.8,
      currentVolumeM3: 0.8,
      aisleWidthM: 2.5,
      zoneType: 'normal',
      rowIndex: 0,
      colIndex: 1,
      displayLabel: 'A-02',
      isBlocked: false,
      isActive: true,
    },
  });

  slots.slot3 = await prisma.storageSlot.create({
    data: {
      zoneId: zones.zone2.id,
      warehouseId: warehouses.warehouse1.id,
      name: 'A2-01',
      localX: 0,
      localY: 0,
      localZ: 0,
      widthM: 2.0,
      depthM: 1.5,
      heightM: 2.0,
      maxWeightKg: 2000,
      currentWeightKg: 0,
      maxVolumeM3: 6.0,
      currentVolumeM3: 0,
      aisleWidthM: 3.0,
      zoneType: 'heavy',
      rowIndex: 0,
      colIndex: 0,
      displayLabel: 'H-01',
      isBlocked: false,
      isActive: true,
      allowedVehicles: {
        create: [
          { vehicleType: 'reach_truck' },
          { vehicleType: 'forklift' },
        ],
      },
    },
  });

  slots.slot4 = await prisma.storageSlot.create({
    data: {
      zoneId: zones.zone3.id,
      warehouseId: warehouses.warehouse1.id,
      name: 'A3-01',
      localX: 0,
      localY: 0,
      localZ: 0,
      widthM: 0.8,
      depthM: 0.6,
      heightM: 0.8,
      maxWeightKg: 100,
      currentWeightKg: 0,
      maxVolumeM3: 0.384,
      currentVolumeM3: 0,
      aisleWidthM: 1.5,
      zoneType: 'fragile',
      rowIndex: 0,
      colIndex: 0,
      displayLabel: 'F-01',
      isBlocked: true,
      isActive: true,
    },
  });

  slots.slot5 = await prisma.storageSlot.create({
    data: {
      zoneId: zones.zone4.id,
      warehouseId: warehouses.warehouse2.id,
      name: 'B1-01',
      localX: 0,
      localY: 0,
      localZ: 0,
      widthM: 1.2,
      depthM: 1.0,
      heightM: 1.5,
      maxWeightKg: 500,
      currentWeightKg: 0,
      maxVolumeM3: 1.8,
      currentVolumeM3: 0,
      aisleWidthM: 2.0,
      zoneType: 'cold',
      rowIndex: 0,
      colIndex: 0,
      displayLabel: 'C-01',
      isBlocked: false,
      isActive: true,
      allowedVehicles: {
        create: [
          { vehicleType: 'forklift' },
          { vehicleType: 'pallet_jack' },
        ],
      },
    },
  });

  slots.slot6 = await prisma.storageSlot.create({
    data: {
      zoneId: zones.zone4.id,
      warehouseId: warehouses.warehouse2.id,
      name: 'B1-02',
      localX: 1.2,
      localY: 0,
      localZ: 0,
      widthM: 1.2,
      depthM: 1.0,
      heightM: 1.5,
      maxWeightKg: 500,
      currentWeightKg: 0,
      maxVolumeM3: 1.8,
      currentVolumeM3: 0,
      aisleWidthM: 2.0,
      zoneType: 'cold',
      rowIndex: 0,
      colIndex: 1,
      displayLabel: 'C-02',
      isBlocked: true,
      isActive: true,
    },
  });

  slots.slot7 = await prisma.storageSlot.create({
    data: {
      zoneId: zones.zone5.id,
      warehouseId: warehouses.warehouse2.id,
      name: 'B2-01',
      localX: 0,
      localY: 0,
      localZ: 0,
      widthM: 1.0,
      depthM: 1.0,
      heightM: 1.5,
      maxWeightKg: 300,
      currentWeightKg: 0,
      maxVolumeM3: 1.5,
      currentVolumeM3: 0,
      aisleWidthM: null,
      zoneType: 'cold',
      rowIndex: 0,
      colIndex: 0,
      displayLabel: 'C-03',
      isBlocked: false,
      isActive: true,
    },
  });

  slots.slot8 = await prisma.storageSlot.create({
    data: {
      zoneId: zones.zone5.id,
      warehouseId: warehouses.warehouse2.id,
      name: 'B2-02',
      localX: 1.0,
      localY: 0,
      localZ: 0,
      widthM: 1.0,
      depthM: 1.0,
      heightM: 1.5,
      maxWeightKg: 300,
      currentWeightKg: 0,
      maxVolumeM3: 1.5,
      currentVolumeM3: 0,
      aisleWidthM: 2.0,
      zoneType: 'cold',
      rowIndex: 0,
      colIndex: 1,
      displayLabel: 'C-04',
      isBlocked: false,
      isActive: true,
    },
  });

  slots.slot9 = await prisma.storageSlot.create({
    data: {
      zoneId: zones.zone6.id,
      warehouseId: warehouses.warehouse3.id,
      name: 'C1-01',
      localX: 0,
      localY: 0,
      localZ: 0,
      widthM: 1.2,
      depthM: 1.0,
      heightM: 1.5,
      maxWeightKg: 500,
      currentWeightKg: 0,
      maxVolumeM3: 1.8,
      currentVolumeM3: 0,
      aisleWidthM: 2.5,
      zoneType: 'normal',
      rowIndex: 0,
      colIndex: 0,
      displayLabel: 'M-01',
      isBlocked: false,
      isActive: true,
    },
  });

  slots.slot10 = await prisma.storageSlot.create({
    data: {
      zoneId: zones.zone6.id,
      warehouseId: warehouses.warehouse3.id,
      name: 'C1-02',
      localX: 1.2,
      localY: 0,
      localZ: 0,
      widthM: 1.2,
      depthM: 1.0,
      heightM: 1.5,
      maxWeightKg: 500,
      currentWeightKg: 0,
      maxVolumeM3: 1.8,
      currentVolumeM3: 0,
      aisleWidthM: 2.5,
      zoneType: 'normal',
      rowIndex: 0,
      colIndex: 1,
      displayLabel: 'M-02',
      isBlocked: false,
      isActive: true,
    },
  });

  slots.slot11 = await prisma.storageSlot.create({
    data: {
      zoneId: zones.zone7.id,
      warehouseId: warehouses.warehouse3.id,
      name: 'C2-01',
      localX: 0,
      localY: 0,
      localZ: 0,
      widthM: 1.0,
      depthM: 1.0,
      heightM: 1.2,
      maxWeightKg: 300,
      currentWeightKg: 0,
      maxVolumeM3: 1.2,
      currentVolumeM3: 0,
      aisleWidthM: 2.0,
      zoneType: 'hazardous',
      rowIndex: 0,
      colIndex: 0,
      displayLabel: 'HZ-01',
      isBlocked: false,
      isActive: true,
    },
  });

  return slots;
}

export type StorageSlotSeed = Awaited<ReturnType<typeof seedStorageSlots>>;
