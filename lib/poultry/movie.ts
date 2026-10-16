// The guided movie of egg formation in the hen: hormones (named circles)
// travel from the gland that makes them to where they act, then the yolk
// travels down the oviduct while each part adds its layer. Same four-phase
// structure as the estrous movie (release → travel → arrive → result).
// Clock: hours after ovulation. Clinical content: to be reviewed by a vet.

import { TIMELINE, LH_SURGE_HOURS_BEFORE } from './egg';

export type EggTokenKind = 'gnrh' | 'fsh' | 'lh' | 'estrogen' | 'progesterone' | 'yolk' | 'vitD' | 'calcium' | 'avt' | 'pg';
export type EggRouteId =
  | 'hypoToPitu'
  | 'pituToOvary'
  | 'pituToF1'
  | 'ovaryToLiver'
  | 'liverToF1'
  | 'f1ToHypo'
  | 'kidneyToGut'
  | 'gutToUterus'
  | 'boneToUterus'
  | 'postPituToUterus'
  | 'pofToUterus';
export type EggSiteId =
  | 'hypothalamus'
  | 'pituitary'
  | 'postPituitary'
  | 'ovary'
  | 'f1'
  | 'liver'
  | 'kidney'
  | 'gut'
  | 'bone'
  | 'infundibulum'
  | 'magnum'
  | 'isthmus'
  | 'uterus'
  | 'vagina'
  | 'egg';
export type EggShotId = 'overview' | 'brain' | 'ovary' | 'liver' | 'calcium' | 'oviduct' | 'followToken' | 'followEgg';
export type EggMoviePhase = 'release' | 'travel' | 'arrive' | 'result';

export const EGG_TOKENS: Record<EggTokenKind, { short: string; name: string; color: string; dark?: boolean }> = {
  gnrh: { short: 'GnRH', name: 'releasing h.', color: '#6250d6' },
  fsh: { short: 'FSH', name: 'follicle-stim.', color: '#eda100', dark: true },
  lh: { short: 'LH', name: 'luteinising', color: '#1baf7a', dark: true },
  estrogen: { short: 'E2', name: 'oestrogen', color: '#2a78d6' },
  progesterone: { short: 'P4', name: 'progesterone', color: '#eb6834', dark: true },
  yolk: { short: 'Yolk', name: 'VTG + VLDL', color: '#f6d34a', dark: true },
  vitD: { short: 'Vit D3', name: 'calcitriol', color: '#00838f' },
  calcium: { short: 'Ca²⁺', name: 'calcium', color: '#eceff1', dark: true },
  avt: { short: 'AVT', name: 'vasotocin', color: '#455a64' },
  pg: { short: 'PG', name: 'prostaglandin', color: '#e87ba4', dark: true },
};

export interface EggScene {
  id: string;
  title: string;
  /** Model clock (hours after ovulation) at the start and end of the scene. */
  hFrom: number;
  hTo: number;
  hormone?: EggTokenKind;
  route?: EggRouteId;
  count?: number;
  from: EggSiteId;
  to?: EggSiteId;
  shot: EggShotId;
  arriveShot?: EggShotId;
  resultShot?: EggShotId;
  release: string;
  travel?: string;
  arrive?: string;
  result: string;
  callout?: { site: EggSiteId; text: string };
  /** Parts of the tract to highlight in a show-only scene. */
  highlight?: EggSiteId[];
  note?: string;
  travelSec?: number;
  resultSec?: number;
}

export const EGG_PHASE_SEC = { release: 6, travel: 8, arrive: 6, result: 9 } as const;
const T = TIMELINE;
const LH = -LH_SURGE_HOURS_BEFORE;

