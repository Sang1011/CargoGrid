import { buildOrderBy, paginate } from './paginate';
import { CorrelationIdMiddleware } from '../correlation/correlation-id.middleware';

describe('paginate', () => {
    const delegate = (total: number) => ({
        findMany: jest.fn().mockResolvedValue(['a', 'b']),
        count: jest.fn().mockResolvedValue(total),
    });

    it('skips and takes according to page and limit, and reports totals', async () => {
        const d = delegate(45);
        const page = await paginate<string>(d, { page: 3, limit: 10, where: { x: 1 } });

        expect(d.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10, where: { x: 1 } }));
        expect(d.count).toHaveBeenCalledWith({ where: { x: 1 } });
        expect(page.meta).toEqual({ total: 45, page: 3, limit: 10, totalPages: 5 });
    });

    it('clamps absurd values', async () => {
        const d = delegate(0);
        const page = await paginate<string>(d, { page: -4, limit: 9999 });
        expect(d.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 100 }));
        expect(page.meta.totalPages).toBe(0);
    });
});

describe('buildOrderBy', () => {
    it('only honours whitelisted fields', () => {
        const fallback = { createdAt: 'asc' as const };
        expect(buildOrderBy('status', 'desc', ['status'], fallback)).toEqual({ status: 'desc' });
        expect(buildOrderBy('passwordHash', 'desc', ['status'], fallback)).toBe(fallback);
        expect(buildOrderBy(undefined, undefined, ['status'], fallback)).toBe(fallback);
    });
});

describe('CorrelationIdMiddleware', () => {
    const run = (header?: string | string[]) => {
        const req: any = { headers: header === undefined ? {} : { 'x-correlation-id': header } };
        const res: any = { setHeader: jest.fn() };
        const next = jest.fn();
        new CorrelationIdMiddleware().use(req, res, next);
        return { req, res, next };
    };

    it('reuses a well-formed incoming id and echoes it back', () => {
        const { req, res, next } = run('trace-123');
        expect(req.correlationId).toBe('trace-123');
        expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', 'trace-123');
        expect(next).toHaveBeenCalled();
    });

    it('generates an id when none is sent, and replaces unsafe ones', () => {
        const uuid = /^[0-9a-f-]{36}$/;
        expect(run().req.correlationId).toMatch(uuid);
        expect(run('bad id with spaces\nand newline').req.correlationId).toMatch(uuid);
        expect(run('x'.repeat(65)).req.correlationId).toMatch(uuid);
    });
});
