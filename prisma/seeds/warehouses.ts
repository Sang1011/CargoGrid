import { PrismaClient } from '@prisma/client';
import type { ScenarioSeed } from './scenarios';

export async function seedWarehouses(prisma: PrismaClient, { scenario1 }: ScenarioSeed) {
  const scenarioId = scenario1.id;

  const warehouse1 = await prisma.warehouse.create({
    data: {
      scenarioId,
      name: 'Main Warehouse A',
      code: 'WH-A',
      type: 'normal',
      geoLat: 21.028511,
      geoLng: 105.804817,
      localX: 0,
      localY: 0,
      totalAreaSqm: 5000,
      doorCount: 5,
      doorWidthM: 4.5,
      doorHeightM: 5.0,
      maxWeightKg: 500000,
      currentWeightKg: 450000,
      maxVolumeM3: 10000,
      currentVolumeM3: 8000,
      gridCols: 20,
      gridRows: 15,
      gridCellWidthM: 3.0,
      gridCellDepthM: 3.0,
      isActive: true,
      notes: 'Primary warehouse with near-full capacity',
      allowedVehicles: {
        create: [
          { vehicleType: 'forklift', maxLoadKg: 1000, speedRating: 3 },
          { vehicleType: 'pallet_jack', maxLoadKg: 500, speedRating: 1 },
          { vehicleType: 'reach_truck', maxLoadKg: 2000, speedRating: 4 },
          { vehicleType: 'electric_cart', maxLoadKg: 300, speedRating: 2 },
          { vehicleType: 'manual', maxLoadKg: 100, speedRating: 1 },
        ],
      },
    },
  });

  const warehouse2 = await prisma.warehouse.create({
    data: {
      scenarioId,
      name: 'Cold Storage B',
      code: 'WH-B',
      type: 'cold',
      geoLat: 21.028511,
      geoLng: 105.814817,
      localX: 500,
      localY: 0,
      tempMin: -10,
      tempMax: 10,
      totalAreaSqm: 2000,
      doorCount: 3,
      doorWidthM: 3.5,
      doorHeightM: 4.0,
      maxWeightKg: 200000,
      currentWeightKg: 50000,
      maxVolumeM3: 4000,
      currentVolumeM3: 1000,
      gridCols: 10,
      gridRows: 10,
      gridCellWidthM: 3.0,
      gridCellDepthM: 3.0,
      isActive: true,
      allowedVehicles: {
        create: [
          { vehicleType: 'forklift', maxLoadKg: 800, speedRating: 2 },
          { vehicleType: 'pallet_jack', maxLoadKg: 400, speedRating: 1 },
        ],
      },
    },
  });

  const warehouse3 = await prisma.warehouse.create({
    data: {
      scenarioId,
      name: 'Mixed Storage C',
      code: 'WH-C',
      type: 'mixed',
      geoLat: null,
      geoLng: null,
      localX: 1000,
      localY: 0,
      totalAreaSqm: 3000,
      doorCount: 4,
      doorWidthM: null,
      doorHeightM: null,
      maxWeightKg: 300000,
      currentWeightKg: 0,
      maxVolumeM3: 6000,
      currentVolumeM3: 0,
      gridCols: null,
      gridRows: null,
      isActive: false,
      notes: 'Inactive warehouse for testing',
    },
  });

  return { warehouse1, warehouse2, warehouse3 };
}

export type WarehouseSeed = Awaited<ReturnType<typeof seedWarehouses>>;