export const EGG_MOVIE: EggScene[] = [
  {
    id: 'intro',
    title: 'Meet the hen’s reproductive tract',
    hFrom: -8,
    hTo: -8,
    from: 'ovary',
    shot: 'overview',
    highlight: ['ovary', 'infundibulum', 'magnum', 'isthmus', 'uterus', 'vagina'],
    release:
      'A hen has only ONE working ovary and oviduct — the LEFT. The right ones stay small and do not work.',
    result:
      'The ovary looks like a bunch of grapes: yellow yolks of different sizes in a queue (hierarchy). The oviduct (65–70 cm) has five parts — infundibulum, magnum, isthmus, uterus (shell gland) and vagina — each coloured differently here.',
    resultSec: 12,
  },
  {
    id: 'gnrh',
    title: 'Light starts it: GnRH',
    hFrom: -8,
    hTo: -8,
    hormone: 'gnrh',
    route: 'hypoToPitu',
    from: 'hypothalamus',
    to: 'pituitary',
    shot: 'brain',
    release: 'Day length reaches the hen’s brain. With long days (about 16 hours of light) the hypothalamus releases GnRH.',
    travel: 'GnRH passes down the short portal vessels to the anterior pituitary.',
    arrive: 'GnRH makes the anterior pituitary release FSH and LH.',
    result: 'The pituitary now sends FSH and LH to the ovary.',
    callout: { site: 'pituitary', text: 'FSH + LH released' },
    travelSec: 6,
    note: 'This is why layer houses use a lighting programme: falling day length or a missed light schedule reduces laying.',
  },
  {
    id: 'fsh',
    title: 'FSH recruits a new yolk',
    hFrom: -8,
    hTo: -8,
    hormone: 'fsh',
    route: 'pituToOvary',
    from: 'pituitary',
    to: 'ovary',
    shot: 'brain',
    arriveShot: 'ovary',
    release: 'The anterior pituitary releases FSH (follicle-stimulating hormone).',
    travel: 'FSH travels in the blood to the ovary.',
    arrive: 'FSH acts on the small white follicles.',
    result: 'About one small follicle a day is selected to join the queue of large yellow yolks (the hierarchy).',
    callout: { site: 'ovary', text: 'New follicle selected' },
  },
  {
    id: 'estrogen',
    title: 'Oestrogen tells the liver to make yolk',
    hFrom: -8,
    hTo: -8,
    hormone: 'estrogen',
    route: 'ovaryToLiver',
    from: 'ovary',
    to: 'liver',
    shot: 'ovary',
    arriveShot: 'liver',
    release: 'The small follicles of the ovary release oestrogen.',
    travel: 'Oestrogen travels in the blood to the liver.',
    arrive: 'In the liver, oestrogen switches on the making of yolk proteins (vitellogenin) and yolk fat (VLDL).',
    result:
      'The liver now makes the yolk material. Oestrogen also builds medullary bone (a calcium store inside the leg bones) and keeps the oviduct glands working.',
    callout: { site: 'liver', text: 'Making yolk material' },
    note: 'Fatty liver (fatty liver haemorrhagic syndrome) is common in high-producing caged layers — the liver works very hard for yolk.',
  },
  {
    id: 'yolk',
    title: 'Yolk material reaches the follicle',
    hFrom: -8,
    hTo: -6,
    hormone: 'yolk',
    route: 'liverToF1',
    count: 3,
    from: 'liver',
    to: 'f1',
    shot: 'liver',
    arriveShot: 'ovary',
    release: 'The liver releases yolk material (vitellogenin and VLDL fat) into the blood.',
    travel: 'Yolk material travels in the blood to the large follicles on the ovary.',
    arrive: 'The follicle takes the yolk material in, layer by layer.',
    result:
      'In 7–11 days of fast growth a follicle grows from about 6 mm to about 40 mm — that is the yolk. Its colour comes from yellow pigments in the feed (xanthophylls) carried in with the yolk fat.',
    callout: { site: 'f1', text: 'Largest yolk (F1)' },
    note: 'Pale yolks usually mean too little pigment in the feed (maize, marigold) or poor absorption — more in Part 2.',
  },
  {
    id: 'p4',
    title: 'Progesterone signals “ready”',
    hFrom: -6,
    hTo: LH,
    hormone: 'progesterone',
    route: 'f1ToHypo',
    from: 'f1',
    to: 'hypothalamus',
    shot: 'ovary',
    arriveShot: 'brain',
    release: 'The largest, ripest follicle (F1) releases progesterone.',
    travel: 'Progesterone travels to the brain.',
    arrive: 'At the hypothalamus progesterone causes a burst of GnRH (positive feedback).',
    result: 'The pituitary answers with an LH surge.',
    callout: { site: 'pituitary', text: 'LH surge' },
  },
  {
    id: 'lh',
    title: 'LH surge → ovulation in ~5 hours',
    hFrom: LH,
    hTo: -0.4,
    hormone: 'lh',
    route: 'pituToF1',
    from: 'pituitary',
    to: 'f1',
    shot: 'brain',
    arriveShot: 'ovary',
    release: 'The anterior pituitary releases the LH surge.',
    travel: 'LH travels in the blood to the ovary.',
    arrive: 'LH acts on the F1 follicle: the pale band on its surface (the stigma) starts to weaken.',
    result: 'About 4–6 hours after the LH surge the follicle is ready to split open.',
    callout: { site: 'f1', text: 'Stigma weakening' },
  },
  {
    id: 'ovulation',
    title: 'Ovulation',
    hFrom: -0.4,
    hTo: 0.08,
    from: 'f1',
    shot: 'ovary',
    highlight: ['infundibulum'],
    release: 'Watch the stigma of the largest follicle…',
    result:
      'The follicle splits along the stigma and releases the yolk (ovum). The funnel of the infundibulum wraps around it. The empty follicle (post-ovulatory follicle) is left on the ovary.',
    callout: { site: 'egg', text: 'Yolk released' },
    resultSec: 10,
    note: 'A hen usually ovulates 15–75 minutes after laying the previous egg — so a new egg is already starting as the last one is laid.',
  },
  {
    id: 'infundibulum',
    title: 'Infundibulum — fertilisation',
    hFrom: 0.08,
    hTo: T.magnum,
    from: 'egg',
    shot: 'followEgg',
    highlight: ['infundibulum'],
    release: 'The infundibulum holds the yolk for only 15–30 minutes.',
    result:
      'If the hen has mated, sperm waiting here fertilise the yolk now — before any white is added. The outer layer of the yolk (vitelline) membrane is added.',
    callout: { site: 'egg', text: 'Vitelline membrane' },
    resultSec: 12,
    note: 'Fertilisation can only happen here — once albumen covers the yolk, sperm cannot reach it.',
  },
  {
    id: 'magnum',
    title: 'Magnum — the egg white',
    hFrom: T.magnum,
    hTo: T.isthmus,
    from: 'egg',
    shot: 'followEgg',
    highlight: ['magnum'],
    release: 'The magnum is the longest part (about 33 cm). Its glands are packed with albumen proteins.',
    result:
      'In about 3 hours the magnum wraps the yolk in almost all the egg-white protein. The layer next to the yolk forms the chalazae — the cords that later hold the yolk in the centre.',
    callout: { site: 'egg', text: 'Albumen added' },
    resultSec: 16,
    note: 'The albumen is thick and gel-like now; it will take up water later in the uterus. Watery whites in laid eggs point to old eggs, old hens or infectious bronchitis.',
  },
  {
    id: 'isthmus',
    title: 'Isthmus — shell membranes',
    hFrom: T.isthmus,
    hTo: T.uterus,
    from: 'egg',
    shot: 'followEgg',
    highlight: ['isthmus'],
    release: 'The egg moves into the narrower isthmus for about 1¼ hours.',
    result:
      'The isthmus spins the inner and outer shell membranes — tough fibres that wrap the egg and give it its shape. At its end the first calcium seeds (mammillary knobs) are placed on the outer membrane.',
    callout: { site: 'egg', text: 'Shell membranes' },
    resultSec: 13,
  },
  {
    id: 'plumping',
    title: 'Uterus — plumping',
    hFrom: T.uterus,
    hTo: T.plumpingEnd,
    from: 'egg',
    shot: 'followEgg',
    highlight: ['uterus'],
    release: 'The egg enters the uterus (shell gland), where it will stay for about 20 hours.',
    result:
      'For the first ~5 hours the uterus pumps water and salts through the membranes into the albumen — it almost doubles in volume and the membranes become tight (plumping). The egg rotates, twisting the chalazae.',
    callout: { site: 'egg', text: 'Albumen swells' },
    resultSec: 13,
  },
  {
    id: 'vitd',
    title: 'Vitamin D3 lets calcium in',
    hFrom: T.plumpingEnd,
    hTo: T.plumpingEnd + 0.5,
    hormone: 'vitD',
    route: 'kidneyToGut',
    from: 'kidney',
    to: 'gut',
    shot: 'calcium',
    release: 'The kidney turns vitamin D3 from the feed into its active form, calcitriol.',
    travel: 'Calcitriol travels in the blood to the intestine.',
    arrive: 'In the intestine it switches on calcium absorption from the feed.',
    result: 'Calcium from the feed (limestone, shell grit) is absorbed into the blood.',
    callout: { site: 'gut', text: 'Calcium absorbed' },
    note: 'Too little vitamin D3 → thin or soft shells even when the feed has enough calcium.',
  },
  {
    id: 'calcium',
    title: 'Calcium builds the shell',
    hFrom: T.plumpingEnd + 0.5,
    hTo: T.pigmentFrom,
    hormone: 'calcium',
    route: 'gutToUterus',
    count: 4,
    from: 'gut',
    to: 'uterus',
    shot: 'calcium',
    arriveShot: 'followEgg',
    release: 'Calcium is carried in the blood — from the intestine by day, and from the medullary bone at night when the hen does not eat.',
    travel: 'Calcium travels to the uterus.',
    arrive: 'The uterus lays down calcium carbonate crystals on the mammillary knobs.',
    result:
      'Over about 15 hours the shell grows thicker — about 2 g of calcium for one egg, around 10% of all the calcium in the hen’s body.',
    callout: { site: 'egg', text: 'Shell thickening' },
    resultSec: 14,
    note: 'Most shell is made at night. Coarse limestone or shell grit given in the afternoon stays in the gizzard and releases calcium through the night.',
  },
  {
    id: 'pigment',
    title: 'Pigment and cuticle',
    hFrom: T.pigmentFrom,
    hTo: T.vagina - 0.05,
    from: 'egg',
    shot: 'followEgg',
    highlight: ['uterus'],
    release: 'In the last hours in the uterus the shell is finished.',
    result:
      'Brown-egg hens add brown pigment (protoporphyrin) in the last 3–4 hours. Then a thin protein cuticle (bloom) seals the pores. The egg turns around so it is laid blunt end first.',
    callout: { site: 'egg', text: 'Cuticle seals the pores' },
    resultSec: 13,
  },
  {
    id: 'avt',
    title: 'Laying: vasotocin and prostaglandin',
    hFrom: T.vagina - 0.05,
    hTo: T.vagina - 0.05,
    hormone: 'avt',
    route: 'postPituToUterus',
    from: 'postPituitary',
    to: 'uterus',
    shot: 'brain',
    arriveShot: 'followEgg',
    release: 'The posterior pituitary releases arginine vasotocin (AVT). Prostaglandins also come from the empty follicle on the ovary.',
    travel: 'AVT travels in the blood to the uterus.',
    arrive: 'AVT and prostaglandins make the uterus contract strongly; the vagina relaxes.',
    result: 'The finished egg is pushed out of the uterus.',
    callout: { site: 'uterus', text: 'Contractions' },
  },
  {
    id: 'laid',
    title: 'Through the vagina — the egg is laid',
    hFrom: T.vagina - 0.05,
    hTo: T.laid + 0.4,
    from: 'egg',
    shot: 'followEgg',
    highlight: ['vagina'],
    release: 'The egg passes quickly through the vagina.',
    result:
      'The vagina turns out through the cloaca as the egg is laid, so the egg does not touch the droppings. About 24–26 hours after ovulation the egg is complete. The air cell forms as it cools.',
    callout: { site: 'egg', text: 'Egg laid' },
    resultSec: 11,
    note: 'Glands where the uterus meets the vagina store sperm for 1–2 weeks (sometimes longer) — so eggs stay fertile for days after mating.',
  },
];

