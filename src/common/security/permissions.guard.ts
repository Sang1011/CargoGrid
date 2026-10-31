import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from './decorators';
import { AppRequest } from './types';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const targets = [context.getHandler(), context.getClass()];
        if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

        const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, targets);
        if (!required || required.length === 0) return true; // authenticated is enough

        const user = context.switchToHttp().getRequest<AppRequest>().user;
        const owned = new Set(user?.permissions ?? []);
        const missing = required.filter(p => !owned.has(p));
        if (missing.length > 0) {
            throw new ForbiddenException(`Missing permission: ${missing.join(', ')}`);
        }
        return true;
    }
}
