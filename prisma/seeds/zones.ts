import { PrismaClient } from '@prisma/client';
import type { WarehouseSeed } from './warehouses';

export async function seedZones(prisma: PrismaClient, warehouses: WarehouseSeed) {
  const zone1 = await prisma.zone.create({
    data: {
      warehouseId: warehouses.warehouse1.id,
      name: 'Normal Storage Zone A1',
      code: 'WH-A-Z1',
      zoneType: 'normal',
      localX: 0,
      localY: 0,
      width: 300,
      depth: 200,
      maxWeightKg: 200000,
      maxVolumeM3: 4000,
      gridColStart: 0,
      gridRowStart: 0,
      gridCols: 10,
      gridRows: 8,
      isActive: true,
    },
  });

  const zone2 = await prisma.zone.create({
    data: {
      warehouseId: warehouses.warehouse1.id,
      name: 'Heavy Zone A2',
      code: 'WH-A-Z2',
      zoneType: 'heavy',
      localX: 0,
      localY: 200,
      width: 200,
      depth: 150,
      maxWeightKg: 300000,
      maxVolumeM3: 5000,
      gridColStart: 0,
      gridRowStart: 8,
      gridCols: 10,
      gridRows: 7,
      isActive: true,
    },
  });

  const zone3 = await prisma.zone.create({
    data: {
      warehouseId: warehouses.warehouse1.id,
      name: 'Fragile Zone A3',
      code: 'WH-A-Z3',
      zoneType: 'fragile',
      localX: 200,
      localY: 0,
      width: 100,
      depth: 100,
      maxWeightKg: 50000,
      maxVolumeM3: 1000,
      gridColStart: 10,
      gridRowStart: 0,
      gridCols: 5,
      gridRows: 5,
      isActive: false,
    },
  });

  const zone4 = await prisma.zone.create({
    data: {
      warehouseId: warehouses.warehouse2.id,
      name: 'Cold Storage B1',
      code: 'WH-B-Z1',
      zoneType: 'cold',
      localX: 0,
      localY: 0,
      width: 200,
      depth: 150,
      tempMin: -10,
      tempMax: 10,
      maxWeightKg: 100000,
      maxVolumeM3: 2000,
      gridColStart: 0,
      gridRowStart: 0,
      gridCols: 8,
      gridRows: 6,
      isActive: true,
    },
  });

  const zone5 = await prisma.zone.create({
    data: {
      warehouseId: warehouses.warehouse2.id,
      name: 'Cold Storage B2',
      code: 'WH-B-Z2',
      zoneType: 'cold',
      localX: 0,
      localY: 150,
      width: 200,
      depth: 100,
      tempMin: null,
      tempMax: null,
      maxWeightKg: 80000,
      maxVolumeM3: 1500,
      gridColStart: 0,
      gridRowStart: 6,
      gridCols: 8,
      gridRows: 4,
      isActive: true,
    },
  });

  const zone6 = await prisma.zone.create({
    data: {
      warehouseId: warehouses.warehouse3.id,
      name: 'Mixed Zone C1',
      code: 'WH-C-Z1',
      zoneType: 'normal',
      localX: 0,
      localY: 0,
      width: 250,
      depth: 150,
      maxWeightKg: 150000,
      maxVolumeM3: 3000,
      gridColStart: 0,
      gridRowStart: 0,
      gridCols: 10,
      gridRows: 6,
      isActive: true,
    },
  });

  const zone7 = await prisma.zone.create({
    data: {
      warehouseId: warehouses.warehouse3.id,
      name: 'Hazardous Zone C2',
      code: 'WH-C-Z2',
      zoneType: 'hazardous',
      localX: 0,
      localY: 150,
      width: 150,
      depth: 100,
      maxWeightKg: 50000,
      maxVolumeM3: 1000,
      gridColStart: 0,
      gridRowStart: 6,
      gridCols: 6,
      gridRows: 4,
      isActive: true,
    },
  });

  return { zone1, zone2, zone3, zone4, zone5, zone6, zone7 };
}

export type ZoneSeed = Awaited<ReturnType<typeof seedZones>>;
