import { severityForDeviation, suggestIncidents } from './incident-suggestions';

const now = new Date('2026-11-03T10:00:00Z');
const ago = (min: number) => new Date(now.getTime() - min * 60_000);
const cold = { id: 'z1', name: 'Cold room', tempMin: -10, tempMax: 8 };

describe('suggestIncidents', () => {
    it('suggests an incident when the latest reading is above the range', () => {
        const [s] = suggestIncidents([cold], [{ zoneId: 'z1', temperatureC: 15, recordedAt: ago(5) }], [], now);
        expect(s).toMatchObject({ zoneId: 'z1', deviationC: 7, suggestedSeverity: 'critical', alreadyOpen: false });
    });

    it('also catches readings below the range', () => {
        const [s] = suggestIncidents([cold], [{ zoneId: 'z1', temperatureC: -13, recordedAt: ago(5) }], [], now);
        expect(s).toMatchObject({ deviationC: 3, suggestedSeverity: 'high' });
    });

    it('uses only the latest reading, so a recovered zone is not flagged', () => {
        const readings = [{ zoneId: 'z1', temperatureC: 20, recordedAt: ago(30) }, { zoneId: 'z1', temperatureC: 4, recordedAt: ago(2) }];
        expect(suggestIncidents([cold], readings, [], now)).toEqual([]);
    });

    it('ignores stale readings, zones without a range, and readings without a temperature', () => {
        const readings = [
            { zoneId: 'z1', temperatureC: 30, recordedAt: ago(61) },
            { zoneId: 'z2', temperatureC: 30, recordedAt: ago(1) },
            { zoneId: 'z1', temperatureC: null, recordedAt: ago(1) },
        ];
        expect(suggestIncidents([cold, { id: 'z2', name: 'Open yard', tempMin: null, tempMax: null }], readings, [], now)).toEqual([]);
    });

    it('flags that a temperature incident is already open, and ranks the worst zone first', () => {
        const zones = [cold, { id: 'z3', name: 'Freezer', tempMin: -30, tempMax: -18 }];
        const readings = [{ zoneId: 'z1', temperatureC: 9, recordedAt: ago(1) }, { zoneId: 'z3', temperatureC: -10, recordedAt: ago(1) }];
        const out = suggestIncidents(zones, readings, [{ incidentType: 'temperature_failure', severity: 'high' }], now);
        expect(out.map(s => s.zoneId)).toEqual(['z3', 'z1']);
        expect(out.every(s => s.alreadyOpen)).toBe(true);
    });

    it('maps deviation to severity', () => {
        expect([1, 2, 4.9, 5].map(severityForDeviation)).toEqual(['medium', 'high', 'high', 'critical']);
    });
});
