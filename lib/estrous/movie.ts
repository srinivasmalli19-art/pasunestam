// The guided "movie" of the estrous cycle: an ordered list of scenes, each
// following one hormone from where it is released to where it acts, then
// showing what happens there. Pure data + timing, so it is unit-tested and the
// 3D scene only has to draw the frame it is given.
//
// Each hormone scene has four phases:
//   release → the hormone appears (named circle) at the gland that makes it
//   travel  → the camera follows it through the blood to its target
//   arrive  → it acts on the target
//   result  → the days move on and the student sees how things look now
// Scenes without a hormone (ovulation, cleavage…) have only release + result.
//
// Clinical content: typical values for a cow; to be reviewed by a veterinarian.

import type { Hormone, Outcome } from './cycle';

export type TokenKind = Hormone | 'gnrh' | 'sperm';
export type RouteId =
  | 'hypoToPitu'
  | 'pituToOvary'
  | 'follicleToBrain'
  | 'follicleToTract'
  | 'clToUterus'
  | 'clToBrain'
  | 'uterusToCl'
  | 'embryoToUterus'
  | 'spermToAmpulla';
export type SiteId = 'hypothalamus' | 'pituitary' | 'follicle' | 'ovary' | 'cl' | 'uterus' | 'cervix' | 'oviduct' | 'embryo';
export type ShotId = 'overview' | 'brain' | 'ovary' | 'oviduct' | 'uterus' | 'tract' | 'followToken' | 'followEmbryo';
export type MoviePhase = 'release' | 'travel' | 'arrive' | 'result';

export const TOKEN_NAMES: Record<TokenKind, { short: string; name: string }> = {
  gnrh: { short: 'GnRH', name: 'releasing h.' },
  lh: { short: 'LH', name: 'luteinising' },
  fsh: { short: 'FSH', name: 'follicle-stim.' },
  estradiol: { short: 'E2', name: 'oestradiol' },
  progesterone: { short: 'P4', name: 'progesterone' },
  pgf2a: { short: 'PGF2α', name: 'prostaglandin' },
  ifnTau: { short: 'IFN-τ', name: 'interferon' },
  sperm: { short: 'Sperm', name: 'from AI' },
};

export interface MovieScene {
  id: string;
  /** Short chapter title. */
  title: string;
  dayFrom: number;
  dayTo: number;
  hormone?: TokenKind;
  route?: RouteId;
  /** Several tokens one after another (PGF2α pulses, sperm). */
  count?: number;
  from: SiteId;
  to?: SiteId;
  /** Camera while releasing (or for a show-only scene). */
  shot: ShotId;
  /** Camera when it arrives and for the result (defaults to `shot`). */
  arriveShot?: ShotId;
  resultShot?: ShotId;
  release: string;
  travel?: string;
  arrive?: string;
  result: string;
  /** Shown during arrive + result, e.g. "✕ No GnRH surge". */
  blocked?: { site: SiteId; text: string };
  /** Short bubble in the result, at the site. */
  callout?: { site: SiteId; text: string };
  /** A practical field note for the side panel. */
  note?: string;
  travelSec?: number;
  resultSec?: number;
}

export const PHASE_SEC = { release: 5, travel: 8, arrive: 5, result: 8 } as const;

// ---- scenes ------------------------------------------------------------------

const intro: MovieScene = {
  id: 'intro',
  title: 'Meet the organs',
  dayFrom: 0,
  dayTo: 0,
  from: 'hypothalamus',
  shot: 'overview',
  release:
    'The cycle is controlled from the brain. The hypothalamus and the anterior pituitary send hormones in the blood to the ovaries; the ovaries answer with their own hormones.',
  result:
    'On the ovary: follicles (fluid-filled, yellow-white) make oestradiol; the corpus luteum (orange) makes progesterone. The uterus decides around day 16 whether the corpus luteum lives. Day 0 = the day of standing heat.',
  resultSec: 9,
};

