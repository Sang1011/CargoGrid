import { PrismaClient } from '@prisma/client';
import { cleanDatabase } from './seeds/helpers';
import { seedScenarios } from './seeds/scenarios';
import { seedProducts } from './seeds/products';
import { seedVehicles } from './seeds/vehicles';
import { seedWarehouses } from './seeds/warehouses';
import { seedZones } from './seeds/zones';
import { seedStorageSlots } from './seeds/storage-slots';
import { seedLocationNodes } from './seeds/location-nodes';
import { seedRoadEdges } from './seeds/road-edges';
import { seedCargoItems } from './seeds/cargo-items';
import { seedInboundShipments } from './seeds/inbound-shipments';
import { seedWarehouseIncidents } from './seeds/warehouse-incidents';
import { seedTransferOrders } from './seeds/transfer-orders';
import { seedOutboundOrders } from './seeds/outbound-orders';
import { seedIdentity } from './seeds/identity';

const prisma = new PrismaClient();

async function reconcileLoads(prisma: PrismaClient) {
  await prisma.$executeRaw`
    UPDATE storage_slots s SET
      current_weight_kg = COALESCE((SELECT SUM(COALESCE(c.actual_weight_kg, p.weight_kg)) FROM cargo_items c JOIN products p ON p.id = c.product_id WHERE c.current_slot_id = s.id), 0),
      current_volume_m3 = COALESCE((SELECT SUM(COALESCE(c.actual_volume_m3, p.volume_m3)) FROM cargo_items c JOIN products p ON p.id = c.product_id WHERE c.current_slot_id = s.id), 0)`;
  await prisma.$executeRaw`
    UPDATE warehouses w SET
      current_weight_kg = COALESCE((SELECT SUM(current_weight_kg) FROM storage_slots WHERE warehouse_id = w.id), 0),
      current_volume_m3 = COALESCE((SELECT SUM(current_volume_m3) FROM storage_slots WHERE warehouse_id = w.id), 0)`;
}

async function main() {
  console.log('Cleaning existing data...');
  await cleanDatabase(prisma);

  console.log('Seeding scenarios...');
  const scenarios = await seedScenarios(prisma);

  console.log('Seeding warehouses...');
  const warehouses = await seedWarehouses(prisma, scenarios);

  console.log('Seeding zones...');
  const zones = await seedZones(prisma, warehouses);

  console.log('Seeding storage slots...');
  const storageSlots = await seedStorageSlots(prisma, warehouses, zones);

  console.log('Seeding products...');
  const products = await seedProducts(prisma, scenarios);

  console.log('Seeding vehicles...');
  const vehicles = await seedVehicles(prisma, scenarios, warehouses);

  console.log('Seeding location nodes...');
  const locationNodes = await seedLocationNodes(prisma, scenarios, warehouses, storageSlots);

  console.log('Seeding road edges...');
  const roadEdges = await seedRoadEdges(prisma, scenarios, locationNodes);

  console.log('Seeding cargo items...');
  const cargoItems = await seedCargoItems(prisma, scenarios, products, warehouses, storageSlots);

  console.log('Seeding inbound shipments...');
  const inboundShipments = await seedInboundShipments(prisma, scenarios, cargoItems, warehouses, storageSlots, locationNodes);

  console.log('Seeding warehouse incidents...');
  const warehouseIncidents = await seedWarehouseIncidents(prisma, warehouses);

  console.log('Seeding transfer orders...');
  const transferOrders = await seedTransferOrders(prisma, scenarios, warehouses, cargoItems, storageSlots, warehouseIncidents);

  console.log('Seeding outbound orders...');
  const outboundOrders = await seedOutboundOrders(prisma, scenarios, warehouses, cargoItems, storageSlots, locationNodes);

  console.log('Seeding roles, permissions and demo users...');
  // Slot and warehouse load are derived from stored cargo; recompute so seeded data satisfies the
  // capacity CHECK constraints and cargo can be moved without negative or over-capacity loads.
  await reconcileLoads(prisma);

  await seedIdentity(prisma);

  console.log('Seed completed:', {
    scenarios: 2,
    products: 16,
    vehicles: 10,
    warehouses: 3,
    zones: 7,
    storageSlots: 11,
    locationNodes: 11,
    roadEdges: 10,
    cargoItems: 10,
    inboundShipments: 2,
    warehouseIncidents: 3,
    transferOrders: 2,
    outboundOrders: 3,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
