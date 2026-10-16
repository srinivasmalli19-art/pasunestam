// Timing for the guided life-cycle movie. Each scene has a slow "look" phase
// (camera on one stage, text to read) and, if the parasite moves on, a "move"
// phase (a token travels to the next stage along the ring or inside the animal).

import type { CycleScene, HostPathId, Parasite } from './cycles';

export type CyclePhase = 'look' | 'move';
export const LOOK_SEC = 11;
export const MOVE_SEC = 7;

export function cyclePhasesOf(s: CycleScene): Array<{ phase: CyclePhase; sec: number }> {
  const out: Array<{ phase: CyclePhase; sec: number }> = [{ phase: 'look', sec: s.lookSec ?? LOOK_SEC }];
  if (s.move) out.push({ phase: 'move', sec: s.moveSec ?? MOVE_SEC });
  return out;
}
export const cycleSceneDuration = (s: CycleScene) => cyclePhasesOf(s).reduce((a, p) => a + p.sec, 0);
export const cycleMovieDuration = (p: Parasite) => p.scenes.reduce((a, s) => a + cycleSceneDuration(s), 0);
export const cycleSceneStart = (p: Parasite, index: number) => p.scenes.slice(0, index).reduce((a, s) => a + cycleSceneDuration(s), 0);

export function cycleLocate(p: Parasite, t: number): { index: number; local: number } {
  let rest = Math.max(0, t);
  for (let i = 0; i < p.scenes.length; i++) {
    const d = cycleSceneDuration(p.scenes[i]);
    if (rest < d || i === p.scenes.length - 1) return { index: i, local: Math.min(rest, d) };
    rest -= d;
  }
  return { index: 0, local: 0 };
}

export type CycleShot =
  | { kind: 'overview' }
  | { kind: 'stage'; stage: string }
  | { kind: 'host'; anchor: NonNullable<CycleScene['hostView']> }
  | { kind: 'pair'; from: string; to: string }
  | { kind: 'hostWide' };

export interface CycleFrame {
  phase: CyclePhase;
  progress: number;
  caption: string;
  shot: CycleShot;
  /** Stage in focus (its part names are shown). */
  focus?: string;
  /** Moving token: from → to, along the ring or a path in the animal; u in [0, 1]. */
  token?: { from: string; to: string; via?: HostPathId; u: number };
  /** Make the animal see-through. */
  xray: boolean;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (k: number) => k * k * (3 - 2 * k);

export function cycleFrameAt(s: CycleScene, t: number): CycleFrame {
  const phases = cyclePhasesOf(s);
  let rest = Math.max(0, t);
  let i = 0;
  while (i < phases.length - 1 && rest >= phases[i].sec) {
    rest -= phases[i].sec;
    i++;
  }
  const { phase, sec } = phases[i];
  const progress = clamp01(rest / sec);
  if (phase === 'look') {
    const shot: CycleShot = s.hostView ? { kind: 'host', anchor: s.hostView } : s.stage ? { kind: 'stage', stage: s.stage } : { kind: 'overview' };
    return { phase, progress, caption: s.text, shot, focus: s.hostView ? undefined : s.stage, xray: !!s.hostView && s.hostView !== 'jaw' };
  }
  const m = s.move!;
  const from = s.stage!;
  // the token waits a moment, travels, then rests at the next stage
  const u = ease(clamp01((progress - 0.12) / 0.76));
  return {
    phase,
    progress,
    caption: m.text,
    shot: m.via ? { kind: 'hostWide' } : { kind: 'pair', from, to: m.to },
    token: { from, to: m.to, via: m.via, u },
    xray: !!m.via,
  };
}

export function shotKey(s: CycleShot): string {
  switch (s.kind) {
    case 'overview':
    case 'hostWide':
      return s.kind;
    case 'stage':
      return `stage:${s.stage}`;
    case 'host':
      return `host:${s.anchor}`;
    case 'pair':
      return `pair:${s.from}:${s.to}`;
  }
}
