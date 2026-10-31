import {
    BadRequestException,
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { AppRequest } from '../security/types';
import { IdempotencyService, hashRequest } from './idempotency.service';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const KEY_PATTERN = /^[\x21-\x7e]{1,128}$/;

/**
 * Same `Idempotency-Key` + same payload -> the first response is replayed and the handler is not run again.
 * Same key + different payload -> 422. Only applies to authenticated write requests that send the header.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(private readonly service: IdempotencyService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const http = context.switchToHttp();
        const req = http.getRequest<AppRequest>();
        const res = http.getResponse();

        const header = req.headers['idempotency-key'];
        const key = Array.isArray(header) ? header[0] : header;
        if (!key || !WRITE_METHODS.has(req.method) || !req.user) return next.handle();
        if (!KEY_PATTERN.test(key)) throw new BadRequestException('Idempotency-Key must be 1-128 printable characters');

        const userId = req.user.id;
        const path = (req.originalUrl ?? req.url ?? '').split('?')[0];
        const requestHash = hashRequest(req.method, path, req.body);

        return from(this.service.begin(userId, key, requestHash)).pipe(
            mergeMap(result => {
                if (result.state === 'replay') {
                    res.status(result.statusCode);
                    res.setHeader('Idempotent-Replayed', 'true');
                    return of(result.response ?? undefined);
                }
                return next.handle().pipe(
                    // A failed handler frees the key so the client can retry; a failed bookkeeping write
                    // keeps the key claimed (retries get 409) rather than risk running the handler twice.
                    catchError(err =>
                        from(this.service.release(userId, key)).pipe(mergeMap(() => throwError(() => err))),
                    ),
                    mergeMap(body =>
                        from(
                            this.service.complete(userId, key, res.statusCode, body === undefined ? undefined : JSON.parse(JSON.stringify(body))),
                        ).pipe(mergeMap(() => of(body))),
                    ),
                );
            }),
        );
    }
}
