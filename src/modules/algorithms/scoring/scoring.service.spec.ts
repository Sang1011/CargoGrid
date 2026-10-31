import { ScoringService } from './scoring.service';
import { makeProduct, makeSlot } from '../test-fixtures';
import { ZoneType } from 'src/common/enums';

describe('ScoringService.isHardViolation — temperature', () => {
    const service = new ScoringService();
    const coldProduct = makeProduct({ requiredTempMin: -5, requiredTempMax: 5, requiredZone: ZoneType.COLD });

    it('rejects a temperature-sensitive product in a slot with no temperature range', () => {
        const normalSlot = makeSlot({ zoneType: ZoneType.NORMAL, tempMin: null, tempMax: null });
        const product = makeProduct({ requiredTempMin: -5, requiredTempMax: 5 });

        const result = service.isHardViolation(product, normalSlot);

        expect(result.violated).toBe(true);
        expect(result.reasons.join(' ')).toMatch(/no temperature range/);
    });

    it('accepts a product whose range fits inside the slot range', () => {
        const coldSlot = makeSlot({ zoneType: ZoneType.COLD, tempMin: -10, tempMax: 10 });

        expect(service.isHardViolation(coldProduct, coldSlot).violated).toBe(false);
    });

    it('rejects a product that needs colder than the slot can offer', () => {
        const mildSlot = makeSlot({ zoneType: ZoneType.COLD, tempMin: 0, tempMax: 10 });

        const result = service.isHardViolation(coldProduct, mildSlot);

        expect(result.violated).toBe(true);
        expect(result.reasons.join(' ')).toMatch(/temp min/);
    });

    it('rejects a product that needs warmer than the slot can offer', () => {
        const veryColdSlot = makeSlot({ zoneType: ZoneType.COLD, tempMin: -30, tempMax: 2 });

        const result = service.isHardViolation(coldProduct, veryColdSlot);

        expect(result.violated).toBe(true);
        expect(result.reasons.join(' ')).toMatch(/temp max/);
    });

    it('does not care about temperature when the product has no requirement', () => {
        const product = makeProduct();

        expect(service.isHardViolation(product, makeSlot()).violated).toBe(false);
        expect(
            service.isHardViolation(product, makeSlot({ tempMin: -10, tempMax: 10 })).violated,
        ).toBe(false);
    });
});

describe('ScoringService.explainSelection', () => {
    const service = new ScoringService();

    it('always explains capacity, vehicle access and distance', () => {
        const reasons = service.explainSelection(makeProduct(), makeSlot({ distanceFromEntryM: 12.34 }));

        expect(reasons.length).toBeGreaterThan(0);
        expect(reasons).toContain('Enough remaining weight and volume capacity');
        expect(reasons.some(r => r.includes('forklift'))).toBe(true);
        expect(reasons).toContain('12.3 m from the entry point');
    });

    it('mentions zone and temperature only when the product requires them', () => {
        const plain = service.explainSelection(makeProduct(), makeSlot());
        const cold = service.explainSelection(
            makeProduct({ requiredZone: ZoneType.COLD, requiredTempMin: -5, requiredTempMax: 5 }),
            makeSlot({ zoneType: ZoneType.COLD, tempMin: -10, tempMax: 10 }),
        );

        expect(plain.some(r => r.startsWith('Required zone'))).toBe(false);
        expect(plain.some(r => r.includes('Temperature'))).toBe(false);
        expect(cold).toContain('Required zone cold matched');
        expect(cold.some(r => r.includes('Temperature'))).toBe(true);
    });
});
