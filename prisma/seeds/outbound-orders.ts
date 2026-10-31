import { PrismaClient } from '@prisma/client';
import type { ScenarioSeed } from './scenarios';
import type { WarehouseSeed } from './warehouses';
import type { CargoItemSeed } from './cargo-items';
import type { StorageSlotSeed } from './storage-slots';
import type { LocationNodeSeed } from './location-nodes';

export async function seedOutboundOrders(
  prisma: PrismaClient,
  { scenario1 }: ScenarioSeed,
  warehouses: WarehouseSeed,
  cargoItems: CargoItemSeed,
  slots: StorageSlotSeed,
  nodes: LocationNodeSeed,
) {
  const scenarioId = scenario1.id;

  const order1 = await prisma.outboundOrder.create({
    data: {
      scenarioId,
      code: 'OUT-2024-001',
      status: 'confirmed',
      priority: 'high',
      destinationType: 'port',
      destinationName: 'Port of Hai Phong',
      exitNodeId: nodes.node1.id,
      requestedAt: new Date('2024-12-01T08:00:00Z'),
      deadlineAt: new Date('2024-12-05T18:00:00Z'),
      totalItems: 2,
      notes: 'Export shipment to international customer',
    },
  });

  const outItem1 = await prisma.outboundOrderItem.create({
    data: {
      outboundOrderId: order1.id,
      cargoItemId: cargoItems.cargo4.id,
      fromSlotId: slots.slot3.id,
      fromWarehouseId: warehouses.warehouse1.id,
      status: 'pending',
    },
  });

  const outItem2 = await prisma.outboundOrderItem.create({
    data: {
      outboundOrderId: order1.id,
      cargoItemId: cargoItems.cargo9.id,
      fromSlotId: null,
      fromWarehouseId: warehouses.warehouse1.id,
      status: 'pending',
    },
  });

  const order2 = await prisma.outboundOrder.create({
    data: {
      scenarioId,
      code: 'OUT-2024-002',
      status: 'draft',
      priority: 'low',
      destinationType: 'gate',
      destinationName: 'WH-A Gate',
      exitNodeId: nodes.node2.id,
      requestedAt: new Date('2024-12-10T08:00:00Z'),
      deadlineAt: null,
      totalItems: 1,
      notes: 'Local pickup - no deadline',
    },
  });

  const outItem3 = await prisma.outboundOrderItem.create({
    data: {
      outboundOrderId: order2.id,
      cargoItemId: cargoItems.cargo2.id,
      fromSlotId: slots.slot5.id,
      fromWarehouseId: warehouses.warehouse2.id,
      status: 'pending',
    },
  });

  const order3 = await prisma.outboundOrder.create({
    data: {
      scenarioId,
      code: 'OUT-2024-003',
      status: 'draft',
      priority: 'medium',
      destinationType: 'port',
      destinationName: 'Port of Da Nang',
      exitNodeId: nodes.node1.id,
      requestedAt: new Date('2024-11-01T08:00:00Z'),
      deadlineAt: new Date('2024-11-05T18:00:00Z'),
      totalItems: 1,
      notes: 'Overdue order - deadline already passed',
    },
  });

  const outItem4 = await prisma.outboundOrderItem.create({
    data: {
      outboundOrderId: order3.id,
      cargoItemId: cargoItems.cargo8.id,
      fromSlotId: null,
      fromWarehouseId: warehouses.warehouse1.id,
      status: 'pending',
    },
  });

  return { order1, order2, order3, outItem1, outItem2, outItem3, outItem4 };
}

export type OutboundOrderSeed = Awaited<ReturnType<typeof seedOutboundOrders>>;