const e2ToBrain: MovieScene = {
  id: 'e2-brain',
  title: 'Oestradiol reaches the brain',
  dayFrom: 0,
  dayTo: 0.15,
  hormone: 'estradiol',
  route: 'follicleToBrain',
  from: 'follicle',
  to: 'hypothalamus',
  shot: 'ovary',
  arriveShot: 'brain',
  release: 'The mature (Graafian) follicle — about 16 mm — releases a large amount of oestradiol (E2) into the blood.',
  travel: 'Oestradiol travels in the blood from the ovary to the brain.',
  arrive: 'At the hypothalamus, high oestradiol switches on heat behaviour and prepares the GnRH surge.',
  result: 'The cow is in standing heat: she stands to be mounted, mounts others, bellows and is restless. Heat lasts about 12–18 hours.',
  callout: { site: 'hypothalamus', text: 'Heat behaviour ON' },
  note: 'The surest sign of heat is standing to be mounted. Watch at least twice a day, early morning and evening.',
};

const e2ToTract: MovieScene = {
  id: 'e2-tract',
  title: 'Oestradiol acts on the tract',
  dayFrom: 0.15,
  dayTo: 0.25,
  hormone: 'estradiol',
  route: 'follicleToTract',
  from: 'follicle',
  to: 'cervix',
  shot: 'ovary',
  arriveShot: 'tract',
  release: 'The same follicle keeps releasing oestradiol.',
  travel: 'This time follow it to the reproductive tract — the uterus, cervix and vagina.',
  arrive: 'Oestradiol relaxes and opens the cervix and makes it secrete thin, clear mucus. The uterus becomes toned (firm, coiled on rectal palpation).',
  result: 'Clear, stringy mucus hangs from the vulva; the vulva is swollen and red. The open cervix lets semen be deposited easily at AI.',
  callout: { site: 'cervix', text: 'Clear mucus · cervix open' },
};

const gnrhSurge: MovieScene = {
  id: 'gnrh-surge',
  title: 'GnRH surge',
  dayFrom: 0.25,
  dayTo: 0.3,
  hormone: 'gnrh',
  route: 'hypoToPitu',
  from: 'hypothalamus',
  to: 'pituitary',
  shot: 'brain',
  release: 'Triggered by high oestradiol, the hypothalamus releases a surge of GnRH (gonadotrophin-releasing hormone).',
  travel: 'GnRH does not go into the general blood — it passes down the tiny portal vessels of the pituitary stalk.',
  arrive: 'GnRH reaches the anterior pituitary and makes it release LH in one big burst.',
  result: 'The anterior pituitary is switched on: the LH surge begins.',
  callout: { site: 'pituitary', text: 'LH surge starting' },
  travelSec: 6,
  note: 'GnRH injections (e.g. in Ovsynch) copy this step to make a follicle ovulate at a planned time.',
};

const lhSurge: MovieScene = {
  id: 'lh-surge',
  title: 'LH surge reaches the follicle',
  dayFrom: 0.3,
  dayTo: 0.9,
  hormone: 'lh',
  route: 'pituToOvary',
  from: 'pituitary',
  to: 'follicle',
  shot: 'brain',
  arriveShot: 'ovary',
  release: 'The anterior pituitary pours out the LH surge (luteinising hormone).',
  travel: 'LH travels in the blood all the way to the ovary.',
  arrive: 'LH acts on the mature follicle: the egg finishes maturing and the follicle wall starts to weaken.',
  result: 'The follicle is ready to burst. Ovulation comes about a day after the LH surge — roughly 10–14 hours after heat ends.',
  callout: { site: 'follicle', text: 'Ready to ovulate' },
};

const ovulation: MovieScene = {
  id: 'ovulation',
  title: 'Ovulation',
  dayFrom: 0.9,
  dayTo: 1.4,
  from: 'follicle',
  shot: 'ovary',
  release: 'Heat is over. Watch the mature follicle on the right ovary…',
  result:
    'The follicle ruptures and releases the egg (oocyte). The funnel of the oviduct (infundibulum) catches it and moves it into the oviduct. A small blood-filled crater is left behind: the corpus haemorrhagicum (red).',
  callout: { site: 'ovary', text: 'Egg released' },
  resultSec: 10,
  note: 'AM–PM rule: seen in heat in the morning → inseminate that evening; seen in the evening → next morning. Sperm need some hours in the tract to become ready, so they should be waiting when the egg arrives.',
};

