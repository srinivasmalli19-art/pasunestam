import { describe, expect, it } from 'vitest';
import { DEFAULT_CASE, findings, schafferVerdict, torsionName, type TorsionConfig } from './rules';

const cfg = (type: TorsionConfig['type'], degree: number, direction: TorsionConfig['direction'] = 'clockwise'): TorsionConfig => ({
  type,
  degree,
  direction,
});

describe('findings', () => {
  it('pre-cervical: normal vagina, crossed ligaments per rectum', () => {
    const f = findings(cfg('pre', 180));
    expect(f.vaginal).toMatch(/NORMAL/);
    expect(f.rectal).toMatch(/left broad ligament is pulled tight over the top/);
    expect(f.rectal).toMatch(/right broad ligament runs down underneath/);
  });

  it('post-cervical: spiral folds turning the way of the torsion', () => {
    expect(findings(cfg('post', 180)).vaginal).toMatch(/spiral folds.*clockwise/);
    expect(findings(cfg('post', 180, 'anticlockwise')).vaginal).toMatch(/anticlockwise/);
  });

  it('mirrors the ligaments for an anticlockwise torsion', () => {
    const f = findings(cfg('post', 270, 'anticlockwise'));
    expect(f.rectal).toMatch(/right broad ligament is pulled tight over the top of the uterus towards the left/);
    expect(f.rectal).toMatch(/left broad ligament runs down underneath/);
  });

  it('cervix out of reach in severe post-cervical torsion', () => {
    expect(findings(cfg('post', 360)).vaginal).toMatch(/cannot be reached/);
  });

  it('names the torsion', () => {
    expect(torsionName(cfg('pre', 270, 'anticlockwise'))).toBe('270° left (anticlockwise) pre-cervical torsion');
  });
});

describe('schafferVerdict', () => {
  it('no correction for a normal uterus', () => {
    expect(schafferVerdict(cfg('none', 0)).level).toBe('notNeeded');
  });

  it('mild torsion usually needs no rolling', () => {
    expect(schafferVerdict(cfg('post', 90)).level).toBe('notNeeded');
  });

  it('early, stable 180–360° torsion of either type: flank method possible', () => {
    for (const type of ['pre', 'post'] as const) {
      for (const degree of [180, 270]) expect(schafferVerdict(cfg(type, degree)).level).toBe('possible');
    }
  });

  it('more than one full turn: surgery', () => {
    const v = schafferVerdict(cfg('post', 540));
    expect(v.level).toBe('surgery');
    expect(v.reasons.join(' ')).toMatch(/more than one full turn/);
  });

  it.each([
    ['weak animal', { animal: 'weak' as const }],
    ['rupture signs', { ruptureSigns: true }],
    ['over 48 hours', { hours: 'over48' as const }],
    ['emphysematous calf', { calf: 'emphysematous' as const }],
    ['3+ rolling attempts', { attempts: 'threePlus' as const }],
  ])('%s: surgery even for a 180° torsion', (_name, change) => {
    expect(schafferVerdict(cfg('post', 180), { ...DEFAULT_CASE, ...change }).level).toBe('surgery');
  });

  it('borderline cases: try with care', () => {
    expect(schafferVerdict(cfg('post', 270), { ...DEFAULT_CASE, hours: '24to48' }).level).toBe('caution');
    expect(schafferVerdict(cfg('pre', 360)).level).toBe('caution');
  });

  it('reminds to check the cervix opens after a non-surgical correction, but not when sending to surgery', () => {
    expect(schafferVerdict(cfg('post', 180)).notes.join(' ')).toMatch(/cervix opens/);
    expect(schafferVerdict(cfg('post', 540)).notes.join(' ')).not.toMatch(/cervix opens/);
  });

  it('pre-cervical: notes that per-vaginal rotation is impossible', () => {
    expect(schafferVerdict(cfg('pre', 180)).notes.join(' ')).toMatch(/not possible/);
  });
});
