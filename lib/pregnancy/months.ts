// Pregnancy month by month in the buffalo and the cow: where the uterus and
// fetus lie, how big the fetus is, and what can be felt per rectum.
//
// Positions are in the skeleton's world frame (lib/anatomy/cow-skeleton.ts):
// units ≈ 10 cm, x = cranial, y = up (ground at 0), z = the animal's right.
// The layout follows the fraction of gestation, so the same table serves both
// species. Typical values — breed, size and twins change them.
// Clinical content: to be reviewed by a veterinarian.

export type Species = 'buffalo' | 'cow';
export type P2 = [number, number];

export const SPECIES: Record<Species, { name: string; gestationDays: number; months: number; gestation: string }> = {
  buffalo: { name: 'Buffalo', gestationDays: 310, months: 10, gestation: '305–320 days (about 10 months)' },
  cow: { name: 'Cattle', gestationDays: 283, months: 9, gestation: '279–290 days (about 9¼ months)' },
};

/** Landmarks of the animal (same body for both species). */
export const BODY = {
  anus: [-14.35, 10.05] as P2,
  vulva: [-14.3, 8.95] as P2,
  pelvicBrim: [-11.0, 10.2] as P2,
  promontory: [-9.7, 11.15] as P2,
  /** How far a vet's hand can reach forward from the anus (≈ 70 cm). */
  reach: 7.0,
};

interface Key {
  f: number;
  cervix: P2;
  centre: P2;
  rx: number;
  ry: number;
  /** Fetal crown–rump length (units ≈ 10 cm). */
  crl: number;
  /** Placentome diameter (cm). */
  placentome: number;
}

const KEYS: Key[] = [
  { f: 0, cervix: [-12.35, 9.65], centre: [-11.6, 9.75], rx: 0.55, ry: 0.35, crl: 0, placentome: 0 },
  { f: 0.1, cervix: [-12.3, 9.6], centre: [-11.3, 9.7], rx: 0.7, ry: 0.45, crl: 0.1, placentome: 0 },
  { f: 0.2, cervix: [-12.1, 9.6], centre: [-10.4, 9.4], rx: 1.2, ry: 0.8, crl: 0.6, placentome: 0 },
  { f: 0.32, cervix: [-11.6, 9.4], centre: [-9.0, 8.4], rx: 2.0, ry: 1.3, crl: 1.5, placentome: 0.8 },
  { f: 0.43, cervix: [-11.0, 9.2], centre: [-7.2, 7.3], rx: 2.7, ry: 1.6, crl: 2.7, placentome: 2 },
  { f: 0.54, cervix: [-10.4, 8.8], centre: [-5.5, 6.7], rx: 3.3, ry: 1.75, crl: 3.8, placentome: 3.5 },
  { f: 0.65, cervix: [-10.1, 8.6], centre: [-4.8, 6.9], rx: 3.8, ry: 1.95, crl: 5.0, placentome: 4.5 },
  { f: 0.76, cervix: [-10.3, 8.7], centre: [-5.0, 7.2], rx: 4.2, ry: 2.2, crl: 6.5, placentome: 5.5 },
  { f: 0.87, cervix: [-10.7, 9.0], centre: [-5.6, 7.4], rx: 4.6, ry: 2.4, crl: 7.8, placentome: 6.2 },
  { f: 1.0, cervix: [-11.1, 9.2], centre: [-6.2, 7.6], rx: 4.9, ry: 2.6, crl: 8.8, placentome: 7 },
];

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export type FetalPose = 'embryo' | 'curled' | 'lying' | 'birth';

export interface PregnancyState {
  f: number;
  day: number;
  cervix: P2;
  centre: P2;
  rx: number;
  ry: number;
  crl: number;
  placentome: number;
  /** 0 = none, up to 1 = strong. */
  fremitus: number;
  pose: FetalPose;
  /** Fetal part nearest the vet's hand (world x, y). */
  nearestFetal: P2;
  reach: 'yes' | 'difficult' | 'no' | 'tooSmall';
}

