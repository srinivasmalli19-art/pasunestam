// Ovarian structures as felt per rectum in the cow and the buffalo: what each
// looks like (drives the 3D), how it feels, what it means, and how to tell it
// apart from the others. Typical values; palpation is confirmed by ultrasound
// or progesterone where available. Clinical content: to be reviewed by a vet.

export type OvSpecies = 'cow' | 'buffalo';
export type StructureKind = 'follicle' | 'clDeveloping' | 'cl' | 'clCystic' | 'clRegressing' | 'follicularCyst' | 'lutealCyst';

export interface Structure {
  kind: StructureKind;
  /** Diameter (mm), cow. Buffalo values are scaled by `buffaloScale`. */
  sizeMm: number;
  /** Wall thickness (mm) for fluid-filled structures. */
  wallMm?: number;
  /** Direction from the ovary centre (normalised when used). */
  dir: [number, number, number];
  /** 0 = buried in the ovary, 1 = sitting fully on top. */
  protrusion: number;
  /** A crown (papilla) sticking out — only on corpora lutea. */
  crown?: boolean;
}

export interface OvaryCase {
  id: string;
  name: string;
  short: string;
  /** Ovary size (mm) length × width × height, cow. */
  ovaryMm: [number, number, number];
  structures: Structure[];
  /** Number of small antral follicles on the surface. */
  smallFollicles: number;
  /** How much the main structure gives when pressed: 0 = hard, 1 = very soft. */
  give: number;
  feel: string[];
  /** Everyday comparison for size and feel. */
  like: string;
  meaning: string;
  tips: string[];
  treatment: string[];
  buffalo?: string;
  normal: boolean;
}

export const BUFFALO_SCALE = 0.72;

