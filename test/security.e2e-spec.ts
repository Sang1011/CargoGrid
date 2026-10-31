import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcryptjs';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { ROLE_PERMISSIONS } from './../src/common/security/permissions';

const uuid = '11111111-1111-4111-8111-111111111111';
const PASSWORD = 'correct-horse-battery';

function buildMock() {
  const auditRows: any[] = [];
  const keys = new Map<string, any>();
  const refreshTokens: any[] = [];
  const cargoCreate = jest.fn(async ({ data }: any) => ({
    id: 'cargo-new-1', status: 'in_transit_inbound', createdAt: new Date(), updatedAt: new Date(), ...data,
  }));
  const keyId = (w: any) => `${w.userId_key?.userId ?? w.userId}:${w.userId_key?.key ?? w.key}`;

  const adminRow = {
    id: 'admin-1', email: 'admin@test.local', fullName: 'Admin', isActive: true,
    passwordHash: hashSync(PASSWORD, 4),
    roles: [{ role: { name: 'admin', permissions: ROLE_PERMISSIONS.admin.map(code => ({ permission: { code } })) } }],
  };

  const mock: any = {
    auditRows, cargoCreate,
    $connect: async () => undefined,
    $disconnect: async () => undefined,
    $queryRaw: async () => [{ ok: 1 }],
    user: {
      findUnique: async ({ where }: any) => (where.email === adminRow.email || where.id === adminRow.id ? adminRow : null),
      update: async () => adminRow,
    },
    refreshToken: {
      create: async ({ data }: any) => { const r = { id: `rt${refreshTokens.length}`, revokedAt: null, ...data }; refreshTokens.push(r); return r; },
      findUnique: async ({ where }: any) => refreshTokens.find(t => t.tokenHash === where.tokenHash) ?? null,
      update: async ({ where, data }: any) => Object.assign(refreshTokens.find(t => t.id === where.id), data),
      updateMany: async () => ({ count: 0 }),
    },
    auditLog: {
      create: async ({ data }: any) => { auditRows.push(data); return data; },
      findMany: async () => auditRows,
      count: async () => auditRows.length,
    },
    idempotencyKey: {
      create: async ({ data }: any) => {
        if (keys.has(keyId(data))) throw Object.assign(new Error('unique'), { code: 'P2002' });
        keys.set(keyId(data), { statusCode: null, response: null, ...data });
      },
      findUnique: async ({ where }: any) => keys.get(keyId(where)) ?? null,
      update: async ({ where, data }: any) => Object.assign(keys.get(keyId(where)), data),
      deleteMany: async ({ where }: any) => { keys.delete(keyId(where)); },
    },
    cargoItem: {
      findMany: async () => [],
      count: async () => 0,
      findUnique: async () => null,
      create: cargoCreate,
    },
  };
  return mock;
}

