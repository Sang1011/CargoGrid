jest.mock('src/prisma/prisma.service', () => ({ PrismaService: class {} }));
import { ContextBuilderService } from './context-builder.service';
import { OptimizationContextType } from 'src/common/enums';

const slotRow = (id: string, zone: { tempMin: any; tempMax: any } | null, zoneType = 'cold') => ({
    id,
    warehouseId: 'w1',
    zoneType,
    localX: 10,
    localY: 0,
    maxWeightKg: 500,
    currentWeightKg: 0,
    maxVolumeM3: 5,
    currentVolumeM3: 0,
    isBlocked: false,
    allowedVehicles: [{ vehicleType: 'forklift' }],
    zone,
});

const buildService = (slots: any[]) => {
    const prisma = {
        scenario: { findUnique: jest.fn().mockResolvedValue({ id: 'sc1' }) },
        product: { findMany: jest.fn().mockResolvedValue([]) },
        warehouse: { findMany: jest.fn().mockResolvedValue([{ id: 'w1', localX: 0, localY: 0 }]) },
        locationNode: { findMany: jest.fn().mockResolvedValue([]) },
        storageSlot: { findMany: jest.fn().mockResolvedValue(slots) },
        warehouseIncident: { findMany: jest.fn().mockResolvedValue([]) },
        slotReservation: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const routes = { routesFrom: jest.fn().mockResolvedValue(null) };
    return { prisma, service: new ContextBuilderService(prisma as any, routes as any) };
};

describe('ContextBuilderService — slot temperature', () => {
    it('asks Prisma to load the zone temperature range with each slot', async () => {
        const { prisma, service } = buildService([]);

        await service.build('sc1', OptimizationContextType.INBOUND);

        expect(prisma.storageSlot.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                include: expect.objectContaining({
                    zone: { select: { tempMin: true, tempMax: true } },
                }),
            }),
        );
    });

    it('copies the zone temperature range onto the slot candidate (Decimal-like values)', async () => {
        // Prisma returns Decimal objects; Number() must handle them.
        const decimal = (n: number) => ({ toString: () => String(n), valueOf: () => n });
        const { service } = buildService([slotRow('s1', { tempMin: decimal(-10), tempMax: decimal(10) })]);

        const ctx = await service.build('sc1', OptimizationContextType.INBOUND);

        expect(ctx.slots[0].tempMin).toBe(-10);
        expect(ctx.slots[0].tempMax).toBe(10);
    });

    it('keeps 0 as a real temperature instead of treating it as missing', async () => {
        const { service } = buildService([slotRow('s1', { tempMin: 0, tempMax: 0 })]);

        const ctx = await service.build('sc1', OptimizationContextType.INBOUND);

        expect(ctx.slots[0].tempMin).toBe(0);
        expect(ctx.slots[0].tempMax).toBe(0);
    });

    it('leaves the range null when the zone has none', async () => {
        const { service } = buildService([
            slotRow('s1', { tempMin: null, tempMax: null }, 'normal'),
            slotRow('s2', null, 'normal'),
        ]);

        const ctx = await service.build('sc1', OptimizationContextType.INBOUND);

        for (const slot of ctx.slots) {
            expect(slot.tempMin).toBeNull();
            expect(slot.tempMax).toBeNull();
        }
    });
});
