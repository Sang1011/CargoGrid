import { PrismaClient } from '@prisma/client';

// Business tables only: users, roles and audit_logs are not wiped by a re-seed.
// The ledger (cargo_item_events) is truncated first and separately: a trigger rejects row-level DELETE on it.
const TABLE_NAMES = [
  'outbox_events',
  'slot_reservations',
  'movements',
  'outbound_order_items',
  'outbound_orders',
  'transfer_order_items',
  'transfer_orders',
  'warehouse_incidents',
  'shipment_items',
  'inbound_shipments',
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
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "cargo_item_events"');
  for (const table of TABLE_NAMES) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}" CASCADE`);
  }
}
