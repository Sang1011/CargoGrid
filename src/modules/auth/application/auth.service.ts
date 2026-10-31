import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash, hashSync } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { AuditService } from 'src/common/audit/audit.service';
import { accessTokenTtlSeconds, getJwtSecret, refreshTokenTtlDays } from 'src/common/security/jwt-config';
import { AccessTokenPayload, AuthUser } from 'src/common/security/types';
import { PrismaService } from 'src/prisma/prisma.service';

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
}

export interface RequestMeta {
    ip?: string | null;
    correlationId?: string | null;
}

const userWithRoles = {
    roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
} as const;

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
export const bcryptRounds = (): number => Number(process.env.BCRYPT_ROUNDS) || 10;

// Compared against when the email is unknown, so "no such user" and "wrong password" cost the same time.
const DUMMY_HASH = hashSync('not-a-real-password', 10);

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        private readonly audit: AuditService,
    ) { }

    hashPassword(plain: string): Promise<string> {
        return hash(plain, bcryptRounds());
    }

    async login(email: string, password: string, meta: RequestMeta = {}): Promise<TokenPair> {
        const user = await this.prisma.user.findUnique({ where: { email }, include: userWithRoles });
        const ok = await compare(password, user?.passwordHash ?? DUMMY_HASH);

        if (!user || !user.isActive || !ok) {
            await this.audit.record({
                actorId: user?.id ?? null,
                actorEmail: email,
                action: 'auth.login_failed',
                entityType: 'auth',
                correlationId: meta.correlationId,
                ipAddress: meta.ip,
                statusCode: 401,
            });
            throw new UnauthorizedException('Invalid credentials');
        }

        await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await this.audit.record({
            actorId: user.id,
            actorEmail: user.email,
            action: 'auth.login',
            entityType: 'auth',
            correlationId: meta.correlationId,
            ipAddress: meta.ip,
            statusCode: 200,
        });
        return this.issueTokens(user);
    }

    /** Rotating refresh: each token works once. Presenting a spent token revokes the user's whole session set. */
    async refresh(refreshToken: string, meta: RequestMeta = {}): Promise<TokenPair> {
        const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
        if (!stored) throw new UnauthorizedException('Invalid refresh token');

        if (stored.revokedAt) {
            await this.prisma.refreshToken.updateMany({
                where: { userId: stored.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            await this.audit.record({
                actorId: stored.userId,
                action: 'auth.refresh_reuse_detected',
                entityType: 'auth',
                correlationId: meta.correlationId,
                ipAddress: meta.ip,
                statusCode: 401,
            });
            throw new UnauthorizedException('Refresh token already used');
        }
        if (stored.expiresAt.getTime() < Date.now()) throw new UnauthorizedException('Refresh token expired');

        const user = await this.prisma.user.findUnique({ where: { id: stored.userId }, include: userWithRoles });
        if (!user || !user.isActive) throw new UnauthorizedException('Account disabled');

        const pair = await this.issueTokens(user);
        const next = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(pair.refreshToken) } });
        await this.prisma.refreshToken.update({
            where: { id: stored.id },
            data: { revokedAt: new Date(), replacedById: next?.id ?? null },
        });
        return pair;
    }

    async logout(refreshToken: string): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { tokenHash: sha256(refreshToken), revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }

    async me(userId: string): Promise<{ id: string; email: string; fullName: string; roles: string[]; permissions: string[] }> {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, include: userWithRoles });
        if (!user) throw new UnauthorizedException();
        const { roles, permissions } = this.flatten(user);
        return { id: user.id, email: user.email, fullName: user.fullName, roles, permissions };
    }

    private flatten(user: any): { roles: string[]; permissions: string[] } {
        const roles: string[] = user.roles.map((ur: any) => ur.role.name);
        const permissions = new Set<string>();
        for (const ur of user.roles) for (const rp of ur.role.permissions) permissions.add(rp.permission.code);
        return { roles, permissions: [...permissions].sort() };
    }

    private async issueTokens(user: any): Promise<TokenPair> {
        const { roles, permissions } = this.flatten(user);
        const payload: AccessTokenPayload = { sub: user.id, email: user.email, roles, permissions };
        const accessToken = await this.jwt.signAsync(payload, {
            secret: getJwtSecret(),
            expiresIn: accessTokenTtlSeconds(),
        });

        const refreshToken = randomBytes(48).toString('base64url');
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: sha256(refreshToken),
                expiresAt: new Date(Date.now() + refreshTokenTtlDays() * 24 * 60 * 60 * 1000),
            },
        });
        return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: accessTokenTtlSeconds() };
    }
}

export type { AuthUser };
