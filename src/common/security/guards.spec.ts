import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from './decorators';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { makeHttpContext } from './test-helpers';

const SECRET = 'unit-test-secret-0123456789';
const reflectorWith = (meta: Record<string, unknown>) =>
    ({ getAllAndOverride: (key: string) => meta[key] }) as unknown as Reflector;

describe('JwtAuthGuard', () => {
    const jwt = new JwtService({ secret: SECRET });
    beforeAll(() => { process.env.JWT_SECRET = SECRET; });

    it('lets @Public routes through without a token', async () => {
        const guard = new JwtAuthGuard(reflectorWith({ [IS_PUBLIC_KEY]: true }), jwt);
        await expect(guard.canActivate(makeHttpContext({ headers: {} }))).resolves.toBe(true);
    });

    it('rejects a missing token with 401', async () => {
        const guard = new JwtAuthGuard(reflectorWith({}), jwt);
        await expect(guard.canActivate(makeHttpContext({ headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a malformed or wrongly signed token with 401', async () => {
        const guard = new JwtAuthGuard(reflectorWith({}), jwt);
        const forged = await new JwtService({ secret: 'another-secret-0123456789' }).signAsync({ sub: 'x' });
        for (const header of ['Bearer nope', `Bearer ${forged}`, 'Basic abc']) {
            await expect(guard.canActivate(makeHttpContext({ headers: { authorization: header } })))
                .rejects.toBeInstanceOf(UnauthorizedException);
        }
    });

    it('rejects an expired token with 401', async () => {
        const guard = new JwtAuthGuard(reflectorWith({}), jwt);
        const expired = await jwt.signAsync({ sub: 'u1' }, { expiresIn: -10 });
        await expect(guard.canActivate(makeHttpContext({ headers: { authorization: `Bearer ${expired}` } })))
            .rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('attaches the user from a valid token', async () => {
        const guard = new JwtAuthGuard(reflectorWith({}), jwt);
        const token = await jwt.signAsync({ sub: 'u1', email: 'a@b.c', roles: ['admin'], permissions: ['x.read'] });
        const req: any = { headers: { authorization: `Bearer ${token}` } };

        await expect(guard.canActivate(makeHttpContext(req))).resolves.toBe(true);
        expect(req.user).toEqual({ id: 'u1', email: 'a@b.c', roles: ['admin'], permissions: ['x.read'] });
    });
});

describe('PermissionsGuard', () => {
    const ctx = (permissions: string[]) => makeHttpContext({ user: { id: 'u', email: 'e', roles: [], permissions } });

    it('allows a route with no permission metadata', () => {
        expect(new PermissionsGuard(reflectorWith({})).canActivate(ctx([]))).toBe(true);
    });

    it('allows when the user holds the permission', () => {
        const guard = new PermissionsGuard(reflectorWith({ [PERMISSIONS_KEY]: ['cargo-items.read'] }));
        expect(guard.canActivate(ctx(['cargo-items.read']))).toBe(true);
    });

    it('rejects with 403 when the permission is missing', () => {
        const guard = new PermissionsGuard(reflectorWith({ [PERMISSIONS_KEY]: ['cargo-items.write'] }));
        expect(() => guard.canActivate(ctx(['cargo-items.read']))).toThrow(ForbiddenException);
    });

    it('lets someone with allocation.run propose but not confirm', () => {
        const run = new PermissionsGuard(reflectorWith({ [PERMISSIONS_KEY]: ['allocation.run'] }));
        const confirm = new PermissionsGuard(reflectorWith({ [PERMISSIONS_KEY]: ['allocation.confirm'] }));
        const user = ctx(['allocation.run']);

        expect(run.canActivate(user)).toBe(true);
        expect(() => confirm.canActivate(user)).toThrow(ForbiddenException);
    });

    it('requires every listed permission', () => {
        const guard = new PermissionsGuard(reflectorWith({ [PERMISSIONS_KEY]: ['a.read', 'b.read'] }));
        expect(() => guard.canActivate(ctx(['a.read']))).toThrow(ForbiddenException);
    });
});