const fshWave = (dayFrom: number, dayTo: number): MovieScene => ({
  id: 'fsh-wave',
  title: 'FSH starts a follicle wave',
  dayFrom,
  dayTo,
  hormone: 'fsh',
  route: 'pituToOvary',
  from: 'pituitary',
  to: 'ovary',
  shot: 'brain',
  arriveShot: 'ovary',
  release: 'Soon after ovulation the anterior pituitary releases a rise of FSH (follicle-stimulating hormone).',
  travel: 'FSH travels in the blood to both ovaries.',
  arrive: 'FSH wakes up a group of small follicles (3–5 mm) — a new follicular wave.',
  result: 'Several small follicles grow; soon one becomes dominant and the others shrink. Cows usually have 2 or 3 waves in each cycle.',
  callout: { site: 'ovary', text: 'New follicle wave' },
});

const luteinisation = (dayFrom: number, dayTo: number): MovieScene => ({
  id: 'cl-forms',
  title: 'LH builds the corpus luteum',
  dayFrom,
  dayTo,
  hormone: 'lh',
  route: 'pituToOvary',
  from: 'pituitary',
  to: 'cl',
  shot: 'brain',
  arriveShot: 'ovary',
  release: 'After the surge, the pituitary keeps sending LH in small pulses.',
  travel: 'The LH pulses travel to the ovary.',
  arrive: 'LH turns the cells of the ruptured follicle into luteal cells (luteinisation).',
  result: 'The red corpus haemorrhagicum becomes a yellow-orange corpus luteum (CL) and starts making progesterone.',
  callout: { site: 'cl', text: 'Corpus luteum forming' },
  resultSec: 9,
  note: 'A CL younger than about 5 days does not respond to a PGF2α injection.',
});

const p4ToUterus = (dayFrom: number, dayTo: number, pregnant: boolean): MovieScene => ({
  id: 'p4-uterus',
  title: 'Progesterone prepares the uterus',
  dayFrom,
  dayTo,
  hormone: 'progesterone',
  route: 'clToUterus',
  from: 'cl',
  to: 'uterus',
  shot: 'ovary',
  arriveShot: 'uterus',
  release: 'The corpus luteum releases progesterone (P4) — more each day as it grows.',
  travel: 'Progesterone travels to the uterus.',
  arrive: 'Progesterone makes the uterine glands secrete “uterine milk” and keeps the uterus quiet (no contractions).',
  result: pregnant
    ? 'The uterus is ready to feed the free-floating embryo. The CL reaches full size (about 25 mm) by day 8–9.'
    : 'The uterus is ready for a pregnancy. The CL reaches full size (about 25 mm) by day 8–9; progesterone is at its peak.',
  callout: { site: 'uterus', text: 'Uterus quiet & ready' },
});

const p4BlocksBrain = (dayFrom: number, dayTo: number, pregnant: boolean): MovieScene => ({
  id: 'p4-brain',
  title: pregnant ? 'Progesterone stops heat returning' : 'Progesterone blocks heat',
  dayFrom,
  dayTo,
  hormone: 'progesterone',
  route: 'clToBrain',
  from: 'cl',
  to: 'hypothalamus',
  shot: 'ovary',
  arriveShot: 'brain',
  resultShot: 'ovary',
  release: 'The corpus luteum keeps releasing progesterone.',
  travel: 'Progesterone also travels to the brain.',
  arrive: 'At the hypothalamus progesterone blocks the GnRH surge — so there is no LH surge, no heat and no ovulation.',
  result: pregnant
    ? 'With the CL kept, progesterone stays high: the cow does not come back into heat at day 21 — the first sign of pregnancy a farmer notices.'
    : 'The dominant follicle of the first wave grows but cannot ovulate — it shrinks away (atresia). Around day 9–10, FSH starts a second wave.',
  blocked: { site: 'hypothalamus', text: '✕ No GnRH surge' },
  callout: pregnant ? { site: 'cl', text: 'CL kept' } : { site: 'follicle', text: 'Follicle cannot ovulate' },
  resultSec: 9,
});

