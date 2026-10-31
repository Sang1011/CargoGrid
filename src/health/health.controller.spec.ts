jest.mock('src/prisma/prisma.service', () => ({ PrismaService: class {} }));
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
    it('reports ok when the database answers', async () => {
        const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
        const controller = new HealthController(prisma as any);

        const result = await controller.check();

        expect(result.status).toBe('ok');
        expect(result.database).toBe('up');
        expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('returns 503 when the database is down', async () => {
        const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')) };
        const controller = new HealthController(prisma as any);

        await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
});
