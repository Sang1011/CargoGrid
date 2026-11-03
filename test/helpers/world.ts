import { PrismaClient } from '@prisma/client';

export const CARGO_KG = 10;
export const CARGO_M3 = 0.1;

export interface World {
  scenarioId: string;
  productId: string;
  coldProductId: string;
  warehouses: { a: { id: string; zoneId: string }; b: { id: string; zoneId: string } };
}

let counter = 0;
const next = () => ++counter;

/** A throwaway scenario with two warehouses, so tests never see each other's rows. */
export async function newWorld(prisma: PrismaClient): Promise<World> {
  const n = next();
  const scenario = await prisma.scenario.create({ data: { name: `test-${Date.now()}-${n}`, tags: [] } });
  const product = (name: string, extra: Record<string, unknown> = {}) =>
    prisma.product.create({
      data: {
        scenarioId: scenario.id, name, category: 'normal', weightKg: CARGO_KG, volumeM3: CARGO_M3,
        vehicleType: 'forklift', ...extra,
      } as any,
    });
  const normal = await product('Pallet');
  const cold = await product('Frozen pallet', { category: 'cold', requiredTempMin: -5, requiredTempMax: 5 });

  const warehouse = async (code: string) => {
    const wh = await prisma.warehouse.create({ data: { scenarioId: scenario.id, name: `WH ${code}`, code, type: 'normal' } });
    const zone = await prisma.zone.create({
      data: { warehouseId: wh.id, name: 'Zone', code: 'Z1', zoneType: 'normal', localX: 0, localY: 0, width: 10, depth: 10 },
    });
    return { id: wh.id, zoneId: zone.id };
  };

  return { scenarioId: scenario.id, productId: normal.id, coldProductId: cold.id, warehouses: { a: await warehouse('A'), b: await warehouse('B') } };
}

let slotIndex = 0;

export async function newSlot(
  prisma: PrismaClient,
  world: World,
  where: 'a' | 'b',
  opts: { maxWeightKg?: number; maxVolumeM3?: number; isBlocked?: boolean; vehicles?: string[]; zoneId?: string; zoneType?: string } = {},
) {
  const wh = world.warehouses[where];
  const i = ++slotIndex;
  return prisma.storageSlot.create({
    data: {
      zoneId: opts.zoneId ?? wh.zoneId, warehouseId: wh.id, name: `S${i}`, localX: 0, localY: 0, widthM: 1, depthM: 1, heightM: 1,
      maxWeightKg: opts.maxWeightKg ?? 1000, maxVolumeM3: opts.maxVolumeM3 ?? 100,
      zoneType: (opts.zoneType ?? 'normal') as any, rowIndex: Math.floor(i / 200), colIndex: i % 200, isBlocked: opts.isBlocked ?? false,
      allowedVehicles: { create: (opts.vehicles ?? ['forklift']).map(vehicleType => ({ vehicleType })) as any },
    },
  });
}

/** Cargo that is already stored in `slot`, with the slot and warehouse load kept consistent. */
export async function storedCargo(prisma: PrismaClient, world: World, slot: { id: string; warehouseId: string }, productId = world.productId) {
  const cargo = await prisma.cargoItem.create({
    data: { productId, scenarioId: world.scenarioId, status: 'stored', currentSlotId: slot.id, currentWarehouseId: slot.warehouseId },
  });
  await prisma.storageSlot.update({ where: { id: slot.id }, data: { currentWeightKg: { increment: CARGO_KG }, currentVolumeM3: { increment: CARGO_M3 } } });
  await prisma.warehouse.update({ where: { id: slot.warehouseId }, data: { currentWeightKg: { increment: CARGO_KG }, currentVolumeM3: { increment: CARGO_M3 } } });
  return cargo;
}

export const inboundCargo = (prisma: PrismaClient, world: World, productId = world.productId) =>
  prisma.cargoItem.create({ data: { productId, scenarioId: world.scenarioId, status: 'in_transit_inbound' } });

export async function slotLoad(prisma: PrismaClient, slotId: string) {
  const s = await prisma.storageSlot.findUniqueOrThrow({ where: { id: slotId } });
  return { weightKg: Number(s.currentWeightKg), volumeM3: Number(s.currentVolumeM3), version: s.version };
}

/** A temperature-controlled zone (-10..8 C) in one of the warehouses; pass its id and zoneType 'cold' to newSlot. */
export async function coldZone(prisma: PrismaClient, world: World, where: 'a' | 'b') {
  return prisma.zone.create({
    data: { warehouseId: world.warehouses[where].id, name: 'Cold', code: 'C1', zoneType: 'cold', localX: 20, localY: 0, width: 10, depth: 10, tempMin: -10, tempMax: 8 },
  });
}

/** A cold product (needs -5..5 C) with a given priority. */
export const coldProduct = (prisma: PrismaClient, world: World, name: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') =>
  prisma.product.create({
    data: {
      scenarioId: world.scenarioId, name, category: 'cold', weightKg: CARGO_KG, volumeM3: CARGO_M3, vehicleType: 'forklift',
      requiredTempMin: -5, requiredTempMax: 5, priority,
    } as any,
  });