// ---- timing engine (same as the estrous movie) ----------------------------------

export function eggPhasesOf(s: EggScene): Array<{ phase: EggMoviePhase; sec: number }> {
  if (!s.hormone) {
    return [
      { phase: 'release', sec: EGG_PHASE_SEC.release },
      { phase: 'result', sec: s.resultSec ?? EGG_PHASE_SEC.result },
    ];
  }
  return [
    { phase: 'release', sec: EGG_PHASE_SEC.release },
    { phase: 'travel', sec: s.travelSec ?? EGG_PHASE_SEC.travel },
    { phase: 'arrive', sec: EGG_PHASE_SEC.arrive },
    { phase: 'result', sec: s.resultSec ?? EGG_PHASE_SEC.result },
  ];
}
export const eggSceneDuration = (s: EggScene) => eggPhasesOf(s).reduce((a, p) => a + p.sec, 0);
export const eggMovieDuration = () => EGG_MOVIE.reduce((a, s) => a + eggSceneDuration(s), 0);

export interface EggMovieToken {
  kind: EggTokenKind;
  route: EggRouteId;
  u: number;
  scale: number;
  lead: boolean;
}
export interface EggMovieFrame {
  phase: EggMoviePhase;
  progress: number;
  /** Model clock: hours after ovulation. */
  hour: number;
  shot: EggShotId;
  tokens: EggMovieToken[];
  glow: EggSiteId[];
  callout?: { site: EggSiteId; text: string };
  caption: string;
}

