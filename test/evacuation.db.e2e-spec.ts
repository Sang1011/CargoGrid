/**
 * Incidents and evacuation against a real PostgreSQL. Skipped unless TEST_DATABASE_URL is set
 * (see movement.db.e2e-spec.ts for why it must be a disposable database).
 */
import { ConflictException, INestApplication, UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { ROLE_PERMISSIONS } from './../src/common/security/permissions';
import { AllocationService } from './../src/modules/allocation/application/allocation.service';
import { EvacuationService } from './../src/modules/evacuation/application/evacuation.service';
import { MovementService } from './../src/modules/movement/application/movement.service';
import { PrismaService } from './../src/prisma/prisma.service';
import { TEST_DATABASE_URL, createPrisma } from './helpers/db';
import { CARGO_KG, World, coldProduct, coldZone, newSlot, newWorld, storedCargo } from './helpers/world';

const dbDescribe = TEST_DATABASE_URL ? describe : describe.skip;

dbDescribe('Incidents and evacuation (real database)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let evac: EvacuationService;
  let allocations: AllocationService;
  let movements: MovementService;
  let jwt: JwtService;
  let userId: string;
  let world: World;

  beforeAll(async () => {
    prisma = createPrisma();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    evac = app.get(EvacuationService);
    allocations = app.get(AllocationService);
    movements = app.get(MovementService);
    jwt = app.get(JwtService);
    userId = (await prisma.user.create({ data: { email: `ev-${Date.now()}@test.local`, passwordHash: 'x', fullName: 'Responder' } })).id;
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    world = await newWorld(prisma);
  });

  const ctx = { actorId: null as string | null, correlationId: 'evac-corr' };

  // ── fixtures ──
  const incident = (where: 'a' | 'b', extra: Record<string, unknown> = {}) =>
    prisma.warehouseIncident.create({
      data: { warehouseId: world.warehouses[where].id, incidentType: 'temperature_failure', severity: 'critical', title: 'Cooling lost', ...extra } as any,
    });

  const product = (name: string, priority: string) =>
    prisma.product.create({
      data: { scenarioId: world.scenarioId, name, category: 'normal', weightKg: CARGO_KG, volumeM3: 0.1, vehicleType: 'forklift', priority } as any,
    });

  /** Cold cargo in warehouse A's cold room, cold slots in B (one cargo each), and some ambient cargo in A. */
  async function building(o: { cold?: number; ambient?: number; coldSlotsInB?: number; normalSlotsInB?: number } = {}) {
    const coldA = await coldZone(prisma, world, 'a');
    const coldB = await coldZone(prisma, world, 'b');
    const roomA = await newSlot(prisma, world, 'a', { zoneId: coldA.id, zoneType: 'cold' });
    const shelfA = await newSlot(prisma, world, 'a');
    const cp = await coldProduct(prisma, world, 'Frozen');
    const cold = [];
    for (let i = 0; i < (o.cold ?? 4); i++) cold.push(await storedCargo(prisma, world, roomA, cp.id));
    const ambient = [];
    for (let i = 0; i < (o.ambient ?? 3); i++) ambient.push(await storedCargo(prisma, world, shelfA));
    const coldSlotsB = [];
    for (let i = 0; i < (o.coldSlotsInB ?? 4); i++) coldSlotsB.push(await newSlot(prisma, world, 'b', { zoneId: coldB.id, zoneType: 'cold', maxWeightKg: CARGO_KG }));
    const normalSlotsB = [];
    for (let i = 0; i < (o.normalSlotsInB ?? 6); i++) normalSlotsB.push(await newSlot(prisma, world, 'b'));
    return { cold, ambient, coldSlotsB, normalSlotsB, roomA, shelfA, coldA };
  }

  const orderRow = (id: string) => prisma.transferOrder.findUniqueOrThrow({ where: { id } });

  // ─── The plan ───────────────────────────────────────────────────────────────

  describe('plan', () => {
    it('critical temperature incident: cold cargo goes first and only to cold slots of the other warehouse', async () => {
      const b = await building();
      const inc = await incident('a');

      const plan = await evac.plan(inc.id, {}, ctx);

      expect(plan.summary).toMatchObject({ inWarehouse: 7, movable: 7, unmovable: 0, temperatureFirst: true });
      expect(plan.steps.slice(0, 4).every(s => s.temperatureSensitive)).toBe(true);
      expect(plan.steps.slice(4).every(s => !s.temperatureSensitive)).toBe(true);
      expect(plan.steps.every(s => s.warehouseId === world.warehouses.b.id)).toBe(true); // never the incident warehouse

      const coldIds = new Set(b.cold.map(c => c.id));
      const coldSlotIds = new Set(b.coldSlotsB.map(s => s.id));
      for (const s of plan.steps.filter(x => coldIds.has(x.cargoItemId))) expect(coldSlotIds.has(s.slotId)).toBe(true);

      const order = await orderRow(plan.transferOrderId!);
      expect(order).toMatchObject({ isEmergency: true, status: 'proposed', priority: 'urgent', totalItems: 7, failedItems: 0, incidentId: inc.id, fromWarehouseId: world.warehouses.a.id });
      expect(plan.allocation).toMatchObject({ status: 'proposed', contextType: 'transfer', contextId: order.id });
      expect(plan.allocation!.items).toHaveLength(7);
    });

    it('confirming it creates one urgent movement per cargo item and marks the order confirmed', async () => {
      await building();
      const inc = await incident('a');
      const plan = await evac.plan(inc.id, {}, ctx);

      await allocations.confirm(plan.allocationId!, ctx);

      const list = await prisma.movement.findMany({ where: { scenarioId: world.scenarioId } });
      expect(list).toHaveLength(7);
      expect(list.every(m => m.priority === 'urgent' && m.status === 'reserved' && m.type === 'warehouse_transfer')).toBe(true);
      expect(list.every(m => m.reason?.startsWith('Emergency evacuation'))).toBe(true);
      expect(list.every(m => m.toWarehouseId === world.warehouses.b.id && m.fromWarehouseId === world.warehouses.a.id)).toBe(true);
      expect(await orderRow(plan.transferOrderId!)).toMatchObject({ status: 'confirmed' });
      const items = await prisma.transferOrderItem.findMany({ where: { transferOrderId: plan.transferOrderId! } });
      expect(items.every(i => i.proposedSlotId && i.status === 'planned')).toBe(true);
    });

    it('reports what does not fit, and leaves behind the lowest priority first', async () => {
      const coldA = await coldZone(prisma, world, 'a');
      const coldB = await coldZone(prisma, world, 'b');
      const room = await newSlot(prisma, world, 'a', { zoneId: coldA.id, zoneType: 'cold' });
      const urgent = await coldProduct(prisma, world, 'Vaccines', 'urgent');
      const low = await coldProduct(prisma, world, 'Ice cream', 'low');
      const keep = [await storedCargo(prisma, world, room, urgent.id), await storedCargo(prisma, world, room, urgent.id)];
      const left = [await storedCargo(prisma, world, room, low.id), await storedCargo(prisma, world, room, low.id)];
      for (let i = 0; i < 2; i++) await newSlot(prisma, world, 'b', { zoneId: coldB.id, zoneType: 'cold', maxWeightKg: CARGO_KG });
      await newSlot(prisma, world, 'b'); // a normal slot cannot hold cold cargo
      const inc = await incident('a');

      const plan = await evac.plan(inc.id, {}, ctx);

      expect(new Set(plan.steps.map(s => s.cargoItemId))).toEqual(new Set(keep.map(c => c.id)));
      expect(plan.unmovable.map(u => u.cargoItemId).sort()).toEqual(left.map(c => c.id).sort());
      expect(plan.unmovable.every(u => u.reason === 'no_capacity' && u.productName === 'Ice cream')).toBe(true);
      expect(plan.summary).toMatchObject({ movable: 2, unmovable: 2 });
      expect(plan.allocation!.items).toHaveLength(2); // the plan only carries what can move, so it can be confirmed

      await allocations.confirm(plan.allocationId!, ctx);
      expect(await prisma.movement.count({ where: { scenarioId: world.scenarioId } })).toBe(2);
      // the report stays available afterwards
      const again = await evac.latest(inc.id);
      expect(again.unmovable).toHaveLength(2);
      expect(again.allocation!.status).toBe('confirmed');
      expect((await orderRow(plan.transferOrderId!)).failedItems).toBe(2);
    });

    it('reports cargo that no road can reach, and withdraws a plan with nothing movable', async () => {
      await building({ cold: 0, ambient: 3, coldSlotsInB: 0 });
      const nodeA = await prisma.locationNode.create({ data: { scenarioId: world.scenarioId, name: 'A', code: 'A', nodeType: 'DOCK' as any, warehouseId: world.warehouses.a.id } });
      const nodeB = await prisma.locationNode.create({ data: { scenarioId: world.scenarioId, name: 'B', code: 'B', nodeType: 'DOCK' as any, warehouseId: world.warehouses.b.id } });
      await prisma.roadEdge.create({ data: { scenarioId: world.scenarioId, fromNodeId: nodeA.id, toNodeId: nodeB.id, distanceM: 100, isBlocked: true } as any });
      const inc = await incident('a', { incidentType: 'flood' });

      const plan = await evac.plan(inc.id, {}, ctx);

      expect(plan.unmovable).toHaveLength(3);
      expect(plan.unmovable.every(u => u.reason === 'no_route')).toBe(true);
      expect(plan.allocationId).toBeNull();
      expect(plan.summary).toMatchObject({ movable: 0, unmovable: 3, temperatureFirst: false });
      expect(await orderRow(plan.transferOrderId!)).toMatchObject({ status: 'cancelled', failedItems: 3 });
      expect(await prisma.allocationProposal.count({ where: { contextId: plan.transferOrderId!, status: 'rejected' } })).toBe(1);
      expect((await evac.latest(inc.id)).unmovable).toHaveLength(3);
    });

    it('BR-14: cargo that cannot be moved within the safe window is left out and reported, lowest priority last', async () => {
      const coldB = await coldZone(prisma, world, 'b'); // unused; keeps the helper symmetrical
      void coldB;
      const shelf = await newSlot(prisma, world, 'a');
      await newSlot(prisma, world, 'b');
      const priorities = ['urgent', 'high', 'medium', 'low', 'low'];
      const cargo = [];
      for (const p of priorities) cargo.push(await storedCargo(prisma, world, shelf, (await product(`P-${p}`, p)).id));
      const inc = await incident('a', { incidentType: 'fire_hazard', safeDurationMinutes: 7 });

      // One crew, 3 minutes per item, 7-minute window: only two items fit.
      const plan = await evac.plan(inc.id, { crews: 1, handlingMinutes: 3 }, ctx);

      expect(plan.summary).toMatchObject({ safeMinutes: 7, movable: 2, unmovable: 3, crews: 1 });
      expect(plan.steps.map(s => s.cargoItemId)).toEqual([cargo[0].id, cargo[1].id]); // urgent, then high
      expect(plan.steps.map(s => [s.startMinute, s.finishMinute])).toEqual([[0, 3], [3, 6]]);
      expect(plan.unmovable.every(u => u.reason === 'not_enough_time' && /7-minute safe window/.test(u.detail))).toBe(true);
      expect(plan.unmovable.map(u => u.cargoItemId).sort()).toEqual([cargo[2].id, cargo[3].id, cargo[4].id].sort());
      expect(plan.allocation!.items).toHaveLength(2);
    });

    it('more crews fit more cargo into the same window', async () => {
      const shelf = await newSlot(prisma, world, 'a');
      await newSlot(prisma, world, 'b');
      for (let i = 0; i < 6; i++) await storedCargo(prisma, world, shelf);
      const inc = await incident('a', { incidentType: 'flood', safeDurationMinutes: 7 });

      const plan = await evac.plan(inc.id, { crews: 3, handlingMinutes: 3 }, ctx);

      expect(plan.summary).toMatchObject({ movable: 6, unmovable: 0, estimatedMinutes: 6 });
    });

    it('lists cargo that already has an open movement instead of planning it twice', async () => {
      const b = await building({ cold: 0, ambient: 3 });
      await movements.create({ cargoItemId: b.ambient[0].id, type: 'internal_transfer' as any, toSlotId: (await newSlot(prisma, world, 'a')).id }, ctx);
      const inc = await incident('a', { incidentType: 'flood' });

      const plan = await evac.plan(inc.id, {}, ctx);

      expect(plan.unmovable).toEqual([expect.objectContaining({ cargoItemId: b.ambient[0].id, reason: 'open_movement' })]);
      expect(plan.summary).toMatchObject({ inWarehouse: 3, movable: 2, unmovable: 1 });
      await allocations.confirm(plan.allocationId!, ctx); // the open movement does not block the rest
    });

    it('BR-13: a second warehouse with a serious incident is no destination either', async () => {
      await building({ cold: 0, ambient: 2 });
      await incident('b', { severity: 'high', incidentType: 'power_outage' });
      const inc = await incident('a', { incidentType: 'flood' });

      const plan = await evac.plan(inc.id, {}, ctx);

      expect(plan.unmovable.map(u => u.reason)).toEqual(['no_capacity', 'no_capacity']);
      expect(plan.steps).toHaveLength(0);
    });

    it('a minor incident does not close its warehouse to new cargo', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'b');
      const c = await storedCargo(prisma, world, from);
      await incident('b', { severity: 'medium', incidentType: 'pest_infestation' });

      await expect(movements.create({ cargoItemId: c.id, type: 'warehouse_transfer' as any, toSlotId: to.id }, ctx)).resolves.toMatchObject({ status: 'reserved' });
    });
  });

  // ─── State rules ────────────────────────────────────────────────────────────

  describe('state', () => {
    it('refuses a second evacuation while one is live, and allows a new one after the plan is rejected', async () => {
      await building({ cold: 0, ambient: 2 });
      const inc = await incident('a', { incidentType: 'flood' });
      const first = await evac.plan(inc.id, {}, ctx);

      await expect(evac.plan(inc.id, {}, ctx)).rejects.toThrow(ConflictException);

      await allocations.reject(first.allocationId!, 'wrong crew count', ctx);
      expect(await orderRow(first.transferOrderId!)).toMatchObject({ status: 'cancelled' });
      const second = await evac.plan(inc.id, {}, ctx);
      expect(second.transferOrderId).not.toBe(first.transferOrderId);
      expect((await evac.latest(inc.id)).transferOrderId).toBe(second.transferOrderId);
    });

    it('refuses a resolved incident, an empty warehouse and an unknown incident', async () => {
      await building({ cold: 0, ambient: 1 });
      const done = await incident('a', { status: 'resolved' });
      await expect(evac.plan(done.id, {}, ctx)).rejects.toThrow(/already resolved/);

      const empty = await incident('b');
      await expect(evac.plan(empty.id, {}, ctx)).rejects.toThrow(UnprocessableEntityException);

      await expect(evac.plan('00000000-0000-4000-8000-000000000000', {}, ctx)).rejects.toThrow(/not found/);
      await expect(evac.latest(done.id)).rejects.toThrow(/no evacuation plan/);
    });

    it('writes audit rows for the plan and its report', async () => {
      await building({ cold: 0, ambient: 1 });
      const inc = await incident('a', { incidentType: 'flood' });
      const plan = await evac.plan(inc.id, {}, ctx);

      const actions = (await prisma.auditLog.findMany({ where: { entityId: plan.transferOrderId! } })).map(a => a.action).sort();
      expect(actions).toEqual(['evacuation.plan', 'evacuation.report']);
    });

    it('BR-13 on movements already reserved: an incident that opens afterwards stops start and complete', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'b');
      const c1 = await storedCargo(prisma, world, from);
      const c2 = await storedCargo(prisma, world, from);
      const m1 = await movements.create({ cargoItemId: c1.id, type: 'warehouse_transfer' as any, toSlotId: to.id }, ctx);
      const m2 = await movements.create({ cargoItemId: c2.id, type: 'warehouse_transfer' as any, toSlotId: to.id }, ctx);
      await movements.start(m2.id, ctx);

      await incident('b', { severity: 'high', incidentType: 'power_outage' });

      await expect(movements.start(m1.id, ctx)).rejects.toThrow(/not accepting cargo/);
      await expect(movements.complete(m2.id, ctx)).rejects.toThrow(/not accepting cargo/);
      // Nothing is stuck: both can be cancelled and the cargo is back where it was.
      await movements.cancel(m1.id, 'incident', ctx);
      await movements.cancel(m2.id, 'incident', ctx);
      expect(await prisma.cargoItem.findUniqueOrThrow({ where: { id: c2.id } })).toMatchObject({ status: 'stored', currentSlotId: from.id });
    });
  });

  // ─── HTTP ───────────────────────────────────────────────────────────────────

  describe('HTTP', () => {
    const as = async (role: string) =>
      request.agent(app.getHttpServer()).set('Authorization', `Bearer ${await jwt.signAsync({ sub: userId, email: 'resp@test.local', roles: [role], permissions: ROLE_PERMISSIONS[role] })}`);

    it('planning needs evacuation.run, applying it needs allocation.confirm, reading needs only read access', async () => {
      await building({ cold: 2, ambient: 1, coldSlotsInB: 2 });
      const inc = await incident('a');

      await (await as('accountant')).post(`/warehouse-incidents/${inc.id}/evacuation-plan`).send({}).expect(403);
      await (await as('warehouse_operator')).post(`/warehouse-incidents/${inc.id}/evacuation-plan`).send({}).expect(403);
      await (await as('dispatcher')).post(`/warehouse-incidents/${inc.id}/evacuation-plan`).send({ crews: 0 }).expect(400);
      const planned = await (await as('dispatcher')).post(`/warehouse-incidents/${inc.id}/evacuation-plan`).send({ crews: 2, seed: 1 }).expect(201);
      expect(planned.body.summary).toMatchObject({ movable: 3, unmovable: 0, crews: 2 });

      const read = await (await as('accountant')).get(`/warehouse-incidents/${inc.id}/evacuation-plan`).expect(200);
      expect(read.body.transferOrderId).toBe(planned.body.transferOrderId);
      await (await as('accountant')).get(`/warehouse-incidents/00000000-0000-4000-8000-000000000000/evacuation-plan`).expect(404);

      await (await as('dispatcher')).post(`/allocations/${planned.body.allocationId}/confirm`).expect(403);
      await (await as('ops_manager')).post(`/allocations/${planned.body.allocationId}/confirm`).expect(200);

      const moved = await (await as('accountant')).get(`/movements?scenarioId=${world.scenarioId}`).expect(200);
      expect(moved.body.items).toHaveLength(3);
      expect(moved.body.items.every((m: any) => m.priority === 'urgent')).toBe(true);
    });

    it('suggests an incident from the latest cold-room reading, and stays quiet when it is in range or stale', async () => {
      const zone = await coldZone(prisma, world, 'a');
      const api = await as('accountant');
      const url = `/warehouses/${world.warehouses.a.id}/incident-suggestions`;

      expect((await api.get(url).expect(200)).body.suggestions).toEqual([]);

      await prisma.warehouseSensorReading.create({ data: { warehouseId: world.warehouses.a.id, zoneId: zone.id, temperatureC: 4 } });
      expect((await api.get(url).expect(200)).body.suggestions).toEqual([]);

      await prisma.warehouseSensorReading.create({ data: { warehouseId: world.warehouses.a.id, zoneId: zone.id, temperatureC: 15, recordedAt: new Date() } });
      const hot = (await api.get(url).expect(200)).body.suggestions;
      expect(hot).toHaveLength(1);
      expect(hot[0]).toMatchObject({ zoneId: zone.id, temperatureC: 15, deviationC: 7, suggestedSeverity: 'critical', alreadyOpen: false });

      await incident('a');
      expect((await api.get(url).expect(200)).body.suggestions[0].alreadyOpen).toBe(true);
      await api.get(`/warehouses/00000000-0000-4000-8000-000000000000/incident-suggestions`).expect(404);
    });
  });
});
