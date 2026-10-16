// The cow's estrous cycle (and early pregnancy) as data: relative hormone
// levels, follicle / corpus luteum sizes, the phase, and what is happening on
// any day. Drives both the 3D lab and the hormone chart, so they always agree.
//
// Day 0 = onset of standing heat. Typical values for a cow; individual cows
// vary (cycles of 18–24 days, two or three follicular waves). Levels are
// RELATIVE (each hormone scaled to its own peak = 1), for teaching the pattern
// — not assay values. Clinical content: to be reviewed by a veterinarian.

export type Outcome = 'notPregnant' | 'pregnant';

export const CYCLE_DAYS = 21;
export const PREGNANT_DAYS = 40;
/** Ovulation ≈ 10–14 h after the end of a ~15 h heat → about 28 h after heat starts. */
export const OVULATION_DAY = 1.2;

export const HORMONES = ['estradiol', 'progesterone', 'lh', 'fsh', 'pgf2a', 'ifnTau'] as const;
export type Hormone = (typeof HORMONES)[number];

export const HORMONE_INFO: Record<Hormone, { name: string; short: string; from: string; to: string }> = {
  estradiol: { name: 'Oestradiol', short: 'E2', from: 'Growing follicle (ovary)', to: 'Brain, uterus, cervix, vagina — heat signs; triggers the LH surge' },
  progesterone: { name: 'Progesterone', short: 'P4', from: 'Corpus luteum (ovary)', to: 'Uterus (prepares for pregnancy) and brain (blocks heat and the LH surge)' },
  lh: { name: 'LH', short: 'LH', from: 'Anterior pituitary', to: 'Ovary — the surge makes the mature follicle ovulate and form a CL' },
  fsh: { name: 'FSH', short: 'FSH', from: 'Anterior pituitary', to: 'Ovary — starts each new wave of follicles' },
  pgf2a: { name: 'PGF2α', short: 'PGF2α', from: 'Uterus (endometrium)', to: 'Ovary — destroys the corpus luteum (luteolysis)' },
  ifnTau: { name: 'Interferon-tau', short: 'IFN-τ', from: 'Embryo (trophoblast)', to: 'Uterus — stops PGF2α pulses so the CL survives (maternal recognition)' },
};

const gauss = (x: number, mu: number, sd: number) => Math.exp(-((x - mu) ** 2) / (2 * sd * sd));
const sig = (x: number, mid: number, width: number) => 1 / (1 + Math.exp(-(x - mid) / width));

/** Days into the cycle, wrapping for a non-pregnant cow (day 21 = next heat = day 0). */
function cycleDay(day: number, outcome: Outcome): number {
  return outcome === 'notPregnant' ? ((day % CYCLE_DAYS) + CYCLE_DAYS) % CYCLE_DAYS : day;
}

