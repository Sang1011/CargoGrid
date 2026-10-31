import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './decorators';
import { AccessTokenPayload, AppRequest } from './types';
import { getJwtSecret } from './jwt-config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly jwt: JwtService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const request = context.switchToHttp().getRequest<AppRequest>();
        const [scheme, token] = (request.headers.authorization ?? '').split(' ');
        if (scheme?.toLowerCase() !== 'bearer' || !token) {
            throw new UnauthorizedException('Missing bearer token');
        }

        try {
            const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, { secret: getJwtSecret() });
            request.user = {
                id: payload.sub,
                email: payload.email,
                roles: payload.roles ?? [],
                permissions: payload.permissions ?? [],
            };
            return true;
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}
