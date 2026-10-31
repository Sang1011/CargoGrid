import { PrismaClient } from '@prisma/client';
import type { ScenarioSeed } from './scenarios';
import type { ProductSeed } from './products';
import type { WarehouseSeed } from './warehouses';
import type { StorageSlotSeed } from './storage-slots';

export async function seedCargoItems(
  prisma: PrismaClient,
  { scenario1 }: ScenarioSeed,
  products: ProductSeed,
  warehouses: WarehouseSeed,
  slots: StorageSlotSeed,
) {
  const scenarioId = scenario1.id;

  const cargo1 = await prisma.cargoItem.create({
    data: {
      productId: products.product1.id,
      scenarioId,
      barcode: 'BARCODE-001',
      serialNumber: 'SN-001-A',
      batchNumber: 'BATCH-2024-01',
      actualWeightKg: 0.5,
      actualVolumeM3: 0.001,
      actualWidthM: 0.1,
      actualDepthM: 0.05,
      actualHeightM: 0.02,
      status: 'stored',
      currentSlotId: slots.slot1.id,
      currentWarehouseId: warehouses.warehouse1.id,
      manufactureDate: new Date('2024-01-15'),
      expiryDate: new Date('2026-01-15'),
    },
  });

  const cargo2 = await prisma.cargoItem.create({
    data: {
      productId: products.product2.id,
      scenarioId,
      barcode: 'BARCODE-002',
      serialNumber: null,
      batchNumber: null,
      actualWeightKg: 1.8,
      actualVolumeM3: 0.045,
      status: 'stored',
      currentSlotId: slots.slot5.id,
      currentWarehouseId: warehouses.warehouse2.id,
    },
  });

  const cargo3 = await prisma.cargoItem.create({
    data: {
      productId: products.product3.id,
      scenarioId,
      barcode: 'BARCODE-003',
      status: 'stored',
      currentSlotId: slots.slot2.id,
      currentWarehouseId: warehouses.warehouse1.id,
    },
  });

  const cargo4 = await prisma.cargoItem.create({
    data: {
      productId: products.product5.id,
      scenarioId,
      barcode: 'BARCODE-004',
      status: 'stored',
      currentSlotId: slots.slot3.id,
      currentWarehouseId: warehouses.warehouse1.id,
    },
  });

  const cargo5 = await prisma.cargoItem.create({
    data: {
      productId: products.product4.id,
      scenarioId,
      barcode: 'BARCODE-005',
      status: 'lost',
      currentSlotId: null,
      currentWarehouseId: null,
    },
  });

  const cargo6 = await prisma.cargoItem.create({
    data: {
      productId: products.product6.id,
      scenarioId,
      barcode: 'BARCODE-006',
      status: 'damaged',
      currentSlotId: slots.slot3.id,
      currentWarehouseId: warehouses.warehouse1.id,
    },
  });

  const cargo7 = await prisma.cargoItem.create({
    data: {
      productId: products.product9.id,
      scenarioId,
      barcode: 'BARCODE-007',
      status: 'in_transit_inbound',
      currentSlotId: null,
      currentWarehouseId: null,
    },
  });

  const cargo8 = await prisma.cargoItem.create({
    data: {
      productId: products.product10.id,
      scenarioId,
      barcode: 'BARCODE-008',
      batchNumber: 'BATCH-2023-OLD',
      status: 'delivered',
      currentSlotId: null,
      currentWarehouseId: warehouses.warehouse1.id,
      expiryDate: new Date('2024-06-15'),
    },
  });

  const cargo9 = await prisma.cargoItem.create({
    data: {
      productId: products.product7.id,
      scenarioId,
      barcode: 'BARCODE-009',
      status: 'in_transit_outbound',
      currentSlotId: null,
      currentWarehouseId: warehouses.warehouse1.id,
    },
  });

  const cargo10 = await prisma.cargoItem.create({
    data: {
      productId: products.product8.id,
      scenarioId,
      barcode: 'BARCODE-010',
      status: 'stored',
      currentSlotId: slots.slot8.id,
      currentWarehouseId: warehouses.warehouse2.id,
    },
  });

  return { cargo1, cargo2, cargo3, cargo4, cargo5, cargo6, cargo7, cargo8, cargo9, cargo10 };
}

export type CargoItemSeed = Awaited<ReturnType<typeof seedCargoItems>>;
