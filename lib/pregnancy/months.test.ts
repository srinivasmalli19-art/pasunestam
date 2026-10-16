import { describe, expect, it } from 'vitest';
import { BODY, COMPARE, MONTHS, SPECIES, monthMidDay, monthOfDay, pregnancyAt, type Species } from './months';

const species: Species[] = ['buffalo', 'cow'];

describe('pregnancy month by month', () => {
  it('has one entry per month for each species', () => {
    expect(MONTHS.buffalo).toHaveLength(10);
    expect(MONTHS.cow).toHaveLength(9);
    for (const s of species) MONTHS[s].forEach((m, i) => expect(m.month).toBe(i + 1));
  });

  it('the uterus starts in the pelvis and goes deepest around months 5–7', () => {
    for (const s of species) {
      const early = pregnancyAt(s, monthMidDay(s, 1));
      expect(early.centre[0]).toBeLessThan(BODY.pelvicBrim[0]); // caudal to the brim = in the pelvis
      const xs = Array.from({ length: SPECIES[s].months }, (_, i) => pregnancyAt(s, monthMidDay(s, i + 1)).centre[0]);
      const deepest = xs.indexOf(Math.max(...xs)) + 1;
      expect(deepest, s).toBeGreaterThanOrEqual(5);
      expect(deepest, s).toBeLessThanOrEqual(7);
    }
  });

  it('the fetus grows every month and is out of reach in mid-pregnancy only', () => {
    for (const s of species) {
      let last = 0;
      const reach: string[] = [];
      for (let m = 1; m <= SPECIES[s].months; m++) {
        const st = pregnancyAt(s, monthMidDay(s, m));
        expect(st.crl).toBeGreaterThan(last);
        last = st.crl;
        reach.push(st.reach);
      }
      expect(reach[0]).toBe('tooSmall');
      expect(reach.at(-1)).toBe('yes');
      const out = reach.map((r, i) => (r === 'no' ? i + 1 : 0)).filter(Boolean);
      expect(out.length, `${s}: ${reach.join(',')}`).toBeGreaterThan(0);
      expect(Math.min(...out)).toBeGreaterThanOrEqual(4);
      expect(Math.max(...out)).toBeLessThanOrEqual(7);
    }
  });

  it('the uterus never goes below the abdominal floor', () => {
    for (const s of species)
      for (let d = 0; d <= SPECIES[s].gestationDays; d += 5) {
        const st = pregnancyAt(s, d);
        expect(st.centre[1] - st.ry).toBeGreaterThan(4.8);
      }
  });

  it('maps days to months', () => {
    expect(monthOfDay('buffalo', 5)).toBe(1);
    expect(monthOfDay('buffalo', 309)).toBe(10);
    expect(monthOfDay('cow', 282)).toBe(9);
    expect(COMPARE.length).toBeGreaterThan(3);
  });
});
