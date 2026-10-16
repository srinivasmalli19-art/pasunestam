import { describe, expect, it } from 'vitest';
import { MOVIES, TOKEN_NAMES, frameAt, locate, movieDuration, phasesOf, sceneDuration, sceneStart } from './movie';
import type { Outcome } from './cycle';

const outcomes: Outcome[] = ['notPregnant', 'pregnant'];

describe('estrous movie', () => {
  it('moves forward in time, never backwards', () => {
    for (const o of outcomes) {
      let last = -1;
      for (const s of MOVIES[o]) {
        expect(s.dayFrom, `${o}/${s.id}`).toBeGreaterThanOrEqual(last);
        expect(s.dayTo, `${o}/${s.id}`).toBeGreaterThanOrEqual(s.dayFrom);
        last = s.dayTo;
      }
    }
  });

  it('ends at the next heat (not pregnant) and at day 40 (pregnant)', () => {
    expect(MOVIES.notPregnant.at(-1)!.dayTo).toBe(21);
    expect(MOVIES.pregnant.at(-1)!.dayTo).toBe(40);
  });

  it('is slow enough to follow: about 3–7 minutes at normal speed', () => {
    for (const o of outcomes) {
      expect(movieDuration(o)).toBeGreaterThan(180);
      expect(movieDuration(o)).toBeLessThan(420);
    }
  });

  it('every hormone scene names its route, target and all four explanations', () => {
    for (const o of outcomes)
      for (const s of MOVIES[o]) {
        expect(s.release.length).toBeGreaterThan(20);
        expect(s.result.length).toBeGreaterThan(20);
        if (s.hormone) {
          expect(s.route, s.id).toBeTruthy();
          expect(s.to, s.id).toBeTruthy();
          expect(s.travel, s.id).toBeTruthy();
          expect(s.arrive, s.id).toBeTruthy();
          expect(TOKEN_NAMES[s.hormone].short).toBeTruthy();
          expect(phasesOf(s).map((p) => p.phase)).toEqual(['release', 'travel', 'arrive', 'result']);
        } else {
          expect(phasesOf(s).map((p) => p.phase)).toEqual(['release', 'result']);
        }
      }
  });

  it('a hormone starts at its gland, is followed by the camera, and acts at the target', () => {
    const lh = MOVIES.notPregnant.find((s) => s.id === 'lh-surge')!;
    const rel = frameAt(lh, 1);
    expect(rel.phase).toBe('release');
    expect(rel.tokens[0].u).toBe(0);
    expect(rel.glow).toContain('pituitary');
    const mid = frameAt(lh, 5 + 4);
    expect(mid.phase).toBe('travel');
    expect(mid.shot).toBe('followToken');
    expect(mid.tokens[0].u).toBeGreaterThan(0.3);
    expect(mid.tokens[0].u).toBeLessThan(0.7);
    const act = frameAt(lh, 5 + 8 + 1);
    expect(act.phase).toBe('arrive');
    expect(act.tokens[0].u).toBe(1);
    expect(act.glow).toContain('follicle');
    const res = frameAt(lh, sceneDuration(lh));
    expect(res.phase).toBe('result');
    expect(res.tokens).toHaveLength(0);
    expect(res.day).toBeCloseTo(lh.dayTo);
  });

  it('PGF2α comes in several pulses that all reach the CL', () => {
    const pgf = MOVIES.notPregnant.find((s) => s.id === 'pgf')!;
    const early = frameAt(pgf, 5 + 1);
    expect(early.tokens).toHaveLength(4);
    expect(early.tokens[0].u).toBeGreaterThan(early.tokens[3].u);
    const end = frameAt(pgf, 5 + 7.99);
    expect(end.tokens.every((t) => t.u > 0.95)).toBe(true);
    expect(end.tokens.filter((t) => t.lead)).toHaveLength(1);
  });

  it('shows blocks only once the hormone has arrived', () => {
    const p4 = MOVIES.notPregnant.find((s) => s.id === 'p4-brain')!;
    expect(frameAt(p4, 2).blocked).toBeUndefined();
    expect(frameAt(p4, 5 + 8 + 1).blocked?.text).toMatch(/GnRH/);
  });

  it('locates scenes on the movie clock', () => {
    const o = 'pregnant';
    const i = 6;
    const at = locate(o, sceneStart(o, i) + 2);
    expect(at.index).toBe(i);
    expect(at.local).toBeCloseTo(2);
    expect(locate(o, 1e6).index).toBe(MOVIES[o].length - 1);
  });

  it('pregnant movie includes fertilisation and maternal recognition; non-pregnant includes luteolysis', () => {
    const ids = (o: Outcome) => MOVIES[o].map((s) => s.id);
    expect(ids('pregnant')).toEqual(expect.arrayContaining(['fertilisation', 'cleavage', 'ifn', 'placentomes']));
    expect(ids('pregnant')).not.toContain('pgf');
    expect(ids('notPregnant')).toEqual(expect.arrayContaining(['pgf', 'next-heat']));
  });
});