export const CASES: OvaryCase[] = [
  {
    id: 'inactive',
    name: 'Inactive (smooth) ovary',
    short: 'Inactive ovary',
    ovaryMm: [20, 13, 10],
    structures: [],
    smallFollicles: 3,
    give: 0.03,
    normal: false,
    feel: ['Small, flat and smooth — no structure sticks out.', 'Firm all over; no fluctuating follicle bigger than about 8 mm and no CL.', 'Feel BOTH ovaries — both are small and smooth.'],
    like: 'Size of an almond or a large bean.',
    meaning: 'True anoestrus: the ovaries are not cycling. Common after calving, in heifers that are underfed, in high-yielders losing body condition, and in summer.',
    tips: [
      'Uterus is small and flaccid (no tone).',
      'Check body condition, feeding, worm load and minerals before hormones.',
      'Re-check after 10–14 days: an ovary that was between waves can feel small but will show a follicle or CL later.',
    ],
    treatment: [
      'Improve energy and protein feeding; give an area-specific mineral mixture (phosphorus, copper, cobalt, zinc, iodine); deworm.',
      'Hormonal induction (e.g. a progesterone device with PGF2α and GnRH/eCG) as per your protocol — works best once body condition improves.',
    ],
    buffalo: 'Very common in buffaloes (summer anoestrus, post-partum, heifers). Buffalo ovaries are naturally smaller — compare both sides and the uterus.',
  },
  {
    id: 'follicle',
    name: 'Growing / ovulatory follicle',
    short: 'Follicle',
    ovaryMm: [34, 22, 18],
    structures: [{ kind: 'follicle', sizeMm: 16, wallMm: 0.5, dir: [0.35, 0.8, 0.45], protrusion: 0.7 }],
    smallFollicles: 7,
    give: 0.4,
    normal: true,
    feel: ['A smooth, round, thin-walled blister on the surface.', 'Soft and FLUCTUATING — your finger feels fluid under a very thin wall.', 'About 12–20 mm at heat.'],
    like: 'Like a grape or a small water blister.',
    meaning: 'Normal follicular phase (proestrus–estrus). The largest follicle ovulates about 12 hours after heat ends.',
    tips: ['At heat the uterus is toned and coiled, with clear mucus.', 'Feel gently — a follicle can rupture if squeezed hard.', 'A follicle should be gone (ovulated) within 1–2 days; one that persists and grows above 25 mm is a cyst.'],
    treatment: ['None — inseminate by the AM–PM rule if the cow is in heat.'],
    buffalo: 'Ovulatory follicle in buffalo is smaller (about 10–15 mm) and heat signs are often weak — palpation helps confirm heat.',
  },
  {
    id: 'clDeveloping',
    name: 'Developing CL (corpus haemorrhagicum)',
    short: 'Developing CL',
    ovaryMm: [30, 20, 17],
    structures: [{ kind: 'clDeveloping', sizeMm: 14, dir: [0.35, 0.8, 0.45], protrusion: 0.45 }],
    smallFollicles: 6,
    give: 0.22,
    normal: true,
    feel: ['Soft, spongy area — sometimes a small crater where the follicle ruptured.', 'Not fluctuating like a follicle, not firm like a mature CL.'],
    like: 'Like a soft sponge or a ripe berry.',
    meaning: 'Day 1–5 after ovulation (metestrus). The ruptured follicle is turning into a CL.',
    tips: ['May be confused with a follicle — a developing CL is softer and less tense, and the cow was in heat a few days ago.', 'Some cows show a little blood-stained mucus 2–3 days after heat.'],
    treatment: ['None. PGF2α does NOT work on a CL younger than about 5 days.'],
  },
  {
    id: 'cl',
    name: 'Mature corpus luteum',
    short: 'Mature CL',
    ovaryMm: [38, 26, 22],
    structures: [{ kind: 'cl', sizeMm: 24, dir: [0.35, 0.8, 0.45], protrusion: 0.55, crown: true }],
    smallFollicles: 5,
    give: 0.06,
    normal: true,
    feel: ['Firm, liver-like structure making the ovary bigger and uneven.', 'Often a CROWN (papilla) sticks out from the surface like a champagne cork.', 'About 20–30 mm.'],
    like: 'Like a firm piece of liver, or a marble set into the ovary.',
    meaning: 'Diestrus (day 6–17) — or PREGNANCY. Progesterone is high.',
    tips: ['Always check the uterus for pregnancy before injecting anything.', 'The crown distinguishes a CL from a luteal cyst.', 'The ovary with the CL is usually clearly bigger than the other one.'],
    treatment: ['If NOT pregnant and you want her in heat: PGF2α (heat in 2–5 days).', 'Never give PGF2α to a pregnant animal — it causes abortion.'],
    buffalo: 'The buffalo CL is smaller (about 15–20 mm), more embedded and less protruding — it can be hard to feel. Feel for a firm area rather than a crown.',
  },
  {
    id: 'clCystic',
    name: 'Cystic CL (CL with a cavity)',
    short: 'Cystic CL',
    ovaryMm: [38, 26, 22],
    structures: [{ kind: 'clCystic', sizeMm: 25, wallMm: 6, dir: [0.35, 0.8, 0.45], protrusion: 0.55, crown: true }],
    smallFollicles: 5,
    give: 0.12,
    normal: true,
    feel: ['Feels like a mature CL with a CROWN, but slightly softer in the centre.', 'Cow is cycling normally.'],
    like: 'A firm marble with a softer centre.',
    meaning: 'A NORMAL variant — a CL with a fluid-filled cavity. It works like any other CL and is NOT a disease.',
    tips: ['Do not treat as a luteal cyst: the crown and a normal cycle (heats every 18–24 days) show it is a CL.', 'Often seen in pregnant cows too.'],
    treatment: ['None. Treat as a normal CL (PGF2α only if not pregnant and you want to bring her into heat).'],
  },
  {
    id: 'clRegressing',
    name: 'Regressing CL (corpus albicans forming)',
    short: 'Regressing CL',
    ovaryMm: [32, 21, 17],
    structures: [
      { kind: 'clRegressing', sizeMm: 13, dir: [-0.4, 0.7, 0.55], protrusion: 0.35 },
      { kind: 'follicle', sizeMm: 13, wallMm: 0.5, dir: [0.55, 0.6, 0.55], protrusion: 0.65 },
    ],
    smallFollicles: 6,
    give: 0.03,
    normal: true,
    feel: ['Small, hard, shrinking area — no crown.', 'Often a growing follicle on the same or other ovary.'],
    like: 'Like a small hard pea in the ovary.',
    meaning: 'Late diestrus / proestrus (day 18–21) — the cow is coming into heat. Old corpora albicantia stay as small hard scars.',
    tips: ['A small hard spot plus a fluctuating follicle = heat is near.', 'Do not mistake a corpus albicans for an active CL.'],
    treatment: ['None — watch for heat.'],
  },
  {
    id: 'follicularCyst',
    name: 'Follicular cyst',
    short: 'Follicular cyst',
    ovaryMm: [32, 22, 18],
    structures: [{ kind: 'follicularCyst', sizeMm: 32, wallMm: 1.5, dir: [0.3, 0.85, 0.4], protrusion: 0.62 }],
    smallFollicles: 3,
    give: 0.45,
    normal: false,
    feel: ['LARGE (25 mm or more), thin-walled and FLUCTUATING — tense like a water balloon.', 'One or several; no CL on either ovary.', 'Still there on re-check after 7–10 days.'],
    like: 'Like a water-filled balloon or a big grape bigger than a follicle.',
    meaning: 'An anovulatory follicle that did not ovulate. Causes irregular or constant heat (nymphomania) or no heat at all.',
    tips: [
      'Signs: frequent or prolonged heat, bull-like behaviour, relaxed sacrosciatic ligaments (raised tail head), or anoestrus.',
      'Differs from a normal follicle by SIZE (≥25 mm) and PERSISTENCE (no ovulation, still there 7–10 days later).',
      'Differs from a luteal cyst by its THIN wall — it feels tense and fluctuating.',
    ],
    treatment: ['GnRH (or hCG) to luteinise the cyst, then PGF2α about 7–10 days later — or a synchronisation protocol (Ovsynch / progesterone device) as per your protocol.', 'Do not rupture cysts by squeezing — it can cause bleeding and adhesions.'],
    buffalo: 'Cystic ovaries are less common in buffaloes than in cows.',
  },
  {
    id: 'lutealCyst',
    name: 'Luteal cyst',
    short: 'Luteal cyst',
    ovaryMm: [32, 22, 18],
    structures: [{ kind: 'lutealCyst', sizeMm: 30, wallMm: 5, dir: [0.3, 0.85, 0.4], protrusion: 0.55 }],
    smallFollicles: 3,
    give: 0.18,
    normal: false,
    feel: ['LARGE (25 mm or more) with a THICK wall (more than 3 mm).', 'Less fluctuating, more RUBBERY / resilient than a follicular cyst.', 'NO crown (papilla).'],
    like: 'Like a thick rubber ball with fluid inside.',
    meaning: 'A cyst with a thick, luteinised wall that produces progesterone. The animal is usually in ANOESTRUS (no heat).',
    tips: [
      'Differs from a follicular cyst: thicker wall, firmer, less fluctuant; the animal is not in heat.',
      'Differs from a mature CL: no crown, larger, and the animal does not cycle.',
      'Differs from a cystic CL: the cystic CL has a crown and the cow cycles normally.',
    ],
    treatment: ['PGF2α — heat usually follows in 3–5 days.'],
  },
];

