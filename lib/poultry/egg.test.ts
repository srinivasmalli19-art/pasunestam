import { describe, expect, it } from 'vitest';
import { SEGMENTS, SEGMENT_SPAN, TIMELINE, eggAt, fmtHours } from './egg';
import { EGG_MOVIE, EGG_TOKENS, eggFrameAt, eggLocate, eggMovieDuration, eggPhasesOf, eggSceneDuration, eggSceneStart } from './movie';

describe('egg formation model', () => {
  it('splits the oviduct by length, the magnum being the longest part', () => {
    expect(SEGMENT_SPAN.infundibulum[0]).toBe(0);
    expect(SEGMENT_SPAN.vagina[1]).toBeCloseTo(1);
    const len = (s: (typeof SEGMENTS)[number]) => SEGMENT_SPAN[s][1] - SEGMENT_SPAN[s][0];
    expect(Math.max(...SEGMENTS.map(len))).toBe(len('magnum'));
  });

  it('is still on the ovary before ovulation', () => {
    const e = eggAt(-2);
    expect(e.segment).toBe('ovary');
    expect(e.albumen).toBe(0);
  });

  it('goes through each part in order, adding the right layer in the right place', () => {
    const inf = eggAt(0.1);
    expect(inf.segment).toBe('infundibulum');
    expect(inf.albumen).toBe(0);

    const mag = eggAt(1.75);
    expect(mag.segment).toBe('magnum');
    expect(mag.albumen).toBeGreaterThan(0.3);
    expect(mag.albumen).toBeLessThan(0.7);
    expect(mag.membranes).toBe(0);

    const ist = eggAt(4);
    expect(ist.segment).toBe('isthmus');
    expect(ist.albumen).toBe(1);
    expect(ist.membranes).toBeGreaterThan(0.4);
    expect(ist.shell).toBe(0);

    const ut = eggAt(15);
    expect(ut.segment).toBe('uterus');
    expect(ut.plumping).toBe(1);
    expect(ut.shell).toBeGreaterThan(0.3);
    expect(ut.shell).toBeLessThan(0.8);
    expect(ut.pigment).toBe(0);

    const late = eggAt(TIMELINE.vagina - 0.1);
    expect(late.shell).toBe(1);
    expect(late.pigment).toBeGreaterThan(0.9);
    expect(late.cuticle).toBeGreaterThan(0.8);
    expect(late.turned).toBe(1);

    expect(eggAt(TIMELINE.laid + 0.1).segment).toBe('laid');
  });

  it('only moves forward along the oviduct', () => {
    let last = -1;
    for (let h = 0; h <= TIMELINE.laid; h += 0.05) {
      const s = eggAt(h).s;
      expect(s).toBeGreaterThanOrEqual(last - 1e-9);
      last = s;
    }
  });

  it('formats hours for students', () => {
    expect(fmtHours(1.5)).toBe('1 h 30 min');
    expect(fmtHours(0.25)).toBe('15 min');
    expect(fmtHours(-5)).toBe('−5 h');
  });
});

describe('egg formation movie', () => {
  it('runs forward in time and ends with the egg laid', () => {
    let last = -Infinity;
    for (const s of EGG_MOVIE) {
      expect(s.hFrom, s.id).toBeGreaterThanOrEqual(last);
      expect(s.hTo, s.id).toBeGreaterThanOrEqual(s.hFrom);
      last = s.hTo;
    }
    expect(eggAt(EGG_MOVIE.at(-1)!.hTo).segment).toBe('laid');
  });

  it('visits every part of the oviduct and shows each key hormone', () => {
    const ids = EGG_MOVIE.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['infundibulum', 'magnum', 'isthmus', 'plumping', 'calcium', 'pigment', 'laid']));
    const hormones = new Set(EGG_MOVIE.map((s) => s.hormone).filter(Boolean));
    for (const h of ['gnrh', 'fsh', 'lh', 'estrogen', 'progesterone', 'yolk', 'vitD', 'calcium', 'avt']) expect(hormones.has(h as never), h).toBe(true);
    for (const s of EGG_MOVIE) if (s.hormone) expect(EGG_TOKENS[s.hormone].short).toBeTruthy();
  });

  it('is slow: 6–10 minutes at normal speed', () => {
    expect(eggMovieDuration()).toBeGreaterThan(360);
    expect(eggMovieDuration()).toBeLessThan(600);
  });

  it('hormone scenes have all four explanations; egg scenes move at an even pace', () => {
    for (const s of EGG_MOVIE) {
      if (s.hormone) {
        expect([s.route, s.to, s.travel, s.arrive].every(Boolean), s.id).toBe(true);
        expect(eggPhasesOf(s)).toHaveLength(4);
      }
    }
    const mag = EGG_MOVIE.find((s) => s.id === 'magnum')!;
    const mid = eggFrameAt(mag, 6 + (mag.resultSec! / 2));
    expect(mid.hour).toBeCloseTo((mag.hFrom + mag.hTo) / 2, 5);
    expect(eggAt(mid.hour).segment).toBe('magnum');
  });

  it('locates scenes on the movie clock', () => {
    const at = eggLocate(eggSceneStart(9) + 1);
    expect(at.index).toBe(9);
    expect(at.local).toBeCloseTo(1);
    expect(eggSceneDuration(EGG_MOVIE[0])).toBeGreaterThan(10);
  });
});
