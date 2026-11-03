import { PriorityLevel } from 'src/common/enums';
import { EvacuationCargo, classifyUnplaced, evacuationOrder, isTemperatureIncident, scheduleEvacuation } from './evacuation-plan';

const cargo = (id: string, priority: PriorityLevel, temperatureSensitive = false, demandFrequency = 50): EvacuationCargo =>
    ({ cargoItemId: id, priority, demandFrequency, temperatureSensitive });

describe('evacuationOrder', () => {
    const items = [
        cargo('a-ambient-urgent', PriorityLevel.URGENT),
        cargo('b-cold-low', PriorityLevel.LOW, true),
        cargo('c-cold-high', PriorityLevel.HIGH, true),
        cargo('d-ambient-high', PriorityLevel.HIGH),
    ];

    it('puts cold cargo first in a temperature incident, then by priority', () => {
        expect(evacuationOrder(items, 'temperature_failure').map(c => c.cargoItemId))
            .toEqual(['c-cold-high', 'b-cold-low', 'a-ambient-urgent', 'd-ambient-high']);
    });

    it('treats a power outage as a temperature incident', () => {
        expect(isTemperatureIncident('power_outage')).toBe(true);
        expect(evacuationOrder(items, 'power_outage')[0].cargoItemId).toBe('c-cold-high');
    });

    it('orders by priority alone for other incidents', () => {
        expect(evacuationOrder(items, 'fire_hazard').map(c => c.cargoItemId))
            .toEqual(['a-ambient-urgent', 'c-cold-high', 'd-ambient-high', 'b-cold-low']);
    });

    it('breaks ties by demand, then id, and does not change its input', () => {
        const tied = [cargo('z', PriorityLevel.HIGH, false, 10), cargo('y', PriorityLevel.HIGH, false, 90), cargo('x', PriorityLevel.HIGH, false, 90)];
        const copy = [...tied];
        expect(evacuationOrder(tied, 'flood').map(c => c.cargoItemId)).toEqual(['x', 'y', 'z']);
        expect(tied).toEqual(copy);
    });
});

describe('scheduleEvacuation', () => {
    const steps = (n: number, distanceM = 0) => Array.from({ length: n }, (_, i) => ({ cargoItemId: `c${i + 1}`, distanceM }));

    it('hands each item to the crew that is free first', () => {
        const { scheduled, totalMinutes } = scheduleEvacuation(steps(4), { crews: 2, handlingMinutes: 3 });
        expect(scheduled.map(s => [s.cargoItemId, s.crew, s.startMinute, s.finishMinute])).toEqual([
            ['c1', 1, 0, 3], ['c2', 2, 0, 3], ['c3', 1, 3, 6], ['c4', 2, 3, 6],
        ]);
        expect(totalMinutes).toBe(6);
    });

    it('counts the round trip on the road', () => {
        const { scheduled } = scheduleEvacuation(steps(1, 160), { crews: 1, handlingMinutes: 2, speedMetersPerMinute: 80 });
        expect(scheduled[0].finishMinute).toBe(6); // 2 handling + 2 * 160 / 80
    });

    it('leaves out what cannot finish inside the safe window, keeping the order of the rest', () => {
        const { scheduled, late } = scheduleEvacuation(steps(5), { crews: 1, handlingMinutes: 3, safeMinutes: 7 });
        expect(scheduled.map(s => s.cargoItemId)).toEqual(['c1', 'c2']);
        expect(late.map(l => l.cargoItemId)).toEqual(['c3', 'c4', 'c5']);
        expect(late[0].wouldFinishMinute).toBe(9);
    });

    it('lets a short job later in the list use time a long job could not', () => {
        const { scheduled, late } = scheduleEvacuation(
            [{ cargoItemId: 'far', distanceM: 4000 }, { cargoItemId: 'near', distanceM: 0 }],
            { crews: 1, handlingMinutes: 3, speedMetersPerMinute: 80, safeMinutes: 10 },
        );
        expect(late.map(l => l.cargoItemId)).toEqual(['far']);
        expect(scheduled.map(s => s.cargoItemId)).toEqual(['near']);
    });

    it('has no limit without a safe window and always uses at least one crew', () => {
        expect(scheduleEvacuation(steps(10), { crews: 0, handlingMinutes: 1 }).late).toHaveLength(0);
    });
});

describe('classifyUnplaced', () => {
    it('says capacity when suitable slots exist but are full', () => {
        const r = classifyUnplaced([
            { reasons: ['Product weight exceeds remaining slot capacity'] },
            { reasons: ['Required zone cold does not match slot zone normal'] },
        ]);
        expect(r.reason).toBe('no_capacity');
    });

    it('says route when no slot can be reached', () => {
        const r = classifyUnplaced([{ reasons: ['No valid route to this slot for vehicle type forklift'] }, { reasons: ['No valid route to this slot for vehicle type forklift', 'Slot is blocked'] }]);
        expect(r.reason).toBe('no_route');
    });

    it('names the most common blocker otherwise', () => {
        const r = classifyUnplaced([
            { reasons: ['Required zone cold does not match slot zone normal'] },
            { reasons: ['Required zone cold does not match slot zone normal'] },
            { reasons: ['Slot is blocked'] },
        ]);
        expect(r.reason).toBe('no_compatible_slot');
        expect(r.detail).toMatch(/Required zone cold/);
        expect(r.detail).toMatch(/2 of 3/);
    });

    it('treats an empty candidate list as nowhere to go', () => {
        expect(classifyUnplaced([]).reason).toBe('no_capacity');
    });
});