const ease = (k: number) => k * k * (3 - 2 * k);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function eggFrameAt(s: EggScene, t: number): EggMovieFrame {
  const phases = eggPhasesOf(s);
  let rest = Math.max(0, t);
  let i = 0;
  while (i < phases.length - 1 && rest >= phases[i].sec) {
    rest -= phases[i].sec;
    i++;
  }
  const { phase, sec } = phases[i];
  const progress = clamp01(rest / sec);
  const n = s.count ?? 1;
  const tokens: EggMovieToken[] = [];
  const addTokens = (uOf: (k: number) => number, scale: number) => {
    if (!s.hormone || !s.route) return;
    for (let k = 0; k < n; k++) tokens.push({ kind: s.hormone, route: s.route, u: uOf(k), scale, lead: k === 0 });
  };
  let hour = s.hFrom;
  let shot = s.shot;
  let caption = s.release;
  const glow: EggSiteId[] = [];
  if (phase === 'release') {
    glow.push(...(s.hormone ? [s.from] : (s.highlight ?? [])));
    addTokens(() => 0, 0.6 + 0.4 * ease(clamp01(progress * 2)));
  } else if (phase === 'travel') {
    shot = 'followToken';
    caption = s.travel ?? s.release;
    const spread = 0.3;
    addTokens((k) => clamp01(progress * (1 + spread * (n - 1)) - spread * k), 1);
    if (s.to) glow.push(s.to);
  } else if (phase === 'arrive') {
    shot = s.arriveShot ?? s.shot;
    caption = s.arrive ?? s.result;
    if (s.to) glow.push(s.to);
    addTokens(() => 1, 1 - 0.45 * ease(progress));
  } else {
    shot = s.resultShot ?? s.arriveShot ?? s.shot;
    caption = s.result;
    // the egg-forming scenes move at an even pace so the layers grow steadily
    hour = s.hFrom + (s.hTo - s.hFrom) * (s.hormone ? ease(progress) : progress);
    if (s.to) glow.push(s.to);
    else glow.push(...(s.highlight ?? []));
  }
  return { phase, progress, hour, shot, tokens, glow, callout: s.callout && phase === 'result' ? s.callout : undefined, caption };
}

export function eggLocate(t: number): { index: number; local: number } {
  let rest = Math.max(0, t);
  for (let i = 0; i < EGG_MOVIE.length; i++) {
    const d = eggSceneDuration(EGG_MOVIE[i]);
    if (rest < d || i === EGG_MOVIE.length - 1) return { index: i, local: Math.min(rest, d) };
    rest -= d;
  }
  return { index: 0, local: 0 };
}

export const eggSceneStart = (index: number) => EGG_MOVIE.slice(0, index).reduce((a, s) => a + eggSceneDuration(s), 0);