describe('Security (e2e)', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof buildMock>;
  let jwt: JwtService;

  beforeAll(async () => {
    prisma = buildMock();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    jwt = app.get(JwtService);
  });

  afterAll(async () => { await app.close(); });

  const tokenFor = (role: string) =>
    jwt.signAsync({ sub: `user-${role}`, email: `${role}@test.local`, roles: [role], permissions: ROLE_PERMISSIONS[role] });
  const server = () => request(app.getHttpServer());

  describe('authentication', () => {
    it('leaves /health public', () => server().get('/health').expect(200));

    it('rejects a request without a token → 401', () => server().get('/cargo-items').expect(401));

    it('rejects a garbage token → 401', () =>
      server().get('/cargo-items').set('Authorization', 'Bearer not.a.jwt').expect(401));

    it('rejects a wrong password → 401, and records the failed attempt', async () => {
      await server().post('/auth/login').send({ email: 'admin@test.local', password: 'nope' }).expect(401);
      expect(prisma.auditRows.some(r => r.action === 'auth.login_failed')).toBe(true);
    });

    it('logs in, then the access token opens protected routes', async () => {
      const login = await server().post('/auth/login').send({ email: 'admin@test.local', password: PASSWORD }).expect(200);
      expect(login.body).toMatchObject({ tokenType: 'Bearer' });
      expect(login.body.refreshToken).toBeDefined();

      const me = await server().get('/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`).expect(200);
      expect(me.body).toMatchObject({ email: 'admin@test.local', roles: ['admin'] });
      expect(me.body.permissions).toContain('allocation.confirm');
    });

    it('never writes the password into the audit trail', async () => {
      await server().post('/auth/login').send({ email: 'admin@test.local', password: PASSWORD });
      expect(JSON.stringify(prisma.auditRows)).not.toContain(PASSWORD);
    });

    it('exchanges a refresh token once; replaying it → 401', async () => {
      const login = await server().post('/auth/login').send({ email: 'admin@test.local', password: PASSWORD });
      const first = await server().post('/auth/refresh').send({ refreshToken: login.body.refreshToken }).expect(200);
      expect(first.body.refreshToken).not.toBe(login.body.refreshToken);
      await server().post('/auth/refresh').send({ refreshToken: login.body.refreshToken }).expect(401);
    });
  });

  describe('authorization', () => {
    it('lets an accountant read cargo, with the paginated shape', async () => {
      const res = await server().get('/cargo-items?page=2&limit=5').set('Authorization', `Bearer ${await tokenFor('accountant')}`).expect(200);
      expect(res.body).toEqual({ items: [], meta: { total: 0, page: 2, limit: 5, totalPages: 0 } });
    });

    it('stops an accountant from writing → 403', async () => {
      await server().post('/cargo-items').set('Authorization', `Bearer ${await tokenFor('accountant')}`)
        .send({ productId: uuid, scenarioId: uuid }).expect(403);
    });

    it('lets a dispatcher reach /optimization/run (fails validation, not authorization)', async () => {
      await server().post('/optimization/run').set('Authorization', `Bearer ${await tokenFor('dispatcher')}`).send({}).expect(400);
    });

    it('stops a warehouse operator from running an allocation → 403', async () => {
      await server().post('/optimization/run').set('Authorization', `Bearer ${await tokenFor('warehouse_operator')}`).send({}).expect(403);
    });

    it('limits user management to admin', async () => {
      await server().get('/users').set('Authorization', `Bearer ${await tokenFor('ops_manager')}`).expect(403);
    });

    it('limits the audit trail to roles holding audit.read', async () => {
      await server().get('/audit-logs').set('Authorization', `Bearer ${await tokenFor('dispatcher')}`).expect(403);
      await server().get('/audit-logs').set('Authorization', `Bearer ${await tokenFor('accountant')}`).expect(200);
    });

    it('offers no way to change or delete audit entries', async () => {
      const auth = { Authorization: `Bearer ${await tokenFor('admin')}` };
      await server().delete(`/audit-logs/${uuid}`).set(auth).expect(404);
      await server().patch(`/audit-logs/${uuid}`).set(auth).send({}).expect(404);
      await server().post('/audit-logs').set(auth).send({}).expect(404);
    });
  });

  describe('audit trail and correlation id', () => {
    it('writes exactly one audit row per write, tied to the caller and the correlation id', async () => {
      const before = prisma.auditRows.length;
      const res = await server().post('/cargo-items')
        .set('Authorization', `Bearer ${await tokenFor('warehouse_operator')}`)
        .set('X-Correlation-Id', 'trace-abc-1')
        .set('X-Reason', 'received at dock 4')
        .send({ productId: uuid, scenarioId: uuid, barcode: 'B-1' })
        .expect(201);

      expect(res.headers['x-correlation-id']).toBe('trace-abc-1');
      await new Promise(r => setImmediate(r));

      const rows = prisma.auditRows.slice(before);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorEmail: 'warehouse_operator@test.local', action: 'POST /cargo-items', entityType: 'cargo-items',
        entityId: 'cargo-new-1', correlationId: 'trace-abc-1', reason: 'received at dock 4', statusCode: 201,
      });
      expect(rows[0].newValue).toMatchObject({ barcode: 'B-1' });
    });

    it('generates a correlation id when the caller sends none', async () => {
      const res = await server().get('/health').expect(200);
      expect(res.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('idempotency', () => {
    const post = async (key: string, body: object, role = 'warehouse_operator') =>
      server().post('/cargo-items').set('Authorization', `Bearer ${await tokenFor(role)}`).set('Idempotency-Key', key).send(body);
    const status = async (key: string, body: object, role?: string) => (await post(key, body, role)).status;

    it('creates once and replays the first answer for a repeated key', async () => {
      prisma.cargoCreate.mockClear();
      const body = { productId: uuid, scenarioId: uuid, barcode: 'IDEM-1' };

      const first = await post('key-1', body);
      expect(first.status).toBe(201);
      const second = await post('key-1', body);

      expect(second.status).toBe(201);
      expect(second.headers['idempotent-replayed']).toBe('true');
      expect(second.body).toEqual(first.body);
      expect(prisma.cargoCreate).toHaveBeenCalledTimes(1);
    });

    it('rejects the same key with a different payload → 422', async () => {
      expect(await status('key-2', { productId: uuid, scenarioId: uuid, barcode: 'A' })).toBe(201);
      expect(await status('key-2', { productId: uuid, scenarioId: uuid, barcode: 'B' })).toBe(422);
    });

    it('does not replay one user\'s key for another user', async () => {
      prisma.cargoCreate.mockClear();
      const body = { productId: uuid, scenarioId: uuid };
      expect(await status('shared-key', body, 'warehouse_operator')).toBe(201);
      expect(await status('shared-key', body, 'ops_manager')).toBe(201);
      expect(prisma.cargoCreate).toHaveBeenCalledTimes(2);
    });
  });
});
