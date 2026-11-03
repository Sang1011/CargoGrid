import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IncidentSuggestion, SUGGESTION_WINDOW_MINUTES, suggestIncidents } from '../domain/incident-suggestions';

@Injectable()
export class IncidentSuggestionService {
    constructor(private readonly prisma: PrismaService) { }

    async forWarehouse(warehouseId: string, now: Date = new Date()): Promise<{ windowMinutes: number; suggestions: IncidentSuggestion[] }> {
        const warehouse = await this.prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { id: true } });
        if (!warehouse) throw new NotFoundException(`Warehouse ${warehouseId} not found`);

        const since = new Date(now.getTime() - SUGGESTION_WINDOW_MINUTES * 60_000);
        const [zones, readings, open] = await Promise.all([
            this.prisma.zone.findMany({ where: { warehouseId }, select: { id: true, name: true, tempMin: true, tempMax: true } }),
            this.prisma.warehouseSensorReading.findMany({ where: { warehouseId, recordedAt: { gte: since, lte: now } }, select: { zoneId: true, temperatureC: true, recordedAt: true } }),
            this.prisma.warehouseIncident.findMany({ where: { warehouseId, status: { in: ['open', 'resolving'] } }, select: { incidentType: true, severity: true } }),
        ]);

        return {
            windowMinutes: SUGGESTION_WINDOW_MINUTES,
            suggestions: suggestIncidents(
                zones.map(z => ({ id: z.id, name: z.name, tempMin: z.tempMin === null ? null : Number(z.tempMin), tempMax: z.tempMax === null ? null : Number(z.tempMax) })),
                readings.map(r => ({ zoneId: r.zoneId, temperatureC: r.temperatureC === null ? null : Number(r.temperatureC), recordedAt: r.recordedAt })),
                open,
                now,
            ),
        };
    }
}
