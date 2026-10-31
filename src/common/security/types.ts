import type { Request } from 'express';

export interface AuthUser {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
}

export interface AppRequest extends Request {
    user?: AuthUser;
    correlationId?: string;
}

export interface AccessTokenPayload {
    sub: string;
    email: string;
    roles: string[];
    permissions: string[];
}
