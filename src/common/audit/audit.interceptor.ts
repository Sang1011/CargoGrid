import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError, mergeMap, tap } from 'rxjs/operators';
import { PrismaService } from 'src/prisma/prisma.service';
import { NO_AUDIT_KEY } from '../security/decorators';
import { AppRequest } from '../security/types';
import { AuditService } from './audit.service';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** 'cargo-items' -> 'cargoItem' (the Prisma delegate name), or null if there is nothing to look up. */
export function delegateNameFor(segment: string): string | null {
    if (!segment) return null;
    const singular = segment.endsWith('s') ? segment.slice(0, -1) : segment;
    return singular.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Writes one audit row per successful or failed write request. For PATCH/PUT/DELETE on /<resource>/:id
 * it reads the row first so `oldValue` is captured.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(
        private readonly audit: AuditService,
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const http = context.switchToHttp();
        const req = http.getRequest<AppRequest>();
        if (!WRITE_METHODS.has(req.method)) return next.handle();
        if (this.reflector.getAllAndOverride<boolean>(NO_AUDIT_KEY, [context.getHandler(), context.getClass()])) {
            return next.handle();
        }

        const res = http.getResponse();
        const path = (req.originalUrl ?? req.url ?? '').split('?')[0];
        const segments = path.split('/').filter(Boolean);
        const entityType = segments[0] ?? 'unknown';
        const rawId = req.params?.id;
        const entityId: string | undefined = Array.isArray(rawId) ? rawId[0] : rawId;

        const base = {
            actorId: req.user?.id ?? null,
            actorEmail: req.user?.email ?? null,
            action: `${req.method} /${segments.join('/')}`,
            entityType,
            reason: this.header(req, 'x-reason'),
            correlationId: req.correlationId ?? null,
            ipAddress: req.ip ?? null,
        };

        return from(this.loadOldValue(req.method, entityType, entityId)).pipe(
            mergeMap(oldValue =>
                next.handle().pipe(
                    tap(body => {
                        void this.audit.record({
                            ...base,
                            entityId: entityId ?? body?.id ?? null,
                            oldValue,
                            newValue: req.method === 'DELETE' ? null : req.body,
                            statusCode: res.statusCode,
                        });
                    }),
                    catchError(err => {
                        void this.audit.record({
                            ...base,
                            entityId: entityId ?? null,
                            oldValue,
                            newValue: req.body,
                            statusCode: err instanceof HttpException ? err.getStatus() : 500,
                        });
                        return throwError(() => err);
                    }),
                ),
            ),
        );
    }

    private header(req: AppRequest, name: string): string | null {
        const v = req.headers[name];
        const value = Array.isArray(v) ? v[0] : v;
        return value ? value.slice(0, 500) : null;
    }

    private async loadOldValue(method: string, entityType: string, id?: string): Promise<unknown> {
        if (!id || method === 'POST') return null;
        const name = delegateNameFor(entityType);
        const delegate = name ? (this.prisma as any)[name] : undefined;
        if (!delegate?.findUnique) return null;
        try {
            return await delegate.findUnique({ where: { id } });
        } catch {
            return null;
        }
    }
}
