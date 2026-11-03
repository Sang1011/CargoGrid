/**
 * Movement behaviour against a real PostgreSQL: locking, rollback, ledger, constraints.
 * Skipped unless TEST_DATABASE_URL is set to a migrated, disposable database
 * (the ledger is append-only, so test rows cannot be cleaned up afterwards).
 */
import { ConflictException, INestApplication, UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuditService } from './../src/common/audit/audit.service';
import { ROLE_PERMISSIONS } from './../src/common/security/permissions';
import { MovementType } from './../src/common/enums';
import { MovementService } from './../src/modules/movement/application/movement.service';
import { PrismaService } from './../src/prisma/prisma.service';
import { TEST_DATABASE_URL, createPrisma } from './helpers/db';
import { CARGO_KG, CARGO_M3, World, inboundCargo, newSlot, newWorld, slotLoad, storedCargo } from './helpers/world';

const dbDescribe = TEST_DATABASE_URL ? describe : describe.skip;

dbDescribe('Movement (real database)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let movements: MovementService;
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
    movements = app.get(MovementService);
    audit = app.get(AuditService);
    jwt = app.get(JwtService);
    userId = (await prisma.user.create({ data: { email: `mv-${Date.now()}@test.local`, passwordHash: 'x', fullName: 'Mover' } })).id;
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    world = await newWorld(prisma);
  });

  const ctx = { actorId: null, correlationId: 'test-corr' };
  const ledger = (cargoItemId: string) => prisma.cargoItemEvent.findMany({ where: { cargoItemId }, orderBy: { seq: 'asc' } });
  const cargoRow = (id: string) => prisma.cargoItem.findUniqueOrThrow({ where: { id } });
  const warehouseLoad = async (id: string) => Number((await prisma.warehouse.findUniqueOrThrow({ where: { id } })).currentWeightKg);

  // ─── The happy paths ────────────────────────────────────────────────────────

  describe('lifecycle', () => {
    it('moves cargo between slots of one warehouse and keeps every total consistent', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);
      const whBefore = await warehouseLoad(world.warehouses.a.id);

      const created = await movements.create({ cargoItemId: cargo.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: to.id, reason: 'consolidate' }, ctx);
      expect(created).toMatchObject({ status: 'reserved', fromSlotId: from.id, toSlotId: to.id, weightKg: CARGO_KG });
      expect(created.reservation?.status).toBe('active');
      expect((await cargoRow(cargo.id)).currentSlotId).toBe(from.id); // nothing moved yet

      await movements.start(created.id, ctx);
      expect(await cargoRow(cargo.id)).toMatchObject({ status: 'in_transit_transfer', currentSlotId: from.id });

      const done = await movements.complete(created.id, ctx);
      expect(done.status).toBe('completed');
      expect(await cargoRow(cargo.id)).toMatchObject({ status: 'stored', currentSlotId: to.id, currentWarehouseId: world.warehouses.a.id });
      expect(await slotLoad(prisma, from.id)).toMatchObject({ weightKg: 0 });
      expect(await slotLoad(prisma, to.id)).toMatchObject({ weightKg: CARGO_KG });
      expect(await warehouseLoad(world.warehouses.a.id)).toBe(whBefore); // same warehouse: total unchanged
      expect((await prisma.slotReservation.findUniqueOrThrow({ where: { movementId: created.id } })).status).toBe('consumed');
    });

    it('writes the ledger, audit and outbox rows for every step, tied to one correlation id', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'b');
      const cargo = await storedCargo(prisma, world, from);

      const m = await movements.create({ cargoItemId: cargo.id, type: MovementType.WAREHOUSE_TRANSFER, toSlotId: to.id }, ctx);
      await movements.start(m.id, ctx);
      await movements.complete(m.id, ctx);

      const events = await ledger(cargo.id);
      expect(events.map(e => e.eventType)).toEqual(['movement_created', 'slot_reserved', 'movement_started', 'movement_completed']);
      expect(events.every(e => e.movementId === m.id && e.correlationId === 'test-corr')).toBe(true);
      expect(events.map(e => Number(e.seq))).toEqual([...events.map(e => Number(e.seq))].sort((x, y) => x - y));
      expect(events[3]).toMatchObject({ fromSlotId: from.id, toSlotId: to.id });

      const audits = await prisma.auditLog.findMany({ where: { entityType: 'movements', entityId: m.id }, orderBy: { createdAt: 'asc' } });
      expect(audits.map(a => a.action)).toEqual(['movement.reserve', 'movement.start', 'movement.complete']);
      expect(audits.every(a => a.correlationId === 'test-corr')).toBe(true);

      const outbox = await prisma.outboxEvent.findMany({ where: { aggregateId: m.id }, orderBy: { createdAt: 'asc' } });
      expect(outbox.map(o => o.eventType)).toEqual(['MovementReserved', 'MovementStarted', 'MovementCompleted']);
    });

    it('moves a warehouse transfer into the other warehouse total', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'b');
      const cargo = await storedCargo(prisma, world, from);

      const m = await movements.create({ cargoItemId: cargo.id, type: MovementType.WAREHOUSE_TRANSFER, toSlotId: to.id }, ctx);
      await movements.start(m.id, ctx);
      await movements.complete(m.id, ctx);

      expect(await warehouseLoad(world.warehouses.a.id)).toBe(0);
      expect(await warehouseLoad(world.warehouses.b.id)).toBe(CARGO_KG);
      expect(await cargoRow(cargo.id)).toMatchObject({ currentWarehouseId: world.warehouses.b.id });
    });

    it('takes cargo in through the port and out again', async () => {
      const slot = await newSlot(prisma, world, 'a');
      const cargo = await inboundCargo(prisma, world);

      const entry = await movements.create({ cargoItemId: cargo.id, type: MovementType.PORT_ENTRY, toSlotId: slot.id }, ctx);
      await movements.start(entry.id, ctx);
      await movements.complete(entry.id, ctx);
      expect(await cargoRow(cargo.id)).toMatchObject({ status: 'stored', currentSlotId: slot.id });
      expect(await slotLoad(prisma, slot.id)).toMatchObject({ weightKg: CARGO_KG });

      const exit = await movements.create({ cargoItemId: cargo.id, type: MovementType.PORT_EXIT }, ctx);
      expect(exit.reservation).toBeNull(); // nothing to reserve when leaving
      await movements.start(exit.id, ctx);
      expect(await cargoRow(cargo.id)).toMatchObject({ status: 'in_transit_outbound' });
      await movements.complete(exit.id, ctx);
      expect(await cargoRow(cargo.id)).toMatchObject({ status: 'delivered', currentSlotId: null, currentWarehouseId: null });
      expect(await slotLoad(prisma, slot.id)).toMatchObject({ weightKg: 0 });
      expect(await warehouseLoad(world.warehouses.a.id)).toBe(0);
    });

    it('refuses steps out of order', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);
      const m = await movements.create({ cargoItemId: cargo.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: to.id }, ctx);

      await expect(movements.complete(m.id, ctx)).rejects.toThrow(ConflictException); // reserved → completed is not allowed
      await movements.start(m.id, ctx);
      await expect(movements.start(m.id, ctx)).rejects.toThrow(ConflictException);
      await movements.complete(m.id, ctx);
      await expect(movements.cancel(m.id, 'too late', ctx)).rejects.toThrow(ConflictException);
    });
  });

  // ─── Business rules ─────────────────────────────────────────────────────────

  describe('rules', () => {
    it.each(['in_transit_transfer', 'in_transit_outbound', 'delivered', 'lost', 'damaged'])('BR-05: refuses to move %s cargo', async status => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);
      await prisma.cargoItem.update({ where: { id: cargo.id }, data: { status: status as any } });

      await expect(movements.create({ cargoItemId: cargo.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: to.id }, ctx)).rejects.toThrow(/needs it to be 'stored'/);
    });

    it('BR-03: a cargo item cannot have two open movements', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);
      await movements.create({ cargoItemId: cargo.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: to.id }, ctx);

      await expect(movements.create({ cargoItemId: cargo.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: to.id }, ctx)).rejects.toThrow(/open movement/);
    });

    it('BR-03: simultaneous requests for one cargo produce exactly one movement', async () => {
      const from = await newSlot(prisma, world, 'a');
      const targets = await Promise.all(Array.from({ length: 10 }, () => newSlot(prisma, world, 'a')));
      const cargo = await storedCargo(prisma, world, from);

      const results = await Promise.allSettled(
        targets.map(t => movements.create({ cargoItemId: cargo.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: t.id }, ctx)),
      );

      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter(r => r.status === 'rejected').every(r => (r as PromiseRejectedResult).reason instanceof ConflictException)).toBe(true);
      expect(await prisma.movement.count({ where: { cargoItemId: cargo.id } })).toBe(1);
    });

    it('BR-07: refuses a blocked destination, with nothing left behind', async () => {
      const from = await newSlot(prisma, world, 'a');
      const blocked = await newSlot(prisma, world, 'a', { isBlocked: true });
      const cargo = await storedCargo(prisma, world, from);

      await expect(movements.create({ cargoItemId: cargo.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: blocked.id }, ctx)).rejects.toThrow(/blocked/);
      expect(await prisma.movement.count({ where: { cargoItemId: cargo.id } })).toBe(0);
      expect(await ledger(cargo.id)).toHaveLength(0);
    });

    it('BR-13: refuses a warehouse with an open high-severity incident', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'b');
      const cargo = await storedCargo(prisma, world, from);
      await prisma.warehouseIncident.create({
        data: { warehouseId: world.warehouses.b.id, incidentType: 'power_outage', severity: 'high', title: 'Power loss' },
      });

      await expect(movements.create({ cargoItemId: cargo.id, type: MovementType.WAREHOUSE_TRANSFER, toSlotId: to.id }, ctx)).rejects.toThrow(/incident/);
    });

    it('BR-09: refuses a slot whose temperature cannot hold the product (422, not 409)', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'b');
      const cold = await storedCargo(prisma, world, from, world.coldProductId);

      const err = await movements.create({ cargoItemId: cold.id, type: MovementType.WAREHOUSE_TRANSFER, toSlotId: to.id }, ctx).catch(e => e);
      expect(err).toBeInstanceOf(UnprocessableEntityException);
      expect(err.message).toMatch(/temperature/);
    });

    it('refuses a destination in another scenario', async () => {
      const from = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);
      const other = await newWorld(prisma);
      const foreign = await newSlot(prisma, other, 'a');

      await expect(movements.create({ cargoItemId: cargo.id, type: MovementType.WAREHOUSE_TRANSFER, toSlotId: foreign.id }, ctx)).rejects.toThrow(/different scenario/);
    });
  });

  // ─── Cancel and expiry ──────────────────────────────────────────────────────

  describe('cancel and expiry', () => {
    it('cancelling frees the reserved capacity for someone else', async () => {
      const from = await newSlot(prisma, world, 'a');
      const full = await newSlot(prisma, world, 'a', { maxWeightKg: CARGO_KG }); // room for exactly one
      const first = await storedCargo(prisma, world, from);
      const second = await storedCargo(prisma, world, from);

      const m1 = await movements.create({ cargoItemId: first.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: full.id }, ctx);
      await expect(movements.create({ cargoItemId: second.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: full.id }, ctx)).rejects.toThrow(ConflictException);

      const cancelled = await movements.cancel(m1.id, 'plan changed', ctx);
      expect(cancelled).toMatchObject({ status: 'cancelled', cancelReason: 'plan changed' });
      expect(cancelled.reservation?.status).toBe('released');

      await expect(movements.create({ cargoItemId: second.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: full.id }, ctx)).resolves.toMatchObject({ status: 'reserved' });
    });

    it('cancelling a started movement puts the cargo back to stored, in place', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);
      const m = await movements.create({ cargoItemId: cargo.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: to.id }, ctx);
      await movements.start(m.id, ctx);

      await movements.cancel(m.id, 'forklift broke down', ctx);

      expect(await cargoRow(cargo.id)).toMatchObject({ status: 'stored', currentSlotId: from.id });
      expect(await slotLoad(prisma, from.id)).toMatchObject({ weightKg: CARGO_KG });
      expect(await slotLoad(prisma, to.id)).toMatchObject({ weightKg: 0 });
      expect((await ledger(cargo.id)).map(e => e.eventType).pop()).toBe('movement_cancelled');
    });

    it('BR-08: a lapsed reservation stops counting at once, and the job then cancels the movement', async () => {
      const from = await newSlot(prisma, world, 'a');
      const full = await newSlot(prisma, world, 'a', { maxWeightKg: CARGO_KG });
      const first = await storedCargo(prisma, world, from);
      const second = await storedCargo(prisma, world, from);

      const m1 = await movements.create({ cargoItemId: first.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: full.id }, ctx);
      await prisma.slotReservation.update({ where: { movementId: m1.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

      // The slot looks full only to a live reservation; this one has lapsed, so the second request fits.
      const m2 = await movements.create({ cargoItemId: second.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: full.id }, ctx);
      expect(m2.status).toBe('reserved');

      await movements.expireOverdue();

      const after = await movements.findOne(m1.id);
      expect(after).toMatchObject({ status: 'cancelled', cancelReason: 'Reservation expired' });
      expect(after.reservation?.status).toBe('expired');
      expect((await ledger(first.id)).map(e => e.eventType)).toContain('reservation_expired');
      expect((await movements.findOne(m2.id)).status).toBe('reserved');
      await expect(movements.start(m1.id, ctx)).rejects.toThrow(ConflictException);
    });

    it('does not expire a movement that has already started', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);
      const m = await movements.create({ cargoItemId: cargo.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: to.id }, ctx);
      await movements.start(m.id, ctx);

      await movements.expireOverdue(new Date(Date.now() + 365 * 24 * 3600 * 1000));

      expect((await movements.findOne(m.id)).status).toBe('in_transit');
    });
  });

  // ─── G2: concurrency ────────────────────────────────────────────────────────

  describe('concurrency (G2)', () => {
    it('100 requests for a slot with room for one: exactly one wins, 99 get 409', async () => {
      const source = await newSlot(prisma, world, 'a');
      const target = await newSlot(prisma, world, 'b', { maxWeightKg: CARGO_KG }); // exactly one cargo fits
      const cargos = [];
      for (let i = 0; i < 100; i++) cargos.push(await storedCargo(prisma, world, source));

      const results = await Promise.allSettled(
        cargos.map(c => movements.create({ cargoItemId: c.id, type: MovementType.WAREHOUSE_TRANSFER, toSlotId: target.id }, ctx)),
      );

      const won = results.filter(r => r.status === 'fulfilled');
      const lost = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(won).toHaveLength(1);
      expect(lost).toHaveLength(99);
      expect(lost.every(r => r.reason instanceof ConflictException)).toBe(true);

      const reserved = await prisma.slotReservation.aggregate({ where: { slotId: target.id, status: 'active' }, _sum: { weightKg: true } });
      expect(Number(reserved._sum.weightKg)).toBe(CARGO_KG);

      // Finish the winner: the slot ends exactly full, never over.
      const winner = (won[0] as PromiseFulfilledResult<any>).value;
      await movements.start(winner.id, ctx);
      await movements.complete(winner.id, ctx);
      expect(await slotLoad(prisma, target.id)).toMatchObject({ weightKg: CARGO_KG });
    }, 120_000);

    it('100 requests for a slot with room for five: exactly five win', async () => {
      const source = await newSlot(prisma, world, 'a');
      const target = await newSlot(prisma, world, 'b', { maxWeightKg: CARGO_KG * 5 });
      const cargos = [];
      for (let i = 0; i < 100; i++) cargos.push(await storedCargo(prisma, world, source));

      const results = await Promise.allSettled(
        cargos.map(c => movements.create({ cargoItemId: c.id, type: MovementType.WAREHOUSE_TRANSFER, toSlotId: target.id }, ctx)),
      );

      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(5);
      expect(results.filter(r => r.status === 'rejected')).toHaveLength(95);
    }, 120_000);

    it('completing the same movement twice at once moves the cargo only once', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);
      const m = await movements.create({ cargoItemId: cargo.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: to.id }, ctx);
      await movements.start(m.id, ctx);

      const results = await Promise.allSettled(Array.from({ length: 8 }, () => movements.complete(m.id, ctx)));

      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      expect(await slotLoad(prisma, to.id)).toMatchObject({ weightKg: CARGO_KG });
      expect(await slotLoad(prisma, from.id)).toMatchObject({ weightKg: 0 });
      expect((await ledger(cargo.id)).filter(e => e.eventType === 'movement_completed')).toHaveLength(1);
    });

    it('opposite transfers between two warehouses do not deadlock', async () => {
      const a = await newSlot(prisma, world, 'a');
      const b = await newSlot(prisma, world, 'b');
      const pairs = [];
      for (let i = 0; i < 6; i++) {
        const inA = await storedCargo(prisma, world, a);
        const inB = await storedCargo(prisma, world, b);
        pairs.push(
          movements.create({ cargoItemId: inA.id, type: MovementType.WAREHOUSE_TRANSFER, toSlotId: b.id }, ctx),
          movements.create({ cargoItemId: inB.id, type: MovementType.WAREHOUSE_TRANSFER, toSlotId: a.id }, ctx),
        );
      }
      const created = (await Promise.all(pairs)).map(m => m.id);

      const finished = await Promise.allSettled(created.map(async id => { await movements.start(id, ctx); return movements.complete(id, ctx); }));
      expect(finished.every(r => r.status === 'fulfilled')).toBe(true);
      expect((await slotLoad(prisma, a.id)).weightKg).toBe(6 * CARGO_KG);
      expect((await slotLoad(prisma, b.id)).weightKg).toBe(6 * CARGO_KG);
    }, 60_000);
  });

  // ─── BR-04: one transaction ─────────────────────────────────────────────────

  describe('atomicity (BR-04)', () => {
    it('a failure while writing the audit row undoes the whole completion', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'b');
      const cargo = await storedCargo(prisma, world, from);
      const m = await movements.create({ cargoItemId: cargo.id, type: MovementType.WAREHOUSE_TRANSFER, toSlotId: to.id }, ctx);
      await movements.start(m.id, ctx);
      const before = { ledger: (await ledger(cargo.id)).length, fromLoad: await slotLoad(prisma, from.id), toLoad: await slotLoad(prisma, to.id), whA: await warehouseLoad(world.warehouses.a.id) };

      // complete() writes slots, warehouses, cargo, reservation and ledger before it reaches audit.
      const spy = jest.spyOn(audit, 'recordInTransaction').mockRejectedValueOnce(new Error('audit store down'));
      await expect(movements.complete(m.id, ctx)).rejects.toThrow('audit store down');
      spy.mockRestore();

      expect(await cargoRow(cargo.id)).toMatchObject({ status: 'in_transit_transfer', currentSlotId: from.id, currentWarehouseId: world.warehouses.a.id });
      expect(await slotLoad(prisma, from.id)).toEqual(before.fromLoad);
      expect(await slotLoad(prisma, to.id)).toEqual(before.toLoad);
      expect(await warehouseLoad(world.warehouses.a.id)).toBe(before.whA);
      expect((await ledger(cargo.id)).length).toBe(before.ledger);
      expect((await movements.findOne(m.id)).status).toBe('in_transit');
      expect((await prisma.slotReservation.findUniqueOrThrow({ where: { movementId: m.id } })).status).toBe('active');
      expect(await prisma.outboxEvent.count({ where: { aggregateId: m.id, eventType: 'MovementCompleted' } })).toBe(0);

      // and the movement is still completable afterwards
      await expect(movements.complete(m.id, ctx)).resolves.toMatchObject({ status: 'completed' });
    });

    it('a failed reservation leaves no movement, ledger row or audit row behind', async () => {
      const from = await newSlot(prisma, world, 'a');
      const tiny = await newSlot(prisma, world, 'a', { maxWeightKg: 1 });
      const cargo = await storedCargo(prisma, world, from);

      await expect(movements.create({ cargoItemId: cargo.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: tiny.id }, ctx)).rejects.toThrow(/capacity/);

      expect(await prisma.movement.count({ where: { cargoItemId: cargo.id } })).toBe(0);
      expect(await ledger(cargo.id)).toHaveLength(0);
      expect(await prisma.outboxEvent.count({ where: { payload: { path: ['cargoItemId'], equals: cargo.id } } })).toBe(0);
    });
  });

  // ─── Database-level guarantees ──────────────────────────────────────────────

  describe('database guarantees', () => {
    it('rejects UPDATE and DELETE on the ledger', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);
      await movements.create({ cargoItemId: cargo.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: to.id }, ctx);

      await expect(prisma.cargoItemEvent.updateMany({ where: { cargoItemId: cargo.id }, data: { reason: 'tampered' } })).rejects.toThrow(/append-only/);
      await expect(prisma.cargoItemEvent.deleteMany({ where: { cargoItemId: cargo.id } })).rejects.toThrow(/append-only/);
      expect(await ledger(cargo.id)).toHaveLength(2);
    });

    it('refuses to delete a cargo item that has history', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);
      await movements.create({ cargoItemId: cargo.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: to.id }, ctx);

      await expect(prisma.cargoItem.delete({ where: { id: cargo.id } })).rejects.toThrow();
    });

    it('the unique index itself blocks a second open movement', async () => {
      const from = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);
      const row = { scenarioId: world.scenarioId, cargoItemId: cargo.id, type: 'internal_transfer' as const, weightKg: 1, volumeM3: 1 };
      await prisma.movement.create({ data: row });

      await expect(prisma.movement.create({ data: row })).rejects.toThrow();
      await prisma.movement.updateMany({ where: { cargoItemId: cargo.id }, data: { status: 'cancelled' } });
      await expect(prisma.movement.create({ data: row })).resolves.toBeDefined(); // a closed one does not count
    });

    it('the CHECK constraint stops a slot from exceeding its capacity', async () => {
      const slot = await newSlot(prisma, world, 'a', { maxWeightKg: 50 });
      await expect(prisma.storageSlot.update({ where: { id: slot.id }, data: { currentWeightKg: 50.01 } })).rejects.toThrow();
      await expect(prisma.storageSlot.update({ where: { id: slot.id }, data: { currentWeightKg: -1 } })).rejects.toThrow();
    });
  });

  // ─── G1: invariants under a random workload ─────────────────────────────────

  describe('invariants (G1)', () => {
    function rng(seed: number) {
      return () => {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    async function checkInvariants(w: World, slotIds: string[]) {
      const cargos = await prisma.cargoItem.findMany({ where: { scenarioId: w.scenarioId } });

      for (const id of slotIds) {
        const slot = await prisma.storageSlot.findUniqueOrThrow({ where: { id } });
        const held = cargos.filter(c => c.currentSlotId === id).length;
        expect(Number(slot.currentWeightKg)).toBeCloseTo(held * CARGO_KG, 6);
        expect(Number(slot.currentVolumeM3)).toBeCloseTo(held * CARGO_M3, 6);
        const reserved = await prisma.slotReservation.aggregate({
          where: { slotId: id, status: 'active', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          _sum: { weightKg: true },
        });
        expect(Number(slot.currentWeightKg) + Number(reserved._sum.weightKg ?? 0)).toBeLessThanOrEqual(Number(slot.maxWeightKg) + 1e-9);
      }

      for (const wh of [w.warehouses.a.id, w.warehouses.b.id]) {
        const row = await prisma.warehouse.findUniqueOrThrow({ where: { id: wh } });
        expect(Number(row.currentWeightKg)).toBeCloseTo(cargos.filter(c => c.currentWarehouseId === wh).length * CARGO_KG, 6);
      }

      for (const c of cargos) {
        const open = await prisma.movement.count({ where: { cargoItemId: c.id, status: { in: ['created', 'reserved', 'in_transit'] } } });
        expect(open).toBeLessThanOrEqual(1);

        // The cargo's location must agree with the last completed entry in its ledger.
        const last = await prisma.cargoItemEvent.findFirst({ where: { cargoItemId: c.id, eventType: 'movement_completed' }, orderBy: { seq: 'desc' } });
        if (last) {
          expect(c.currentSlotId).toBe(last.toSlotId);
          expect(c.currentWarehouseId).toBe(last.toWarehouseId);
        }
      }
    }

    it('keeps slot load, warehouse load, ledger and cargo location in agreement through 150 random steps', async () => {
      const random = rng(20261101);
      const pick = <T,>(xs: T[]) => xs[Math.floor(random() * xs.length)];

      const slots = [] as { id: string; warehouseId: string }[];
      for (const where of ['a', 'b'] as const) for (let i = 0; i < 3; i++) slots.push(await newSlot(prisma, world, where, { maxWeightKg: CARGO_KG * 3, maxVolumeM3: CARGO_M3 * 3 }));
      const cargoIds: string[] = [];
      for (let i = 0; i < 6; i++) cargoIds.push((await storedCargo(prisma, world, slots[i % 3])).id);
      for (let i = 0; i < 2; i++) cargoIds.push((await inboundCargo(prisma, world)).id);
      const slotIds = slots.map(s => s.id);

      const expected = [ConflictException, UnprocessableEntityException];
      const tolerate = async (p: Promise<unknown>) => { try { await p; } catch (e) { if (!expected.some(c => e instanceof c)) throw e; } };

      let completed = 0;
      for (let step = 0; step < 150; step++) {
        const open = await prisma.movement.findMany({ where: { scenarioId: world.scenarioId, status: { in: ['reserved', 'in_transit'] } } });

        if (open.length > 0 && random() < 0.65) {
          const m = pick(open);
          if (m.status === 'reserved') await tolerate(random() < 0.85 ? movements.start(m.id, ctx) : movements.cancel(m.id, 'random', ctx));
          else if (random() < 0.85) { await tolerate(movements.complete(m.id, ctx)); completed++; }
          else await tolerate(movements.cancel(m.id, 'random', ctx));
        } else {
          const cargo = await cargoRow(pick(cargoIds));
          const dest = pick(slots);
          if (cargo.status === 'in_transit_inbound') await tolerate(movements.create({ cargoItemId: cargo.id, type: MovementType.PORT_ENTRY, toSlotId: dest.id }, ctx));
          else if (cargo.status === 'stored') {
            const type = pick([MovementType.INTERNAL_TRANSFER, MovementType.WAREHOUSE_TRANSFER, MovementType.WAREHOUSE_TRANSFER, MovementType.PORT_EXIT]);
            await tolerate(movements.create({ cargoItemId: cargo.id, type, toSlotId: type === MovementType.PORT_EXIT ? undefined : dest.id }, ctx));
          }
        }

        if (step % 5 === 0) await checkInvariants(world, slotIds);
      }
      await checkInvariants(world, slotIds);
      expect(completed).toBeGreaterThan(10); // the workload actually moved things
    }, 180_000);
  });

  // ─── HTTP layer ─────────────────────────────────────────────────────────────

  describe('HTTP', () => {
    const as = async (role: string) =>
      request.agent(app.getHttpServer()).set('Authorization', `Bearer ${await jwt.signAsync({ sub: userId, email: 'mover@test.local', roles: [role], permissions: ROLE_PERMISSIONS[role] })}`);

    it('replays a retried POST /movements instead of creating a second movement', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);
      const api = await as('dispatcher');
      const body = { cargoItemId: cargo.id, type: 'internal_transfer', toSlotId: to.id };

      const first = await api.post('/movements').set('Idempotency-Key', 'mv-retry-1').send(body).expect(201);
      const second = await api.post('/movements').set('Idempotency-Key', 'mv-retry-1').send(body).expect(201);

      expect(second.headers['idempotent-replayed']).toBe('true');
      expect(second.body.id).toBe(first.body.id);
      expect(await prisma.movement.count({ where: { cargoItemId: cargo.id } })).toBe(1);
      await api.post('/movements').set('Idempotency-Key', 'mv-retry-1').send({ ...body, reason: 'different' }).expect(422);
    });

    it('answers 409 when the slot is full and 422 when the cargo does not fit the slot', async () => {
      const from = await newSlot(prisma, world, 'a');
      const full = await newSlot(prisma, world, 'b', { maxWeightKg: CARGO_KG });
      const c1 = await storedCargo(prisma, world, from);
      const c2 = await storedCargo(prisma, world, from);
      const cold = await storedCargo(prisma, world, from, world.coldProductId);
      const api = await as('dispatcher');

      await api.post('/movements').send({ cargoItemId: c1.id, type: 'warehouse_transfer', toSlotId: full.id }).expect(201);
      await api.post('/movements').send({ cargoItemId: c2.id, type: 'warehouse_transfer', toSlotId: full.id }).expect(409);
      const spare = await newSlot(prisma, world, 'b');
      await api.post('/movements').send({ cargoItemId: cold.id, type: 'warehouse_transfer', toSlotId: spare.id }).expect(422);
    });

    it('separates planning from execution by permission', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);

      await (await as('accountant')).post('/movements').send({ cargoItemId: cargo.id, type: 'internal_transfer', toSlotId: to.id }).expect(403);
      const created = await (await as('dispatcher')).post('/movements').send({ cargoItemId: cargo.id, type: 'internal_transfer', toSlotId: to.id }).expect(201);
      await (await as('dispatcher')).patch(`/movements/${created.body.id}/start`).expect(403);
      await (await as('warehouse_operator')).patch(`/movements/${created.body.id}/start`).expect(200);
      await (await as('warehouse_operator')).patch(`/movements/${created.body.id}/complete`).expect(200);
      await (await as('accountant')).get(`/movements/${created.body.id}`).expect(200);
    });

    it('filters and pages movements, and exposes the cargo ledger', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);
      const m = await movements.create({ cargoItemId: cargo.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: to.id }, ctx);
      await movements.start(m.id, ctx);
      await movements.complete(m.id, ctx);
      const api = await as('accountant');

      const list = await api.get(`/movements?cargoItemId=${cargo.id}&status=completed&limit=5`).expect(200);
      expect(list.body.meta).toMatchObject({ total: 1, page: 1, limit: 5 });
      expect(list.body.items[0].id).toBe(m.id);

      const page1 = await api.get(`/cargo-items/${cargo.id}/history?limit=3`).expect(200);
      expect(page1.body.meta.total).toBe(4);
      expect(page1.body.items.map((e: any) => e.eventType)).toEqual(['movement_completed', 'movement_started', 'slot_reserved']); // newest first
      const page2 = await api.get(`/cargo-items/${cargo.id}/history?limit=3&page=2`).expect(200);
      expect(page2.body.items.map((e: any) => e.eventType)).toEqual(['movement_created']);
    });

    it('BR-01: cargo location and status is ignored by PATCH /cargo-items', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);
      const api = await as('ops_manager');

      // The global whitelist pipe drops these fields, so the request succeeds but changes nothing.
      await api.patch(`/cargo-items/${cargo.id}`).send({ currentSlotId: to.id, currentWarehouseId: world.warehouses.b.id, status: 'delivered' }).expect(200);
      expect(await cargoRow(cargo.id)).toMatchObject({ currentSlotId: from.id, status: 'stored' });
      await api.patch(`/cargo-items/${cargo.id}`).send({ notes: 'fragile corner' }).expect(200);
      expect(await cargoRow(cargo.id)).toMatchObject({ currentSlotId: from.id, status: 'stored', notes: 'fragile corner' });
    });

    it('refuses to delete a cargo item that has history (409, not 500)', async () => {
      const from = await newSlot(prisma, world, 'a');
      const to = await newSlot(prisma, world, 'a');
      const cargo = await storedCargo(prisma, world, from);
      await movements.create({ cargoItemId: cargo.id, type: MovementType.INTERNAL_TRANSFER, toSlotId: to.id }, ctx);

      await (await as('ops_manager')).delete(`/cargo-items/${cargo.id}`).expect(409);
    });
  });
});
