// How a hen's egg is formed, as data: where the yolk/egg is in the oviduct and
// which layers it has at any time. Drives the 3D egg lab and its tests.
//
// Clock: hours after ovulation (negative = before ovulation, yolk still on the
// ovary). Typical values for a laying hen; individual hens vary (the whole
// passage takes about 24–26 h). Clinical content: to be reviewed by a vet.

export type SegmentId = 'ovary' | 'infundibulum' | 'magnum' | 'isthmus' | 'uterus' | 'vagina' | 'laid';

export interface SegmentInfo {
  name: string;
  /** Approximate length in a laying hen (cm). */
  lengthCm: number;
  /** How long the egg stays there. */
  time: string;
  /** What this part adds to the egg. */
  adds: string;
  /** Colour used for this part in the 3D and the legend. */
  color: string;
}

/** The oviduct, in order from the ovary to the cloaca. */
export const SEGMENTS: Array<Exclude<SegmentId, 'ovary' | 'laid'>> = ['infundibulum', 'magnum', 'isthmus', 'uterus', 'vagina'];

export const SEGMENT_INFO: Record<Exclude<SegmentId, 'ovary' | 'laid'>, SegmentInfo> = {
  infundibulum: { name: 'Infundibulum', lengthCm: 9, time: '15–30 min', adds: 'Catches the yolk; fertilisation; outer layer of the yolk (vitelline) membrane', color: '#f2b8c6' },
  magnum: { name: 'Magnum', lengthCm: 33, time: '~3 hours', adds: 'Albumen (egg white) proteins and the chalaza layer', color: '#e98fa5' },
  isthmus: { name: 'Isthmus', lengthCm: 10, time: '~1¼ hours', adds: 'Inner and outer shell membranes; gives the egg its shape', color: '#d9798f' },
  uterus: { name: 'Uterus (shell gland)', lengthCm: 10, time: '~20 hours', adds: 'Water and salts (plumping), the calcium shell, pigment and cuticle', color: '#c45c78' },
  vagina: { name: 'Vagina', lengthCm: 12, time: 'a few minutes', adds: 'Nothing added — pushes the egg out; stores sperm in its glands', color: '#a8485c' },
};

/** Where each part starts and ends along the oviduct (0 = funnel mouth, 1 = cloaca), from the lengths. */
export const SEGMENT_SPAN: Record<Exclude<SegmentId, 'ovary' | 'laid'>, [number, number]> = (() => {
  const total = SEGMENTS.reduce((a, s) => a + SEGMENT_INFO[s].lengthCm, 0);
  let at = 0;
  const out = {} as Record<Exclude<SegmentId, 'ovary' | 'laid'>, [number, number]>;
  for (const s of SEGMENTS) {
    const from = at;
    at += SEGMENT_INFO[s].lengthCm / total;
    out[s] = [from, at];
  }
  return out;
})();

/** Hours after ovulation when the egg enters each part. */
export const TIMELINE = {
  ovulation: 0,
  magnum: 0.25,
  isthmus: 3.25,
  uterus: 4.5,
  plumpingEnd: 9.5,
  pigmentFrom: 20.5,
  cuticleFrom: 23,
  turnFrom: 23.4,
  vagina: 24.3,
  laid: 24.5,
} as const;

/** The LH surge comes about 4–6 h before ovulation. */
export const LH_SURGE_HOURS_BEFORE = 5;

