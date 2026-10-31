import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, NoAudit, Public } from 'src/common/security/decorators';
import type { AppRequest, AuthUser } from 'src/common/security/types';
import { AuthService } from '../application/auth.service';
import { LoginDto, RefreshDto } from '../application/dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) { }

    // Login and refresh write their own audit rows (with the right actor) and must not log credentials.
    @Public()
    @NoAudit()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Exchange email + password for an access and refresh token' })
    login(@Body() dto: LoginDto, @Req() req: AppRequest) {
        return this.auth.login(dto.email, dto.password, { ip: req.ip, correlationId: req.correlationId });
    }

    @Public()
    @NoAudit()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Rotate the refresh token and get a new access token' })
    refresh(@Body() dto: RefreshDto, @Req() req: AppRequest) {
        return this.auth.refresh(dto.refreshToken, { ip: req.ip, correlationId: req.correlationId });
    }

    @Post('logout')
    @NoAudit()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Revoke a refresh token' })
    async logout(@Body() dto: RefreshDto): Promise<void> {
        await this.auth.logout(dto.refreshToken);
    }

    @Get('me')
    @ApiOperation({ summary: 'Current user with roles and permissions' })
    me(@CurrentUser() user: AuthUser) {
        return this.auth.me(user.id);
    }
}
