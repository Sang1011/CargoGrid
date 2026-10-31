import { PrismaClient } from '@prisma/client';

const TABLE_NAMES = [
  'outbound_order_items',
  'outbound_orders',
  'transfer_order_items',
  'transfer_orders',
  'warehouse_incidents',
  'shipment_items',
  'inbound_shipments',
  'cargo_item_events',
  'cargo_items',
  'road_allowed_vehicles',
  'road_edges',
  'location_nodes',
  'slot_allowed_vehicles',
  'storage_slots',
  'warehouse_sensor_readings',
  'zones',
  'warehouse_allowed_vehicles',
  'warehouses',
  'vehicles',
  'assignments',
  'optimization_runs',
  'products',
  'scenarios',
];

export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  for (const table of TABLE_NAMES) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}" CASCADE`);
  }
}
