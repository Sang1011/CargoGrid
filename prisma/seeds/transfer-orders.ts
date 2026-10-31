import { PrismaClient } from '@prisma/client';
import type { ScenarioSeed } from './scenarios';
import type { WarehouseSeed } from './warehouses';
import type { CargoItemSeed } from './cargo-items';
import type { StorageSlotSeed } from './storage-slots';
import type { WarehouseIncidentSeed } from './warehouse-incidents';

export async function seedTransferOrders(
  prisma: PrismaClient,
  { scenario1 }: ScenarioSeed,
  warehouses: WarehouseSeed,
  cargoItems: CargoItemSeed,
  slots: StorageSlotSeed,
  incidents: WarehouseIncidentSeed,
) {
  const scenarioId = scenario1.id;

  const order1 = await prisma.transferOrder.create({
    data: {
      scenarioId,
      incidentId: incidents.incident1.id,
      code: 'TFR-2024-001',
      status: 'draft',
      priority: 'urgent',
      fromWarehouseId: warehouses.warehouse1.id,
      reason: 'Emergency evacuation due to cooling failure',
      isEmergency: true,
      totalItems: 2,
    },
  });

  const item1 = await prisma.transferOrderItem.create({
    data: {
      transferOrderId: order1.id,
      cargoItemId: cargoItems.cargo3.id,
      fromSlotId: slots.slot2.id,
      proposedWarehouseId: warehouses.warehouse2.id,
      proposedSlotId: slots.slot6.id,
      proposalScore: 85.5,
      proposalReasons: ['capacity_fit', 'category_match'],
      actualWarehouseId: warehouses.warehouse2.id,
      actualSlotId: slots.slot8.id,
      status: 'pending',
    },
  });

  const item2 = await prisma.transferOrderItem.create({
    data: {
      transferOrderId: order1.id,
      cargoItemId: cargoItems.cargo6.id,
      fromSlotId: slots.slot3.id,
      proposedWarehouseId: warehouses.warehouse2.id,
      proposedSlotId: slots.slot5.id,
      proposalScore: 72.0,
      proposalReasons: ['vehicle_access'],
      status: 'pending',
    },
  });

  const order2 = await prisma.transferOrder.create({
    data: {
      scenarioId,
      incidentId: null,
      code: 'TFR-2024-002',
      status: 'proposed',
      priority: 'high',
      fromWarehouseId: warehouses.warehouse1.id,
      reason: 'Routine redistribution',
      isEmergency: false,
      totalItems: 1,
    },
  });

  const item3 = await prisma.transferOrderItem.create({
    data: {
      transferOrderId: order2.id,
      cargoItemId: cargoItems.cargo1.id,
      fromSlotId: slots.slot1.id,
      proposedWarehouseId: warehouses.warehouse3.id,
      proposedSlotId: slots.slot9.id,
      status: 'pending',
    },
  });

  return { order1, order2, item1, item2, item3 };
}

export type TransferOrderSeed = Awaited<ReturnType<typeof seedTransferOrders>>;
