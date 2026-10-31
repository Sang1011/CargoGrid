import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditController } from '../audit/audit.controller';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditService } from '../audit/audit.service';
import { IdempotencyInterceptor } from '../idempotency/idempotency.interceptor';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { accessTokenTtlSeconds, getJwtSecret } from './jwt-config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';

/**
 * Cross-cutting concerns applied to every route: authentication, permission checks,
 * idempotent replay and the audit trail. Order matters: guards run before interceptors,
 * and the idempotency interceptor wraps the audit one so a replay is not audited twice.
 */
@Global()
@Module({
    imports: [
        PrismaModule,
        JwtModule.registerAsync({
            useFactory: () => ({ secret: getJwtSecret(), signOptions: { expiresIn: accessTokenTtlSeconds() } }),
        }),
    ],
    controllers: [AuditController],
    providers: [
        AuditService,
        IdempotencyService,
        JwtAuthGuard,
        PermissionsGuard,
        { provide: APP_GUARD, useExisting: JwtAuthGuard },
        { provide: APP_GUARD, useExisting: PermissionsGuard },
        { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
        { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    ],
    exports: [AuditService, IdempotencyService, JwtModule],
})
export class SecurityModule { }
