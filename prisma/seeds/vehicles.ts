import { PrismaClient } from '@prisma/client';
import type { ScenarioSeed } from './scenarios';
import type { WarehouseSeed } from './warehouses';

export async function seedVehicles(
  prisma: PrismaClient,
  { scenario1 }: ScenarioSeed,
  warehouses: WarehouseSeed,
) {
  const scenarioId = scenario1.id;

  const vehicle1 = await prisma.vehicle.create({
    data: {
      scenarioId,
      code: 'FKL-001',
      name: 'Forklift Alpha',
      vehicleType: 'forklift',
      scope: 'intra_warehouse',
      homeWarehouseId: warehouses.warehouse1.id,
      status: 'available',
      maxLoadKg: 1000,
      maxVolumeM3: 2.0,
      widthM: 1.2,
      heightM: 1.8,
      speedRating: 3,
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      scenarioId,
      code: 'FKL-002',
      name: 'Forklift Beta',
      vehicleType: 'forklift',
      scope: 'intra_warehouse',
      homeWarehouseId: warehouses.warehouse1.id,
      status: 'busy',
      maxLoadKg: 800,
      maxVolumeM3: 1.5,
      speedRating: 2,
    },
  });

  const vehicle3 = await prisma.vehicle.create({
    data: {
      scenarioId,
      code: 'PJK-001',
      name: 'Pallet Jack One',
      vehicleType: 'pallet_jack',
      scope: 'intra_warehouse',
      homeWarehouseId: warehouses.warehouse1.id,
      status: 'available',
      maxLoadKg: 500,
      maxVolumeM3: 1.0,
      speedRating: 1,
    },
  });

  const vehicle4 = await prisma.vehicle.create({
    data: {
      scenarioId,
      code: 'RCH-001',
      name: 'Reach Truck One',
      vehicleType: 'reach_truck',
      scope: 'intra_warehouse',
      homeWarehouseId: warehouses.warehouse1.id,
      status: 'maintenance',
      maxLoadKg: 1500,
      maxVolumeM3: 3.0,
      speedRating: 4,
    },
  });

  const vehicle5 = await prisma.vehicle.create({
    data: {
      scenarioId,
      code: 'CTR-001',
      name: 'Container Truck Alpha',
      vehicleType: 'container_truck',
      scope: 'inter_warehouse',
      homeWarehouseId: null,
      status: 'available',
      maxLoadKg: 10000,
      maxVolumeM3: 40.0,
      widthM: 2.5,
      heightM: 3.0,
      speedRating: 5,
    },
  });

  const vehicle6 = await prisma.vehicle.create({
    data: {
      scenarioId,
      code: 'ECT-001',
      name: 'Electric Cart One',
      vehicleType: 'electric_cart',
      scope: 'intra_warehouse',
      homeWarehouseId: warehouses.warehouse2.id,
      status: 'available',
      maxLoadKg: 300,
      maxVolumeM3: 0.5,
      speedRating: 2,
    },
  });

  const vehicle7 = await prisma.vehicle.create({
    data: {
      scenarioId,
      code: 'MAN-001',
      name: 'Manual Cart One',
      vehicleType: 'manual',
      scope: 'intra_warehouse',
      homeWarehouseId: warehouses.warehouse3.id,
      status: 'inactive',
      maxLoadKg: 100,
      maxVolumeM3: 0.3,
      speedRating: 1,
    },
  });

  const vehicle8 = await prisma.vehicle.create({
    data: {
      scenarioId,
      code: 'CTR-002',
      name: 'Container Truck Beta',
      vehicleType: 'container_truck',
      scope: 'inter_warehouse',
      homeWarehouseId: warehouses.warehouse1.id,
      status: 'available',
      maxLoadKg: 8000,
      maxVolumeM3: 35.0,
      speedRating: 5,
    },
  });

  const vehicle9 = await prisma.vehicle.create({
    data: {
      scenarioId,
      code: 'FKL-003',
      name: 'Forklift Gamma',
      vehicleType: 'forklift',
      scope: 'intra_warehouse',
      homeWarehouseId: warehouses.warehouse2.id,
      status: 'available',
      maxLoadKg: 1200,
      maxVolumeM3: 2.5,
      speedRating: 3,
    },
  });

  const vehicle10 = await prisma.vehicle.create({
    data: {
      scenarioId,
      code: 'RCH-002',
      name: 'Reach Truck Beta',
      vehicleType: 'reach_truck',
      scope: 'intra_warehouse',
      homeWarehouseId: warehouses.warehouse3.id,
      status: 'available',
      maxLoadKg: 2000,
      maxVolumeM3: 4.0,
      speedRating: 4,
    },
  });

  return { vehicle1, vehicle2, vehicle3, vehicle4, vehicle5, vehicle6, vehicle7, vehicle8, vehicle9, vehicle10 };
}

export type VehicleSeed = Awaited<ReturnType<typeof seedVehicles>>;