const pgf: MovieScene = {
  id: 'pgf',
  title: 'No embryo: PGF2α destroys the CL',
  dayFrom: 16.2,
  dayTo: 19,
  hormone: 'pgf2a',
  route: 'uterusToCl',
  count: 4,
  from: 'uterus',
  to: 'cl',
  shot: 'uterus',
  arriveShot: 'ovary',
  release:
    'Day 16–17: no embryo has signalled the mother. Helped by oxytocin from the CL, the endometrium releases PGF2α in pulses.',
  travel:
    'PGF2α passes from the uterine vein straight into the ovarian artery wrapped around it (counter-current transfer) — so it reaches the CL on the same side.',
  arrive: 'Pulse after pulse, PGF2α destroys the corpus luteum (luteolysis).',
  result: 'Within 1–2 days the CL shrinks and turns pale. Progesterone falls to almost nothing.',
  callout: { site: 'cl', text: 'CL regressing' },
  resultSec: 10,
  note: 'A PGF2α injection copies this — it works on a CL older than about 5 days and brings the cow into heat in 2–5 days. Never inject a pregnant cow: it can cause abortion.',
};

const gnrhPulses: MovieScene = {
  id: 'gnrh-pulses',
  title: 'GnRH pulses return',
  dayFrom: 19,
  dayTo: 19.3,
  hormone: 'gnrh',
  route: 'hypoToPitu',
  count: 3,
  from: 'hypothalamus',
  to: 'pituitary',
  shot: 'brain',
  release: 'With progesterone gone, the brain is free again: the hypothalamus releases GnRH pulses more often.',
  travel: 'The pulses pass down the pituitary stalk.',
  arrive: 'Each GnRH pulse makes the anterior pituitary release a pulse of LH.',
  result: 'LH pulses become frequent — proestrus begins.',
  travelSec: 6,
};

const lhPulsesFollicle: MovieScene = {
  id: 'lh-follicle',
  title: 'The next follicle matures',
  dayFrom: 19.3,
  dayTo: 20.7,
  hormone: 'lh',
  route: 'pituToOvary',
  count: 3,
  from: 'pituitary',
  to: 'follicle',
  shot: 'brain',
  arriveShot: 'ovary',
  release: 'The anterior pituitary sends frequent LH pulses.',
  travel: 'LH travels to the ovary.',
  arrive: 'The LH pulses drive the dominant follicle of the last wave.',
  result: 'The follicle grows to about 16 mm and makes more and more oestradiol (proestrus).',
  callout: { site: 'follicle', text: 'Oestradiol rising' },
};

const nextHeat: MovieScene = {
  id: 'next-heat',
  title: 'Heat again — day 21',
  dayFrom: 20.7,
  dayTo: 21,
  hormone: 'estradiol',
  route: 'follicleToBrain',
  from: 'follicle',
  to: 'hypothalamus',
  shot: 'ovary',
  arriveShot: 'brain',
  resultShot: 'overview',
  release: 'The new mature follicle releases a peak of oestradiol.',
  travel: 'Oestradiol travels to the brain again.',
  arrive: 'Heat behaviour switches on and the GnRH surge follows — exactly as at the start.',
  result: 'About 21 days after the last heat (18–24 days is normal), the cow is in heat again. If she is not pregnant, the cycle repeats.',
  callout: { site: 'hypothalamus', text: 'Heat again' },
  note: 'If a cow inseminated 3 weeks ago comes back into heat around day 18–24, she did not conceive — inseminate again.',
};

// ---- pregnant-only scenes ------------------------------------------------------

const fertilisation: MovieScene = {
  id: 'fertilisation',
  title: 'Fertilisation',
  dayFrom: 1.4,
  dayTo: 1.9,
  hormone: 'sperm',
  route: 'spermToAmpulla',
  count: 6,
  from: 'uterus',
  to: 'oviduct',
  shot: 'oviduct',
  release: 'Semen from AI (given about 12 hours earlier) is in the uterus; the sperm have become ready to fertilise (capacitation).',
  travel: 'The sperm swim up through the uterine horn and into the oviduct.',
  arrive: 'In the ampulla of the oviduct they meet the egg. One sperm enters it — fertilisation.',
  result: 'The egg is now a single-cell zygote, still in the upper oviduct.',
  callout: { site: 'embryo', text: 'Zygote' },
  note: 'Semen deposited in the uterine body (just past the cervix) gives sperm the best chance to reach the oviduct.',
};

const cleavage: MovieScene = {
  id: 'cleavage',
  title: 'Cleavage in the oviduct',
  dayFrom: 1.9,
  dayTo: 4.9,
  from: 'embryo',
  shot: 'followEmbryo',
  release: 'The zygote starts dividing while the oviduct slowly moves it towards the uterus.',
  result: 'It divides to 2, then 4, 8 and 16 cells (a morula) — still inside its shell, the zona pellucida — and reaches the uterine horn on about day 4–5.',
  resultSec: 12,
};

