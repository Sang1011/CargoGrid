/** Turns the latest sensor readings into "open an incident?" hints. It only suggests; a person opens the incident. */

export interface ZoneLimits { id: string; name: string; tempMin: number | null; tempMax: number | null }
export interface Reading { zoneId: string | null; temperatureC: number | null; recordedAt: Date }
export interface OpenIncident { incidentType: string; severity: string }

export interface IncidentSuggestion {
    zoneId: string;
    zoneName: string;
    temperatureC: number;
    allowedMinC: number | null;
    allowedMaxC: number | null;
    /** Degrees outside the allowed range. */
    deviationC: number;
    suggestedSeverity: 'medium' | 'high' | 'critical';
    recordedAt: Date;
    /** A temperature incident is already open for the warehouse, so opening another may be redundant. */
    alreadyOpen: boolean;
}

export const SUGGESTION_WINDOW_MINUTES = 60;

export function severityForDeviation(deviationC: number): IncidentSuggestion['suggestedSeverity'] {
    if (deviationC >= 5) return 'critical';
    if (deviationC >= 2) return 'high';
    return 'medium';
}

export function suggestIncidents(zones: ZoneLimits[], readings: Reading[], open: OpenIncident[], now: Date = new Date(), windowMinutes = SUGGESTION_WINDOW_MINUTES): IncidentSuggestion[] {
    const cutoff = now.getTime() - windowMinutes * 60_000;
    const alreadyOpen = open.some(i => i.incidentType === 'temperature_failure');
    const out: IncidentSuggestion[] = [];

    for (const zone of zones) {
        if (zone.tempMin === null && zone.tempMax === null) continue;
        const latest = readings
            .filter(r => r.zoneId === zone.id && r.temperatureC !== null && r.recordedAt.getTime() >= cutoff && r.recordedAt.getTime() <= now.getTime())
            .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];
        if (!latest) continue;

        const t = latest.temperatureC!;
        const deviation = Math.max(zone.tempMin !== null ? zone.tempMin - t : 0, zone.tempMax !== null ? t - zone.tempMax : 0, 0);
        if (deviation <= 0) continue;
        out.push({
            zoneId: zone.id,
            zoneName: zone.name,
            temperatureC: t,
            allowedMinC: zone.tempMin,
            allowedMaxC: zone.tempMax,
            deviationC: Math.round(deviation * 100) / 100,
            suggestedSeverity: severityForDeviation(deviation),
            recordedAt: latest.recordedAt,
            alreadyOpen,
        });
    }
    return out.sort((a, b) => b.deviationC - a.deviationC);
}
