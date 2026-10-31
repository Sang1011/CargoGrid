import { PrismaClient } from '@prisma/client';
import type { ScenarioSeed } from './scenarios';
import type { WarehouseSeed } from './warehouses';
import type { StorageSlotSeed } from './storage-slots';

export async function seedLocationNodes(
  prisma: PrismaClient,
  { scenario1 }: ScenarioSeed,
  warehouses: WarehouseSeed,
  slots: StorageSlotSeed,
) {
  const scenarioId = scenario1.id;

  const node1 = await prisma.locationNode.create({
    data: {
      scenarioId,
      name: 'Main Port Entry',
      code: 'PORT-01',
      nodeType: 'PORT',
      geoLat: 21.028511,
      geoLng: 105.804817,
      localX: null,
      localY: null,
      warehouseId: null,
      slotId: null,
      isActive: true,
      metadata: { capacity: 500, type: 'sea_port' },
    },
  });

  const node2 = await prisma.locationNode.create({
    data: {
      scenarioId,
      name: 'WH-A Main Gate',
      code: 'GATE-A-01',
      nodeType: 'GATE',
      geoLat: null,
      geoLng: null,
      localX: 0,
      localY: 0,
      warehouseId: warehouses.warehouse1.id,
      slotId: null,
      isActive: true,
    },
  });

  const node3 = await prisma.locationNode.create({
    data: {
      scenarioId,
      name: 'WH-A Receiving Dock',
      code: 'DOCK-A-01',
      nodeType: 'DOCK',
      localX: 10,
      localY: 5,
      warehouseId: warehouses.warehouse1.id,
      slotId: null,
      isActive: true,
    },
  });

  const node4 = await prisma.locationNode.create({
    data: {
      scenarioId,
      name: 'WH-A Intersection 1',
      code: 'INT-A-01',
      nodeType: 'INTERSECTION',
      localX: 50,
      localY: 30,
      warehouseId: warehouses.warehouse1.id,
      slotId: null,
      isActive: true,
    },
  });

  const node5 = await prisma.locationNode.create({
    data: {
      scenarioId,
      name: 'WH-B Main Gate',
      code: 'GATE-B-01',
      nodeType: 'GATE',
      localX: 500,
      localY: 0,
      warehouseId: warehouses.warehouse2.id,
      slotId: null,
      isActive: true,
    },
  });

  const node6 = await prisma.locationNode.create({
    data: {
      scenarioId,
      name: 'WH-B Receiving Dock',
      code: 'DOCK-B-01',
      nodeType: 'DOCK',
      localX: 510,
      localY: 10,
      warehouseId: warehouses.warehouse2.id,
      slotId: null,
      isActive: true,
    },
  });

  const node7 = await prisma.locationNode.create({
    data: {
      scenarioId,
      name: 'WH-C Main Gate',
      code: 'GATE-C-01',
      nodeType: 'GATE',
      localX: 1000,
      localY: 0,
      warehouseId: warehouses.warehouse3.id,
      slotId: null,
      isActive: true,
    },
  });

  const node8 = await prisma.locationNode.create({
    data: {
      scenarioId,
      name: 'Warehouse A Storage Point',
      code: 'WH-A-SP',
      nodeType: 'WAREHOUSE',
      localX: 30,
      localY: 20,
      warehouseId: warehouses.warehouse1.id,
      slotId: null,
      isActive: true,
    },
  });

  const node9 = await prisma.locationNode.create({
    data: {
      scenarioId,
      name: 'Slot A1-01 Node',
      code: 'SLOT-A1-01',
      nodeType: 'SLOT',
      localX: 5,
      localY: 5,
      warehouseId: warehouses.warehouse1.id,
      slotId: slots.slot1.id,
      isActive: true,
    },
  });

  const node10 = await prisma.locationNode.create({
    data: {
      scenarioId,
      name: 'Parking Area A',
      code: 'PARK-A-01',
      nodeType: 'PARKING',
      localX: 0,
      localY: 50,
      warehouseId: warehouses.warehouse1.id,
      slotId: null,
      isActive: true,
    },
  });

  const node11 = await prisma.locationNode.create({
    data: {
      scenarioId,
      name: 'Security Checkpoint A',
      code: 'CHK-A-01',
      nodeType: 'CHECKPOINT',
      localX: -5,
      localY: 0,
      warehouseId: warehouses.warehouse1.id,
      slotId: null,
      isActive: true,
    },
  });

  return { node1, node2, node3, node4, node5, node6, node7, node8, node9, node10, node11 };
}

export type LocationNodeSeed = Awaited<ReturnType<typeof seedLocationNodes>>;
