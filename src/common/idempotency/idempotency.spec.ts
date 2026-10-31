jest.mock('src/prisma/prisma.service', () => ({ PrismaService: class { } }));

import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { makeHttpContext } from '../security/test-helpers';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyService, hashRequest } from './idempotency.service';

/** In-memory stand-in for the idempotency_keys table, including the unique (userId, key) constraint. */
function fakePrisma() {
    const rows = new Map<string, any>();
    const id = (w: any) => `${w.userId_key?.userId ?? w.userId}:${w.userId_key?.key ?? w.key}`;
    return {
        rows,
        idempotencyKey: {
            create: jest.fn(async ({ data }: any) => {
                if (rows.has(id(data))) throw Object.assign(new Error('unique'), { code: 'P2002' });
                rows.set(id(data), { statusCode: null, response: null, ...data });
            }),
            findUnique: jest.fn(async ({ where }: any) => rows.get(id(where)) ?? null),
            update: jest.fn(async ({ where, data }: any) => Object.assign(rows.get(id(where)), data)),
            deleteMany: jest.fn(async ({ where }: any) => { rows.delete(id(where)); }),
        },
    };
}

describe('hashRequest', () => {
    it('ignores key order but not content or route', () => {
        expect(hashRequest('POST', '/a', { x: 1, y: 2 })).toBe(hashRequest('POST', '/a', { y: 2, x: 1 }));
        expect(hashRequest('POST', '/a', { x: 1 })).not.toBe(hashRequest('POST', '/a', { x: 2 }));
        expect(hashRequest('POST', '/a', { x: 1 })).not.toBe(hashRequest('POST', '/b', { x: 1 }));
    });
});

describe('IdempotencyInterceptor', () => {
    const setup = () => {
        const prisma = fakePrisma();
        const interceptor = new IdempotencyInterceptor(new IdempotencyService(prisma as any));
        const run = (opts: { key?: string; body?: any; handler: () => any; user?: any }) => {
            const res: any = { statusCode: 201, status(c: number) { this.statusCode = c; return this; }, setHeader: jest.fn() };
            const req: any = {
                method: 'POST', originalUrl: '/cargo-items', body: opts.body ?? { a: 1 },
                headers: opts.key ? { 'idempotency-key': opts.key } : {},
                user: opts.user === undefined ? { id: 'u1' } : opts.user,
            };
            const result$ = interceptor.intercept(makeHttpContext(req, res), { handle: opts.handler } as any);
            return { res, result: lastValueFrom(result$) };
        };
        return { prisma, run };
    };

    it('does nothing without the header', async () => {
        const { run, prisma } = setup();
        const handler = jest.fn(() => of({ id: 1 }));

        await expect(run({ handler }).result).resolves.toEqual({ id: 1 });
        expect(prisma.rows.size).toBe(0);
    });

    it('runs the handler once and replays the stored response for the same key and payload', async () => {
        const { run } = setup();
        const handler = jest.fn(() => of({ id: 'created-1' }));

        const first = await run({ key: 'k1', handler }).result;
        const replay = run({ key: 'k1', handler });

        expect(first).toEqual({ id: 'created-1' });
        await expect(replay.result).resolves.toEqual({ id: 'created-1' });
        expect(handler).toHaveBeenCalledTimes(1);
        expect(replay.res.setHeader).toHaveBeenCalledWith('Idempotent-Replayed', 'true');
        expect(replay.res.statusCode).toBe(201);
    });

    it('returns 422 when the same key is reused with a different payload', async () => {
        const { run } = setup();
        await run({ key: 'k1', body: { a: 1 }, handler: () => of({ ok: true }) }).result;

        await expect(run({ key: 'k1', body: { a: 2 }, handler: () => of({}) }).result)
            .rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('returns 409 while the first request is still in flight', async () => {
        const { run, prisma } = setup();
        await prisma.idempotencyKey.create({ data: { userId: 'u1', key: 'k1', requestHash: hashRequest('POST', '/cargo-items', { a: 1 }), expiresAt: new Date(Date.now() + 60_000) } });

        await expect(run({ key: 'k1', handler: () => of({}) }).result).rejects.toBeInstanceOf(ConflictException);
    });

    it('frees the key when the handler fails so the client can retry', async () => {
        const { run } = setup();
        await expect(run({ key: 'k1', handler: () => throwError(() => new Error('boom')) }).result).rejects.toThrow('boom');

        const handler = jest.fn(() => of({ id: 'second-try' }));
        await expect(run({ key: 'k1', handler }).result).resolves.toEqual({ id: 'second-try' });
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('scopes keys per user', async () => {
        const { run } = setup();
        const handler = jest.fn(() => of({ id: 'x' }));

        await run({ key: 'same', handler, user: { id: 'u1' } }).result;
        await run({ key: 'same', handler, user: { id: 'u2' } }).result;

        expect(handler).toHaveBeenCalledTimes(2);
    });

    it('ignores the header on unauthenticated requests', async () => {
        const { run, prisma } = setup();
        await run({ key: 'k1', user: null, handler: () => of({ ok: 1 }) }).result;
        expect(prisma.rows.size).toBe(0);
    });
});