export interface EggState {
  segment: SegmentId;
  /** Position along the oviduct, 0–1 (only meaningful inside it). */
  s: number;
  /** 0–1 progress through the current part. */
  progress: number;
  /** Layers, each 0 (not yet) to 1 (complete). */
  vitelline: number;
  chalazae: number;
  albumen: number;
  membranes: number;
  plumping: number;
  shell: number;
  pigment: number;
  cuticle: number;
  /** 0 = pointed end first (as it travels), 1 = turned to be laid blunt end first. */
  turned: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const along = (seg: Exclude<SegmentId, 'ovary' | 'laid'>, k: number) => lerp(SEGMENT_SPAN[seg][0], SEGMENT_SPAN[seg][1], k);

/** The egg (or yolk) at `h` hours after ovulation. */
export function eggAt(h: number): EggState {
  const T = TIMELINE;
  const base: EggState = { segment: 'ovary', s: 0, progress: 0, vitelline: 0, chalazae: 0, albumen: 0, membranes: 0, plumping: 0, shell: 0, pigment: 0, cuticle: 0, turned: 0 };
  if (h < T.ovulation) return base;

  const e = { ...base };
  e.vitelline = clamp01(h / T.magnum);
  e.chalazae = clamp01((h - T.magnum) / 1.2) * 0.5 + clamp01((h - T.uterus) / 5) * 0.5; // laid down in the magnum, twisted by rotation in the uterus
  e.albumen = clamp01((h - T.magnum) / (T.isthmus - T.magnum));
  e.membranes = clamp01((h - T.isthmus) / (T.uterus - T.isthmus));
  e.plumping = clamp01((h - T.uterus) / (T.plumpingEnd - T.uterus));
  // shell: a slow start (mammillary knobs) then steady growth until ~1½ h before laying
  const calc = h - T.uterus;
  e.shell = calc <= 0 ? 0 : calc < 5 ? 0.08 * (calc / 5) : clamp01(0.08 + 0.92 * ((calc - 5) / (T.vagina - 1.3 - T.uterus - 5)));
  e.pigment = clamp01((h - T.pigmentFrom) / (T.vagina - 0.3 - T.pigmentFrom));
  e.cuticle = clamp01((h - T.cuticleFrom) / (T.vagina - T.cuticleFrom));
  e.turned = clamp01((h - T.turnFrom) / 0.6);

  if (h < T.magnum) {
    e.segment = 'infundibulum';
    e.progress = h / T.magnum;
    e.s = along('infundibulum', e.progress);
  } else if (h < T.isthmus) {
    e.segment = 'magnum';
    e.progress = (h - T.magnum) / (T.isthmus - T.magnum);
    e.s = along('magnum', e.progress);
  } else if (h < T.uterus) {
    e.segment = 'isthmus';
    e.progress = (h - T.isthmus) / (T.uterus - T.isthmus);
    e.s = along('isthmus', e.progress);
  } else if (h < T.vagina) {
    e.segment = 'uterus';
    e.progress = (h - T.uterus) / (T.vagina - T.uterus);
    // moves into the pouch and stays there
    e.s = along('uterus', 0.2 + 0.35 * clamp01((h - T.uterus) / 1.5));
  } else if (h < T.laid) {
    e.segment = 'vagina';
    e.progress = (h - T.vagina) / (T.laid - T.vagina);
    e.s = along('vagina', e.progress);
  } else {
    e.segment = 'laid';
    e.progress = 1;
    e.s = 1;
  }
  return e;
}

/** A plain-English line for each layer, for the "egg so far" checklist. */
export const LAYER_INFO: Array<{ key: keyof EggState; name: string; where: string }> = [
  { key: 'vitelline', name: 'Vitelline membrane (outer layer)', where: 'Infundibulum' },
  { key: 'chalazae', name: 'Chalazae (twisted cords)', where: 'Magnum, twisted in the uterus' },
  { key: 'albumen', name: 'Albumen (egg white) proteins', where: 'Magnum' },
  { key: 'membranes', name: 'Shell membranes', where: 'Isthmus' },
  { key: 'plumping', name: 'Water and salts (plumping)', where: 'Uterus' },
  { key: 'shell', name: 'Calcium shell', where: 'Uterus' },
  { key: 'pigment', name: 'Brown pigment (brown-egg breeds)', where: 'Uterus' },
  { key: 'cuticle', name: 'Cuticle (bloom)', where: 'Uterus' },
];

/** "1 h 20 min" style. */
export function fmtHours(h: number): string {
  const sign = h < 0 ? '−' : '';
  const total = Math.round(Math.abs(h) * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  if (hh === 0) return `${sign}${mm} min`;
  return mm === 0 ? `${sign}${hh} h` : `${sign}${hh} h ${mm} min`;
}
