import { ProductCandidate } from '../domain/types/candidate.type';
import { OptimizationContext } from '../domain/types/optimization-context.type';
import { ScoringService } from '../scoring/scoring.service';
import { Placement, PlacementState } from './placement';

export interface SearchOptions {
    iterations: number;
    /** Decide whether a move with this change in total score is kept. `step` runs 0..iterations-1. */
    accept(delta: number, step: number): boolean;
}

/**
 * Improves a plan by moving or swapping single products. Every move is checked against the hard
 * constraints with the slots' real, current load, so the plan stays valid after every accepted move
 * (an unplaced product may also be placed if a move frees room). Returns the best plan seen.
 */
export function improvePlacement(
    context: OptimizationContext,
    scoring: ScoringService,
    start: { placement: Placement; state: PlacementState },
    rng: () => number,
    options: SearchOptions,
): Placement {
    const { state } = start;
    const placement: Placement = new Map(start.placement);
    const products = context.products;
    const byId = new Map(products.map(p => [p.id, p]));
    const members = new Map<string, Set<string>>(context.slots.map(s => [s.id, new Set<string>()]));
    for (const [pid, sid] of placement) if (sid) members.get(sid)!.add(pid);

    const slotObjective = (slotId: string): number => {
        let sum = 0;
        for (const pid of members.get(slotId)!) sum += state.score(byId.get(pid)!, slotId, context.weights).finalScore;
        return sum;
    };
    const objective = (slotIds: string[]) => slotIds.reduce((s, id) => s + slotObjective(id), 0);

    let current = objective(context.slots.map(s => s.id));
    let best = current;
    let bestPlacement: Placement = new Map(placement);

    const move = (p: ProductCandidate, to: string | null) => {
        const from = placement.get(p.id) ?? null;
        if (from) { state.unplace(p); members.get(from)!.delete(p.id); }
        if (to) { state.place(p, to); members.get(to)!.add(p.id); }
        placement.set(p.id, to);
    };

    if (products.length === 0 || context.slots.length === 0) return bestPlacement;

    for (let step = 0; step < options.iterations; step++) {
        const p1 = products[Math.floor(rng() * products.length)];
        const from1 = placement.get(p1.id) ?? null;

        const placed = products.filter(p => placement.get(p.id));
        const doSwap = from1 !== null && placed.length >= 2 && rng() < 0.5;

        if (doSwap) {
            const p2 = placed[Math.floor(rng() * placed.length)];
            const from2 = placement.get(p2.id)!;
            if (p2.id === p1.id || from2 === from1) continue;

            const slots = [from1!, from2];
            const before = objective(slots);
            move(p1, null);
            move(p2, null);
            // After both leave, each must be allowed in the other's slot with the load that remains.
            const ok = state.violations(p1, from2).length === 0;
            if (ok) {
                move(p1, from2);
                if (state.violations(p2, from1!).length === 0) {
                    move(p2, from1!);
                    const delta = objective(slots) - before;
                    if (options.accept(delta, step)) { current += delta; } else { move(p1, null); move(p2, null); move(p1, from1); move(p2, from2); }
                } else { move(p1, null); move(p1, from1); move(p2, from2); }
            } else { move(p1, from1); move(p2, from2); }
        } else {
            const target = context.slots[Math.floor(rng() * context.slots.length)].id;
            if (target === from1) continue;

            const slots = from1 ? [from1, target] : [target];
            const before = objective(slots);
            move(p1, null);
            if (state.violations(p1, target).length > 0) { move(p1, from1); continue; }
            move(p1, target);
            const delta = objective(slots) - before;
            if (options.accept(delta, step)) { current += delta; } else { move(p1, null); move(p1, from1); }
        }

        if (current > best + 1e-9) {
            best = current;
            bestPlacement = new Map(placement);
        }
    }
    return bestPlacement;
}
