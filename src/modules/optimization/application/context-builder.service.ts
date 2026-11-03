import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OptimizationContext } from 'src/modules/algorithms/domain/types/optimization-context.type';
import { ProductCandidate, RouteInfo, RouteTable, SlotCandidate } from 'src/modules/algorithms/domain/types/candidate.type';
import { DEFAULT_SCORING_WEIGHTS } from 'src/modules/algorithms/domain/types/scoring-weights.type';
import { OptimizationContextType, ZoneType, VehicleType } from 'src/common/enums';
import { RouteService } from 'src/modules/route/application/route.service';

export interface BuildOptions {
    /** InboundShipment (inbound) or TransferOrder (transfer). Without it the whole product catalogue is used. */
    contextId?: string;
    seed?: number;
    /** Cargo item id -> position in the order it must be placed (lower first). Used by evacuations. */
    cargoRank?: ReadonlyMap<string, number>;
}

const OPEN_MOVEMENT = ['created', 'reserved', 'in_transit'] as const;

@Injectable()
export class ContextBuilderService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly routes: RouteService,
    ) {}

    async build(scenarioId: string, contextType: OptimizationContextType, options: BuildOptions = {}): Promise<OptimizationContext> {
        const scenario = await this.prisma.scenario.findUnique({ where: { id: scenarioId } });
        if (!scenario) {
            throw new NotFoundException(`Scenario ${scenarioId} not found`);
        }

        const notes: string[] = [];
        const lot = options.contextId ? await this.loadLot(scenarioId, contextType, options.contextId) : null;

        const [products, loaded] = await Promise.all([
            lot ? this.loadCargo(scenarioId, lot.cargoItemIds, options.cargoRank) : this.loadProducts(scenarioId),
            this.loadSlots(scenarioId, notes),
        ]);

        // A transfer must leave the warehouse it starts from (that is its whole purpose).
        const slots = lot?.excludeWarehouseId
            ? loaded.slots.filter(s => s.warehouseId !== lot.excludeWarehouseId)
            : loaded.slots;
        if (lot?.excludeWarehouseId) notes.push('Slots of the source warehouse are excluded');

        await this.attachRoutes(scenarioId, products, slots, loaded, lot?.originNodeId ?? null, notes);

        let maxDistanceM = 0;
        for (const slot of slots) {
            if (slot.distanceFromEntryM > maxDistanceM) {
                maxDistanceM = slot.distanceFromEntryM;
            }
        }

        return {
            scenarioId,
            contextType,
            contextId: options.contextId,
            products,
            slots,
            weights: DEFAULT_SCORING_WEIGHTS,
            maxDistanceM: maxDistanceM || 100,
            seed: options.seed,
            notes,
        };
    }

    // ─── the lot being allocated ────────────────────────────────────────────

    private async loadLot(scenarioId: string, contextType: OptimizationContextType, contextId: string): Promise<{
        cargoItemIds: string[];
        originNodeId: string | null;
        excludeWarehouseId: string | null;
    }> {
        let cargoItemIds: string[];
        let originNodeId: string | null = null;
        let excludeWarehouseId: string | null = null;

        if (contextType === OptimizationContextType.INBOUND) {
            const shipment = await this.prisma.inboundShipment.findUnique({
                where: { id: contextId },
                include: { shipmentItems: { select: { cargoItemId: true } } },
            });
            if (!shipment || shipment.scenarioId !== scenarioId) throw new NotFoundException(`Inbound shipment ${contextId} not found in this scenario`);
            cargoItemIds = shipment.shipmentItems.map(i => i.cargoItemId);
            originNodeId = shipment.entryNodeId;
        } else if (contextType === OptimizationContextType.TRANSFER) {
            const order = await this.prisma.transferOrder.findUnique({
                where: { id: contextId },
                include: { items: { select: { cargoItemId: true } } },
            });
            if (!order || order.scenarioId !== scenarioId) throw new NotFoundException(`Transfer order ${contextId} not found in this scenario`);
            cargoItemIds = order.items.map(i => i.cargoItemId);
            excludeWarehouseId = order.fromWarehouseId;
            const nodes = await this.prisma.locationNode.findMany({
                where: { scenarioId, warehouseId: order.fromWarehouseId, isActive: true },
                select: { id: true, nodeType: true },
            });
            originNodeId = pickWarehouseNode(nodes)?.id ?? null;
        } else {
            throw new UnprocessableEntityException(`contextId is only supported for inbound and transfer, not ${contextType}`);
        }

        if (cargoItemIds.length === 0) throw new UnprocessableEntityException('This lot has no cargo items to allocate');

        const busy = await this.prisma.movement.findMany({
            where: { cargoItemId: { in: cargoItemIds }, status: { in: [...OPEN_MOVEMENT] } },
            select: { cargoItemId: true },
        });
        if (busy.length > 0) {
            throw new ConflictException(`${busy.length} cargo item(s) of this lot already have an open movement: ${busy.slice(0, 5).map(b => b.cargoItemId).join(', ')}`);
        }

        return { cargoItemIds, originNodeId, excludeWarehouseId };
    }

    private async loadCargo(scenarioId: string, cargoItemIds: string[], rank?: ReadonlyMap<string, number>): Promise<ProductCandidate[]> {
        const rows = await this.prisma.cargoItem.findMany({
            where: { id: { in: cargoItemIds }, scenarioId },
            include: { product: true },
            orderBy: { id: 'asc' },
        });
        return rows.map(row => ({
            ...this.toCandidate(row.product),
            id: row.id,
            productId: row.productId,
            cargoItemId: row.id,
            rank: rank?.get(row.id),
            weightKg: Number(row.actualWeightKg ?? row.product.weightKg),
            volumeM3: Number(row.actualVolumeM3 ?? row.product.volumeM3),
        }));
    }

    private async loadProducts(scenarioId: string): Promise<ProductCandidate[]> {
        const rows = await this.prisma.product.findMany({
            where: { scenarioId },
        });

        return rows.map(row => this.toCandidate(row));
    }

    private toCandidate(row: any): ProductCandidate {
        return {
            id: row.id,
            weightKg: Number(row.weightKg),
            volumeM3: Number(row.volumeM3),
            requiredZone: row.requiredZone as ZoneType | null,
            requiredTempMin: row.requiredTempMin !== null && row.requiredTempMin !== undefined ? Number(row.requiredTempMin) : null,
            requiredTempMax: row.requiredTempMax !== null && row.requiredTempMax !== undefined ? Number(row.requiredTempMax) : null,
            demandFrequency: row.demandFrequency,
            priority: row.priority as any,
            vehicleType: row.vehicleType as VehicleType,
        };
    }

    // ─── routes (BR-10) ─────────────────────────────────────────────────────

    /**
     * Gives each product the cost of reaching every slot by road from the lot's entry point, one
     * Dijkstra per vehicle type. Without an entry point or a road graph the straight-line distance
     * stays in use, and the notes say so.
     */
    private async attachRoutes(
        scenarioId: string,
        products: ProductCandidate[],
        slots: SlotCandidate[],
        loaded: LoadedSlots,
        originNodeId: string | null,
        notes: string[],
    ): Promise<void> {
        const origin = originNodeId ?? (await this.defaultOrigin(scenarioId));
        if (!origin) {
            notes.push('No entry node: movement cost uses straight-line distance, no route checks');
            return;
        }

        const tables = new Map<string, RouteTable | null>();
        for (const vehicleType of new Set(products.map(p => p.vehicleType))) {
            const tree = await this.routes.routesFrom(scenarioId, origin, vehicleType);
            if (!tree) { tables.set(vehicleType, null); continue; }

            const bySlot = new Map<string, RouteInfo | null>();
            let scale = 0;
            for (const slot of slots) {
                const own = loaded.slotNode.get(slot.id);
                const target = own ?? loaded.warehouseNode.get(slot.warehouseId);
                const hop = target ? tree.to(target) : null;
                if (!hop) { bySlot.set(slot.id, null); continue; }
                // Inside the warehouse the road graph stops; the walk to the shelf is the straight-line leg.
                const leg = own ? 0 : slot.distanceFromEntryM;
                const info: RouteInfo = {
                    costM: Math.round((hop.totalCost + leg) * 100) / 100,
                    distanceM: Math.round((hop.distanceM + leg) * 100) / 100,
                    path: hop.nodePath,
                    warnings: hop.warnings,
                };
                bySlot.set(slot.id, info);
                scale = Math.max(scale, info.costM);
            }
            tables.set(vehicleType, { bySlot, scale: scale || 1 });
        }

        if ([...tables.values()].every(t => t === null)) {
            notes.push('Entry node is not on the road graph: movement cost uses straight-line distance, no route checks');
            return;
        }
        for (const p of products) p.routes = tables.get(p.vehicleType) ?? undefined;
    }

    /** With no lot-specific entry, the scenario's only PORT/GATE node is used when it is unambiguous. */
    private async defaultOrigin(scenarioId: string): Promise<string | null> {
        const nodes = await this.prisma.locationNode.findMany({
            where: { scenarioId, isActive: true, nodeType: { in: ['PORT', 'GATE'] }, warehouseId: null },
            select: { id: true, nodeType: true },
            orderBy: { id: 'asc' },
        });
        const ports = nodes.filter(n => n.nodeType === 'PORT');
        const pool = ports.length > 0 ? ports : nodes;
        return pool.length === 1 ? pool[0].id : null;
    }

    // ─── slots ──────────────────────────────────────────────────────────────

    private async loadSlots(scenarioId: string, notes: string[]): Promise<LoadedSlots> {
        const warehouses = await this.prisma.warehouse.findMany({
            where: { scenarioId, isActive: true },
            select: { id: true, localX: true, localY: true },
        });

        const warehouseIds = warehouses.map(w => w.id);

        // BR-13: a warehouse with an open serious incident takes no new cargo.
        const incidents = await this.prisma.warehouseIncident.findMany({
            where: { warehouseId: { in: warehouseIds }, status: { in: ['open', 'resolving'] }, severity: { in: ['high', 'critical'] } },
            select: { warehouseId: true },
        });
        const closed = new Set(incidents.map(i => i.warehouseId));
        if (closed.size > 0) notes.push(`${closed.size} warehouse(s) excluded: open high/critical incident`);

        const nodes = await this.prisma.locationNode.findMany({
            where: { scenarioId, isActive: true },
            select: { id: true, warehouseId: true, slotId: true, nodeType: true, localX: true, localY: true },
        });

        const warehouseNode = new Map<string, string>();
        const slotNode = new Map<string, string>();
        const byWarehouse = new Map<string, typeof nodes>();
        for (const n of nodes) {
            if (n.slotId) slotNode.set(n.slotId, n.id);
            if (n.warehouseId) byWarehouse.set(n.warehouseId, [...(byWarehouse.get(n.warehouseId) ?? []), n]);
        }
        for (const [wid, list] of byWarehouse) {
            const node = pickWarehouseNode(list);
            if (node) warehouseNode.set(wid, node.id);
        }

        const gateMap = new Map<string, { localX: number; localY: number }>();
        for (const gate of nodes.filter(n => n.nodeType === 'GATE' || n.nodeType === 'DOCK')) {
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
                warehouseId: { in: warehouseIds.filter(id => !closed.has(id)) },
                isActive: true,
            },
            include: {
                allowedVehicles: true,
                zone: { select: { tempMin: true, tempMax: true } },
            },
        });

        // Capacity already promised to movements in flight counts as used.
        const reservedRows = await this.prisma.slotReservation.groupBy({
            by: ['slotId'],
            where: {
                slotId: { in: rows.map(r => r.id) },
                status: 'active',
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            _sum: { weightKg: true, volumeM3: true },
        });
        const reserved = new Map(reservedRows.map(r => [r.slotId, { w: Number(r._sum?.weightKg ?? 0), v: Number(r._sum?.volumeM3 ?? 0) }]));

        const slots = rows.map(row => {
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

            const held = reserved.get(row.id);
            return {
                id: row.id,
                warehouseId: row.warehouseId,
                zoneType: row.zoneType as ZoneType,
                // Temperature range comes from the slot's zone; a zone without a
                // range means "no controlled temperature" (null).
                tempMin: row.zone?.tempMin != null ? Number(row.zone.tempMin) : null,
                tempMax: row.zone?.tempMax != null ? Number(row.zone.tempMax) : null,
                maxWeightKg: Number(row.maxWeightKg),
                currentWeightKg: Number(row.currentWeightKg) + (held?.w ?? 0),
                maxVolumeM3: Number(row.maxVolumeM3),
                currentVolumeM3: Number(row.currentVolumeM3) + (held?.v ?? 0),
                distanceFromEntryM,
                isBlocked: row.isBlocked,
                allowedVehicleTypes: row.allowedVehicles.map(
                    av => av.vehicleType as VehicleType,
                ),
            } satisfies SlotCandidate;
        });

        return { slots, slotNode, warehouseNode };
    }
}

interface LoadedSlots {
    slots: SlotCandidate[];
    /** slot id -> the road-graph node that sits on that slot, when one exists */
    slotNode: Map<string, string>;
    /** warehouse id -> its entrance node on the road graph */
    warehouseNode: Map<string, string>;
}

/** Entrance of a warehouse on the road graph: a dock beats a gate beats the warehouse node itself. */
function pickWarehouseNode<T extends { id: string; nodeType: string }>(nodes: T[]): T | undefined {
    for (const type of ['DOCK', 'GATE', 'WAREHOUSE']) {
        const hit = nodes.filter(n => n.nodeType === type).sort((a, b) => a.id.localeCompare(b.id))[0];
        if (hit) return hit;
    }
    return undefined;
}
