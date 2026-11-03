import { PriorityLevel } from 'src/common/enums';
import { CandidateScore, ProductCandidate, SlotCandidate } from '../domain/types/candidate.type';
import {
    AssignmentResult,
    OptimizationContext,
    OptimizationResult,
    RejectedCandidateInfo,
} from '../domain/types/optimization-context.type';
import { ScoringService } from '../scoring/scoring.service';

/** product id -> slot id, or null when nothing fits. */
export type Placement = Map<string, string | null>;

const EXPLAIN_FEASIBLE = 3;
const EXPLAIN_INFEASIBLE = 3;

/** Small seedable PRNG (mulberry32) so a run can be repeated exactly. */
export function makeRng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const contextRng = (context: OptimizationContext) => makeRng(context.seed ?? Math.floor(Math.random() * 2 ** 31));

const PRIORITY_RANK: Record<PriorityLevel, number> = {
    [PriorityLevel.URGENT]: 4,
    [PriorityLevel.HIGH]: 3,
    [PriorityLevel.MEDIUM]: 2,
    [PriorityLevel.LOW]: 1,
};

export const byUrgency = (a: ProductCandidate, b: ProductCandidate): number =>
    (a.rank ?? 0) - (b.rank ?? 0) ||
    (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0) ||
    b.demandFrequency - a.demandFrequency ||
    a.id.localeCompare(b.id);

/**
 * Working copy of the slots while a plan is being built. Loading and unloading keeps every slot's
 * current load honest, so a later decision always sees what earlier ones already put there.
 */
export class PlacementState {
    private readonly slots = new Map<string, SlotCandidate>();
    private readonly where = new Map<string, string>();

    constructor(slots: SlotCandidate[], private readonly scoring: ScoringService) {
        for (const s of slots) this.slots.set(s.id, { ...s });
    }

    slot(id: string): SlotCandidate {
        return this.slots.get(id)!;
    }

    slotOf(productId: string): string | null {
        return this.where.get(productId) ?? null;
    }

    place(p: ProductCandidate, slotId: string): void {
        const s = this.slots.get(slotId)!;
        s.currentWeightKg += p.weightKg;
        s.currentVolumeM3 += p.volumeM3;
        this.where.set(p.id, slotId);
    }

    unplace(p: ProductCandidate): void {
        const slotId = this.where.get(p.id);
        if (!slotId) return;
        const s = this.slots.get(slotId)!;
        s.currentWeightKg -= p.weightKg;
        s.currentVolumeM3 -= p.volumeM3;
        this.where.delete(p.id);
    }

    /** Hard-constraint reasons for putting `p` into `slotId` now; empty = allowed. */
    violations(p: ProductCandidate, slotId: string): string[] {
        return this.scoring.isHardViolation(p, this.slots.get(slotId)!).reasons;
    }

    /** The slot as `p` would find it: everything else in place, `p` itself not counted. */
    viewFor(p: ProductCandidate, slotId: string): SlotCandidate {
        const s = this.slots.get(slotId)!;
        if (this.where.get(p.id) !== slotId) return s;
        return { ...s, currentWeightKg: s.currentWeightKg - p.weightKg, currentVolumeM3: s.currentVolumeM3 - p.volumeM3 };
    }

    score(p: ProductCandidate, slotId: string, weights: OptimizationContext['weights']): CandidateScore {
        return this.scoring.scoreCandidate(p, this.viewFor(p, slotId), weights);
    }

    /** Violations as `p` would experience them, ignoring its own current load. */
    violationsIgnoringSelf(p: ProductCandidate, slotId: string): string[] {
        return this.scoring.isHardViolation(p, this.viewFor(p, slotId)).reasons;
    }

    entries(): IterableIterator<[string, string]> {
        return this.where.entries();
    }
}

/** Best feasible slot for `p` right now, ties broken by slot id so results are stable. */
export function bestSlotFor(
    p: ProductCandidate,
    slots: SlotCandidate[],
    state: PlacementState,
    weights: OptimizationContext['weights'],
): string | null {
    let best: { id: string; score: number } | null = null;
    for (const s of slots) {
        if (state.violations(p, s.id).length > 0) continue;
        const score = state.score(p, s.id, weights).finalScore;
        if (!best || score > best.score || (score === best.score && s.id < best.id)) best = { id: s.id, score };
    }
    return best?.id ?? null;
}

