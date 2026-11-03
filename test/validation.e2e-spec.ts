import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ALL_PERMISSIONS } from './../src/common/security/permissions';

const mockPrisma = {
  $connect: async () => undefined,
  $disconnect: async () => undefined,
  $transaction: async (fn: any) => fn(mockPrisma),
  $on: async () => undefined,
  $use: async () => undefined,
  auditLog: { create: async () => ({}) },
  idempotencyKey: { create: async () => ({}), findUnique: async () => null, update: async () => ({}), deleteMany: async () => ({}) },
  scenario: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  product: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  vehicle: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  warehouse: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  zone: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  storageSlot: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  locationNode: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  roadEdge: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  cargoItem: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  inboundShipment: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  shipmentItem: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  warehouseIncident: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  transferOrder: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  transferOrderItem: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  outboundOrder: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  outboundOrderItem: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
    update: async (args: any) => args.data,
    delete: async () => null,
  },
  optimizationRun: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
  },
  assignment: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (args: any) => args.data,
  },
};

describe('Validation (e2e)', () => {
  let app: INestApplication;
  // Every request is sent as an admin; authentication itself is covered in security.e2e-spec.ts.
  let http: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const token = await app.get(JwtService).signAsync({
      sub: '00000000-0000-0000-0000-0000000000aa',
      email: 'admin@test.local',
      roles: ['admin'],
      permissions: ALL_PERMISSIONS,
    });
    http = request.agent(app.getHttpServer()).set('Authorization', `Bearer ${token}`);
  });

  afterAll(async () => {
    await app.close();
  });

  const uuid = '00000000-0000-0000-0000-000000000000';
  const invalidUuid = 'not-a-uuid';

  // ─── Scenario ─────────────────────────────────────────────────────────────
  describe('Scenario', () => {
    const basePath = '/scenarios';

    it('POST — missing name → 400', () => {
      return http
        .post(basePath)
        .send({})
        .expect(400);
    });

    it('POST — invalid status enum → 400', () => {
      return http
        .post(basePath)
        .send({ name: 'Test', status: 'nonexistent_status' })
        .expect(400);
    });

    it('POST — name exceeds @MaxLength(100) → 400', () => {
      return http
        .post(basePath)
        .send({ name: 'A'.repeat(101) })
        .expect(400);
    });

    it('POST — tags is not an array → 400', () => {
      return http
        .post(basePath)
        .send({ name: 'Test', tags: 'not-an-array' })
        .expect(400);
    });

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });

    it('PATCH :id — invalid UUID → 400', () => {
      return http
        .patch(`${basePath}/${invalidUuid}`)
        .send({ name: 'Updated' })
        .expect(400);
    });

    it('PATCH :id — valid UUID not found → 404', () => {
      return http
        .patch(`${basePath}/${uuid}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('DELETE :id — invalid UUID → 400', () => {
      return http
        .delete(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('DELETE :id — valid UUID not found → 404', () => {
      return http
        .delete(`${basePath}/${uuid}`)
        .expect(404);
    });

    it('PATCH :id/archive — invalid UUID → 400', () => {
      return http
        .patch(`${basePath}/${invalidUuid}/archive`)
        .expect(400);
    });

    it('PATCH :id/activate — invalid UUID → 400', () => {
      return http
        .patch(`${basePath}/${invalidUuid}/activate`)
        .expect(400);
    });
  });

  // ─── Product ──────────────────────────────────────────────────────────────
  describe('Product', () => {
    const basePath = '/products';

    it('POST — missing required fields (name, category, weightKg, volumeM3, vehicleType) → 400', () => {
      return http
        .post(basePath)
        .send({ scenarioId: uuid })
        .expect(400);
    });

    it('POST — invalid category enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, name: 'Test', category: 'invalid_cat',
          weightKg: 1, volumeM3: 0.01, vehicleType: 'forklift',
        })
        .expect(400);
    });

    it('POST — invalid priority enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, name: 'Test', category: 'normal',
          weightKg: 1, volumeM3: 0.01, vehicleType: 'forklift', priority: 'invalid',
        })
        .expect(400);
    });

    it('POST — invalid vehicleType enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, name: 'Test', category: 'normal',
          weightKg: 1, volumeM3: 0.01, vehicleType: 'flying_car',
        })
        .expect(400);
    });

    it('POST — invalid requiredZone enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, name: 'Test', category: 'normal',
          weightKg: 1, volumeM3: 0.01, vehicleType: 'forklift',
          requiredZone: 'nonexistent',
        })
        .expect(400);
    });

    it('POST — name exceeds @MaxLength(200) → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, name: 'A'.repeat(201), category: 'normal',
          weightKg: 1, volumeM3: 0.01, vehicleType: 'forklift',
        })
        .expect(400);
    });

    it('POST — weightKg negative → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, name: 'Test', category: 'normal',
          weightKg: -1, volumeM3: 0.01, vehicleType: 'forklift',
        })
        .expect(400);
    });

    it('POST — volumeM3 negative → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, name: 'Test', category: 'normal',
          weightKg: 1, volumeM3: -0.01, vehicleType: 'forklift',
        })
        .expect(400);
    });

    it('POST — string in number field → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, name: 'Test', category: 'normal',
          weightKg: 'abc', volumeM3: 0.01, vehicleType: 'forklift',
        })
        .expect(400);
    });

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });

    it('DELETE :id — invalid UUID → 400', () => {
      return http
        .delete(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('DELETE :id — valid UUID not found → 404', () => {
      return http
        .delete(`${basePath}/${uuid}`)
        .expect(404);
    });
  });

  // ─── Vehicle ──────────────────────────────────────────────────────────────
  describe('Vehicle', () => {
    const basePath = '/vehicles';

    it('POST — missing required fields → 400', () => {
      return http
        .post(basePath)
        .send({ scenarioId: uuid })
        .expect(400);
    });

    it('POST — invalid vehicleType enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'VH-001', vehicleType: 'spaceship',
          scope: 'intra_warehouse', maxLoadKg: 1000,
        })
        .expect(400);
    });

    it('POST — invalid scope enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'VH-001', vehicleType: 'forklift',
          scope: 'invalid_scope', maxLoadKg: 1000,
        })
        .expect(400);
    });

    it('POST — invalid status enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'VH-001', vehicleType: 'forklift',
          scope: 'intra_warehouse', maxLoadKg: 1000, status: 'floating',
        })
        .expect(400);
    });

    it('POST — code exceeds @MaxLength(50) → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'A'.repeat(51), vehicleType: 'forklift',
          scope: 'intra_warehouse', maxLoadKg: 1000,
        })
        .expect(400);
    });

    it('POST — maxLoadKg negative → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'VH-001', vehicleType: 'forklift',
          scope: 'intra_warehouse', maxLoadKg: -100,
        })
        .expect(400);
    });

    it('PATCH :id/status — invalid status enum → 400', () => {
      return http
        .patch(`${basePath}/${uuid}/status`)
        .send({ status: 'nonexistent' })
        .expect(400);
    });

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });
  });

  // ─── Warehouse ────────────────────────────────────────────────────────────
  describe('Warehouse', () => {
    const basePath = '/warehouses';

    it('POST — missing required fields → 400', () => {
      return http
        .post(basePath)
        .send({ scenarioId: uuid })
        .expect(400);
    });

    it('POST — invalid type enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, name: 'WH', code: 'WH-01', type: 'underground',
        })
        .expect(400);
    });

    it('POST — name exceeds @MaxLength(100) → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, name: 'A'.repeat(101), code: 'WH-01', type: 'normal',
        })
        .expect(400);
    });

    it('POST — code exceeds @MaxLength(20) → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, name: 'WH', code: 'A'.repeat(21), type: 'normal',
        })
        .expect(400);
    });

    it('POST — doorCount negative → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, name: 'WH', code: 'WH-01', type: 'normal',
          doorCount: -1,
        })
        .expect(400);
    });

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });
  });

  // ─── Zone ─────────────────────────────────────────────────────────────────
  describe('Zone', () => {
    const basePath = '/zones';

    it('POST — missing required fields → 400', () => {
      return http
        .post(basePath)
        .send({ warehouseId: uuid })
        .expect(400);
    });

    it('POST — invalid zoneType enum → 400', () => {
      return http
        .post(basePath)
        .send({
          warehouseId: uuid, name: 'Z', code: 'Z-01', zoneType: 'invalid',
          localX: 0, localY: 0, width: 10, depth: 10,
        })
        .expect(400);
    });

    it('POST — name exceeds @MaxLength(100) → 400', () => {
      return http
        .post(basePath)
        .send({
          warehouseId: uuid, name: 'A'.repeat(101), code: 'Z-01', zoneType: 'normal',
          localX: 0, localY: 0, width: 10, depth: 10,
        })
        .expect(400);
    });

    it('POST — negative width → 400', () => {
      return http
        .post(basePath)
        .send({
          warehouseId: uuid, name: 'Z', code: 'Z-01', zoneType: 'normal',
          localX: 0, localY: 0, width: -10, depth: 10,
        })
        .expect(400);
    });

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });
  });

  // ─── StorageSlot ──────────────────────────────────────────────────────────
  describe('StorageSlot', () => {
    const basePath = '/storage-slots';

    it('POST — missing required fields → 400', () => {
      return http
        .post(basePath)
        .send({ zoneId: uuid, warehouseId: uuid })
        .expect(400);
    });

    it('POST — invalid zoneType enum → 400', () => {
      return http
        .post(basePath)
        .send({
          zoneId: uuid, warehouseId: uuid, name: 'S', localX: 0, localY: 0,
          widthM: 1, depthM: 1, heightM: 1, maxWeightKg: 100, maxVolumeM3: 1,
          zoneType: 'nonexistent', rowIndex: 0, colIndex: 0,
        })
        .expect(400);
    });

    it('POST — name exceeds @MaxLength(50) → 400', () => {
      return http
        .post(basePath)
        .send({
          zoneId: uuid, warehouseId: uuid, name: 'A'.repeat(51), localX: 0, localY: 0,
          widthM: 1, depthM: 1, heightM: 1, maxWeightKg: 100, maxVolumeM3: 1,
          zoneType: 'normal', rowIndex: 0, colIndex: 0,
        })
        .expect(400);
    });

    it('POST — negative maxWeightKg → 400', () => {
      return http
        .post(basePath)
        .send({
          zoneId: uuid, warehouseId: uuid, name: 'S', localX: 0, localY: 0,
          widthM: 1, depthM: 1, heightM: 1, maxWeightKg: -100, maxVolumeM3: 1,
          zoneType: 'normal', rowIndex: 0, colIndex: 0,
        })
        .expect(400);
    });

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });

    it('PATCH :id/block — invalid UUID → 400', () => {
      return http
        .patch(`${basePath}/${invalidUuid}/block`)
        .expect(400);
    });

    it('PATCH :id/unblock — invalid UUID → 400', () => {
      return http
        .patch(`${basePath}/${invalidUuid}/unblock`)
        .expect(400);
    });
  });

  // ─── LocationNode ─────────────────────────────────────────────────────────
  describe('LocationNode', () => {
    const basePath = '/location-nodes';

    it('POST — missing required fields → 400', () => {
      return http
        .post(basePath)
        .send({ scenarioId: uuid })
        .expect(400);
    });

    it('POST — invalid nodeType enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, name: 'N', code: 'N-01', nodeType: 'submarine',
        })
        .expect(400);
    });

    it('POST — name exceeds @MaxLength(100) → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, name: 'A'.repeat(101), code: 'N-01', nodeType: 'GATE',
        })
        .expect(400);
    });

    it('POST — code exceeds @MaxLength(30) → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, name: 'N', code: 'A'.repeat(31), nodeType: 'GATE',
        })
        .expect(400);
    });

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });
  });

  // ─── RoadEdge ─────────────────────────────────────────────────────────────
  describe('RoadEdge', () => {
    const basePath = '/road-edges';

    it('POST — missing required fields → 400', () => {
      return http
        .post(basePath)
        .send({ scenarioId: uuid })
        .expect(400);
    });

    it('POST — invalid direction enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, fromNodeId: uuid, toNodeId: uuid,
          distanceM: 100, direction: 'circular',
        })
        .expect(400);
    });

    it('POST — negative distanceM → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, fromNodeId: uuid, toNodeId: uuid,
          distanceM: -100,
        })
        .expect(400);
    });

    // TODO: DTO thiếu @Max(1) cho congestionLevel — cần bổ sung

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });

    it('PATCH :id/block — invalid UUID → 400', () => {
      return http
        .patch(`${basePath}/${invalidUuid}/block`)
        .expect(400);
    });

    it('PATCH :id/unblock — invalid UUID → 400', () => {
      return http
        .patch(`${basePath}/${invalidUuid}/unblock`)
        .expect(400);
    });
  });

  // ─── CargoItem ────────────────────────────────────────────────────────────
  describe('CargoItem', () => {
    const basePath = '/cargo-items';

    it('POST — missing required fields → 400', () => {
      return http
        .post(basePath)
        .send({})
        .expect(400);
    });

    // Cargo status is no longer client input (BR-01): it is set by the movement lifecycle.

    it('POST — barcode exceeds @MaxLength(100) → 400', () => {
      return http
        .post(basePath)
        .send({
          productId: uuid, scenarioId: uuid,
          barcode: 'A'.repeat(101),
        })
        .expect(400);
    });

    it('POST — negative actualWeightKg → 400', () => {
      return http
        .post(basePath)
        .send({
          productId: uuid, scenarioId: uuid,
          actualWeightKg: -1,
        })
        .expect(400);
    });

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });
  });

  // ─── InboundShipment ──────────────────────────────────────────────────────
  describe('InboundShipment', () => {
    const basePath = '/inbound-shipments';

    it('POST — missing required fields → 400', () => {
      return http
        .post(basePath)
        .send({ scenarioId: uuid })
        .expect(400);
    });

    it('POST — invalid status enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'SHIP-001', sourceType: 'supplier',
          status: 'in_orbit',
        })
        .expect(400);
    });

    it('POST — code exceeds @MaxLength(50) → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'A'.repeat(51), sourceType: 'supplier',
        })
        .expect(400);
    });

    it('POST — sourceType exceeds @MaxLength(20) → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'SHIP-001', sourceType: 'A'.repeat(21),
        })
        .expect(400);
    });

    it('POST — totalItems negative → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'SHIP-001', sourceType: 'supplier',
          totalItems: -1,
        })
        .expect(400);
    });

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });

    it('PATCH :id/arrive — invalid UUID → 400', () => {
      return http
        .patch(`${basePath}/${invalidUuid}/arrive`)
        .expect(400);
    });

    it('PATCH :id/complete — invalid UUID → 400', () => {
      return http
        .patch(`${basePath}/${invalidUuid}/complete`)
        .expect(400);
    });

    it('PATCH :id/cancel — invalid UUID → 400', () => {
      return http
        .patch(`${basePath}/${invalidUuid}/cancel`)
        .expect(400);
    });
  });

  // ─── ShipmentItem ─────────────────────────────────────────────────────────
  describe('ShipmentItem', () => {
    const basePath = '/shipment-items';

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });
  });

  // ─── WarehouseIncident ────────────────────────────────────────────────────
  describe('WarehouseIncident', () => {
    const basePath = '/warehouse-incidents';

    it('POST — missing required fields → 400', () => {
      return http
        .post(basePath)
        .send({ warehouseId: uuid })
        .expect(400);
    });

    it('POST — invalid incidentType enum → 400', () => {
      return http
        .post(basePath)
        .send({
          warehouseId: uuid, incidentType: 'alien_attack',
          severity: 'low', title: 'Test',
        })
        .expect(400);
    });

    it('POST — invalid severity enum → 400', () => {
      return http
        .post(basePath)
        .send({
          warehouseId: uuid, incidentType: 'other',
          severity: 'cosmic', title: 'Test',
        })
        .expect(400);
    });

    it('POST — invalid status enum → 400', () => {
      return http
        .post(basePath)
        .send({
          warehouseId: uuid, incidentType: 'other',
          severity: 'low', status: 'unknown', title: 'Test',
        })
        .expect(400);
    });

    it('POST — title exceeds @MaxLength(200) → 400', () => {
      return http
        .post(basePath)
        .send({
          warehouseId: uuid, incidentType: 'other',
          severity: 'low', title: 'A'.repeat(201),
        })
        .expect(400);
    });

    it('POST — safeDurationMinutes negative → 400', () => {
      return http
        .post(basePath)
        .send({
          warehouseId: uuid, incidentType: 'other',
          severity: 'low', title: 'Test', safeDurationMinutes: -5,
        })
        .expect(400);
    });

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });
  });

  // ─── TransferOrder ────────────────────────────────────────────────────────
  describe('TransferOrder', () => {
    const basePath = '/transfer-orders';

    it('POST — missing required fields → 400', () => {
      return http
        .post(basePath)
        .send({ scenarioId: uuid })
        .expect(400);
    });

    it('POST — invalid status enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'TFR-001', fromWarehouseId: uuid,
          status: 'invalid_status',
        })
        .expect(400);
    });

    it('POST — invalid priority enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'TFR-001', fromWarehouseId: uuid,
          priority: 'overdrive',
        })
        .expect(400);
    });

    it('POST — code exceeds @MaxLength(50) → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'A'.repeat(51), fromWarehouseId: uuid,
        })
        .expect(400);
    });

    it('POST — totalItems negative → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'TFR-001', fromWarehouseId: uuid,
          totalItems: -1,
        })
        .expect(400);
    });

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });
  });

  // ─── TransferOrderItem ────────────────────────────────────────────────────
  describe('TransferOrderItem', () => {
    const basePath = '/transfer-order-items';

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });
  });

  // ─── OutboundOrder ────────────────────────────────────────────────────────
  describe('OutboundOrder', () => {
    const basePath = '/outbound-orders';

    it('POST — missing required fields → 400', () => {
      return http
        .post(basePath)
        .send({ scenarioId: uuid })
        .expect(400);
    });

    it('POST — invalid destinationType enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'OUT-001', destinationType: 'airport',
        })
        .expect(400);
    });

    it('POST — invalid status enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'OUT-001', destinationType: 'gate',
          status: 'unknown',
        })
        .expect(400);
    });

    it('POST — invalid priority enum → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'OUT-001', destinationType: 'gate',
          priority: 'ultra',
        })
        .expect(400);
    });

    it('POST — code exceeds @MaxLength(50) → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'A'.repeat(51), destinationType: 'gate',
        })
        .expect(400);
    });

    it('POST — totalItems negative → 400', () => {
      return http
        .post(basePath)
        .send({
          scenarioId: uuid, code: 'OUT-001', destinationType: 'gate',
          totalItems: -1,
        })
        .expect(400);
    });

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });
  });

  // ─── OutboundOrderItem ────────────────────────────────────────────────────
  describe('OutboundOrderItem', () => {
    const basePath = '/outbound-order-items';

    it('GET :id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/${invalidUuid}`)
        .expect(400);
    });

    it('GET :id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/${uuid}`)
        .expect(404);
    });
  });

  // ─── Optimization ─────────────────────────────────────────────────────────
  describe('Optimization', () => {
    const basePath = '/optimization';

    it('POST /run — missing scenarioId → 400', () => {
      return http
        .post(`${basePath}/run`)
        .send({ algorithm: 'greedy' })
        .expect(400);
    });

    it('POST /run — invalid algorithm enum → 400', () => {
      return http
        .post(`${basePath}/run`)
        .send({
          scenarioId: uuid,
          algorithm: 'quantum',
        })
        .expect(400);
    });

    it('POST /run — invalid contextType enum → 400', () => {
      return http
        .post(`${basePath}/run`)
        .send({
          scenarioId: uuid,
          algorithm: 'greedy',
          contextType: 'invalid_context',
        })
        .expect(400);
    });

    it('POST /run — scenarioId not a valid UUID → 400', () => {
      return http
        .post(`${basePath}/run`)
        .send({
          scenarioId: invalidUuid,
          algorithm: 'greedy',
        })
        .expect(400);
    });

    it('POST /compare — invalid algorithms array → 400', () => {
      return http
        .post(`${basePath}/compare`)
        .send({
          scenarioId: uuid,
          algorithms: ['quantum'],
        })
        .expect(400);
    });

    it('GET /runs/:id — invalid UUID → 400', () => {
      return http
        .get(`${basePath}/runs/${invalidUuid}`)
        .expect(400);
    });

    it('GET /runs/:id — valid UUID not found → 404', () => {
      return http
        .get(`${basePath}/runs/${uuid}`)
        .expect(404);
    });
  });
});