export const DIFFERENTIALS: Array<{ a: string; b: string; how: string }> = [
  { a: 'Follicle', b: 'Follicular cyst', how: 'Size (follicle 12–20 mm, cyst ≥25 mm) and time: a follicle ovulates within 1–2 days; a cyst is still there 7–10 days later.' },
  { a: 'Follicular cyst', b: 'Luteal cyst', how: 'Wall: thin and tense/fluctuating vs thick and rubbery. Behaviour: irregular/frequent heat vs no heat.' },
  { a: 'Luteal cyst', b: 'Mature CL', how: 'A CL has a crown, is firm and liver-like, and the cow cycles. A luteal cyst has no crown, is larger and rubbery, and the cow is in anoestrus.' },
  { a: 'Luteal cyst', b: 'Cystic CL', how: 'The cystic CL has a crown and the cow cycles normally — it is normal and needs no treatment.' },
  { a: 'Inactive ovary', b: 'Ovary between waves', how: 'Both feel small, but an inactive ovary stays smooth on re-check after 10–14 days and the uterus has no tone.' },
  { a: 'Developing CL', b: 'Follicle', how: 'Developing CL is soft and spongy, not tense; the cow was in heat a few days earlier.' },
];

/** Sizes (mm) for a species. */
export function caseFor(c: OvaryCase, species: OvSpecies): OvaryCase {
  if (species === 'cow') return c;
  const k = BUFFALO_SCALE;
  return {
    ...c,
    ovaryMm: [c.ovaryMm[0] * k, c.ovaryMm[1] * k, c.ovaryMm[2] * k],
    structures: c.structures.map((s) => ({
      ...s,
      sizeMm: s.sizeMm * (s.kind === 'follicularCyst' || s.kind === 'lutealCyst' ? 0.85 : k),
      // the buffalo CL is more embedded
      protrusion: s.kind === 'cl' || s.kind === 'clCystic' ? s.protrusion - 0.2 : s.protrusion,
    })),
  };
}

/** Shuffle for the quiz (seeded, so tests are repeatable). */
export function quizOrder(seed: number): string[] {
  const ids = CASES.map((c) => c.id);
  let s = seed || 1;
  for (let i = ids.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}