/** Greedy: most urgent first, each into its best-scoring slot given what is already placed. */
export function greedyPlacement(context: OptimizationContext, scoring: ScoringService): { placement: Placement; state: PlacementState } {
    const state = new PlacementState(context.slots, scoring);
    const placement: Placement = new Map();
    for (const p of [...context.products].sort(byUrgency)) {
        const slotId = bestSlotFor(p, context.slots, state, context.weights);
        placement.set(p.id, slotId);
        if (slotId) state.place(p, slotId);
    }
    return { placement, state };
}

const DIMENSIONS: { key: keyof CandidateScore; label: string; weight: keyof OptimizationContext['weights'] }[] = [
    { key: 'capacityFitScore', label: 'capacity fit', weight: 'capacityFit' },
    { key: 'movementCostScore', label: 'movement cost', weight: 'movementCost' },
    { key: 'categoryMatchScore', label: 'category match', weight: 'categoryMatch' },
    { key: 'vehicleAccessScore', label: 'vehicle access', weight: 'vehicleAccess' },
    { key: 'demandPriorityScore', label: 'demand priority', weight: 'demandPriority' },
    { key: 'congestionScore', label: 'slot congestion', weight: 'congestion' },
];

/** "weaker on movement cost (-0.12), slot congestion (-0.03)" - the dimensions that cost the loser the most. */
function whyLower(chosen: CandidateScore, other: CandidateScore, weights: OptimizationContext['weights']): string {
    const losses = DIMENSIONS
        .map(d => ({ label: d.label, delta: (other[d.key] - chosen[d.key]) * weights[d.weight] }))
        .filter(d => d.delta < -0.0005)
        .sort((a, b) => a.delta - b.delta)
        .slice(0, 2);
    const gap = (chosen.finalScore - other.finalScore).toFixed(2);
    if (losses.length === 0) return `Scored ${gap} lower than the chosen slot overall`;
    return `Scored ${gap} lower than the chosen slot: weaker on ${losses.map(l => `${l.label} (${l.delta.toFixed(2)})`).join(', ')}`;
}

/**
 * Turns a finished placement into per-product results with concrete explanations, then checks the
 * plan independently of how the algorithm built it.
 */
