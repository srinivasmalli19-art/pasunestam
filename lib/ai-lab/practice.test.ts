import { describe, expect, it } from 'vitest';
import { X, centreY } from './anatomy';
import { assess, deposit, displayPose, move, startPractice, tipPosition, type GunPose } from './practice';

/** The pitch that lines the gun up with the tract centre at the cervix (the gun pivots at the vulva, 3 cm below it). */
const ALIGNED_PITCH = (Math.atan(3 / 40) * 180) / Math.PI; // ≈ 4.3°

describe('anatomy centre line', () => {
  it('slopes up through the vestibule, then runs level', () => {
    expect(centreY(0)).toBe(-3);
    expect(centreY(X.vestibuleEnd)).toBe(0);
    expect(centreY(30)).toBe(0);
    expect(centreY(6)).toBeGreaterThan(-3);
    expect(centreY(6)).toBeLessThan(0);
  });
});

describe('assess', () => {
  it('reports a gun that has not gone in yet', () => {
    expect(assess({ depth: -5, pitchDeg: 0, yawDeg: 0 }).zone).toBe('outside');
  });

  it('drops a level gun into the urethral opening', () => {
    const a = assess({ depth: 8, pitchDeg: 0, yawDeg: 0 });
    expect(a.zone).toBe('urethra');
    expect(a.status).toBe('error');
  });

  it('clears the urethral opening when angled upward', () => {
    const a = assess({ depth: 10, pitchDeg: 20, yawDeg: 0 });
    expect(a.zone).toBe('vestibule');
    expect(a.allowed).toBe(true);
  });

  it('refuses an angle so steep the tip goes through the vestibule roof', () => {
    const a = assess({ depth: 10, pitchDeg: 40, yawDeg: 0 });
    expect(a.allowed).toBe(false);
    expect(a.blockKind).toBe('wall');
  });

  it('lodges a misaligned tip in the fornix', () => {
    const a = assess({ depth: 34, pitchDeg: 8, yawDeg: 0 });
    expect(a.allowed).toBe(false);
    expect(a.blockKind).toBe('fornix');
  });

  it('passes through the cervix when lined up, counting the rings', () => {
    const a = assess({ depth: 41, pitchDeg: ALIGNED_PITCH, yawDeg: 0 });
    expect(a.zone).toBe('cervix');
    expect(a.allowed).toBe(true);
    expect(a.ringsPassed).toBe(3);
  });

  it('marks the uterine body just past the cervix as the correct site', () => {
    const a = assess({ depth: 44.6, pitchDeg: ALIGNED_PITCH, yawDeg: 0 });
    expect(a.zone).toBe('uterineBody');
    expect(a.status).toBe('success');
  });

  it('will not let the angle swing while the gun is through the cervix', () => {
    const a = assess({ depth: 44.6, pitchDeg: ALIGNED_PITCH + 3, yawDeg: 0 });
    expect(a.allowed).toBe(false);
    expect(a.blockKind).toBe('heldByCervix');
  });

  it('warns when the tip goes on into a horn', () => {
    const a = assess({ depth: 49, pitchDeg: ALIGNED_PITCH, yawDeg: 0 });
    expect(a.zone).toBe('horn');
    expect(a.status).toBe('warn');
  });

  it('puts the tip where the angle and depth say', () => {
    const t = tipPosition({ depth: 10, pitchDeg: 0, yawDeg: 0 });
    expect(t.x).toBeCloseTo(10);
    expect(t.y).toBeCloseTo(-3);
  });
});

/** Walks the gun in 0.5 cm steps to `depth` at a fixed angle. */
function pushTo(state: ReturnType<typeof startPractice>, depth: number, pitchDeg: number, yawDeg = 0) {
  let s = move(state, { ...state.pose, pitchDeg, yawDeg });
  while (s.pose.depth < depth - 0.01) {
    const before = s.pose.depth;
    s = move(s, { ...s.pose, depth: Math.min(depth, s.pose.depth + 0.5) });
    if (s.pose.depth === before) break; // refused
  }
  return s;
}

