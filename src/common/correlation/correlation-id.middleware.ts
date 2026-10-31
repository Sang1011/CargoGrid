import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Response } from 'express';
import { AppRequest } from '../security/types';

export const CORRELATION_HEADER = 'x-correlation-id';
const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;

/** Reuses a well-formed incoming id so a call can be traced across systems; otherwise generates one. */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
    use(req: AppRequest, res: Response, next: NextFunction): void {
        const incoming = req.headers[CORRELATION_HEADER];
        const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
        const id = candidate && SAFE_ID.test(candidate) ? candidate : randomUUID();
        req.correlationId = id;
        res.setHeader(CORRELATION_HEADER, id);
        next();
    }
}
