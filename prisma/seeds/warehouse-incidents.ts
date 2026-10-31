import { PrismaClient } from '@prisma/client';
import type { WarehouseSeed } from './warehouses';

export async function seedWarehouseIncidents(prisma: PrismaClient, warehouses: WarehouseSeed) {
  const incident1 = await prisma.warehouseIncident.create({
    data: {
      warehouseId: warehouses.warehouse1.id,
      incidentType: 'temperature_failure',
      severity: 'critical',
      status: 'open',
      title: 'Cooling System Failure in Zone A2',
      description: 'Main cooling unit malfunction detected. Temperature rising above threshold.',
      affectedTempC: 35.5,
      safeDurationMinutes: 45,
      occurredAt: new Date('2024-11-15T14:30:00Z'),
      estimatedDowntimeHours: 4,
      reportedBy: 'John Doe',
    },
  });

  const incident2 = await prisma.warehouseIncident.create({
    data: {
      warehouseId: warehouses.warehouse2.id,
      incidentType: 'power_outage',
      severity: 'high',
      status: 'open',
      title: 'Power Outage in Cold Storage B',
      description: 'Electrical fault causing intermittent power loss',
      affectedTempC: 8.0,
      safeDurationMinutes: null,
      occurredAt: new Date('2024-11-16T09:00:00Z'),
      estimatedDowntimeHours: 2,
      reportedBy: 'Jane Smith',
    },
  });

  const incident3 = await prisma.warehouseIncident.create({
    data: {
      warehouseId: warehouses.warehouse1.id,
      incidentType: 'equipment_failure',
      severity: 'low',
      status: 'closed',
      title: 'Broken Pallet Rack',
      description: 'Minor damage to pallet rack in aisle 3 - resolved same day',
      occurredAt: new Date('2024-10-01T08:00:00Z'),
      resolvedAt: new Date('2024-10-01T16:00:00Z'),
      estimatedDowntimeHours: 0,
      reportedBy: 'Mike Johnson',
    },
  });

  return { incident1, incident2, incident3 };
}

export type WarehouseIncidentSeed = Awaited<ReturnType<typeof seedWarehouseIncidents>>;