/** Everything about the pregnancy on a given day. `birth` = the calving posture. */
export function pregnancyAt(species: Species, day: number, birth = false): PregnancyState {
  const g = SPECIES[species].gestationDays;
  const f = Math.min(1, Math.max(0, day / g));
  let i = 1;
  while (i < KEYS.length - 1 && KEYS[i].f < f) i++;
  const a = KEYS[i - 1];
  const b = KEYS[i];
  const k = (f - a.f) / (b.f - a.f || 1);
  const crl = lerp(a.crl, b.crl, k);
  const centre: P2 = [lerp(a.centre[0], b.centre[0], k), lerp(a.centre[1], b.centre[1], k)];
  const pose: FetalPose = birth ? 'birth' : f < 0.22 ? 'embryo' : f < 0.5 ? 'curled' : 'lying';
  // the fetus lies with its head towards the pelvis from mid-pregnancy
  const nearestFetal: P2 = pose === 'lying' || pose === 'birth' ? [centre[0] - crl * 0.45, centre[1]] : [centre[0] - crl * 0.3, centre[1]];
  if (birth) nearestFetal[0] = BODY.pelvicBrim[0] - 0.2;
  const d = Math.hypot(nearestFetal[0] - BODY.anus[0], nearestFetal[1] - BODY.anus[1]);
  const reach = crl < 0.4 ? 'tooSmall' : d <= BODY.reach * 0.95 ? 'yes' : d <= BODY.reach * 1.06 ? 'difficult' : 'no';
  return {
    f,
    day,
    cervix: [lerp(a.cervix[0], b.cervix[0], k), lerp(a.cervix[1], b.cervix[1], k)],
    centre,
    rx: lerp(a.rx, b.rx, k),
    ry: lerp(a.ry, b.ry, k),
    crl,
    placentome: lerp(a.placentome, b.placentome, k),
    fremitus: Math.min(1, Math.max(0, (f - 0.4) / 0.15)),
    pose,
    nearestFetal,
    reach,
  };
}

// ---- month by month ---------------------------------------------------------------------

export interface MonthInfo {
  month: number;
  days: string;
  position: string;
  size: string;
  palpation: string[];
  note?: string;
}

