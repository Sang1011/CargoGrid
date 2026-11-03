/**
 * Pure routing on the yard graph (no framework, no database), so it can be unit-tested on small graphs.
 *
 * Edge cost = distance * (1 + CONGESTION_PENALTY * congestion), so a fully congested road (1.0) costs
 * twice its length. Rules (BR-10): blocked edges are never used, one-way edges are used in their
 * direction only, and an edge with a vehicle list is closed to every vehicle type not on it
 * (an empty list means "no restriction").
 */

export const CONGESTION_PENALTY = 1;
export const HEAVY_CONGESTION = 0.7;

export interface RouteNode {
    id: string;
    code?: string;
}

export interface RouteEdge {
    id: string;
    fromNodeId: string;
    toNodeId: string;
    distanceM: number;
    oneWay: boolean;
    /** 0..1 */
    congestion: number;
    blocked: boolean;
    /** Vehicle types allowed on this edge; empty = all. */
    allowedVehicles: string[];
}

export interface RouteResult {
    /** Congestion-weighted cost: what the optimiser minimises. */
    totalCost: number;
    /** Plain length in metres. */
    distanceM: number;
    nodePath: string[];
    edgeIds: string[];
    warnings: string[];
}

interface Arc {
    to: string;
    edge: RouteEdge;
    cost: number;
}

export const edgeCost = (e: Pick<RouteEdge, 'distanceM' | 'congestion'>): number =>
    e.distanceM * (1 + CONGESTION_PENALTY * Math.min(Math.max(e.congestion, 0), 1));

export const edgeOpenTo = (e: RouteEdge, vehicleType?: string): boolean =>
    !e.blocked && (vehicleType === undefined || e.allowedVehicles.length === 0 || e.allowedVehicles.includes(vehicleType));

/** Minimal binary min-heap keyed by number. */
class MinHeap<T> {
    private items: { key: number; value: T }[] = [];
    get size() { return this.items.length; }
    push(key: number, value: T) {
        const a = this.items;
        a.push({ key, value });
        let i = a.length - 1;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (a[p].key <= a[i].key) break;
            [a[p], a[i]] = [a[i], a[p]];
            i = p;
        }
    }
    pop(): { key: number; value: T } | undefined {
        const a = this.items;
        if (a.length === 0) return undefined;
        const top = a[0];
        const last = a.pop()!;
        if (a.length > 0) {
            a[0] = last;
            let i = 0;
            for (;;) {
                const l = 2 * i + 1, r = l + 1;
                let m = i;
                if (l < a.length && a[l].key < a[m].key) m = l;
                if (r < a.length && a[r].key < a[m].key) m = r;
                if (m === i) break;
                [a[m], a[i]] = [a[i], a[m]];
                i = m;
            }
        }
        return top;
    }
}

/** Result of one Dijkstra run from a single origin: ask it for any destination. */
export class ShortestPathTree {
    constructor(
        readonly origin: string,
        private readonly cost: Map<string, number>,
        private readonly prev: Map<string, { node: string; edge: RouteEdge }>,
        private readonly nodes: Map<string, RouteNode>,
    ) { }

    reachable(target: string): boolean {
        return this.cost.has(target);
    }

    to(target: string): RouteResult | null {
        const total = this.cost.get(target);
        if (total === undefined) return null;

        const nodePath: string[] = [target];
        const edges: RouteEdge[] = [];
        for (let at = target; at !== this.origin;) {
            const step = this.prev.get(at)!;
            edges.push(step.edge);
            nodePath.push(step.node);
            at = step.node;
        }
        nodePath.reverse();
        edges.reverse();

        const warnings: string[] = [];
        edges.forEach((e, i) => {
            if (e.congestion >= HEAVY_CONGESTION) {
                const a = this.nodes.get(nodePath[i])?.code ?? nodePath[i];
                const b = this.nodes.get(nodePath[i + 1])?.code ?? nodePath[i + 1];
                warnings.push(`Heavy congestion (${e.congestion.toFixed(2)}) on ${a} -> ${b}`);
            }
        });

        return {
            totalCost: round(total),
            distanceM: round(edges.reduce((s, e) => s + e.distanceM, 0)),
            nodePath,
            edgeIds: edges.map(e => e.id),
            warnings,
        };
    }
}

const round = (n: number) => Math.round(n * 100) / 100;

export class RouteGraph {
    private readonly nodes = new Map<string, RouteNode>();
    private readonly out = new Map<string, Arc[]>();

    constructor(nodes: RouteNode[], edges: RouteEdge[]) {
        for (const n of nodes) {
            this.nodes.set(n.id, n);
            this.out.set(n.id, []);
        }
        for (const e of edges) {
            // An edge that points at a node we do not know is ignored rather than crashing the whole graph.
            if (!this.nodes.has(e.fromNodeId) || !this.nodes.has(e.toNodeId)) continue;
            const cost = edgeCost(e);
            this.out.get(e.fromNodeId)!.push({ to: e.toNodeId, edge: e, cost });
            if (!e.oneWay) this.out.get(e.toNodeId)!.push({ to: e.fromNodeId, edge: e, cost });
        }
    }

    hasNode(id: string): boolean {
        return this.nodes.has(id);
    }

    get nodeCount(): number {
        return this.nodes.size;
    }

    /** Dijkstra from one origin for one vehicle type (undefined = ignore vehicle rules). */
    from(origin: string, vehicleType?: string): ShortestPathTree | null {
        if (!this.nodes.has(origin)) return null;

        const cost = new Map<string, number>([[origin, 0]]);
        const prev = new Map<string, { node: string; edge: RouteEdge }>();
        const done = new Set<string>();
        const heap = new MinHeap<string>();
        heap.push(0, origin);

        for (let top = heap.pop(); top; top = heap.pop()) {
            const u = top.value;
            if (done.has(u)) continue;
            done.add(u);
            for (const arc of this.out.get(u) ?? []) {
                if (!edgeOpenTo(arc.edge, vehicleType) || done.has(arc.to)) continue;
                const candidate = top.key + arc.cost;
                if (candidate < (cost.get(arc.to) ?? Infinity)) {
                    cost.set(arc.to, candidate);
                    prev.set(arc.to, { node: u, edge: arc.edge });
                    heap.push(candidate, arc.to);
                }
            }
        }
        return new ShortestPathTree(origin, cost, prev, this.nodes);
    }

    shortestPath(origin: string, target: string, vehicleType?: string): RouteResult | null {
        if (!this.nodes.has(target)) return null;
        return this.from(origin, vehicleType)?.to(target) ?? null;
    }
}