/** Relative hormone level (0–1) on a given day. */
export function hormoneLevel(h: Hormone, day: number, outcome: Outcome): number {
  const pregnant = outcome === 'pregnant';
  const d = cycleDay(day, outcome);
  switch (h) {
    case 'progesterone': {
      const rise = sig(d, 5, 0.9);
      const fall = pregnant ? 1 : 1 - sig(d, 17.6, 0.45);
      return clamp01(0.06 + 0.94 * rise * fall);
    }
    case 'estradiol': {
      // Peaks with the ovulatory follicle around heat; a smaller rise with each wave's dominant follicle.
      const heat = gauss(d, -0.3, 0.9) + (pregnant ? 0 : gauss(d, 20.7, 0.9));
      const wave1 = 0.32 * gauss(d, 6, 1.4);
      const laterWaves = pregnant ? 0.25 * gauss(d, 16, 1.6) + 0.25 * gauss(d, 26, 1.6) + 0.25 * gauss(d, 35, 1.6) : 0.3 * gauss(d, 15, 1.5);
      return clamp01(0.05 + heat + wave1 + laterWaves);
    }
    case 'lh': {
      // Pre-ovulatory surge at the start of heat; low basal pulses otherwise.
      const surge = gauss(d, 0.2, 0.18) + (pregnant ? 0 : gauss(d, 21.2, 0.18));
      return clamp01(0.08 + surge);
    }
    case 'fsh': {
      // A rise before each follicular wave emerges.
      const waves = pregnant ? [1.2, 9.3, 18, 27, 35.5] : [1.2, 9.3, 19.5];
      return clamp01(0.12 + waves.reduce((s, w) => s + 0.55 * gauss(d, w, 0.7), 0));
    }
    case 'pgf2a': {
      if (pregnant) return 0.04;
      // Pulsatile release from the uterus, days ~16–18.5.
      return clamp01(0.04 + [16.2, 16.9, 17.5, 18.1, 18.6].reduce((s, p) => s + 0.85 * gauss(d, p, 0.14), 0));
    }
    case 'ifnTau': {
      if (!pregnant) return 0;
      return clamp01(gauss(d, 16.5, 2.1) * sig(d, 13, 0.8));
    }
  }
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export type Phase = 'estrus' | 'metestrus' | 'diestrus' | 'proestrus' | 'pregnancy';

export const PHASE_INFO: Record<Phase, { name: string; days: string }> = {
  estrus: { name: 'Estrus (standing heat)', days: 'about 12–18 hours' },
  metestrus: { name: 'Metestrus', days: 'days 1–4' },
  diestrus: { name: 'Diestrus', days: 'days 5–17' },
  proestrus: { name: 'Proestrus', days: 'days 18–20' },
  pregnancy: { name: 'Early pregnancy', days: 'from day 18 onwards' },
};

export function phaseOn(day: number, outcome: Outcome): Phase {
  const d = cycleDay(day, outcome);
  if (d < 0.75) return 'estrus';
  if (d < 4.5) return 'metestrus';
  if (outcome === 'pregnant') return d < 18 ? 'diestrus' : 'pregnancy';
  if (d < 17.5) return 'diestrus';
  return 'proestrus';
}

/** Size (mm) of the largest follicle on the ovary, and whether it is the one that ovulates. */
export function dominantFollicle(day: number, outcome: Outcome): { sizeMm: number; ovulatory: boolean } {
  const d = cycleDay(day, outcome);
  if (d < OVULATION_DAY) return { sizeMm: 16, ovulatory: true };
  // Each wave: emerges, a dominant follicle grows to ~13–15 mm, then regresses under progesterone.
  const waves = outcome === 'pregnant' ? [2, 10, 19, 28, 36.5] : [2, 10];
  let size = 3;
  waves.forEach((w, i) => {
    const age = d - w;
    if (age < 0) return;
    const lastNonPregnantWave = outcome === 'notPregnant' && i === waves.length - 1;
    const grow = Math.min(1, age / 6) * (lastNonPregnantWave ? 1 + Math.max(0, age - 6) / 10 : 1);
    const regress = lastNonPregnantWave ? 1 : 1 - sig(age, 9, 0.9);
    size = Math.max(size, 3 + 11 * grow * regress);
  });
  const ovulatory = outcome === 'notPregnant' && d > 17;
  return { sizeMm: Math.min(17, size), ovulatory };
}

/** Corpus luteum size (mm, 0 = none) and its state. */
export function corpusLuteum(day: number, outcome: Outcome): { sizeMm: number; state: 'none' | 'haemorrhagicum' | 'luteum' | 'regressing' | 'albicans' } {
  const d = cycleDay(day, outcome);
  if (d < OVULATION_DAY) return { sizeMm: 0, state: 'none' };
  if (d < 4) return { sizeMm: 6 + 8 * ((d - OVULATION_DAY) / (4 - OVULATION_DAY)), state: 'haemorrhagicum' };
  const grown = 14 + 11 * Math.min(1, (d - 4) / 5);
  if (outcome === 'pregnant' || d < 17) return { sizeMm: grown, state: 'luteum' };
  if (d < 20) return { sizeMm: 25 - 15 * ((d - 17) / 3), state: 'regressing' };
  return { sizeMm: 8, state: 'albicans' };
}

export type EmbryoStage =
  | 'none'
  | 'oocyte'
  | 'zygote'
  | '2-cell'
  | '4-8 cell'
  | 'morula'
  | 'blastocyst'
  | 'hatched blastocyst'
  | 'elongating'
  | 'attaching'
  | 'placentomes forming';

export interface EmbryoState {
  stage: EmbryoStage;
  /** Where it is: 0–1 along the oviduct, then 0–1 along the uterine horn. */
  site: 'ovary' | 'oviduct' | 'uterus';
  progress: number;
  cells: number;
}

/** Where the embryo is and what stage it has reached (pregnant cows only). */
export function embryo(day: number): EmbryoState {
  if (day < OVULATION_DAY) return { stage: 'none', site: 'ovary', progress: 0, cells: 0 };
  if (day < 1.5) return { stage: 'oocyte', site: 'oviduct', progress: 0.25 * ((day - OVULATION_DAY) / 0.3), cells: 1 };
  if (day < 2) return { stage: 'zygote', site: 'oviduct', progress: 0.3, cells: 1 };
  if (day < 2.5) return { stage: '2-cell', site: 'oviduct', progress: 0.4, cells: 2 };
  if (day < 4) return { stage: '4-8 cell', site: 'oviduct', progress: 0.45 + 0.35 * ((day - 2.5) / 1.5), cells: day < 3.2 ? 4 : 8 };
  if (day < 5) return { stage: 'morula', site: 'oviduct', progress: 0.8 + 0.2 * (day - 4), cells: 16 };
  if (day < 7) return { stage: 'morula', site: 'uterus', progress: 0.05 * (day - 5), cells: 32 };
  if (day < 9) return { stage: 'blastocyst', site: 'uterus', progress: 0.1 + 0.05 * (day - 7), cells: 80 };
  if (day < 13) return { stage: 'hatched blastocyst', site: 'uterus', progress: 0.2 + 0.05 * (day - 9), cells: 160 };
  if (day < 19) return { stage: 'elongating', site: 'uterus', progress: 0.4, cells: 0 };
  if (day < 28) return { stage: 'attaching', site: 'uterus', progress: 0.4, cells: 0 };
  return { stage: 'placentomes forming', site: 'uterus', progress: 0.4, cells: 0 };
}

export interface DayStory {
  phase: Phase;
  headline: string;
  events: string[];
  /** Show the heat-signs and AI-timing panel. */
  heat: boolean;
}

/** Plain-English account of what is happening on a given day. */
export function story(day: number, outcome: Outcome): DayStory {
  const pregnant = outcome === 'pregnant';
  const d = cycleDay(day, outcome);
  const phase = phaseOn(day, outcome);
  const ev: string[] = [];
  let headline: string;

  if (d < 0.75) {
    headline = 'Standing heat: the mature follicle’s oestradiol peaks.';
    ev.push('High oestradiol causes the heat signs and makes the hypothalamus release a burst of GnRH.');
    ev.push('GnRH triggers the LH surge from the anterior pituitary.');
  } else if (d < OVULATION_DAY + 0.3) {
    headline = 'Ovulation: the mature follicle ruptures and releases the egg.';
    ev.push('Ovulation happens about 10–14 hours after heat ends — this is why AI is timed after heat is first seen.');
    ev.push('The egg is caught by the infundibulum and enters the oviduct.');
  } else if (d < 4.5) {
    headline = 'The ovulated follicle turns into a corpus luteum.';
    ev.push('First a blood-filled corpus haemorrhagicum, then luteal cells form the corpus luteum (CL).');
    ev.push('Progesterone starts to rise. Some cows show a little bloody discharge on day 2–3 (metestrus bleeding).');
    if (d < 3) ev.push('An FSH rise starts the first follicular wave.');
  } else if (d < 16 || pregnant) {
    headline =
      pregnant && d >= 19
        ? 'The corpus luteum is kept for the pregnancy.'
        : pregnant && d >= 13
          ? 'The embryo signals the mother: “keep the CL”.'
          : 'Diestrus: the corpus luteum dominates.';
    ev.push('High progesterone keeps the uterus quiet and ready, and blocks heat and the LH surge.');
    if (d < 11) ev.push('Follicles still grow in waves, but the dominant follicle cannot ovulate under progesterone — it regresses.');
    if (d >= 9 && d < 11) ev.push('An FSH rise starts the next follicular wave.');
    if (pregnant && d >= 13 && d < 20) ev.push('The elongating embryo secretes interferon-tau, which stops the uterus releasing PGF2α pulses — so the CL survives (maternal recognition of pregnancy).');
    if (pregnant && d >= 19) ev.push('The CL is maintained; progesterone stays high and keeps the pregnancy.');
  } else if (d < 18.7) {
    headline = 'No embryo: the uterus releases PGF2α pulses.';
    ev.push('PGF2α passes from the uterine vein to the ovarian artery on the same side and destroys the corpus luteum (luteolysis).');
    ev.push('Progesterone falls quickly — this is what a PGF2α injection copies to bring a cow into heat.');
  } else {
    headline = 'Proestrus: a new follicle matures for the next heat.';
    ev.push('With progesterone gone, LH pulses increase, the dominant follicle of the last wave grows, and oestradiol rises.');
    ev.push('The next heat comes about 21 days after the last one.');
  }

  if (pregnant) {
    const e = embryo(day);
    const where = e.site === 'oviduct' ? 'in the oviduct' : e.site === 'uterus' ? 'in the uterine horn' : '';
    const embryoNote: Partial<Record<EmbryoStage, string>> = {
      oocyte: 'The egg meets capacitated sperm in the ampulla of the oviduct.',
      zygote: 'Fertilisation: the sperm enters the egg — a single-cell zygote.',
      '2-cell': 'The zygote divides into 2 cells (cleavage).',
      '4-8 cell': 'Cleavage continues: 4, then 8 cells, still inside the zona pellucida.',
      morula: e.site === 'oviduct' ? 'A 16-cell morula reaches the uterus around day 4–5.' : 'A compact morula in the uterine horn.',
      blastocyst: 'Blastocyst (day 7–8): a fluid-filled cavity, inner cell mass and trophoblast.',
      'hatched blastocyst': 'The blastocyst hatches from the zona pellucida (day 9–10).',
      elongating: 'The embryo elongates rapidly into a long filament along the horn (day 13–19).',
      attaching: 'Attachment begins (from ~day 19–20): the membranes adhere to the endometrium.',
      'placentomes forming': 'Placentomes form where fetal cotyledons meet maternal caruncles (day 30–40). Pregnancy is detectable by ultrasound from about day 28–30 and by rectal palpation from about day 35–40.',
    };
    const note = embryoNote[e.stage];
    if (note) ev.push(`Embryo ${where}: ${note}`);
    // In the pregnant story the embryo leads; the ovary's story moves into the list.
    const embryoHeadline: Partial<Record<EmbryoStage, string>> = {
      zygote: 'Fertilisation in the oviduct: a single-cell zygote.',
      '2-cell': 'The embryo starts dividing: 2 cells.',
      '4-8 cell': 'Cleavage: 4–8 cells, moving down the oviduct.',
      morula: e.site === 'oviduct' ? 'A 16-cell morula nears the uterus.' : 'The morula has entered the uterine horn.',
      blastocyst: 'Blastocyst: a fluid-filled ball in the uterus.',
      'hatched blastocyst': 'The blastocyst hatches from its shell (zona pellucida).',
      elongating: 'The embryo elongates and signals the mother: “keep the CL”.',
      attaching: 'Attachment: the membranes adhere to the uterine lining.',
      'placentomes forming': 'Placentomes form — the pregnancy is established.',
    };
    const eh = embryoHeadline[e.stage];
    if (eh) {
      ev.unshift(`Ovary: ${headline}`);
      headline = eh;
    }
  }

  return { phase, headline, events: ev, heat: d < 0.75 || (!pregnant && d > 20.4) };
}

// ---- Timing differences between species (notes table) ---------------------

export interface SpeciesTiming {
  species: string;
  cycle: string;
  heat: string;
  ovulation: string;
  season: string;
  gestation: string;
}

export const SPECIES_TIMING: SpeciesTiming[] = [
  {
    species: 'Cow',
    cycle: '~21 days (18–24)',
    heat: '12–18 hours',
    ovulation: '~10–14 h after heat ends',
    season: 'All year',
    gestation: '~280–285 days',
  },
  {
    species: 'Buffalo',
    cycle: '~21 days (17–26)',
    heat: '18–24 hours (signs often weak or silent)',
    ovulation: '~12–18 h after heat ends',
    season: 'All year; peaks in cooler months (Oct–Feb)',
    gestation: '~305–315 days',
  },
  {
    species: 'Sheep',
    cycle: '~17 days (14–19)',
    heat: '24–36 hours',
    ovulation: 'Near the end of heat',
    season: 'Seasonal (short days); Indian breeds often breed most of the year',
    gestation: '~147–150 days',
  },
  {
    species: 'Goat',
    cycle: '~21 days (18–22)',
    heat: '24–48 hours (average ~36)',
    ovulation: 'Near the end of heat',
    season: 'Seasonal tendency; Indian breeds breed most of the year',
    gestation: '~145–155 days',
  },
];