const blastocyst: MovieScene = {
  id: 'blastocyst',
  title: 'Blastocyst and hatching',
  dayFrom: 6.5,
  dayTo: 10,
  from: 'embryo',
  shot: 'followEmbryo',
  release: 'In the uterine horn the morula, fed by uterine milk, keeps growing.',
  result:
    'Day 7–8: it becomes a blastocyst — a fluid-filled ball with an inner cell mass (the future calf) and an outer layer (trophoblast, the future placenta). Day 9–10: it hatches out of the zona pellucida.',
  resultSec: 11,
  note: 'Embryo transfer uses embryos at this stage (day 7).',
};

const ifnTau: MovieScene = {
  id: 'ifn',
  title: 'The embryo saves the CL',
  dayFrom: 13,
  dayTo: 17,
  hormone: 'ifnTau',
  route: 'embryoToUterus',
  from: 'embryo',
  to: 'uterus',
  shot: 'uterus',
  release: 'Day 13–16: the embryo has stretched into a long thread along the horn. Its outer layer releases interferon-tau (IFN-τ).',
  travel: 'Interferon-tau acts locally — it spreads over the lining of the uterus (endometrium).',
  arrive: 'Interferon-tau stops the endometrium from releasing PGF2α pulses.',
  result: 'No PGF2α, so the corpus luteum is NOT destroyed — this is maternal recognition of pregnancy (day 15–17).',
  blocked: { site: 'uterus', text: '✕ PGF2α blocked' },
  callout: { site: 'cl', text: 'CL saved' },
  resultSec: 9,
  note: 'Many embryos are lost before day 16 — if the signal is too weak or late, the CL is destroyed and the cow returns to heat, often a little later than 21 days.',
};

const attachment: MovieScene = {
  id: 'attachment',
  title: 'Attachment',
  dayFrom: 19.5,
  dayTo: 28,
  from: 'uterus',
  shot: 'uterus',
  release: 'The embryo’s membranes now fill the pregnant horn and begin to spread into the other horn.',
  result: 'From about day 19–20 the membranes attach to the uterine lining. Progesterone from the CL keeps everything in place.',
  resultSec: 10,
};

const placentomes: MovieScene = {
  id: 'placentomes',
  title: 'Placentomes — pregnancy established',
  dayFrom: 28,
  dayTo: 40,
  from: 'uterus',
  shot: 'uterus',
  release: 'Around day 30 the true placenta starts to form.',
  result:
    'Placentomes form where fetal cotyledons meet the mother’s caruncles (red). Progesterone from the CL maintains the pregnancy (the placenta takes over later in gestation).',
  callout: { site: 'uterus', text: 'Placentomes' },
  resultSec: 11,
  note: 'Pregnancy diagnosis: ultrasound from about day 28–30; rectal palpation from about day 35–40 (membrane slip, fluid in the horn).',
};

export const MOVIES: Record<Outcome, MovieScene[]> = {
  notPregnant: [
    intro,
    e2ToBrain,
    e2ToTract,
    gnrhSurge,
    lhSurge,
    ovulation,
    fshWave(1.4, 2.8),
    luteinisation(2.8, 5.5),
    p4ToUterus(5.5, 9, false),
    p4BlocksBrain(9, 11.5, false),
    pgf,
    gnrhPulses,
    lhPulsesFollicle,
    nextHeat,
  ],
  pregnant: [
    intro,
    e2ToBrain,
    e2ToTract,
    gnrhSurge,
    lhSurge,
    ovulation,
    fertilisation,
    cleavage,
    { ...luteinisation(4.9, 6.5), release: 'Meanwhile on the ovary: since ovulation the pituitary has been sending LH in small pulses.' },
    p4ToUterus(6.5, 6.5, true),
    blastocyst,
    ifnTau,
    p4BlocksBrain(17, 19.5, true),
    attachment,
    placentomes,
  ],
};

// ---- timing ---------------------------------------------------------------------