describe('a practice attempt', () => {
  it('scores a clean textbook pass as excellent', () => {
    let s = startPractice();
    s = pushTo(s, 14, 22); // in pointing upward, past the urethral opening
    s = move(s, { ...s.pose, pitchDeg: ALIGNED_PITCH }); // level off
    s = pushTo(s, 44.6, ALIGNED_PITCH);
    expect(s.assessment.zone).toBe('uterineBody');
    const r = deposit(s);
    expect(r.verdict).toBe('excellent');
    expect(r.score).toBe(100);
  });

  it('traps a level gun in the urethral opening until it is pulled back', () => {
    let s = startPractice();
    s = pushTo(s, 8, 0);
    expect(s.trapped).toBe(true);
    expect(s.urethraEntries).toBe(1);

    const tryRaise = move(s, { ...s.pose, pitchDeg: 20 });
    expect(tryRaise.pose.pitchDeg).toBe(0); // refused while trapped
    expect(tryRaise.feedback.status).toBe('error');

    let out = s;
    while (out.trapped) out = move(out, { ...out.pose, depth: out.pose.depth - 0.5 });
    expect(out.trapped).toBe(false);
    expect(out.urethraEntries).toBe(1);
  });

  it('counts holding the gun against a wall as one bump, not many', () => {
    let s = startPractice();
    s = pushTo(s, 14, 22);
    const stuck = [1, 2, 3].reduce((acc) => move(acc, { ...acc.pose, depth: acc.pose.depth + 30 }), s);
    // a jump of 30 cm at 22° drives the tip through the vaginal roof: refused each time, counted once
    expect(stuck.pose.depth).toBe(s.pose.depth);
    expect(stuck.wallBumps).toBe(1);
  });

  it('penalises depositing in the vagina', () => {
    let s = startPractice();
    s = pushTo(s, 14, 22);
    s = move(s, { ...s.pose, pitchDeg: ALIGNED_PITCH });
    s = pushTo(s, 25, ALIGNED_PITCH);
    const r = deposit(s);
    expect(r.verdict).toBe('poor');
    expect(r.score).toBeLessThanOrEqual(40);
  });

  it('keeps the angle within the allowed range', () => {
    const s = move(startPractice(), { depth: -6, pitchDeg: 90, yawDeg: -90 } as GunPose);
    expect(s.pose.pitchDeg).toBe(40);
    expect(s.pose.yawDeg).toBe(-15);
  });
});

describe('levelling off', () => {
  it('is safe once the tip is past the urethral opening, as the guided steps teach', () => {
    let s = startPractice();
    s = pushTo(s, 12, 22);
    s = move(s, { ...s.pose, pitchDeg: ALIGNED_PITCH });
    expect(s.trapped).toBe(false);
    expect(s.pose.pitchDeg).toBeCloseTo(ALIGNED_PITCH);
  });

  it('still drops into the opening if levelled too early', () => {
    let s = startPractice();
    s = pushTo(s, 9, 22);
    for (let p = 22; p >= 0; p -= 0.5) s = move(s, { ...s.pose, pitchDeg: p });
    expect(s.urethraEntries).toBe(1);
  });
});

describe('displayPose', () => {
  it('shows the gun as controlled normally', () => {
    const s = startPractice();
    expect(displayPose(s)).toEqual(s.pose);
  });

  it('draws a trapped tip down in the pouch below the vestibule floor', () => {
    let s = startPractice();
    s = pushTo(s, 8, 0);
    expect(s.trapped).toBe(true);
    const tip = tipPosition(displayPose(s));
    expect(tip.x).toBeGreaterThan(8);
    expect(tip.x).toBeLessThan(X.urethralOpening);
    expect(tip.y).toBeLessThan(centreY(tip.x) - 3.5); // below the floor
  });
});

describe('left and right', () => {
  it('names the horn on the side the tip is turned to (positive side angle = cow’s right)', () => {
    expect(assess({ depth: 49, pitchDeg: ALIGNED_PITCH, yawDeg: 0.6 }).message).toMatch(/right uterine horn/);
    expect(assess({ depth: 49, pitchDeg: ALIGNED_PITCH, yawDeg: -0.6 }).message).toMatch(/left uterine horn/);
  });
});