export const MONTHS: Record<Species, MonthInfo[]> = {
  buffalo: [
    {
      month: 1,
      days: '0–30',
      position: 'Uterus still in the pelvic cavity, close to the cervix — the nearest it ever lies to the vulva.',
      size: 'Embryo under 1 cm',
      palpation: ['Not reliably detectable per rectum.', 'A corpus luteum on the ovary on the same side as the pregnant horn.', 'Non-return to heat around day 21 (heat signs are often weak in buffaloes — “silent heat”).'],
    },
    {
      month: 2,
      days: '31–60',
      position: 'Uterus in the pelvic cavity, at the pelvic brim.',
      size: 'About 3–6 cm',
      palpation: ['Slight asymmetry of the horns; the pregnant horn feels thin-walled and fluctuating.', 'Membrane slip from about day 40–45.', 'Amniotic vesicle may be felt early in the month.'],
      note: 'Rectal pregnancy diagnosis in buffaloes is usually done from day 45–60. The buffalo cervix is tighter and more tortuous than the cow’s.',
    },
    {
      month: 3,
      days: '61–90',
      position: 'Uterus at the pelvic brim, beginning to tip forward over it.',
      size: 'About 10–14 cm (rat size)',
      palpation: ['Pregnant horn clearly larger, fluid-filled.', 'Membrane slip on both horns.', 'Fetus can be bounced (ballotted) in the fluid.'],
    },
    {
      month: 4,
      days: '91–120',
      position: 'Uterus over the pelvic brim, descending into the abdomen.',
      size: 'About 18–25 cm',
      palpation: ['Small placentomes (about 1–1.5 cm) on the uterine wall.', 'Fetus still within reach by ballottement.', 'Cervix lies at the pelvic brim.'],
    },
    {
      month: 5,
      days: '121–150',
      position: 'Uterus in the abdomen, cervix pulled forward to or over the pelvic brim.',
      size: 'About 28–35 cm',
      palpation: ['Placentomes 2–3 cm.', 'Fremitus begins in the middle uterine artery on the pregnant side.', 'Fetus becoming hard to reach.'],
    },
    {
      month: 6,
      days: '151–180',
      position: 'Uterus deep on the abdominal floor — the furthest from the vulva.',
      size: 'About 38–48 cm',
      palpation: ['Fetus usually OUT OF REACH.', 'Diagnose by: placentomes (3–4 cm), fremitus, cervix pulled forward and down, tight broad ligament.'],
      note: 'This is the stage where pregnancy is most often missed by inexperienced hands — follow the cervix and the uterine artery.',
    },
    {
      month: 7,
      days: '181–210',
      position: 'Uterus fills the right ventral abdomen, still deep.',
      size: 'About 50–60 cm',
      palpation: ['Fetus still usually out of reach.', 'Placentomes 4–5 cm, strong fremitus.'],
    },
    {
      month: 8,
      days: '211–240',
      position: 'Fetus large; parts of it come back towards the pelvic inlet.',
      size: 'About 62–72 cm',
      palpation: ['Fetal head or limbs can often be reached again.', 'Fetal movements may be felt.'],
    },
    {
      month: 9,
      days: '241–270',
      position: 'Fetus fills much of the abdomen; head and forelimbs towards the pelvis.',
      size: 'About 75–85 cm',
      palpation: ['Fetus easily palpable.', 'Placentomes 5–7 cm.'],
    },
    {
      month: 10,
      days: '271–310',
      position: 'Fetus in front of the pelvic inlet, preparing for birth.',
      size: 'About 85–95 cm (calf 30–40 kg)',
      palpation: ['Head and forelimbs at the pelvic inlet.', 'Before calving: sacrosciatic ligaments relax, tail head sinks, udder fills, vulva swells.'],
      note: 'Uterine torsion is common in buffaloes at full term — check the vaginal folds (see the Torsion Lab).',
    },
  ],
  cow: [
    {
      month: 1,
      days: '0–30',
      position: 'Uterus in the pelvic cavity, close to the cervix — nearest to the vulva.',
      size: 'Embryo under 1 cm',
      palpation: ['Not reliably detectable per rectum (ultrasound from about day 26–30).', 'Corpus luteum on the ovary on the pregnant side.'],
    },
    {
      month: 2,
      days: '31–60',
      position: 'Uterus in the pelvic cavity / at the pelvic brim.',
      size: 'About 3–6 cm (mouse)',
      palpation: ['Horn asymmetry; pregnant horn fluctuating.', 'Membrane slip from about day 35.', 'Amniotic vesicle (about day 30–65).'],
    },
    {
      month: 3,
      days: '61–90',
      position: 'Uterus at the pelvic brim, starting to drop into the abdomen.',
      size: 'About 13–17 cm (rat)',
      palpation: ['Pregnant horn 6–9 cm wide, thin-walled, fluid-filled.', 'Membrane slip; fetus can be ballotted.'],
    },
    {
      month: 4,
      days: '91–120',
      position: 'Uterus over the brim into the abdomen; cervix at the brim.',
      size: 'About 25–30 cm (cat)',
      palpation: ['Placentomes 1.5–2.5 cm.', 'Fremitus may start late in the month.', 'Fetus within reach with effort.'],
    },
    {
      month: 5,
      days: '121–150',
      position: 'Uterus deep in the abdomen; cervix pulled forward over the brim.',
      size: 'About 35–45 cm',
      palpation: ['Fetus often OUT OF REACH.', 'Placentomes 2.5–4 cm; fremitus present.'],
      note: 'Follow the cervix forward and down to find the uterus.',
    },
    {
      month: 6,
      days: '151–180',
      position: 'Deepest position, on the abdominal floor.',
      size: 'About 50–60 cm',
      palpation: ['Fetus usually out of reach.', 'Diagnose by placentomes, fremitus and the position of the cervix.'],
    },
    {
      month: 7,
      days: '181–210',
      position: 'Fetus large; nearest parts come back within reach.',
      size: 'About 65–75 cm',
      palpation: ['Fetus can often be reached again.', 'Placentomes 4–6 cm.'],
    },
    {
      month: 8,
      days: '211–240',
      position: 'Fetus fills the abdomen; head towards the pelvis.',
      size: 'About 75–85 cm',
      palpation: ['Fetus easily palpable; movements felt.'],
    },
    {
      month: 9,
      days: '241–283',
      position: 'Fetus in front of the pelvic inlet, preparing for birth.',
      size: 'About 85–95 cm (calf 25–40 kg)',
      palpation: ['Head and forelimbs at the pelvic inlet.', 'Before calving: relaxed sacrosciatic ligaments, sunken tail head, udder filling.'],
    },
  ],
};

/** Day in the middle of month m. */
export function monthMidDay(species: Species, m: number): number {
  const g = SPECIES[species].gestationDays;
  const per = g / SPECIES[species].months;
  return Math.min(g, (m - 0.5) * per);
}
export function monthOfDay(species: Species, day: number): number {
  const per = SPECIES[species].gestationDays / SPECIES[species].months;
  return Math.min(SPECIES[species].months, Math.max(1, Math.floor(day / per) + 1));
}

export const COMPARE: Array<{ label: string; buffalo: string; cow: string }> = [
  { label: 'Gestation', buffalo: '305–320 days (~10 months)', cow: '279–290 days (~9¼ months)' },
  { label: 'Earliest rectal diagnosis', buffalo: 'About day 45–60', cow: 'About day 35–45' },
  { label: 'Fremitus of middle uterine artery', buffalo: 'From about 4½–5 months', cow: 'From about 4 months' },
  { label: 'Fetus usually out of reach', buffalo: 'About 5½–7 months', cow: 'About 5–6½ months' },
  { label: 'Birth weight', buffalo: '30–40 kg', cow: '25–40 kg (breed dependent)' },
];
