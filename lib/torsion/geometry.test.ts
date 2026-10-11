import { describe, expect, it } from 'vitest';
import { baseRadius, ligamentPath, radiusAt, twistAt, twistZone } from './geometry';

const R = 15;
/** Does the path go over the top of the uterus (y above it) / underneath (y below it)? */
const overTop = (p: Array<[number, number]>) => p.some(([z, y]) => y > R && Math.abs(z) < 3);
const underneath = (p: Array<[number, number]>) => p.some(([z, y]) => y < -R && Math.abs(z) < 3);

describe('twist position', () => {
  it('pre-cervical twist lies in front of the cervix, post-cervical in the front of the vagina', () => {
    expect(twistZone('pre')![0]).toBeGreaterThanOrEqual(40);
    expect(twistZone('post')![1]).toBeLessThanOrEqual(30);
  });

  it('vagina untwisted in pre-cervical, cervix fully rotated in post-cervical', () => {
    expect(twistAt(20, 'pre', 180)).toBe(0);
    expect(twistAt(35, 'pre', 180)).toBe(0);
    expect(twistAt(35, 'post', 180)).toBe(180);
    expect(twistAt(70, 'pre', 180)).toBe(180);
  });

  it('pinches the tract at the twist, more for a tighter torsion', () => {
    expect(radiusAt(22, 'post', 360)).toBeLessThan(radiusAt(22, 'post', 90));
    expect(radiusAt(22, 'pre', 360)).toBe(baseRadius(22));
  });
});

describe('broad ligaments', () => {
  it('hang down each side, not crossing, when there is no torsion', () => {
    const left = ligamentPath('left', 70, 0, R);
    const right = ligamentPath('right', 70, 0, R);
    expect(left.every(([z]) => z < 0)).toBe(true);
    expect(right.every(([z]) => z > 0)).toBe(true);
  });

  it('clockwise (right) torsion: LEFT ligament over the top, RIGHT one underneath', () => {
    expect(overTop(ligamentPath('left', 70, 180, R))).toBe(true);
    expect(underneath(ligamentPath('right', 70, 180, R))).toBe(true);
    expect(underneath(ligamentPath('left', 70, 180, R))).toBe(false);
  });

  it('anticlockwise (left) torsion: RIGHT ligament over the top, LEFT one underneath', () => {
    expect(overTop(ligamentPath('right', 70, -180, R))).toBe(true);
    expect(underneath(ligamentPath('left', 70, -180, R))).toBe(true);
  });

  it('wraps right round for a 360° torsion', () => {
    const p = ligamentPath('left', 70, 360, R);
    expect(overTop(p)).toBe(true);
    expect(underneath(p)).toBe(true);
  });

  it('returns evenly spaced points starting at the fixed top attachment', () => {
    const p = ligamentPath('left', 70, 180, R, 30);
    expect(p).toHaveLength(30);
    expect(p[0]).toEqual([-20, 24]);
  });
});
