jest.mock('src/prisma/prisma.service', () => ({ PrismaService: class { } }));

import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcryptjs';
import { AuthService, sha256 } from './auth.service';

const SECRET = 'unit-test-secret-0123456789';

const userRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'u1',
    email: 'ops@cargogrid.local',
    fullName: 'Ops',
    isActive: true,
    passwordHash: hashSync('correct-horse', 4),
    roles: [{ role: { name: 'ops_manager', permissions: [{ permission: { code: 'allocation.run' } }, { permission: { code: 'allocation.confirm' } }] } }],
    ...overrides,
});

function build(user: any = userRow()) {
    const tokens: any[] = [];
    const prisma: any = {
        user: { findUnique: jest.fn().mockResolvedValue(user), update: jest.fn().mockResolvedValue({}) },
        refreshToken: {
            create: jest.fn(async ({ data }: any) => { const row = { id: `t${tokens.length + 1}`, revokedAt: null, ...data }; tokens.push(row); return row; }),
            findUnique: jest.fn(async ({ where }: any) => tokens.find(t => t.tokenHash === where.tokenHash) ?? null),
            update: jest.fn(async ({ where, data }: any) => Object.assign(tokens.find(t => t.id === where.id)!, data)),
            updateMany: jest.fn(async ({ where, data }: any) => {
                tokens.filter(t => (!where.userId || t.userId === where.userId) && (!where.tokenHash || t.tokenHash === where.tokenHash) && t.revokedAt === null)
                    .forEach(t => Object.assign(t, data));
                return { count: 1 };
            }),
        },
    };
    const audit: any = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AuthService(prisma, new JwtService({ secret: SECRET }), audit);
    return { service, prisma, audit, tokens };
}

describe('AuthService', () => {
    beforeAll(() => { process.env.JWT_SECRET = SECRET; });

    describe('login', () => {
        it('returns a signed access token carrying roles and permissions, and stores only a hash of the refresh token', async () => {
            const { service, tokens } = build();

            const pair = await service.login('ops@cargogrid.local', 'correct-horse');
            const payload: any = new JwtService({ secret: SECRET }).decode(pair.accessToken);

            expect(payload).toMatchObject({ sub: 'u1', roles: ['ops_manager'], permissions: ['allocation.confirm', 'allocation.run'] });
            expect(tokens).toHaveLength(1);
            expect(tokens[0].tokenHash).toBe(sha256(pair.refreshToken));
            expect(JSON.stringify(tokens[0])).not.toContain(pair.refreshToken);
        });

        it('rejects a wrong password and audits the failure', async () => {
            const { service, audit } = build();

            await expect(service.login('ops@cargogrid.local', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
            expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.login_failed' }));
        });

        it('gives the same error for an unknown email', async () => {
            const { service } = build(null);
            await expect(service.login('nobody@x.y', 'whatever')).rejects.toThrow('Invalid credentials');
        });

        it('rejects a disabled account even with the right password', async () => {
            const { service } = build(userRow({ isActive: false }));
            await expect(service.login('ops@cargogrid.local', 'correct-horse')).rejects.toBeInstanceOf(UnauthorizedException);
        });
    });

    describe('refresh', () => {
        it('rotates: the old token stops working and a new pair is issued', async () => {
            const { service } = build();
            const first = await service.login('ops@cargogrid.local', 'correct-horse');

            const second = await service.refresh(first.refreshToken);

            expect(second.refreshToken).not.toBe(first.refreshToken);
            await expect(service.refresh(first.refreshToken)).rejects.toThrow('already used');
        });

        it('treats reuse of a spent token as theft and revokes every session of that user', async () => {
            const { service, tokens } = build();
            const first = await service.login('ops@cargogrid.local', 'correct-horse');
            const second = await service.refresh(first.refreshToken);

            await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);

            // the legitimate newer token is dead too
            await expect(service.refresh(second.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
            expect(tokens.every(t => t.revokedAt !== null)).toBe(true);
        });

        it('rejects an unknown token', async () => {
            const { service } = build();
            await expect(service.refresh('x'.repeat(40))).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('rejects an expired token', async () => {
            const { service, tokens } = build();
            const pair = await service.login('ops@cargogrid.local', 'correct-horse');
            tokens[0].expiresAt = new Date(Date.now() - 1000);

            await expect(service.refresh(pair.refreshToken)).rejects.toThrow('expired');
        });
    });

    it('logout revokes the token so it cannot be refreshed', async () => {
        const { service } = build();
        const pair = await service.login('ops@cargogrid.local', 'correct-horse');

        await service.logout(pair.refreshToken);

        await expect(service.refresh(pair.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
    });
});
