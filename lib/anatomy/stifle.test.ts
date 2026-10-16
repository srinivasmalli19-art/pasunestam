import { describe, expect, it } from 'vitest';
import { FLEXED, LOCKED, LOCKED_PATELLA, STANDING, STIFLE_STEPS, ligament, patellaFor } from './stifle';

describe('stifle model', () => {
  it('the patella slides down the groove as the stifle bends', () => {
    const straight = patellaFor(LOCKED).s;
    const stand = patellaFor(STANDING).s;
    const bent = patellaFor(FLEXED).s;
    expect(straight).toBeLessThan(stand);
    expect(stand).toBeLessThan(bent);
  });
  it('in upward fixation the patella sits higher and on the medial side', () => {
    expect(LOCKED_PATELLA[1]).toBeGreaterThan(patellaFor(LOCKED).centre[1]);
    expect(LOCKED_PATELLA[2]).toBeLessThan(0); // medial is −z for the right leg
  });
  it('the medial ligament runs on the medial side', () => {
    const [a, b] = ligament('medial', patellaFor(STANDING).centre, STANDING);
    expect(a[2]).toBeLessThan(0);
    expect(b[2]).toBeLessThan(0);
    const [c] = ligament('lateral', patellaFor(STANDING).centre, STANDING);
    expect(c[2]).toBeGreaterThan(0);
  });
  it('the lesson asks which ligament to cut before cutting it, and frees the patella at the end', () => {
    const quiz = STIFLE_STEPS.findIndex((s) => s.quiz);
    const cut = STIFLE_STEPS.findIndex((s) => s.cut);
    expect(quiz).toBeGreaterThan(0);
    expect(cut).toBeGreaterThan(quiz);
    expect(STIFLE_STEPS.at(-1)!.motion).toBe('free');
  });
});