export function phasesOf(s: MovieScene): Array<{ phase: MoviePhase; sec: number }> {
  if (!s.hormone) {
    return [
      { phase: 'release', sec: PHASE_SEC.release },
      { phase: 'result', sec: s.resultSec ?? PHASE_SEC.result },
    ];
  }
  return [
    { phase: 'release', sec: PHASE_SEC.release },
    { phase: 'travel', sec: s.travelSec ?? PHASE_SEC.travel },
    { phase: 'arrive', sec: PHASE_SEC.arrive },
    { phase: 'result', sec: s.resultSec ?? PHASE_SEC.result },
  ];
}

export const sceneDuration = (s: MovieScene) => phasesOf(s).reduce((a, p) => a + p.sec, 0);
export const movieDuration = (o: Outcome) => MOVIES[o].reduce((a, s) => a + sceneDuration(s), 0);

export interface MovieToken {
  kind: TokenKind;
  route: RouteId;
  /** 0 = at the source, 1 = at the target. */
  u: number;
  /** Size multiplier (pulses while released, shrinks as it acts). */
  scale: number;
  /** Only the first token carries the name badge. */
  lead: boolean;
}

export interface MovieFrame {
  phase: MoviePhase;
  /** 0–1 within the phase. */
  progress: number;
  day: number;
  shot: ShotId;
  tokens: MovieToken[];
  glow: SiteId[];
  blocked?: { site: SiteId; text: string };
  callout?: { site: SiteId; text: string };
  caption: string;
}

const ease = (k: number) => k * k * (3 - 2 * k);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Everything the 3D scene needs to draw scene `s`, `t` seconds after it started. */
export function frameAt(s: MovieScene, t: number): MovieFrame {
  const phases = phasesOf(s);
  let rest = Math.max(0, t);
  let i = 0;
  while (i < phases.length - 1 && rest >= phases[i].sec) {
    rest -= phases[i].sec;
    i++;
  }
  const { phase, sec } = phases[i];
  const progress = clamp01(rest / sec);
  const n = s.count ?? 1;
  const tokens: MovieToken[] = [];
  const addTokens = (uOf: (k: number) => number, scale: number) => {
    if (!s.hormone || !s.route) return;
    for (let k = 0; k < n; k++) tokens.push({ kind: s.hormone, route: s.route, u: uOf(k), scale, lead: k === 0 });
  };

  let day = s.dayFrom;
  let shot: ShotId = s.shot;
  let caption = s.release;
  const glow: SiteId[] = [];
  if (phase === 'release') {
    glow.push(s.from);
    addTokens(() => 0, 0.6 + 0.4 * ease(clamp01(progress * 2)));
  } else if (phase === 'travel') {
    shot = 'followToken';
    caption = s.travel ?? s.release;
    // several tokens leave one after another and all arrive by the end
    const spread = 0.3;
    addTokens((k) => clamp01(progress * (1 + spread * (n - 1)) - spread * k), 1);
    if (s.to) glow.push(s.to); // show where it is heading
  } else if (phase === 'arrive') {
    shot = s.arriveShot ?? s.shot;
    caption = s.arrive ?? s.result;
    if (s.to) glow.push(s.to);
    addTokens(() => 1, 1 - 0.45 * ease(progress));
  } else {
    shot = s.resultShot ?? s.arriveShot ?? s.shot;
    caption = s.result;
    day = s.dayFrom + (s.dayTo - s.dayFrom) * ease(progress);
    if (s.to) glow.push(s.to);
  }

  return {
    phase,
    progress,
    day,
    shot,
    tokens,
    glow,
    blocked: s.blocked && (phase === 'arrive' || phase === 'result') ? s.blocked : undefined,
    callout: s.callout && phase === 'result' ? s.callout : undefined,
    caption,
  };
}

/** Which scene (and time within it) is playing at `t` seconds into the movie. */
export function locate(o: Outcome, t: number): { index: number; local: number } {
  const list = MOVIES[o];
  let rest = Math.max(0, t);
  for (let i = 0; i < list.length; i++) {
    const d = sceneDuration(list[i]);
    if (rest < d || i === list.length - 1) return { index: i, local: Math.min(rest, d) };
    rest -= d;
  }
  return { index: 0, local: 0 };
}

export function sceneStart(o: Outcome, index: number): number {
  return MOVIES[o].slice(0, index).reduce((a, s) => a + sceneDuration(s), 0);
}
