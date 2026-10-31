import { PrismaClient } from '@prisma/client';
import type { ScenarioSeed } from './scenarios';
import type { CargoItemSeed } from './cargo-items';
import type { WarehouseSeed } from './warehouses';
import type { StorageSlotSeed } from './storage-slots';
import type { LocationNodeSeed } from './location-nodes';

export async function seedInboundShipments(
  prisma: PrismaClient,
  { scenario1 }: ScenarioSeed,
  cargoItems: CargoItemSeed,
  warehouses: WarehouseSeed,
  slots: StorageSlotSeed,
  nodes: LocationNodeSeed,
) {
  const scenarioId = scenario1.id;

  const shipment1 = await prisma.inboundShipment.create({
    data: {
      scenarioId,
      code: 'INB-2024-001',
      sourceType: 'supplier',
      sourceName: 'Supplier Alpha',
      entryNodeId: nodes.node1.id,
      status: 'partial',
      arrivedAt: new Date('2024-11-01T08:00:00Z'),
      totalItems: 3,
      assignedItems: 2,
      failedItems: 1,
      notes: 'Partial delivery - one item failed inspection',
    },
  });

  const shipmentItem1 = await prisma.shipmentItem.create({
    data: {
      shipmentId: shipment1.id,
      cargoItemId: cargoItems.cargo1.id,
      status: 'stored',
      assignedWarehouseId: warehouses.warehouse1.id,
      assignedSlotId: slots.slot1.id,
      assignedAt: new Date('2024-11-01T10:00:00Z'),
      storedAt: new Date('2024-11-01T10:30:00Z'),
    },
  });

  const shipmentItem2 = await prisma.shipmentItem.create({
    data: {
      shipmentId: shipment1.id,
      cargoItemId: cargoItems.cargo2.id,
      status: 'stored',
      assignedWarehouseId: warehouses.warehouse2.id,
      assignedSlotId: slots.slot5.id,
      assignedAt: new Date('2024-11-01T11:00:00Z'),
      storedAt: new Date('2024-11-01T11:30:00Z'),
    },
  });

  const shipmentItem3 = await prisma.shipmentItem.create({
    data: {
      shipmentId: shipment1.id,
      cargoItemId: cargoItems.cargo3.id,
      status: 'failed',
      assignedWarehouseId: null,
      assignedSlotId: null,
    },
  });

  const shipment2 = await prisma.inboundShipment.create({
    data: {
      scenarioId,
      code: 'INB-2024-002',
      sourceType: 'port',
      sourceName: 'Port Authority',
      entryNodeId: nodes.node1.id,
      status: 'pending',
      arrivedAt: null,
      totalItems: 2,
      assignedItems: 0,
      failedItems: 0,
      notes: 'Awaiting arrival',
    },
  });

  const shipmentItem4 = await prisma.shipmentItem.create({
    data: {
      shipmentId: shipment2.id,
      cargoItemId: cargoItems.cargo4.id,
      status: 'waiting',
      assignedWarehouseId: null,
      assignedSlotId: null,
    },
  });

  const shipmentItem5 = await prisma.shipmentItem.create({
    data: {
      shipmentId: shipment2.id,
      cargoItemId: cargoItems.cargo7.id,
      status: 'waiting',
      assignedWarehouseId: null,
      assignedSlotId: null,
    },
  });

  return { shipment1, shipment2, shipmentItem1, shipmentItem2, shipmentItem3, shipmentItem4, shipmentItem5 };
}

export type InboundShipmentSeed = Awaited<ReturnType<typeof seedInboundShipments>>;
