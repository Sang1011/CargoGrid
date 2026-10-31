import { PrismaClient } from '@prisma/client';
import type { ScenarioSeed } from './scenarios';

export async function seedProducts(prisma: PrismaClient, { scenario1 }: ScenarioSeed) {
  const scenarioId = scenario1.id;

  const product1 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'Electronics Component A',
      sku: 'ELEC-A-001',
      category: 'normal',
      weightKg: 0.5,
      volumeM3: 0.001,
      widthM: 0.1,
      depthM: 0.05,
      heightM: 0.02,
      demandFrequency: 80,
      priority: 'high',
      vehicleType: 'forklift',
    },
  });

  const product2 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'Cold Storage Item B',
      sku: 'COLD-B-001',
      category: 'cold',
      weightKg: 2.0,
      volumeM3: 0.05,
      widthM: 0.3,
      depthM: 0.2,
      heightM: 0.15,
      requiredZone: 'cold',
      requiredTempMin: -5,
      requiredTempMax: 5,
      demandFrequency: 50,
      priority: 'urgent',
      vehicleType: 'pallet_jack',
    },
  });

  const product3 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'Fragile Glassware C',
      sku: 'FRAG-C-001',
      category: 'fragile',
      weightKg: 1.5,
      volumeM3: 0.02,
      widthM: 0.4,
      depthM: 0.3,
      heightM: 0.25,
      requiredZone: 'fragile',
      demandFrequency: 30,
      priority: 'high',
      vehicleType: 'manual',
    },
  });

  const product4 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'Hazardous Chemicals D',
      sku: 'HAZ-D-001',
      category: 'hazardous',
      weightKg: 10.0,
      volumeM3: 0.1,
      requiredZone: 'hazardous',
      demandFrequency: 20,
      priority: 'medium',
      vehicleType: 'forklift',
    },
  });

  const product5 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'Bulky Furniture E',
      sku: 'BULK-E-001',
      category: 'bulky',
      weightKg: 50.0,
      volumeM3: 2.0,
      widthM: 1.5,
      depthM: 0.8,
      heightM: 0.6,
      demandFrequency: 10,
      priority: 'low',
      vehicleType: 'reach_truck',
    },
  });

  const product6 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'Heavy Machinery F',
      sku: 'HVY-F-001',
      category: 'heavy',
      weightKg: 500.0,
      volumeM3: 5.0,
      widthM: 2.0,
      depthM: 1.5,
      heightM: 1.2,
      demandFrequency: 5,
      priority: 'medium',
      vehicleType: 'container_truck',
    },
  });

  const product7 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'No Zone Required G',
      sku: 'GEN-G-001',
      category: 'normal',
      weightKg: 1.0,
      volumeM3: 0.01,
      requiredZone: null,
      demandFrequency: 60,
      priority: 'low',
      vehicleType: 'electric_cart',
    },
  });

  const product8 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'Cold Without Temp H',
      sku: 'COLD-H-001',
      category: 'cold',
      weightKg: 3.0,
      volumeM3: 0.03,
      requiredZone: 'cold',
      requiredTempMin: null,
      requiredTempMax: null,
      demandFrequency: 40,
      priority: 'medium',
      vehicleType: 'pallet_jack',
    },
  });

  const product9 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'Zero Demand I',
      sku: 'EDGE-I-001',
      category: 'normal',
      weightKg: 1.0,
      volumeM3: 0.01,
      demandFrequency: 0,
      priority: 'low',
      vehicleType: 'forklift',
    },
  });

  const product10 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'Max Demand J',
      sku: 'EDGE-J-001',
      category: 'normal',
      weightKg: 1.0,
      volumeM3: 0.01,
      demandFrequency: 100,
      priority: 'urgent',
      vehicleType: 'forklift',
    },
  });

  const product11 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'Tiny Item K',
      sku: 'EDGE-K-001',
      category: 'normal',
      weightKg: 0.001,
      volumeM3: 0.0001,
      widthM: 0.01,
      depthM: 0.005,
      heightM: 0.002,
      demandFrequency: 90,
      priority: 'low',
      vehicleType: 'manual',
    },
  });

  const product12 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'Large Item L',
      sku: 'EDGE-L-001',
      category: 'heavy',
      weightKg: 800.0,
      volumeM3: 8.0,
      widthM: 3.0,
      depthM: 2.0,
      heightM: 1.5,
      demandFrequency: 2,
      priority: 'medium',
      vehicleType: 'container_truck',
    },
  });

  const product13 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'Entry Exit Null M',
      sku: 'EDGE-M-001',
      category: 'normal',
      weightKg: 2.0,
      volumeM3: 0.02,
      preferredEntryNodeId: null,
      preferredExitNodeId: null,
      demandFrequency: 50,
      priority: 'high',
      vehicleType: 'electric_cart',
    },
  });

  const product14 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'Medium Priority N',
      sku: 'GEN-N-001',
      category: 'normal',
      weightKg: 1.0,
      volumeM3: 0.01,
      demandFrequency: 50,
      priority: 'medium',
      vehicleType: 'forklift',
    },
  });

  const product15 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'High Priority O',
      sku: 'GEN-O-001',
      category: 'fragile',
      weightKg: 0.8,
      volumeM3: 0.008,
      requiredZone: 'fragile',
      demandFrequency: 70,
      priority: 'high',
      vehicleType: 'pallet_jack',
    },
  });

  const product16 = await prisma.product.create({
    data: {
      scenarioId,
      name: 'Standard Product P',
      sku: 'GEN-P-001',
      category: 'normal',
      weightKg: 5.0,
      volumeM3: 0.05,
      widthM: 0.5,
      depthM: 0.4,
      heightM: 0.3,
      demandFrequency: 50,
      priority: 'low',
      vehicleType: 'forklift',
    },
  });

  return {
    product1, product2, product3, product4, product5,
    product6, product7, product8, product9, product10,
    product11, product12, product13, product14, product15, product16,
  };
}

export type ProductSeed = Awaited<ReturnType<typeof seedProducts>>;
