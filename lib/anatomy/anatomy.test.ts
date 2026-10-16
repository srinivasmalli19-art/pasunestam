import { describe, expect, it } from 'vitest';
import { BONES } from './cow-bones';
import { buildSkeleton, spineAt, SPINE_LENGTH, vertebraParams } from './cow-skeleton';
import { meshSdf } from './mesher';
import { toSurface } from './sdf';

const pieces = buildSkeleton();

describe('cow skeleton', () => {
  it('has the bovine bone counts', () => {
    const count = (bone: string) => pieces.filter((p) => p.bone === bone).length;
    expect(pieces.filter((p) => /^C\d$/.test(p.id))).toHaveLength(7);
    expect(count('thoracic')).toBe(13);
    expect(count('lumbar')).toBe(6);
    expect(count('sacrum')).toBe(1);
    expect(pieces.filter((p) => p.id.startsWith('rib'))).toHaveLength(26); // 13 pairs
    expect(count('femur')).toBe(2);
    expect(count('p3')).toBe(8); // two weight-bearing digits per foot
  });

  it('every piece is described, and every bone with landmarks has some', () => {
    for (const p of pieces) expect(BONES[p.bone], p.id).toBeTruthy();
    for (const b of Object.values(BONES)) {
      expect(b.summary.length, b.id).toBeGreaterThan(30);
      expect(b.landmarks.length, b.id).toBeGreaterThan(1);
    }
  });

  it('the vertebral column fits along the spine curve', () => {
    expect(spineAt(0).p[0]).toBeGreaterThan(spineAt(SPINE_LENGTH).p[0]); // runs head → tail
    expect(vertebraParams('T', 3).spine).toBeGreaterThan(vertebraParams('T', 13).spine); // withers are the highest
  });

  it('feet stand on the ground and the withers are about 1.3–1.45 m high', () => {
    const feet = pieces.filter((p) => p.bone === 'p3');
    for (const f of feet) expect(f.pos[1]).toBeLessThan(0.7);
    const t3 = pieces.find((p) => p.id === 'T3')!;
    const withers = t3.pos[1] + vertebraParams('T', 3).spine;
    expect(withers).toBeGreaterThan(12.8);
    expect(withers).toBeLessThan(14.8);
  });

  it('bone shapes mesh into closed surfaces and landmarks sit on the bone', () => {
    const seen = new Set<string>();
    for (const p of pieces) {
      if (!p.shape || seen.has(p.bone)) continue;
      seen.add(p.bone);
      const s = p.shape();
      const m = meshSdf(s.sdf, s.min, s.max, 0.09);
      expect(m.indices.length, p.bone).toBeGreaterThan(300);
      // the mesh must not touch the bounding box (or the bone was cut off)
      for (let i = 0; i < m.positions.length; i += 3)
        for (let a = 0; a < 3; a++) {
          expect(m.positions[i + a], `${p.bone} inside its box`).toBeGreaterThan(s.min[a] + 0.04);
          expect(m.positions[i + a], `${p.bone} inside its box`).toBeLessThan(s.max[a] - 0.04);
        }
      for (const l of BONES[p.bone].landmarks) {
        const q = toSurface(s.sdf, l.at);
        const moved = Math.hypot(q[0] - l.at[0], q[1] - l.at[1], q[2] - l.at[2]);
        expect(moved, `${p.bone}: ${l.name}`).toBeLessThan(0.45);
      }
    }
  });
});
