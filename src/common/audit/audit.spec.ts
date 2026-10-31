jest.mock('src/prisma/prisma.service', () => ({ PrismaService: class { } }));

import { NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { NO_AUDIT_KEY } from '../security/decorators';
import { makeHttpContext } from '../security/test-helpers';
import { AuditInterceptor, delegateNameFor } from './audit.interceptor';
import { AuditService, redact } from './audit.service';

const flush = () => new Promise(resolve => setImmediate(resolve));

describe('redact', () => {
    it('masks credentials at any depth and leaves the rest alone', () => {
        expect(redact({ email: 'a@b.c', password: 'p', nested: { refreshToken: 't', list: [{ secretKey: 's', ok: 1 }] } }))
            .toEqual({ email: 'a@b.c', password: '[REDACTED]', nested: { refreshToken: '[REDACTED]', list: [{ secretKey: '[REDACTED]', ok: 1 }] } });
    });
    it('serialises Decimal-like values through toJSON', () => {
        expect(redact({ w: { toJSON: () => '12.5' } })).toEqual({ w: '12.5' });
    });
});

describe('delegateNameFor', () => {
    it.each([
        ['cargo-items', 'cargoItem'],
        ['warehouses', 'warehouse'],
        ['warehouse-incidents', 'warehouseIncident'],
        ['storage-slots', 'storageSlot'],
    ])('%s -> %s', (segment, expected) => expect(delegateNameFor(segment)).toBe(expected));
});

describe('AuditService', () => {
    it('never throws when the audit write fails', async () => {
        const prisma: any = { auditLog: { create: jest.fn().mockRejectedValue(new Error('db down')) } };
        await expect(new AuditService(prisma).record({ action: 'x', entityType: 'y' })).resolves.toBeUndefined();
    });

    it('exposes no way to change or delete an entry', () => {
        const methods = Object.getOwnPropertyNames(AuditService.prototype);
        expect(methods.filter(m => /update|delete|remove|destroy/i.test(m))).toEqual([]);
    });
});

describe('AuditInterceptor', () => {
    const setup = (oldRow: any = { id: 'c1', status: 'stored' }) => {
        const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
        const prisma = { cargoItem: { findUnique: jest.fn().mockResolvedValue(oldRow) } } as any;
        const reflector = new Reflector();
        const interceptor = new AuditInterceptor(audit, reflector, prisma);
        const run = async (req: any, handler: () => any, res: any = { statusCode: 200 }, fn: Function = function h() { }) => {
            const full = { ip: '10.0.0.1', correlationId: 'corr-1', headers: {}, user: { id: 'u1', email: 'u@x.y' }, ...req };
            return lastValueFrom(interceptor.intercept(makeHttpContext(full, res, fn), { handle: handler } as any));
        };
        return { audit, prisma, run };
    };

    it('does not audit reads', async () => {
        const { audit, run } = setup();
        await run({ method: 'GET', originalUrl: '/cargo-items' }, () => of([]));
        await flush();
        expect(audit.record).not.toHaveBeenCalled();
    });

    it('records one row for a create, with actor, correlation id and the new id from the response', async () => {
        const { audit, run } = setup();
        await run({ method: 'POST', originalUrl: '/cargo-items', params: {}, body: { barcode: 'B1' } }, () => of({ id: 'new-1' }), { statusCode: 201 });
        await flush();

        expect(audit.record).toHaveBeenCalledTimes(1);
        expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
            actorId: 'u1', actorEmail: 'u@x.y', action: 'POST /cargo-items', entityType: 'cargo-items',
            entityId: 'new-1', newValue: { barcode: 'B1' }, oldValue: null, correlationId: 'corr-1', statusCode: 201,
        }));
    });

    it('captures the previous state on update and delete', async () => {
        const { audit, prisma, run } = setup({ id: 'c1', status: 'stored' });
        await run({ method: 'PATCH', originalUrl: '/cargo-items/c1?x=1', params: { id: 'c1' }, body: { status: 'released' } }, () => of({ id: 'c1' }));
        await flush();

        expect(prisma.cargoItem.findUnique).toHaveBeenCalledWith({ where: { id: 'c1' } });
        expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
            entityId: 'c1', oldValue: { id: 'c1', status: 'stored' }, newValue: { status: 'released' },
        }));

        await run({ method: 'DELETE', originalUrl: '/cargo-items/c1', params: { id: 'c1' }, body: undefined }, () => of(undefined));
        await flush();
        expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({ newValue: null, oldValue: { id: 'c1', status: 'stored' } }));
    });

    it('records the status code of a failed write and still surfaces the error', async () => {
        const { audit, run } = setup();
        await expect(run({ method: 'PATCH', originalUrl: '/cargo-items/c1', params: { id: 'c1' }, body: {} },
            () => throwError(() => new NotFoundException()))).rejects.toBeInstanceOf(NotFoundException);
        await flush();
        expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });

    it('takes the reason from the X-Reason header', async () => {
        const { audit, run } = setup();
        await run({ method: 'POST', originalUrl: '/cargo-items', params: {}, body: {}, headers: { 'x-reason': 'damaged on arrival' } }, () => of({ id: '1' }));
        await flush();
        expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ reason: 'damaged on arrival' }));
    });

    it('skips handlers marked @NoAudit', async () => {
        const { audit, run } = setup();
        const handler = function login() { };
        Reflect.defineMetadata(NO_AUDIT_KEY, true, handler);

        await run({ method: 'POST', originalUrl: '/auth/login', params: {}, body: { password: 'secret' } }, () => of({}), { statusCode: 200 }, handler);
        await flush();
        expect(audit.record).not.toHaveBeenCalled();
    });
});
