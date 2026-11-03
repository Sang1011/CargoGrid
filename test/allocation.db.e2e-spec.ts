/**
 * Route + allocation against a real PostgreSQL. Skipped unless TEST_DATABASE_URL is set
 * (see movement.db.e2e-spec.ts for why it must be a disposable database).
 */
import { ConflictException, INestApplication, UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuditService } from './../src/common/audit/audit.service';
import { ROLE_PERMISSIONS } from './../src/common/security/permissions';
import { AllocationService } from './../src/modules/allocation/application/allocation.service';
import { RoadEdgeService } from './../src/modules/road-edge/application/road-edge.service';
import { RouteService } from './../src/modules/route/application/route.service';
import { PrismaService } from './../src/prisma/prisma.service';
import { TEST_DATABASE_URL, createPrisma } from './helpers/db';
import { CARGO_KG, World, inboundCargo, newSlot, newWorld, storedCargo } from './helpers/world';

const dbDescribe = TEST_DATABASE_URL ? describe : describe.skip;

dbDescribe('Route and allocation (real database)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let allocations: AllocationService;
  let routes: RouteService;
  let roadEdges: RoadEdgeService;
  let audit: AuditService;
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
    allocations = app.get(AllocationService);
    routes = app.get(RouteService);
    roadEdges = app.get(RoadEdgeService);
    audit = app.get(AuditService);
    jwt = app.get(JwtService);
    userId = (await prisma.user.create({ data: { email: `al-${Date.now()}@test.local`, passwordHash: 'x', fullName: 'Planner' } })).id;
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    world = await newWorld(prisma);
  });

  const ctx = { actorId: null as string | null, correlationId: 'alloc-corr' };
  let seq = 0;

  // ── fixtures ──
  const node = (nodeType: string, code: string, warehouseId?: string) =>
    prisma.locationNode.create({ data: { scenarioId: world.scenarioId, name: code, code, nodeType: nodeType as any, warehouseId: warehouseId ?? null } });
  const road = (from: string, to: string, distanceM: number, extra: Record<string, unknown> = {}) =>
    prisma.roadEdge.create({
      data: { scenarioId: world.scenarioId, fromNodeId: from, toNodeId: to, distanceM, ...extra } as any,
    });

  /** PORT -> dock A (short road) and PORT -> dock B (longer road). */
  async function yard(opts: { aDistance?: number; bDistance?: number } = {}) {
    const port = await node('PORT', 'PORT');
    const dockA = await node('DOCK', 'DOCK-A', world.warehouses.a.id);
    const dockB = await node('DOCK', 'DOCK-B', world.warehouses.b.id);
    const toA = await road(port.id, dockA.id, opts.aDistance ?? 50);
    const toB = await road(port.id, dockB.id, opts.bDistance ?? 400);
    return { port, dockA, dockB, toA, toB };
  }

  async function shipment(cargoCount: number, entryNodeId: string | null, productId = world.productId) {
    const s = await prisma.inboundShipment.create({
      data: { scenarioId: world.scenarioId, code: `SH-${Date.now()}-${++seq}`, sourceType: 'vessel', entryNodeId },
    });
    const cargo = [];
    for (let i = 0; i < cargoCount; i++) {
      const c = await inboundCargo(prisma, world, productId);
      await prisma.shipmentItem.create({ data: { shipmentId: s.id, cargoItemId: c.id } });
      cargo.push(c);
    }
    return { shipment: s, cargo };
  }

  const propose = (shipmentId: string, extra: Record<string, unknown> = {}) =>
    allocations.propose({ scenarioId: world.scenarioId, contextType: 'inbound' as any, contextId: shipmentId, seed: 1, ...extra } as any, ctx);

  const slotsOf = (a: { items?: { slotId: string | null }[] }) => (a.items ?? []).map(i => i.slotId);

  // ─── Route (FR-RTE-01, BR-10) ───────────────────────────────────────────────

  describe('routes', () => {
    it('finds the cheapest road and reports congestion', async () => {
      const y = await yard();
      await prisma.roadEdge.update({ where: { id: y.toB.id }, data: { congestionLevel: 0.9 } });

      const r = (await routes.findRoute(world.scenarioId, y.port.id, y.dockB.id))!;
      expect(r.nodePath).toEqual([y.port.id, y.dockB.id]);
      expect(r.distanceM).toBe(400);
      expect(r.totalCost).toBeCloseTo(400 * 1.9, 1);
      expect(r.warnings[0]).toMatch(/Heavy congestion/);
    });

    it('drops the cached graph as soon as an edge is blocked through the service', async () => {
      const y = await yard();
      expect(await routes.findRoute(world.scenarioId, y.port.id, y.dockA.id)).not.toBeNull(); // now cached

      await roadEdges.block(y.toA.id);
      expect(await routes.findRoute(world.scenarioId, y.port.id, y.dockA.id)).toBeNull();

      await roadEdges.unblock(y.toA.id);
      expect(await routes.findRoute(world.scenarioId, y.port.id, y.dockA.id)).not.toBeNull();
    });

    it('GET /routes answers 200 with the path and 404 when no road qualifies', async () => {
      const y = await yard();
      await prisma.roadAllowedVehicle.create({ data: { edgeId: y.toA.id, vehicleType: 'container_truck' } });
      const api = await as('dispatcher');
      const q = (vehicle: string) => `/routes?scenarioId=${world.scenarioId}&from=${y.port.id}&to=${y.dockA.id}&vehicleType=${vehicle}`;

      const ok = await api.get(q('container_truck')).expect(200);
      expect(ok.body.nodePath).toEqual([y.port.id, y.dockA.id]);
      await api.get(q('forklift')).expect(404);
    });
  });

  // ─── Propose ────────────────────────────────────────────────────────────────

  describe('propose', () => {
    it('places a real lot, uses the road cost, and stores a run with one assignment per cargo item', async () => {
      const y = await yard();
      const a1 = await newSlot(prisma, world, 'a');
      const b1 = await newSlot(prisma, world, 'b');
      const { shipment: s, cargo } = await shipment(3, y.port.id);

      const p = await propose(s.id);

      expect(p).toMatchObject({ status: 'proposed', contextType: 'inbound', contextId: s.id, modifiedByUser: false });
      expect(p.items!.map(i => i.cargoItemId).sort()).toEqual(cargo.map(c => c.id).sort());
      // dock A is 50 m away, dock B 400 m: everything goes to A's slot
      expect(slotsOf(p).every(id => id === a1.id)).toBe(true);
      const item = p.items![0];
      expect(item).toMatchObject({ feasible: true, recommended: true, editedByUser: false, movementId: null });
      expect(item.routeCost).toBeCloseTo(50, 0);
      expect((item.routePath as any).nodes).toEqual([y.port.id, y.dockA.id]);
      expect(p.constraintsApplied).toMatchObject({ routing: expect.stringContaining('road graph') });

      const run = await prisma.optimizationRun.findUniqueOrThrow({ where: { id: p.optimizationRunId! }, include: { assignments: true } });
      expect(run.assignments).toHaveLength(3);
      expect(run.assignments.every(a => a.productId === world.productId && a.routeCost !== null)).toBe(true);
      expect(await prisma.auditLog.count({ where: { entityId: p.id, action: 'allocation.propose' } })).toBe(1);
      expect(b1.id).toBeDefined();
    });

    it('never picks a slot whose warehouse the road cannot reach, and says why', async () => {
      const y = await yard();
      await roadEdges.block(y.toA.id);
      const a1 = await newSlot(prisma, world, 'a');
      const b1 = await newSlot(prisma, world, 'b');
      const { shipment: s } = await shipment(1, y.port.id);

      const p = await propose(s.id);

      expect(p.items![0].slotId).toBe(b1.id);
      const rejected = p.items![0].rejectedCandidates as any[];
      const cut = rejected.find(c => c.slotId === a1.id);
      expect(cut).toMatchObject({ feasible: false, score: null });
      expect(cut.reasons.join()).toMatch(/No valid route/);
    });

    it('leaves cargo unplaced when the vehicle is banned from every road in, and confirm refuses (BR-12)', async () => {
      const y = await yard();
      await prisma.roadAllowedVehicle.create({ data: { edgeId: y.toA.id, vehicleType: 'container_truck' } });
      await prisma.roadAllowedVehicle.create({ data: { edgeId: y.toB.id, vehicleType: 'container_truck' } });
      await newSlot(prisma, world, 'a');
      const { shipment: s } = await shipment(2, y.port.id);

      const p = await propose(s.id);

      expect(p.summary).toMatchObject({ total: 2, allocated: 0, unallocated: 2 });
      expect(p.items![0]).toMatchObject({ feasible: false, recommended: false });
      expect(p.items![0].reasons[0]).toMatch(/No valid route/);
      await expect(allocations.confirm(p.id, ctx)).rejects.toThrow(UnprocessableEntityException);
      expect(await prisma.movement.count({ where: { scenarioId: world.scenarioId } })).toBe(0);
    });

    it('falls back to straight-line distance when the yard has no road graph, and notes it', async () => {
      const a1 = await newSlot(prisma, world, 'a');
      const { shipment: s } = await shipment(1, null);

      const p = await propose(s.id);

      expect(p.items![0].slotId).toBe(a1.id);
      expect(p.items![0].routeCost).toBeNull();
      expect(p.notes.join()).toMatch(/No entry node/);
      expect(p.constraintsApplied).toMatchObject({ routing: 'straight-line distance' });
    });

    it('splits one lot across warehouses when no single one has room (FR-ALC-06)', async () => {
      const y = await yard();
      await newSlot(prisma, world, 'a', { maxWeightKg: CARGO_KG * 2 });
      await newSlot(prisma, world, 'b', { maxWeightKg: CARGO_KG * 3 }); // 2 + 3 = 5: only a split fits
      const { shipment: s } = await shipment(5, y.port.id);

      const p = await propose(s.id);
      const byWarehouse = new Map<string, number>();
      for (const i of p.items!) byWarehouse.set(i.warehouseId!, (byWarehouse.get(i.warehouseId!) ?? 0) + 1);

      expect(p.summary.unallocated).toBe(0);
      expect(byWarehouse.get(world.warehouses.a.id)).toBe(2);
      expect(byWarehouse.get(world.warehouses.b.id)).toBe(3);
    });

    it('does not offer capacity that another reservation already holds', async () => {
      const y = await yard();
      const a1 = await newSlot(prisma, world, 'a', { maxWeightKg: CARGO_KG });
      const b1 = await newSlot(prisma, world, 'b');
      const other = await inboundCargo(prisma, world);
      const m = await prisma.movement.create({
        data: { scenarioId: world.scenarioId, cargoItemId: other.id, type: 'port_entry', status: 'reserved', toSlotId: a1.id, toWarehouseId: a1.warehouseId, weightKg: CARGO_KG, volumeM3: 0.1 },
      });
      await prisma.slotReservation.create({ data: { slotId: a1.id, movementId: m.id, weightKg: CARGO_KG, volumeM3: 0.1, expiresAt: new Date(Date.now() + 3600_000) } });
      const { shipment: s } = await shipment(1, y.port.id);

      const p = await propose(s.id);

      expect(p.items![0].slotId).toBe(b1.id); // A looks full to everyone but the reservation's owner
    });

    it('skips a warehouse with an open high-severity incident (BR-13)', async () => {
      const y = await yard();
      await newSlot(prisma, world, 'a');
      const b1 = await newSlot(prisma, world, 'b');
      await prisma.warehouseIncident.create({ data: { warehouseId: world.warehouses.a.id, incidentType: 'power_outage', severity: 'high', title: 'Outage' } });
      const { shipment: s } = await shipment(1, y.port.id);

      const p = await propose(s.id);

      expect(p.items![0].slotId).toBe(b1.id);
      expect(p.notes.join()).toMatch(/excluded: open high\/critical incident/);
    });

    it('refuses a lot whose cargo already has an open movement (409)', async () => {
      const y = await yard();
      const a1 = await newSlot(prisma, world, 'a');
      const { shipment: s, cargo } = await shipment(2, y.port.id);
      await prisma.movement.create({ data: { scenarioId: world.scenarioId, cargoItemId: cargo[0].id, type: 'port_entry', status: 'reserved', toSlotId: a1.id, weightKg: 1, volumeM3: 1 } });

      await expect(propose(s.id)).rejects.toThrow(ConflictException);
    });

    it('plans a transfer out of a warehouse without using that warehouse', async () => {
      const a1 = await newSlot(prisma, world, 'a');
      const b1 = await newSlot(prisma, world, 'b');
      const stored = await storedCargo(prisma, world, a1);
      const order = await prisma.transferOrder.create({
        data: { scenarioId: world.scenarioId, code: `TO-${++seq}`, fromWarehouseId: world.warehouses.a.id, items: { create: [{ cargoItemId: stored.id, fromSlotId: a1.id }] } },
      });

      const p = await allocations.propose({ scenarioId: world.scenarioId, contextType: 'transfer', contextId: order.id, seed: 1 } as any, ctx);

      expect(p.items![0].slotId).toBe(b1.id);
      expect(p.notes.join()).toMatch(/source warehouse are excluded/);

      await allocations.confirm(p.id, ctx);
      const m = await prisma.movement.findFirstOrThrow({ where: { cargoItemId: stored.id } });
      expect(m).toMatchObject({ type: 'warehouse_transfer', status: 'reserved', fromSlotId: a1.id, toSlotId: b1.id });
    });
  });

  // ─── Confirm (BR-12) ────────────────────────────────────────────────────────

  describe('confirm', () => {
    it('turns every item into a reserved movement and closes the proposal, in one go', async () => {
      const y = await yard();
      const a1 = await newSlot(prisma, world, 'a');
      const { shipment: s } = await shipment(4, y.port.id);
      const p = await propose(s.id);

      const done = await allocations.confirm(p.id, { actorId: userId, correlationId: 'confirm-corr' });

      expect(done).toMatchObject({ status: 'confirmed', confirmedById: userId });
      expect(done.items!.every(i => i.movementId)).toBe(true);
      const movs = await prisma.movement.findMany({ where: { id: { in: done.items!.map(i => i.movementId!) } }, include: { reservation: true } });
      expect(movs).toHaveLength(4);
      expect(movs.every(m => m.status === 'reserved' && m.type === 'port_entry' && m.toSlotId === a1.id && m.reservation?.status === 'active')).toBe(true);
      expect(await prisma.auditLog.count({ where: { entityId: p.id, action: 'allocation.confirm', correlationId: 'confirm-corr' } })).toBe(1);
    });

    it('cannot be confirmed twice', async () => {
      const y = await yard();
      await newSlot(prisma, world, 'a');
      const { shipment: s } = await shipment(2, y.port.id);
      const p = await propose(s.id);
      await allocations.confirm(p.id, ctx);

      await expect(allocations.confirm(p.id, ctx)).rejects.toThrow(/already confirmed/);
      expect(await prisma.movement.count({ where: { scenarioId: world.scenarioId } })).toBe(2);
    });

    it('is all-or-nothing: a failure after the movements are written undoes every one of them', async () => {
      const y = await yard();
      await newSlot(prisma, world, 'a');
      const { shipment: s } = await shipment(3, y.port.id);
      const p = await propose(s.id);

      // The movements and their reservations are written first; the proposal's own audit row comes last.
      const spy = jest.spyOn(audit, 'recordInTransaction').mockImplementation(async (tx, entry) => {
        if (entry.action === 'allocation.confirm') throw new Error('audit store down');
        await tx.auditLog.create({ data: { action: entry.action, entityType: entry.entityType, entityId: entry.entityId } });
      });
      await expect(allocations.confirm(p.id, ctx)).rejects.toThrow('audit store down');
      spy.mockRestore();

      expect(await prisma.movement.count({ where: { scenarioId: world.scenarioId } })).toBe(0);
      expect(await prisma.slotReservation.count({ where: { slot: { warehouse: { scenarioId: world.scenarioId } } } })).toBe(0);
      expect((await allocations.findOne(p.id)).status).toBe('proposed');

      await expect(allocations.confirm(p.id, ctx)).resolves.toMatchObject({ status: 'confirmed' }); // and it still works
    });

    it('re-checks the plan: capacity taken since the proposal makes confirm fail with 422 and nothing is created', async () => {
      const y = await yard();
      const a1 = await newSlot(prisma, world, 'a', { maxWeightKg: CARGO_KG * 2 });
      const { shipment: s } = await shipment(2, y.port.id);
      const p = await propose(s.id);
      expect(slotsOf(p)).toEqual([a1.id, a1.id]);

      await prisma.storageSlot.update({ where: { id: a1.id }, data: { currentWeightKg: CARGO_KG } }); // someone stored a pallet meanwhile

      const err = await allocations.confirm(p.id, ctx).catch(e => e);
      expect(err).toBeInstanceOf(UnprocessableEntityException);
      expect(JSON.stringify(err.getResponse())).toMatch(/no longer fits/);
      expect(await prisma.movement.count({ where: { scenarioId: world.scenarioId } })).toBe(0);
      expect((await allocations.findOne(p.id)).status).toBe('proposed');
    });

    it('two simultaneous confirms of one proposal create the movements once', async () => {
      const y = await yard();
      await newSlot(prisma, world, 'a');
      const { shipment: s } = await shipment(5, y.port.id);
      const p = await propose(s.id);

      const results = await Promise.allSettled([1, 2, 3, 4].map(() => allocations.confirm(p.id, ctx)));

      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter(r => r.status === 'rejected').every(r => (r as PromiseRejectedResult).reason instanceof ConflictException)).toBe(true);
      expect(await prisma.movement.count({ where: { scenarioId: world.scenarioId } })).toBe(5);
    });

    it('rejecting closes it without moving anything', async () => {
      const y = await yard();
      await newSlot(prisma, world, 'a');
      const { shipment: s } = await shipment(1, y.port.id);
      const p = await propose(s.id);

      const r = await allocations.reject(p.id, 'wrong shipment', ctx);

      expect(r).toMatchObject({ status: 'rejected', rejectReason: 'wrong shipment' });
      await expect(allocations.confirm(p.id, ctx)).rejects.toThrow(/already rejected/);
      expect(await prisma.movement.count({ where: { scenarioId: world.scenarioId } })).toBe(0);
    });
  });

  // ─── Edit ───────────────────────────────────────────────────────────────────

  describe('edit', () => {
    it('lets a person move an item, marks it as manual, and keeps the rest', async () => {
      const y = await yard();
      const a1 = await newSlot(prisma, world, 'a');
      const b1 = await newSlot(prisma, world, 'b');
      const { shipment: s } = await shipment(2, y.port.id);
      const p = await propose(s.id);
      const target = p.items![0].cargoItemId;

      const e = await allocations.edit(p.id, { items: [{ cargoItemId: target, slotId: b1.id }] }, { ...ctx, actorEmail: 'boss@test.local' });

      expect(e).toMatchObject({ status: 'edited', modifiedByUser: true, version: p.version + 1 });
      const moved = e.items!.find(i => i.cargoItemId === target)!;
      expect(moved).toMatchObject({ slotId: b1.id, warehouseId: world.warehouses.b.id, editedByUser: true, recommended: false, feasible: true });
      expect(moved.reasons[0]).toBe('Chosen manually by boss@test.local');
      expect(e.items!.find(i => i.cargoItemId !== target)).toMatchObject({ slotId: a1.id, editedByUser: false, recommended: true });
      expect(await prisma.auditLog.count({ where: { entityId: p.id, action: 'allocation.edit' } })).toBe(1);
    });

    it('refuses a change that breaks a hard constraint and names the reason', async () => {
      const y = await yard();
      await newSlot(prisma, world, 'a');
      const blocked = await newSlot(prisma, world, 'b', { isBlocked: true });
      const { shipment: s } = await shipment(1, y.port.id);
      const p = await propose(s.id);

      const err = await allocations.edit(p.id, { items: [{ cargoItemId: p.items![0].cargoItemId, slotId: blocked.id }] }, ctx).catch(e => e);

      expect(err).toBeInstanceOf(UnprocessableEntityException);
      expect(JSON.stringify(err.getResponse())).toContain('Slot is blocked');
      expect((await allocations.findOne(p.id)).status).toBe('proposed'); // nothing changed
    });

    it('catches two edits that only collide with each other', async () => {
      const y = await yard();
      await newSlot(prisma, world, 'a');
      const tight = await newSlot(prisma, world, 'b', { maxWeightKg: CARGO_KG }); // room for one
      const { shipment: s } = await shipment(2, y.port.id);
      const p = await propose(s.id);

      const err = await allocations.edit(p.id, { items: p.items!.map(i => ({ cargoItemId: i.cargoItemId, slotId: tight.id })) }, ctx).catch(e => e);

      expect(err).toBeInstanceOf(UnprocessableEntityException);
      expect(JSON.stringify(err.getResponse())).toMatch(/exceeds remaining slot capacity/);
    });

    it('lets a person fill a slot the algorithm left out, then confirm', async () => {
      const y = await yard();
      await roadEdges.block(y.toB.id); // B unreachable: the algorithm cannot use it
      const a1 = await newSlot(prisma, world, 'a', { maxWeightKg: CARGO_KG });
      await newSlot(prisma, world, 'b');
      const { shipment: s } = await shipment(2, y.port.id);
      const p = await propose(s.id);
      expect(p.summary).toMatchObject({ allocated: 1, unallocated: 1 });
      await expect(allocations.confirm(p.id, ctx)).rejects.toThrow(UnprocessableEntityException);

      const spare = await newSlot(prisma, world, 'a');
      const open = p.items!.find(i => !i.slotId)!;
      const e = await allocations.edit(p.id, { items: [{ cargoItemId: open.cargoItemId, slotId: spare.id }] }, ctx);

      expect(e.summary.unallocated).toBe(0);
      const done = await allocations.confirm(p.id, ctx);
      expect(done.status).toBe('confirmed');
      expect(done.items!.map(i => i.slotId).sort()).toEqual([a1.id, spare.id].sort());
    });

    it('takes an item out of the plan on request, which then blocks confirmation', async () => {
      const y = await yard();
      await newSlot(prisma, world, 'a');
      const { shipment: s } = await shipment(2, y.port.id);
      const p = await propose(s.id);

      const e = await allocations.edit(p.id, { items: [{ cargoItemId: p.items![0].cargoItemId, slotId: null }] }, ctx);

      expect(e.items!.find(i => i.cargoItemId === p.items![0].cargoItemId)).toMatchObject({ slotId: null, feasible: false, editedByUser: true });
      await expect(allocations.confirm(p.id, ctx)).rejects.toThrow(/have no slot/);
    });

    it('rejects a stale version, a foreign cargo item, an unusable slot, and edits after confirm', async () => {
      const y = await yard();
      await newSlot(prisma, world, 'a');
      const outsider = await newSlot(prisma, { ...world, warehouses: { ...world.warehouses } }, 'b');
      const { shipment: s } = await shipment(1, y.port.id);
      const p = await propose(s.id);
      const cargoId = p.items![0].cargoItemId;

      await expect(allocations.edit(p.id, { items: [{ cargoItemId: cargoId, slotId: outsider.id }], version: p.version + 5 }, ctx)).rejects.toThrow(ConflictException);
      await expect(allocations.edit(p.id, { items: [{ cargoItemId: '00000000-0000-4000-8000-000000000000', slotId: outsider.id }] }, ctx)).rejects.toThrow(/Not part of this allocation/);
      await expect(allocations.edit(p.id, { items: [{ cargoItemId: cargoId, slotId: '00000000-0000-4000-8000-000000000000' }] }, ctx)).rejects.toThrow(/cannot be used for this lot/);

      await allocations.confirm(p.id, ctx);
      await expect(allocations.edit(p.id, { items: [{ cargoItemId: cargoId, slotId: outsider.id }] }, ctx)).rejects.toThrow(/already confirmed/);
    });
  });

  // ─── HTTP ───────────────────────────────────────────────────────────────────

  const as = async (role: string) =>
    request.agent(app.getHttpServer()).set('Authorization', `Bearer ${await jwt.signAsync({ sub: userId, email: 'planner@test.local', roles: [role], permissions: ROLE_PERMISSIONS[role] })}`);

  describe('HTTP', () => {
    it('lets a dispatcher propose and edit but not confirm; an ops manager confirms; an accountant only reads', async () => {
      const y = await yard();
      await newSlot(prisma, world, 'a');
      const { shipment: s } = await shipment(2, y.port.id);
      const body = { scenarioId: world.scenarioId, contextType: 'inbound', contextId: s.id, seed: 1 };

      await (await as('accountant')).post('/allocations/propose').send(body).expect(403);
      const proposed = await (await as('dispatcher')).post('/allocations/propose').send(body).expect(201);
      expect(proposed.body.items).toHaveLength(2);

      await (await as('dispatcher')).post(`/allocations/${proposed.body.id}/confirm`).expect(403);
      await (await as('accountant')).get(`/allocations/${proposed.body.id}`).expect(200);
      const listed = await (await as('accountant')).get(`/allocations?scenarioId=${world.scenarioId}&status=proposed`).expect(200);
      expect(listed.body.meta.total).toBe(1);
      expect(listed.body.items[0].summary).toMatchObject({ total: 2, allocated: 2 });

      const confirmed = await (await as('ops_manager')).post(`/allocations/${proposed.body.id}/confirm`).expect(200);
      expect(confirmed.body.status).toBe('confirmed');
    });

    it('POST /optimization/benchmark returns one row per dataset and algorithm, and validates its input', async () => {
      const api = await as('dispatcher');
      const res = await api.post('/optimization/benchmark').send({ datasets: ['small', 'cold-chain'], seed: 3 }).expect(201);
      expect(res.body).toHaveLength(2 * 4);
      expect(res.body.every((r: any) => r.hardViolations === 0)).toBe(true);
      await api.post('/optimization/benchmark').send({ datasets: ['nope'] }).expect(400);
      await (await as('accountant')).post('/optimization/benchmark').send({}).expect(403);
    });

    it('replays a retried confirm instead of failing or duplicating', async () => {
      const y = await yard();
      await newSlot(prisma, world, 'a');
      const { shipment: s } = await shipment(2, y.port.id);
      const proposed = await propose(s.id);
      const api = await as('ops_manager');

      const first = await api.post(`/allocations/${proposed.id}/confirm`).set('Idempotency-Key', 'confirm-1').expect(200);
      const again = await api.post(`/allocations/${proposed.id}/confirm`).set('Idempotency-Key', 'confirm-1').expect(200);

      expect(again.headers['idempotent-replayed']).toBe('true');
      expect(again.body.id).toBe(first.body.id);
      expect(await prisma.movement.count({ where: { scenarioId: world.scenarioId } })).toBe(2);
      // Without the key a retry is a plain conflict.
      await api.post(`/allocations/${proposed.id}/confirm`).expect(409);
    });

    it('validates input: only inbound and transfer lots, known uuids', async () => {
      const api = await as('dispatcher');
      await api.post('/allocations/propose').send({ scenarioId: world.scenarioId, contextType: 'outbound', contextId: '00000000-0000-4000-8000-000000000000' }).expect(400);
      await api.post('/allocations/propose').send({ scenarioId: 'nope', contextType: 'inbound', contextId: 'nope' }).expect(400);
      await api.post('/allocations/propose').send({ scenarioId: world.scenarioId, contextType: 'inbound', contextId: '00000000-0000-4000-8000-000000000000' }).expect(404);
      await api.patch('/allocations/00000000-0000-4000-8000-000000000000').send({ items: [] }).expect(400);
      await api.get('/allocations/00000000-0000-4000-8000-000000000000').expect(404);
    });
  });
});
