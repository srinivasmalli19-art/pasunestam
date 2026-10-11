import { describe, expect, it } from 'vitest';
import { PROCEDURE } from './procedure';
import { assess, type GunPose } from './practice';

const lerp = (a: GunPose, b: GunPose, t: number): GunPose => ({
  depth: a.depth + (b.depth - a.depth) * t,
  pitchDeg: a.pitchDeg + (b.pitchDeg - a.pitchDeg) * t,
  yawDeg: a.yawDeg + (b.yawDeg - a.yawDeg) * t,
});

describe('guided procedure', () => {
  // The demo animation must never show a move the practice rules would call wrong.
  const inserting = PROCEDURE.filter((s) => s.gun.visible && s.gun.to.depth >= s.gun.from.depth && s.gun.to.depth > 0);

  it.each(inserting.map((s) => [s.title, s] as const))('"%s" keeps the gun in valid positions', (_title, step) => {
    for (let i = 0; i <= 40; i++) {
      const a = assess(lerp(step.gun.from, step.gun.to, i / 40));
      expect(a.allowed).toBe(true);
      expect(a.zone).not.toBe('urethra');
    }
  });

  it('ends the insertion at the correct deposition site', () => {
    const depositStep = PROCEDURE.find((s) => s.deposit);
    expect(depositStep).toBeDefined();
    expect(assess(depositStep!.gun.to).zone).toBe('uterineBody');
  });
});
