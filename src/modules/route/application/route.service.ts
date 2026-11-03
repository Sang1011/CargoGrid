import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RouteEdge, RouteGraph, RouteResult, ShortestPathTree } from '../domain/route-graph';

const CACHE_TTL_MS = 60_000;

interface Cached {
    graph: Promise<RouteGraph>;
    loadedAt: number;
}

/**
 * Builds the yard graph of a scenario once and reuses it. The cache is dropped whenever a node or edge
 * of that scenario changes (see `invalidate`); the TTL is only a safety net for writes that bypass
 * the services, such as seeds or manual SQL.
 */
@Injectable()
export class RouteService {
    private readonly cache = new Map<string, Cached>();

    constructor(private readonly prisma: PrismaService) { }

    invalidate(scenarioId?: string | null): void {
        if (scenarioId) this.cache.delete(scenarioId);
        else this.cache.clear();
    }

    async graph(scenarioId: string): Promise<RouteGraph> {
        const hit = this.cache.get(scenarioId);
        if (hit && Date.now() - hit.loadedAt < CACHE_TTL_MS) return hit.graph;

        const graph = this.load(scenarioId);
        this.cache.set(scenarioId, { graph, loadedAt: Date.now() });
        // A failed load must not poison the cache.
        graph.catch(() => this.cache.delete(scenarioId));
        return graph;
    }

    async findRoute(scenarioId: string, fromNodeId: string, toNodeId: string, vehicleType?: string): Promise<RouteResult | null> {
        return (await this.graph(scenarioId)).shortestPath(fromNodeId, toNodeId, vehicleType);
    }

    /** All destinations from one origin in a single search; null when the origin is not on the graph. */
    async routesFrom(scenarioId: string, originNodeId: string, vehicleType?: string): Promise<ShortestPathTree | null> {
        return (await this.graph(scenarioId)).from(originNodeId, vehicleType);
    }

    private async load(scenarioId: string): Promise<RouteGraph> {
        const [nodes, edges] = await Promise.all([
            this.prisma.locationNode.findMany({ where: { scenarioId, isActive: true }, select: { id: true, code: true } }),
            this.prisma.roadEdge.findMany({ where: { scenarioId }, include: { allowedVehicles: { select: { vehicleType: true } } } }),
        ]);
        const routeEdges: RouteEdge[] = edges.map(e => ({
            id: e.id,
            fromNodeId: e.fromNodeId,
            toNodeId: e.toNodeId,
            distanceM: Number(e.distanceM),
            oneWay: e.direction === 'one_way',
            congestion: Number(e.congestionLevel),
            blocked: e.isBlocked,
            allowedVehicles: e.allowedVehicles.map(v => v.vehicleType),
        }));
        return new RouteGraph(nodes, routeEdges);
    }
}