export function buildResult(
    context: OptimizationContext,
    placement: Placement,
    scoring: ScoringService,
    startedAt: number,
): OptimizationResult {
    const state = new PlacementState(context.slots, scoring);
    for (const p of context.products) {
        const slotId = placement.get(p.id);
        if (slotId) state.place(p, slotId);
    }

    const assignments: AssignmentResult[] = [];
    let totalMovementCost = 0;
    let scoreSum = 0;
    let congestionSum = 0;
    let hardViolations = 0;

    for (const p of context.products) {
        const slotId = placement.get(p.id) ?? null;

        if (!slotId) {
            assignments.push({
                productId: p.id, slotId: null, warehouseId: null, score: null,
                capacityFitScore: null, movementCostScore: null, categoryMatchScore: null,
                vehicleAccessScore: null, demandPriorityScore: null, congestionScore: null,
                reasons: [explainUnplaced(p, context, state)],
                rejectedCandidates: explainRejected(p, null, context, state),
                routeCost: null, routeDistanceM: null, routePath: null, routeWarnings: [],
            });
            continue;
        }

        const slot = state.slot(slotId);
        const score = state.score(p, slotId, context.weights);
        const route = p.routes?.bySlot.get(slotId) ?? null;
        // Reasons describe the slot as the product found it, so look at it without the product's own load.
        const found = { ...slot, currentWeightKg: slot.currentWeightKg - p.weightKg, currentVolumeM3: slot.currentVolumeM3 - p.volumeM3 };

        if (state.violationsIgnoringSelf(p, slotId).length > 0) hardViolations++;
        totalMovementCost += scoring.movementCost(p, slot) ?? 0;
        scoreSum += score.finalScore;
        congestionSum += score.congestionScore;

        assignments.push({
            productId: p.id,
            slotId,
            warehouseId: slot.warehouseId,
            score: score.finalScore,
            capacityFitScore: score.capacityFitScore,
            movementCostScore: score.movementCostScore,
            categoryMatchScore: score.categoryMatchScore,
            vehicleAccessScore: score.vehicleAccessScore,
            demandPriorityScore: score.demandPriorityScore,
            congestionScore: score.congestionScore,
            reasons: scoring.explainSelection(p, found),
            rejectedCandidates: explainRejected(p, slotId, context, state),
            routeCost: route?.costM ?? null,
            routeDistanceM: route?.distanceM ?? null,
            routePath: route?.path ?? null,
            routeWarnings: route?.warnings ?? [],
        });
    }

    // A slot loaded past its limit by the plan as a whole is a violation even if each item looked fine alone.
    for (const s of context.slots) {
        const final = state.slot(s.id);
        if (final.currentWeightKg > final.maxWeightKg + 1e-9 || final.currentVolumeM3 > final.maxVolumeM3 + 1e-9) hardViolations++;
    }

    const assigned = assignments.filter(a => a.slotId !== null);
    const open = context.slots.filter(s => !s.isBlocked);
    const util = (pick: (s: SlotCandidate) => [number, number]) => {
        let used = 0, cap = 0;
        for (const s of open) { const [u, c] = pick(state.slot(s.id)); used += u; cap += c; }
        return cap > 0 ? used / cap : 0;
    };
    const spaceUtilization = (util(s => [s.currentWeightKg, s.maxWeightKg]) + util(s => [s.currentVolumeM3, s.maxVolumeM3])) / 2;

    return {
        assignments,
        metrics: {
            productsTotal: context.products.length,
            productsAssigned: assigned.length,
            productsUnassigned: context.products.length - assigned.length,
            hardViolations,
            totalMovementCost: Math.round(totalMovementCost * 100) / 100,
            avgRetrievalCost: assigned.length > 0 ? totalMovementCost / assigned.length : 0,
            spaceUtilization,
            congestionScore: assigned.length > 0 ? congestionSum / assigned.length : 0,
            runtimeMs: Date.now() - startedAt,
            // Unplaced products count as zero, so leaving cargo behind can never look like a better plan.
            optimizationScore: context.products.length > 0 ? scoreSum / context.products.length : 0,
        },
    };
}

function explainRejected(
    p: ProductCandidate,
    chosenId: string | null,
    context: OptimizationContext,
    state: PlacementState,
): RejectedCandidateInfo[] {
    const chosenScore = chosenId ? state.score(p, chosenId, context.weights) : null;
    const feasible: RejectedCandidateInfo[] = [];
    const infeasible: RejectedCandidateInfo[] = [];

    for (const s of context.slots) {
        if (s.id === chosenId) continue;
        const reasons = state.violationsIgnoringSelf(p, s.id);
        if (reasons.length > 0) {
            infeasible.push({ slotId: s.id, warehouseId: s.warehouseId, score: null, feasible: false, reasons });
            continue;
        }
        const score = state.score(p, s.id, context.weights);
        feasible.push({
            slotId: s.id,
            warehouseId: s.warehouseId,
            score: score.finalScore,
            feasible: true,
            reasons: [chosenScore ? whyLower(chosenScore, score, context.weights) : 'Allowed, but not chosen'],
        });
    }

    feasible.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.slotId.localeCompare(b.slotId));
    // The closest misses are the most informative: fewest broken rules first.
    infeasible.sort((a, b) => a.reasons.length - b.reasons.length || a.slotId.localeCompare(b.slotId));
    return [...feasible.slice(0, EXPLAIN_FEASIBLE), ...infeasible.slice(0, EXPLAIN_INFEASIBLE)];
}

/** Why nothing was placed: the most common blocking reason across all slots, with counts. */
function explainUnplaced(p: ProductCandidate, context: OptimizationContext, state: PlacementState): string {
    if (context.slots.length === 0) return 'No slots are available';
    const counts = new Map<string, number>();
    for (const s of context.slots) {
        for (const r of state.violations(p, s.id)) counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3);
    return `No slot can take this: ${top.map(([r, n]) => `${r} (${n}/${context.slots.length} slots)`).join('; ')}`;
}
