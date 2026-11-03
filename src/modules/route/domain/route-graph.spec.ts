import { RouteEdge, RouteGraph, RouteNode } from './route-graph';

const nodes = (...ids: string[]): RouteNode[] => ids.map(id => ({ id, code: id }));
let n = 0;
const edge = (a: string, b: string, distanceM: number, over: Partial<RouteEdge> = {}): RouteEdge => ({
    id: `e${++n}`, fromNodeId: a, toNodeId: b, distanceM, oneWay: false, congestion: 0, blocked: false, allowedVehicles: [], ...over,
});

describe('RouteGraph', () => {
    it('takes the cheaper of two routes', () => {
        const g = new RouteGraph(nodes('A', 'B', 'C'), [edge('A', 'B', 10), edge('B', 'C', 10), edge('A', 'C', 50)]);
        const r = g.shortestPath('A', 'C')!;
        expect(r.nodePath).toEqual(['A', 'B', 'C']);
        expect(r).toMatchObject({ totalCost: 20, distanceM: 20, warnings: [] });
    });

    it('a route from a node to itself is free', () => {
        const g = new RouteGraph(nodes('A'), []);
        expect(g.shortestPath('A', 'A')).toMatchObject({ totalCost: 0, nodePath: ['A'], edgeIds: [] });
    });

    it('respects one-way edges: usable forwards, closed backwards', () => {
        const g = new RouteGraph(nodes('A', 'B'), [edge('A', 'B', 10, { oneWay: true })]);
        expect(g.shortestPath('A', 'B')).not.toBeNull();
        expect(g.shortestPath('B', 'A')).toBeNull();
    });

    it('a one-way street forces the long way round the other direction', () => {
        const g = new RouteGraph(nodes('A', 'B', 'C'), [
            edge('A', 'B', 5, { oneWay: true }),
            edge('B', 'C', 5),
            edge('A', 'C', 40),
        ]);
        expect(g.shortestPath('A', 'C')!.nodePath).toEqual(['A', 'B', 'C']);
        expect(g.shortestPath('C', 'A')!.nodePath).toEqual(['C', 'A']); // cannot go back through B->A
        expect(g.shortestPath('C', 'A')!.totalCost).toBe(40);
    });

    it('never uses a blocked edge, and reports no route when it is the only way', () => {
        const detour = new RouteGraph(nodes('A', 'B', 'C'), [edge('A', 'B', 5, { blocked: true }), edge('B', 'C', 5), edge('A', 'C', 40)]);
        expect(detour.shortestPath('A', 'C')!.nodePath).toEqual(['A', 'C']);

        const cut = new RouteGraph(nodes('A', 'B'), [edge('A', 'B', 5, { blocked: true })]);
        expect(cut.shortestPath('A', 'B')).toBeNull();
    });

    it('closes an edge to vehicle types that are not on its list', () => {
        const g = new RouteGraph(nodes('A', 'B', 'C'), [
            edge('A', 'B', 5, { allowedVehicles: ['forklift'] }),
            edge('B', 'C', 5),
            edge('A', 'C', 40),
        ]);
        expect(g.shortestPath('A', 'C', 'forklift')!.totalCost).toBe(10);
        expect(g.shortestPath('A', 'C', 'container_truck')!.totalCost).toBe(40); // detour
        expect(g.shortestPath('A', 'C')!.totalCost).toBe(10); // no vehicle given: rule not applied
    });

    it('reports no route when a vehicle is banned from the only way in', () => {
        const g = new RouteGraph(nodes('A', 'B'), [edge('A', 'B', 5, { allowedVehicles: ['forklift'] })]);
        expect(g.shortestPath('A', 'B', 'container_truck')).toBeNull();
    });

    it('congestion raises cost (not length) and can change the winner', () => {
        const g = new RouteGraph(nodes('A', 'B', 'C'), [
            edge('A', 'B', 10, { congestion: 1 }), // costs 20
            edge('B', 'C', 10, { congestion: 1 }), // costs 20
            edge('A', 'C', 30),
        ]);
        const r = g.shortestPath('A', 'C')!;
        expect(r.nodePath).toEqual(['A', 'C']);
        expect(r).toMatchObject({ totalCost: 30, distanceM: 30 });
    });

    it('keeps length and cost separate when a congested road is still the best', () => {
        const g = new RouteGraph(nodes('A', 'B'), [edge('A', 'B', 10, { congestion: 0.5 })]);
        expect(g.shortestPath('A', 'B')).toMatchObject({ totalCost: 15, distanceM: 10 });
    });

    it('warns about heavily congested stretches on the chosen path', () => {
        const g = new RouteGraph(nodes('A', 'B'), [edge('A', 'B', 10, { congestion: 0.8 })]);
        expect(g.shortestPath('A', 'B')!.warnings).toEqual(['Heavy congestion (0.80) on A -> B']);
        const light = new RouteGraph(nodes('A', 'B'), [edge('A', 'B', 10, { congestion: 0.3 })]);
        expect(light.shortestPath('A', 'B')!.warnings).toEqual([]);
    });

    it('returns null for unknown nodes and ignores edges that point at unknown nodes', () => {
        const g = new RouteGraph(nodes('A', 'B'), [edge('A', 'B', 5), edge('A', 'GHOST', 1)]);
        expect(g.shortestPath('A', 'GHOST')).toBeNull();
        expect(g.shortestPath('NOPE', 'A')).toBeNull();
        expect(g.shortestPath('A', 'B')).not.toBeNull();
    });

    it('a disconnected node is unreachable', () => {
        const g = new RouteGraph(nodes('A', 'B', 'X'), [edge('A', 'B', 5)]);
        expect(g.shortestPath('A', 'X')).toBeNull();
        expect(g.from('A')!.reachable('X')).toBe(false);
    });

    it('one search from an origin answers every destination the same as a point-to-point search', () => {
        const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
        const rand = seeded(7);
        const ids = Array.from({ length: 25 }, (_, i) => `N${i}`);
        const edges: RouteEdge[] = [];
        for (let i = 0; i < 70; i++) {
            const a = ids[Math.floor(rand() * ids.length)], b = ids[Math.floor(rand() * ids.length)];
            if (a === b) continue;
            edges.push(edge(a, b, 1 + Math.floor(rand() * 30), { oneWay: rand() < 0.3, congestion: rand() < 0.3 ? rand() : 0, blocked: rand() < 0.1 }));
        }
        const g = new RouteGraph(nodes(...ids), edges);
        const tree = g.from('N0')!;
        for (const t of ids) {
            expect(tree.to(t)?.totalCost ?? null).toBe(g.shortestPath('N0', t)?.totalCost ?? null);
        }
    });

    it('matches a brute-force Bellman-Ford on random graphs', () => {
        const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
        for (let round = 0; round < 20; round++) {
            const rand = seeded(100 + round);
            const ids = Array.from({ length: 12 }, (_, i) => `N${i}`);
            const edges: RouteEdge[] = [];
            for (let i = 0; i < 30; i++) {
                const a = ids[Math.floor(rand() * ids.length)], b = ids[Math.floor(rand() * ids.length)];
                if (a !== b) edges.push(edge(a, b, 1 + Math.floor(rand() * 20), { oneWay: rand() < 0.4, congestion: Math.round(rand() * 10) / 10, blocked: rand() < 0.15 }));
            }
            const dist = new Map(ids.map(i => [i, Infinity]));
            dist.set('N0', 0);
            for (let pass = 0; pass < ids.length; pass++) {
                for (const e of edges.filter(x => !x.blocked)) {
                    const c = e.distanceM * (1 + e.congestion);
                    if (dist.get(e.fromNodeId)! + c < dist.get(e.toNodeId)!) dist.set(e.toNodeId, dist.get(e.fromNodeId)! + c);
                    if (!e.oneWay && dist.get(e.toNodeId)! + c < dist.get(e.fromNodeId)!) dist.set(e.fromNodeId, dist.get(e.toNodeId)! + c);
                }
            }
            const g = new RouteGraph(nodes(...ids), edges);
            for (const t of ids) {
                const got = g.shortestPath('N0', t)?.totalCost;
                const want = dist.get(t)!;
                if (want === Infinity) expect(got).toBeUndefined();
                else expect(got).toBeCloseTo(want, 1);
            }
        }
    });
});
