import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { AppRequest, AuthUser } from './types';

export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSIONS_KEY = 'requiredPermissions';
export const NO_AUDIT_KEY = 'noAudit';

/** Skips authentication (login, health, docs). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** The caller must hold ALL listed permissions. */
export const RequirePermission = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

/** The handler writes its own audit entry, or must not be audited automatically. */
export const NoAudit = () => SetMetadata(NO_AUDIT_KEY, true);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    return ctx.switchToHttp().getRequest<AppRequest>().user;
});
