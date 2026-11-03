export interface AllocationItemView {
    cargoItemId: string;
    slotId: string | null;
    warehouseId: string | null;
    feasible: boolean;
    recommended: boolean;
    editedByUser: boolean;
    score: number | null;
    reasons: string[];
    rejectedCandidates: unknown[];
    routeCost: number | null;
    routePath: unknown;
    movementId: string | null;
}

export interface AllocationView {
    id: string;
    scenarioId: string;
    contextType: string;
    contextId: string;
    algorithm: string;
    status: string;
    optimizationRunId: string | null;
    requestedById: string | null;
    confirmedById: string | null;
    modifiedByUser: boolean;
    constraintsApplied: unknown;
    notes: string[];
    rejectReason: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    confirmedAt: Date | null;
    summary: { total: number; allocated: number; unallocated: number; edited: number };
    items?: AllocationItemView[];
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function toItemView(i: any): AllocationItemView {
    return {
        cargoItemId: i.cargoItemId,
        slotId: i.slotId,
        warehouseId: i.warehouseId,
        feasible: i.feasible,
        recommended: i.recommended,
        editedByUser: i.editedByUser,
        score: num(i.score),
        reasons: i.reasons,
        rejectedCandidates: (i.rejectedCandidates as { candidates?: unknown[] } | null)?.candidates ?? [],
        routeCost: num(i.routeCost),
        routePath: i.routePath ?? null,
        movementId: i.movementId,
    };
}

export function toView(p: any, withItems = true): AllocationView {
    const items: any[] = p.items ?? [];
    return {
        id: p.id,
        scenarioId: p.scenarioId,
        contextType: p.contextType,
        contextId: p.contextId,
        algorithm: p.algorithm,
        status: p.status,
        optimizationRunId: p.optimizationRunId,
        requestedById: p.requestedById,
        confirmedById: p.confirmedById,
        modifiedByUser: p.modifiedByUser,
        constraintsApplied: p.constraintsApplied,
        notes: p.notes,
        rejectReason: p.rejectReason,
        version: p.version,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        confirmedAt: p.confirmedAt,
        summary: {
            total: items.length,
            allocated: items.filter(i => i.slotId).length,
            unallocated: items.filter(i => !i.slotId).length,
            edited: items.filter(i => i.editedByUser).length,
        },
        ...(withItems && { items: items.map(toItemView) }),
    };
}
