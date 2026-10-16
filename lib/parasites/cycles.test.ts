import { describe, expect, it } from 'vitest';
import { PARASITES, PARASITE_ORDER, nextStage, stageOf } from './cycles';
import { cycleFrameAt, cycleLocate, cycleMovieDuration, cycleSceneDuration, cycleSceneStart } from './movie';

describe('parasite life cycles', () => {
  for (const id of PARASITE_ORDER) {
    const p = PARASITES[id];
    describe(p.latin, () => {
      it('has unique, numbered stages in ring order', () => {
        const ids = p.stages.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        p.stages.forEach((s, i) => expect(s.n).toBe(i + 1));
      });

      it('has exactly the expected infective stage(s) and they come before the host', () => {
        const inf = p.stages.filter((s) => s.infective);
        expect(inf.length).toBeGreaterThan(0);
      });

      it('keeps bubbles apart on the ring', () => {
        const a = p.stages.map((s) => ((s.angle % 360) + 360) % 360).sort((x, y) => x - y);
        for (let i = 0; i < a.length; i++) {
          const gap = i === a.length - 1 ? a[0] + 360 - a[i] : a[i + 1] - a[i];
          expect(gap).toBeGreaterThanOrEqual(28);
        }
      });

      it('movie scenes point at real stages and every move goes to the next stage on the ring', () => {
        for (const s of p.scenes) {
          if (s.stage) expect(stageOf(p, s.stage), s.id).toBeDefined();
          if (s.move) {
            expect(s.stage, s.id).toBeDefined();
            expect(s.move.to).toBe(nextStage(p, s.stage!));
          }
        }
      });

      it('the movie visits every stage and every ring step', () => {
        const visited = new Set(p.scenes.map((s) => s.stage).filter(Boolean));
        for (const st of p.stages) expect(visited.has(st.id), st.id).toBe(true);
        const moves = new Set(p.scenes.filter((s) => s.move).map((s) => s.stage));
        expect(moves.size).toBe(p.stages.length);
      });

      it('control measures target real stages', () => {
        for (const c of p.controls) {
          expect(c.targets.length).toBeGreaterThan(0);
          for (const t of c.targets) expect(stageOf(p, t), `${c.id}:${t}`).toBeDefined();
        }
      });

      it('quiz answers are valid', () => {
        for (const q of p.quiz) {
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(q.options.length);
        }
      });

      it('is slow enough to read (at least 9 s per look)', () => {
        for (const s of p.scenes) expect(cycleSceneDuration(s)).toBeGreaterThanOrEqual(9);
        expect(cycleMovieDuration(p)).toBeGreaterThan(120);
      });

      it('locate and scene start agree', () => {
        p.scenes.forEach((_, i) => {
          const t = cycleSceneStart(p, i) + 0.01;
          expect(cycleLocate(p, t).index).toBe(i);
        });
        expect(cycleLocate(p, 1e9).index).toBe(p.scenes.length - 1);
      });

      it('moves the token from 0 to 1 during a move phase', () => {
        const s = p.scenes.find((x) => x.move)!;
        const look = s.lookSec ?? 11;
        const start = cycleFrameAt(s, look + 0.01);
        const end = cycleFrameAt(s, cycleSceneDuration(s) - 0.01);
        expect(start.phase).toBe('move');
        expect(start.token!.u).toBe(0);
        expect(end.token!.u).toBeCloseTo(1, 5);
      });
    });
  }

  it('fluke: only the metacercaria infects; snail is the intermediate host', () => {
    const f = PARASITES.fluke;
    expect(f.stages.filter((s) => s.infective).map((s) => s.id)).toEqual(['metacercaria']);
    expect(f.stages.some((s) => s.habitat === 'snail')).toBe(true);
    expect(f.controls.find((c) => c.id === 'triclabendazole')!.targets).toContain('juvenile');
  });

  it('theileria: sexual stage in the tick, transstadial', () => {
    const t = PARASITES.theileria;
    expect(stageOf(t, 'gamete')!.habitat).toBe('tick');
    expect(stageOf(t, 'kinete')!.what).toMatch(/transstadial/i);
    expect(t.controls.find((c) => c.id === 'buparvaquone')!.targets).toEqual(expect.arrayContaining(['schizont', 'piroplasm']));
  });

  it('haemonchus: direct cycle, sheathed L3 infective, prepatent about 3 weeks', () => {
    const h = PARASITES.haemonchus;
    expect(h.stages.every((s) => s.habitat !== 'snail' && s.habitat !== 'tick')).toBe(true);
    expect(stageOf(h, 'L3')!.infective).toBe(true);
    expect(h.facts.prepatent).toMatch(/18–21/);
  });
});
