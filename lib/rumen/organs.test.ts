import { describe, expect, it } from 'vitest';
import { meshSdf } from '@/lib/anatomy/mesher';
import { ABOMASUM_PATH, JOURNEY, ORGANS, PROBLEMS, abomasumShape, jejunumPath, omasumShape, reticulumShape, rumenShape } from './organs';

const inside = (s: ReturnType<typeof rumenShape>, p: [number, number, number]) => s.sdf(...p) < 0;

describe('ruminant digestive organs', () => {
  it('the rumen fills the left side; omasum and abomasum lie to the right', () => {
    const r = rumenShape();
    expect(inside(r, [-4, 8, -2.5])).toBe(true); // left
    expect(inside(r, [-4, 8, 2.5])).toBe(false); // right
    const o = omasumShape();
    expect(inside(o, [1.0, 7.65, 2.0])).toBe(true);
    const a = abomasumShape();
    expect(inside(a, [-1.4, 5.85, 2.0])).toBe(true);
  });
  it('the reticulum is the most cranial compartment', () => {
    const ret = reticulumShape();
    const r = rumenShape();
    const maxX = (s: ReturnType<typeof rumenShape>) => {
      const m = meshSdf(s.sdf, s.min, s.max, 0.15);
      let x = -1e9;
      for (let i = 0; i < m.positions.length; i += 3) x = Math.max(x, m.positions[i]);
      return x;
    };
    expect(maxX(ret)).toBeGreaterThan(maxX(r));
  });
  it('in LDA the abomasum moves to the left side; in RDA it rises on the right', () => {
    const mean = (k: keyof typeof ABOMASUM_PATH, i: 0 | 1 | 2) => ABOMASUM_PATH[k].reduce((s, p) => s + p[0][i], 0) / ABOMASUM_PATH[k].length;
    expect(mean('lda', 2)).toBeLessThan(-1.5);
    expect(mean('normal', 2)).toBeGreaterThan(0.5);
    expect(mean('rda', 1)).toBeGreaterThan(mean('normal', 1) + 1.5);
  });
  it('the intestines stay in the right ventral abdomen', () => {
    for (const p of jejunumPath()) {
      expect(p[2]).toBeGreaterThan(0.6);
      expect(p[1]).toBeGreaterThan(4.8);
    }
  });
  it('every journey step and problem is described', () => {
    expect(JOURNEY.length).toBeGreaterThanOrEqual(8);
    for (const j of JOURNEY) for (const f of j.focus) expect(ORGANS[f]).toBeTruthy();
    expect(PROBLEMS.map((p) => p.id)).toEqual(['frothy', 'freegas', 'hardware', 'lda', 'rda']);
    for (const p of PROBLEMS) expect(p.treatment.length).toBeGreaterThan(0);
    for (const p of PROBLEMS) expect(p.signs.length).toBeGreaterThan(0);
  });
});
