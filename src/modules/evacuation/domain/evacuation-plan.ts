/**
 * Pure rules for an evacuation (no framework, no database): who goes first, how long it takes, and
 * why something could not be moved. Kept separate so the rules can be tested without a yard.
 */
import { IncidentType, PriorityLevel } from 'src/common/enums';

export type UnmovableReason = 'open_movement' | 'no_capacity' | 'no_route' | 'no_compatible_slot' | 'not_enough_time';

export interface EvacuationCargo {
    cargoItemId: string;
    priority: PriorityLevel;
    demandFrequency: number;
    /** Needs a controlled temperature (a temperature range or the cold zone). */
    temperatureSensitive: boolean;
}

/** Incidents that put temperature-controlled cargo at risk first. */
export const isTemperatureIncident = (type: string): boolean =>
    type === IncidentType.TEMPERATURE_FAILURE || type === IncidentType.POWER_OUTAGE;

const PRIORITY_RANK: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

/**
 * BR-14: cold cargo first when the incident is a temperature problem, then by priority, then by how
 * often it is called for; the id keeps the order stable.
 */
export function evacuationOrder(cargo: EvacuationCargo[], incidentType: string): EvacuationCargo[] {
    const coldFirst = isTemperatureIncident(incidentType);
    return [...cargo].sort((a, b) =>
        (coldFirst ? Number(b.temperatureSensitive) - Number(a.temperatureSensitive) : 0) ||
        (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0) ||
        b.demandFrequency - a.demandFrequency ||
        a.cargoItemId.localeCompare(b.cargoItemId));
}

export interface ScheduleOptions {
    crews: number;
    /** Loading plus unloading, per item. */
    handlingMinutes: number;
    speedMetersPerMinute: number;
    /** BR-14 window; null = no limit. */
    safeMinutes: number | null;
}

export const DEFAULT_SCHEDULE: ScheduleOptions = { crews: 2, handlingMinutes: 3, speedMetersPerMinute: 80, safeMinutes: null };

export interface ScheduleStep { cargoItemId: string; distanceM: number }
export interface ScheduledItem { cargoItemId: string; crew: number; startMinute: number; finishMinute: number }
export interface LateItem { cargoItemId: string; wouldFinishMinute: number }

/**
 * Hands the items, in priority order, to whichever crew is free first. A trip is the handling time
 * plus the round trip on the road. An item that would finish after the safe window is left out
 * (and takes no crew time), so a shorter job later in the list can still fit.
 */
export function scheduleEvacuation(steps: ScheduleStep[], options: Partial<ScheduleOptions> = {}): { scheduled: ScheduledItem[]; late: LateItem[]; totalMinutes: number } {
    const o = { ...DEFAULT_SCHEDULE, ...options };
    const free = Array.from({ length: Math.max(1, o.crews) }, () => 0);
    const scheduled: ScheduledItem[] = [];
    const late: LateItem[] = [];

    for (const step of steps) {
        let crew = 0;
        for (let c = 1; c < free.length; c++) if (free[c] < free[crew]) crew = c;
        const start = free[crew];
        const finish = round(start + o.handlingMinutes + (2 * step.distanceM) / o.speedMetersPerMinute);
        if (o.safeMinutes !== null && finish > o.safeMinutes) {
            late.push({ cargoItemId: step.cargoItemId, wouldFinishMinute: finish });
            continue;
        }
        free[crew] = finish;
        scheduled.push({ cargoItemId: step.cargoItemId, crew: crew + 1, startMinute: round(start), finishMinute: finish });
    }
    return { scheduled, late, totalMinutes: round(Math.max(0, ...free)) };
}

export interface RejectedSlot { feasible?: boolean; reasons: string[] }

/**
 * Why no slot took this cargo, from the optimizer's per-slot reasons: compatible slots that were
 * simply full (capacity), slots nobody can drive to (route), or nothing that suits it at all.
 */
export function classifyUnplaced(rejected: RejectedSlot[]): { reason: Exclude<UnmovableReason, 'open_movement' | 'not_enough_time'>; detail: string } {
    if (rejected.length === 0) {
        return { reason: 'no_capacity', detail: 'No other slot is available outside the affected warehouse' };
    }
    const isCapacity = (r: string) => /remaining slot capacity/i.test(r);
    const isRoute = (r: string) => /no valid route/i.test(r);

    const capacityOnly = rejected.filter(c => c.reasons.length > 0 && c.reasons.every(isCapacity));
    if (capacityOnly.length > 0) {
        return { reason: 'no_capacity', detail: `${capacityOnly.length} suitable slot(s) exist but none has enough free weight or volume` };
    }
    const unreachable = rejected.filter(c => c.reasons.some(isRoute));
    if (unreachable.length === rejected.length) {
        return { reason: 'no_route', detail: `No road reaches any of the ${rejected.length} slot(s) for this cargo's vehicle type` };
    }
    // The most common single reason is the most useful hint.
    const counts = new Map<string, number>();
    for (const c of rejected) for (const r of c.reasons) counts.set(r, (counts.get(r) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return { reason: 'no_compatible_slot', detail: top ? `Most common blocker: ${top[0]} (${top[1]} of ${rejected.length} slots)` : 'No slot meets the hard constraints' };
}

const round = (n: number) => Math.round(n * 100) / 100;
