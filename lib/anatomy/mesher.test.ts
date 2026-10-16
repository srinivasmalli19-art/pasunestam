import { describe, expect, it } from 'vitest';
import { meshSdf } from './mesher';
import { blend, capsule, ellipsoid, roundBox, roundCone, sphere, subtract, toSurface, torus } from './sdf';

describe('sdf primitives', () => {
  it('measure distance correctly at simple points', () => {
    expect(sphere([0, 0, 0], 1)(2, 0, 0)).toBeCloseTo(1);
    expect(capsule([0, 0, 0], [0, 2, 0], 0.5)(1, 1, 0)).toBeCloseTo(0.5);
    expect(roundCone([0, 0, 0], [0, 2, 0], 0.5, 0.5)(0, -1, 0)).toBeCloseTo(0.5);
    expect(roundBox([0, 0, 0], [1, 1, 1], 0.1)(2, 0, 0)).toBeCloseTo(1);
    expect(torus([0, 0, 0], 2, 0.5, 'z')(2, 0, 0)).toBeCloseTo(-0.5);
    expect(ellipsoid([0, 0, 0], [2, 1, 1])(2, 0, 0)).toBeCloseTo(0, 5);
  });
  it('subtracts and blends', () => {
    const s = subtract(sphere([0, 0, 0], 1), 0, sphere([1, 0, 0], 0.5));
    expect(s(0.9, 0, 0)).toBeGreaterThan(0); // carved away
    expect(blend(0.3, sphere([0, 0, 0], 1), sphere([1.5, 0, 0], 1))(0.75, 0, 0)).toBeLessThan(0);
  });
  it('moves a point onto the surface', () => {
    const p = toSurface(sphere([0, 0, 0], 1), [0.3, 0.2, 0.1]);
    expect(Math.hypot(...p)).toBeCloseTo(1, 4);
  });
});

describe('mesher', () => {
  const m = meshSdf(sphere([0, 0, 0], 1), [-1.3, -1.3, -1.3], [1.3, 1.3, 1.3], 0.08);
  it('puts vertices on the surface', () => {
    for (let i = 0; i < m.positions.length; i += 3) {
      const r = Math.hypot(m.positions[i], m.positions[i + 1], m.positions[i + 2]);
      expect(Math.abs(r - 1)).toBeLessThan(0.05);
    }
  });
  it('makes a closed mesh with outward-facing triangles and normals', () => {
    expect(m.indices.length).toBeGreaterThan(1000);
    let outward = 0;
    const tri = m.indices.length / 3;
    for (let t = 0; t < m.indices.length; t += 3) {
      const [a, b, c] = [m.indices[t], m.indices[t + 1], m.indices[t + 2]].map((i) => [m.positions[3 * i], m.positions[3 * i + 1], m.positions[3 * i + 2]]);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const cen = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      if (n[0] * cen[0] + n[1] * cen[1] + n[2] * cen[2] > 0) outward++;
    }
    expect(outward / tri).toBeGreaterThan(0.99);
    // gradient normals point outward
    expect(m.normals[0] * m.positions[0] + m.normals[1] * m.positions[1] + m.normals[2] * m.positions[2]).toBeGreaterThan(0.9);
  });
});
