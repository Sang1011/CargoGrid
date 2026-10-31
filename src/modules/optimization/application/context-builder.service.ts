import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OptimizationContext } from 'src/modules/algorithms/domain/types/optimization-context.type';
import { ProductCandidate, SlotCandidate } from 'src/modules/algorithms/domain/types/candidate.type';
import { DEFAULT_SCORING_WEIGHTS } from 'src/modules/algorithms/domain/types/scoring-weights.type';
import { OptimizationContextType, ZoneType, VehicleType } from 'src/common/enums';

@Injectable()
export class ContextBuilderService {
    constructor(private readonly prisma: PrismaService) {}

    async build(scenarioId: string, contextType: OptimizationContextType): Promise<OptimizationContext> {
        const scenario = await this.prisma.scenario.findUnique({ where: { id: scenarioId } });
        if (!scenario) {
            throw new NotFoundException(`Scenario ${scenarioId} not found`);
        }

        const [products, slots] = await Promise.all([
            this.loadProducts(scenarioId),
            this.loadSlots(scenarioId),
        ]);

        let maxDistanceM = 0;
        for (const slot of slots) {
            if (slot.distanceFromEntryM > maxDistanceM) {
                maxDistanceM = slot.distanceFromEntryM;
            }
        }

        return {
            scenarioId,
            contextType,
            products,
            slots,
            weights: DEFAULT_SCORING_WEIGHTS,
            maxDistanceM: maxDistanceM || 100,
        };
    }

    private async loadProducts(scenarioId: string): Promise<ProductCandidate[]> {
        const rows = await this.prisma.product.findMany({
            where: { scenarioId },
        });

        return rows.map(row => ({
            id: row.id,
            weightKg: Number(row.weightKg),
            volumeM3: Number(row.volumeM3),
            requiredZone: row.requiredZone as ZoneType | null,
            requiredTempMin: row.requiredTempMin ? Number(row.requiredTempMin) : null,
            requiredTempMax: row.requiredTempMax ? Number(row.requiredTempMax) : null,
            demandFrequency: row.demandFrequency,
            priority: row.priority as any,
            vehicleType: row.vehicleType as VehicleType,
        }));
    }

    private async loadSlots(scenarioId: string): Promise<SlotCandidate[]> {
        const warehouses = await this.prisma.warehouse.findMany({
            where: { scenarioId, isActive: true },
            select: { id: true, localX: true, localY: true },
        });

        const warehouseIds = warehouses.map(w => w.id);

        const gateNodes = await this.prisma.locationNode.findMany({
            where: {
                scenarioId,
                nodeType: { in: ['GATE', 'DOCK'] },
                isActive: true,
            },
            select: { warehouseId: true, localX: true, localY: true },
        });

        const gateMap = new Map<string, { localX: number; localY: number }>();
        for (const gate of gateNodes) {
            if (gate.warehouseId) {
                gateMap.set(gate.warehouseId, {
                    localX: Number(gate.localX ?? 0),
                    localY: Number(gate.localY ?? 0),
                });
            }
        }

        const warehouseCoordMap = new Map<string, { localX: number; localY: number }>();
        for (const w of warehouses) {
            warehouseCoordMap.set(w.id, {
                localX: Number(w.localX ?? 0),
                localY: Number(w.localY ?? 0),
            });
        }

        const rows = await this.prisma.storageSlot.findMany({
            where: {
                warehouseId: { in: warehouseIds },
                isActive: true,
            },
            include: {
                allowedVehicles: true,
                zone: { select: { tempMin: true, tempMax: true } },
            },
        });

        return rows.map(row => {
            const whCoord = warehouseCoordMap.get(row.warehouseId);
            const gateCoord = gateMap.get(row.warehouseId);

            let distanceFromEntryM: number;

            if (gateCoord) {
                const dx = Number(row.localX) - gateCoord.localX;
                const dy = Number(row.localY) - gateCoord.localY;
                distanceFromEntryM = Math.sqrt(dx * dx + dy * dy);
            } else if (whCoord) {
                const dx = Number(row.localX) - whCoord.localX;
                const dy = Number(row.localY) - whCoord.localY;
                distanceFromEntryM = Math.sqrt(dx * dx + dy * dy);
            } else {
                distanceFromEntryM = Math.sqrt(
                    Number(row.localX) * Number(row.localX) + Number(row.localY) * Number(row.localY),
                );
            }

            return {
                id: row.id,
                warehouseId: row.warehouseId,
                zoneType: row.zoneType as ZoneType,
                // Temperature range comes from the slot's zone; a zone without a
                // range means "no controlled temperature" (null).
                tempMin: row.zone?.tempMin != null ? Number(row.zone.tempMin) : null,
                tempMax: row.zone?.tempMax != null ? Number(row.zone.tempMax) : null,
                maxWeightKg: Number(row.maxWeightKg),
                currentWeightKg: Number(row.currentWeightKg),
                maxVolumeM3: Number(row.maxVolumeM3),
                currentVolumeM3: Number(row.currentVolumeM3),
                distanceFromEntryM,
                isBlocked: row.isBlocked,
                allowedVehicleTypes: row.allowedVehicles.map(
                    av => av.vehicleType as VehicleType,
                ),
            };
        });
    }
}
