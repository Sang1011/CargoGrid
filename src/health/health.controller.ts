import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/security/decorators';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    @ApiOperation({ summary: 'Liveness and database connectivity check' })
    @ApiResponse({ status: 200, description: 'API and database are reachable' })
    @ApiResponse({ status: 503, description: 'Database is not reachable' })
    async check(): Promise<{ status: 'ok'; database: 'up'; uptimeSeconds: number }> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
        } catch {
            throw new ServiceUnavailableException({ status: 'error', database: 'down' });
        }
        return { status: 'ok', database: 'up', uptimeSeconds: Math.round(process.uptime()) };
    }
}
