import { ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

export type IdempotencyState =
    | { state: 'new' }
    | { state: 'replay'; statusCode: number; response: unknown };

const TTL_MS = 24 * 60 * 60 * 1000;

function stable(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`);
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value) ?? 'null';
}

export function hashRequest(method: string, path: string, body: unknown): string {
    return createHash('sha256').update(`${method}\n${path}\n${stable(body ?? {})}`).digest('hex');
}

@Injectable()
export class IdempotencyService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Claims the key atomically (unique on userId+key). Exactly one concurrent request gets `new`;
     * the others see the stored record.
     */
    async begin(userId: string, key: string, requestHash: string): Promise<IdempotencyState> {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                await this.prisma.idempotencyKey.create({
                    data: { userId, key, requestHash, expiresAt: new Date(Date.now() + TTL_MS) },
                });
                return { state: 'new' };
            } catch (err: any) {
                if (err?.code !== 'P2002') throw err;
            }

            const existing = await this.prisma.idempotencyKey.findUnique({ where: { userId_key: { userId, key } } });
            if (!existing) continue; // released between the two calls; try to claim again

            if (existing.expiresAt.getTime() < Date.now()) {
                await this.prisma.idempotencyKey.deleteMany({ where: { userId, key } });
                continue;
            }
            if (existing.requestHash !== requestHash) {
                throw new UnprocessableEntityException('Idempotency-Key was already used with a different request');
            }
            if (existing.statusCode === null) {
                throw new ConflictException('A request with this Idempotency-Key is still being processed');
            }
            return { state: 'replay', statusCode: existing.statusCode, response: existing.response };
        }
        throw new ConflictException('Could not claim the Idempotency-Key, please retry');
    }

    async complete(userId: string, key: string, statusCode: number, response: unknown): Promise<void> {
        await this.prisma.idempotencyKey.update({
            where: { userId_key: { userId, key } },
            data: { statusCode, response: response === undefined || response === null ? undefined : (response as any) },
        });
    }

    /** Frees the key after a failed request so the client can retry with the same one. */
    async release(userId: string, key: string): Promise<void> {
        await this.prisma.idempotencyKey.deleteMany({ where: { userId, key } });
    }
}
