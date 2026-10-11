// The cow reproductive tract as used by the 3D AI practice lab: one source
// of truth for the 3D model (components/knowledge/ai-lab/scene.ts) AND the
// practice rules (./practice.ts), so what the vet sees is exactly what the
// rules check against.
//
// Units are centimetres. x runs from the vulva (x = 0) forward (cranially)
// to the uterus; y is up (dorsal); z is towards the cow's right (so from
// behind the cow, +z is on the viewer's right too). The sizes are
// approximate averages for an adult cow — a teaching schematic, not an exact
// specimen — and every label and note is meant to be reviewed by a
// veterinarian before publishing.

/** Where things are along the tract (x, cm from the vulva). */
export const X = {
  vulva: 0,
  /** External urethral opening, on the floor of the vestibule. */
  urethralOpening: 10,
  /** Vestibule ends and the vagina proper begins (just past the urethral opening). */
  vestibuleEnd: 12,
  /** The vaginal end of the cervix projects into the vagina from here (the fornix surrounds it). */
  cervixStart: 33,
  vaginaEnd: 36,
  /** Cervical rings (annular folds) — the vet works the gun through each one. */
  cervicalRings: [35, 37.5, 40, 42] as const,
  cervixEnd: 43,
  /** Short uterine body: the correct place to deposit semen, just past the cervix. */
  uterineBodyEnd: 46,
} as const;

/**
 * The danger zone where a gun held level or pointing down drops into the
 * urethral opening / suburethral diverticulum: from a few cm before the
 * opening (where the diverticulum lies) to just past it. Once the tip is
 * beyond it, lowering the gun can no longer drop the tip in.
 */
export const URETHRAL_TRAP = { fromX: 6, toX: X.urethralOpening + 1, belowCentre: 1.2 } as const;

/** Radius of the open passage (cm) — how far the gun tip can be from the tract's centre line. */
export const RADIUS = {
  vestibule: 3.5,
  vagina: 4.5,
  /** The narrow, winding canal through the cervix; the tip has to be lined up closely. */
  cervicalCanal: 0.9,
  uterineBody: 2,
  cervixOuter: 2.6,
} as const;

/** Height (y) of the tract's centre line at distance x: the vestibule slopes upward from the vulva, then the tract runs level. */
export function centreY(x: number): number {
  if (x >= X.vestibuleEnd) return 0;
  if (x <= X.vulva) return -3;
  const t = (x - X.vulva) / (X.vestibuleEnd - X.vulva);
  const smooth = t * t * (3 - 2 * t);
  return -3 + 3 * smooth;
}

/** The gun pivots at the vulva opening. */
export const ENTRY = { x: 0, y: centreY(0), z: 0 } as const;

/** Horn centre lines (one per side) for the 3D model: forward, then curling down and back like a ram's horn. */
export function hornPath(side: 1 | -1): Array<[number, number, number]> {
  return [
    [X.uterineBodyEnd - 0.5, 0, 0.6 * side],
    [50, 0.4, 2.2 * side],
    [54, -0.8, 3.8 * side],
    [56.5, -3.6, 5 * side],
    [55.5, -7, 5.8 * side],
    [52, -8.6, 6 * side],
    [49, -7.4, 5.6 * side],
    [48.2, -5.2, 5.2 * side],
  ];
}

export type PartId =
  | 'vulva'
  | 'vestibule'
  | 'urethralOpening'
  | 'diverticulum'
  | 'vagina'
  | 'fornix'
  | 'cervix'
  | 'uterineBody'
  | 'horns'
  | 'ovaries'
  | 'rectum'
  | 'bladder';

export interface PartInfo {
  name: string;
  note: string;
}

export const PARTS: Record<PartId, PartInfo> = {
  vulva: {
    name: 'Vulva',
    note: 'External opening of the tract. Wipe it clean and dry before inserting the gun, so dung and dirt are not carried inside.',
  },
  vestibule: {
    name: 'Vestibule',
    note: 'The first ~10–12 cm, shared by the urinary and reproductive tracts. It slopes upward, which is why the gun goes in pointing upward.',
  },
  urethralOpening: {
    name: 'External urethral opening',
    note: 'On the floor of the vestibule, about 10 cm in. A gun held level or pointing down can slip into it.',
  },
  diverticulum: {
    name: 'Suburethral diverticulum',
    note: 'A small blind pouch just below the urethral opening — the most common place for the gun tip to get stuck. Avoid it by entering at an upward angle (about 30°).',
  },
  vagina: {
    name: 'Vagina',
    note: 'About 25–30 cm long with soft folds. Pushing the cervix forward with the rectal hand straightens the folds so the gun slides through.',
  },
  fornix: {
    name: 'Fornix',
    note: 'The blind ring-shaped space around the end of the cervix. The gun tip often lodges here; pull back slightly and guide the cervix onto the tip.',
  },
  cervix: {
    name: 'Cervix',
    note: 'Firm, thick-walled, about 8–10 cm long, with 3–4 cartilage-like rings. Hold it through the rectum and work it over the gun — move the cervix, not just the gun.',
  },
  uterineBody: {
    name: 'Uterine body — deposition site',
    note: 'Short (2–3 cm), just past the cervix. Deposit semen here, slowly, with the tip about 1–2 cm beyond the cervix.',
  },
  horns: {
    name: 'Uterine horns',
    note: 'Two horns that curl like a ram’s horn. Do not push the gun deep into a horn: it risks injury and may put semen on the wrong side.',
  },
  ovaries: {
    name: 'Ovaries',
    note: 'Almond-shaped, at the end of each horn via the oviduct. They carry the follicles and the corpus luteum; fertilisation happens in the oviduct.',
  },
  rectum: {
    name: 'Rectum',
    note: 'Lies above the tract. The gloved, lubricated hand goes here to locate, hold and guide the cervix.',
  },
  bladder: {
    name: 'Urinary bladder',
    note: 'Lies below the tract; the urethra runs from it to the urethral opening on the vestibule floor.',
  },
};
