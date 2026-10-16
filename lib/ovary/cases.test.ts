import { describe, expect, it } from 'vitest';
import { CASES, DIFFERENTIALS, caseFor, quizOrder } from './cases';

const byId = (id: string) => CASES.find((c) => c.id === id)!;

describe('ovarian structures', () => {
  it('covers the conditions a field vet must tell apart', () => {
    for (const id of ['inactive', 'follicle', 'cl', 'clCystic', 'follicularCyst', 'lutealCyst']) expect(byId(id), id).toBeTruthy();
  });
  it('cysts are 25 mm or more; a normal follicle is smaller', () => {
    expect(byId('follicularCyst').structures[0].sizeMm).toBeGreaterThanOrEqual(25);
    expect(byId('lutealCyst').structures[0].sizeMm).toBeGreaterThanOrEqual(25);
    expect(byId('follicle').structures[0].sizeMm).toBeLessThan(25);
  });
  it('a luteal cyst has a thicker wall and is firmer than a follicular cyst', () => {
    const f = byId('follicularCyst').structures[0];
    const l = byId('lutealCyst').structures[0];
    expect(l.wallMm!).toBeGreaterThan(3);
    expect(f.wallMm!).toBeLessThan(3);
    expect(byId('lutealCyst').give).toBeLessThan(byId('follicularCyst').give);
  });
  it('corpora lutea have a crown; cysts do not', () => {
    expect(byId('cl').structures[0].crown).toBe(true);
    expect(byId('clCystic').structures[0].crown).toBe(true);
    expect(byId('lutealCyst').structures[0].crown).toBeFalsy();
  });
  it('an inactive ovary is small and has no structure', () => {
    const i = byId('inactive');
    expect(i.structures).toHaveLength(0);
    expect(i.ovaryMm[0]).toBeLessThan(byId('cl').ovaryMm[0]);
  });
  it('buffalo ovaries and structures are smaller', () => {
    const cow = byId('cl');
    const buf = caseFor(cow, 'buffalo');
    expect(buf.ovaryMm[0]).toBeLessThan(cow.ovaryMm[0]);
    expect(buf.structures[0].sizeMm).toBeLessThan(cow.structures[0].sizeMm);
  });
  it('the quiz shows every condition once, in a mixed order', () => {
    const q = quizOrder(7);
    expect([...q].sort()).toEqual(CASES.map((c) => c.id).sort());
    expect(q).not.toEqual(CASES.map((c) => c.id));
    expect(DIFFERENTIALS.length).toBeGreaterThan(4);
  });
});
