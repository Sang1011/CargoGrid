import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Page, paginate, buildOrderBy } from '../pagination/paginate';

export interface AuditEntry {
    actorId?: string | null;
    actorEmail?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    reason?: string | null;
    correlationId?: string | null;
    ipAddress?: string | null;
    statusCode?: number | null;
}

export interface AuditFilter {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    correlationId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

const SENSITIVE_KEY = /password|secret|token|authorization/i;

/** Deep-copies a value into JSON-safe form with credentials masked. */
export function redact(value: unknown): any {
    if (value === undefined || value === null) return null;
    const walk = (v: any): any => {
        if (Array.isArray(v)) return v.map(walk);
        if (v && typeof v === 'object') {
            if (typeof v.toJSON === 'function') return walk(v.toJSON());
            return Object.fromEntries(
                Object.entries(v).map(([k, val]) => [k, SENSITIVE_KEY.test(k) ? '[REDACTED]' : walk(val)]),
            );
        }
        return v;
    };
    return walk(value);
}

/**
 * Append-only by design: this class has create and read methods only, and no HTTP route
 * exposes anything but a read.
 */
@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private readonly prisma: PrismaService) { }

    /** Best effort: a failed audit write is logged loudly but never turns a committed request into an error. */
    async record(entry: AuditEntry): Promise<void> {
        try {
            await this.prisma.auditLog.create({ data: this.toData(entry) });
        } catch (err) {
            this.logger.error(`Audit write failed for ${entry.action}: ${(err as Error).message}`);
        }
    }

    /**
     * Writes the audit row through the caller's transaction client. Unlike `record`, a failure
     * propagates, so the business change and its audit trail commit or roll back together.
     */
    async recordInTransaction(tx: { auditLog: { create: (args: any) => Promise<unknown> } }, entry: AuditEntry): Promise<void> {
        await tx.auditLog.create({ data: this.toData(entry) });
    }

    private toData(entry: AuditEntry) {
        return {
            actorId: entry.actorId ?? null,
            actorEmail: entry.actorEmail ?? null,
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId ?? null,
            oldValue: redact(entry.oldValue) ?? undefined,
            newValue: redact(entry.newValue) ?? undefined,
            reason: entry.reason ?? null,
            correlationId: entry.correlationId ?? null,
            ipAddress: entry.ipAddress ?? null,
            statusCode: entry.statusCode ?? null,
        };
    }

    async list(filter: AuditFilter): Promise<Page<any>> {
        const where: Record<string, any> = {};
        if (filter.entityType) where.entityType = filter.entityType;
        if (filter.entityId) where.entityId = filter.entityId;
        if (filter.actorId) where.actorId = filter.actorId;
        if (filter.correlationId) where.correlationId = filter.correlationId;
        if (filter.from || filter.to) {
            where.createdAt = { ...(filter.from && { gte: filter.from }), ...(filter.to && { lte: filter.to }) };
        }
        return paginate(this.prisma.auditLog, {
            where,
            orderBy: buildOrderBy(filter.sortBy, filter.sortOrder, ['createdAt', 'action', 'entityType'], { createdAt: 'desc' }),
            page: filter.page,
            limit: filter.limit,
        });
    }
}
