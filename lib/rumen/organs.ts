// The ruminant (cow) digestive organs as shapes in the skeleton's world frame
// (units ≈ 10 cm, x cranial, y up, z = the cow's right), plus what students
// learn about each. Clinical content: to be reviewed by a veterinarian.

import { blend, capsule, chain, ellipsoid, rotated, sphere, subtract, torus, type SDF, type V3 } from '@/lib/anatomy/sdf';

export type OrganId =
  | 'rumen'
  | 'reticulum'
  | 'omasum'
  | 'abomasum'
  | 'esophagus'
  | 'duodenum'
  | 'jejunum'
  | 'caecum'
  | 'colon'
  | 'liver'
  | 'spleen'
  | 'heart'
  | 'diaphragm';

export interface OrganShape {
  sdf: SDF;
  min: V3;
  max: V3;
}

// ---- shapes -----------------------------------------------------------------------------

export function rumenShape(): OrganShape {
  const body = blend(
    0.9,
    ellipsoid([-3.6, 9.25, -1.25], [5.8, 1.95, 2.0]), // dorsal sac
    ellipsoid([-3.9, 6.75, -0.6], [5.3, 1.85, 2.35]), // ventral sac
    ellipsoid([-8.9, 9.1, -1.25], [1.5, 1.45, 1.7]), // caudodorsal blind sac
    ellipsoid([-9.25, 6.75, -0.5], [1.6, 1.5, 2.0]), // caudoventral blind sac
    ellipsoid([1.05, 8.6, -1.0], [1.65, 1.55, 1.6]), // cranial sac (atrium)
    ellipsoid([0.55, 6.6, -0.7], [1.3, 1.2, 1.7]), // ventral recess
  );
  const grooves = subtract(
    body,
    0.25,
    capsule([0.6, 7.95, -3.0], [-7.6, 7.95, -2.95], 0.34), // left longitudinal groove
    capsule([-0.6, 7.85, 1.15], [-7.6, 7.8, 1.15], 0.3), // right longitudinal groove
    capsule([-10.75, 7.95, -2.6], [-10.75, 7.95, 1.6], 0.32), // caudal groove
    rotated(torus([-7.65, 9.1, -1.25], 1.5, 0.2, 'x'), [-7.65, 9.1, -1.25], [0, 0, 0]), // dorsal coronary groove
    torus([-7.9, 6.75, -0.5], 1.75, 0.2, 'x'), // ventral coronary groove
    capsule([0.15, 7.35, -2.7], [0.15, 7.35, 1.0], 0.3), // cranial groove
  );
  return { sdf: grooves, min: [-11.6, 4.4, -3.9], max: [3.3, 11.6, 2.4] };
}

export function reticulumShape(): OrganShape {
  const s = subtract(
    blend(0.35, ellipsoid([2.8, 6.55, -0.4], [1.25, 1.55, 1.6]), ellipsoid([2.1, 7.4, -0.5], [0.8, 0.8, 1.0])),
    0.15,
    sphere([1.0, 7.6, -0.6], 0.95), // ruminoreticular fold side
  );
  return { sdf: s, min: [0.6, 4.6, -2.3], max: [4.4, 8.6, 1.5] };
}

export function omasumShape(): OrganShape {
  const s = blend(
    0.3,
    rotated(ellipsoid([1.0, 7.65, 2.0], [1.15, 1.0, 0.95]), [1.0, 7.65, 2.0], [0, 0, 20]),
    capsule([2.3, 7.1, 0.6], [1.55, 7.45, 1.35], 0.32), // reticulo-omasal orifice
    capsule([0.55, 6.85, 2.15], [0.45, 6.15, 1.65], 0.36), // omaso-abomasal opening
  );
  return { sdf: s, min: [-0.6, 5.7, 0.1], max: [2.9, 9.0, 3.3] };
}

/** Abomasum along a centre line; `displaced` = LDA/RDA positions. */
export const ABOMASUM_PATH: Record<'normal' | 'lda' | 'rda', Array<[V3, number]>> = {
  normal: [
    [[2.45, 5.95, 0.6], 1.08],
    [[0.6, 5.8, 1.2], 1.0],
    [[-1.4, 5.85, 2.0], 0.78],
    [[-2.9, 6.2, 2.5], 0.5],
    [[-3.6, 6.6, 2.6], 0.3],
  ],
  lda: [
    [[2.2, 6.0, -0.4], 1.0],
    [[1.0, 7.0, -2.5], 1.05],
    [[-0.8, 8.4, -3.0], 0.95],
    [[-2.6, 9.4, -2.9], 0.7],
    [[-3.6, 9.9, -2.6], 0.4],
  ],
  rda: [
    [[2.4, 6.0, 0.5], 1.15],
    [[0.6, 6.6, 2.3], 1.35],
    [[-1.6, 8.0, 2.9], 1.35],
    [[-3.8, 9.3, 2.8], 1.1],
    [[-5.0, 9.8, 2.4], 0.5],
  ],
};

export function abomasumShape(which: 'normal' | 'lda' | 'rda' = 'normal'): OrganShape {
  const p = ABOMASUM_PATH[which];
  const s = blend(0.25, chain(p.map((q) => q[0]), p.map((q) => q[1])), capsule([0.5, 6.25, 1.7], p[1][0], 0.4));
  const min: V3 = [Math.min(...p.map((q) => q[0][0] - q[1]), 0.1) - 0.4, Math.min(...p.map((q) => q[0][1] - q[1]), 5.85) - 0.4, Math.min(...p.map((q) => q[0][2] - q[1]), 1.3) - 0.4];
  const max: V3 = [Math.max(...p.map((q) => q[0][0] + q[1]), 0.9) + 0.4, Math.max(...p.map((q) => q[0][1] + q[1]), 6.65) + 0.4, Math.max(...p.map((q) => q[0][2] + q[1]), 2.1) + 0.4];
  return { sdf: s, min, max };
}

export function heartShape(): OrganShape {
  const s = blend(
    0.4,
    rotated(ellipsoid([5.7, 7.35, -0.35], [1.25, 1.5, 1.15]), [5.7, 7.35, -0.35], [0, 0, -18]),
    sphere([5.2, 6.1, -0.45], 0.55), // apex
    capsule([5.9, 8.6, -0.2], [6.3, 9.6, -0.1], 0.32), // aorta
    capsule([6.2, 8.4, -0.5], [6.8, 9.2, -0.7], 0.28), // pulmonary trunk
  );
  return { sdf: s, min: [3.9, 5.2, -1.9], max: [7.5, 10.1, 1.2] };
}

export function liverShape(): OrganShape {
  const s = blend(
    0.3,
    rotated(ellipsoid([2.0, 9.2, 2.25], [1.55, 2.0, 0.55]), [2.0, 9.2, 2.25], [8, 0, 35]),
    rotated(ellipsoid([0.9, 8.0, 2.5], [1.0, 1.0, 0.45]), [0.9, 8.0, 2.5], [0, 0, 20]), // right lobe
    ellipsoid([3.0, 10.3, 1.4], [0.7, 0.8, 0.45]), // caudate process
  );
  return { sdf: s, min: [-0.6, 6.3, 0.6], max: [4.3, 11.8, 3.4] };
}

export function spleenShape(): OrganShape {
  return { sdf: rotated(ellipsoid([0.9, 10.05, -2.85], [1.55, 0.6, 0.17]), [0.9, 10.05, -2.85], [0, 0, -35]), min: [-0.9, 8.6, -3.3], max: [2.7, 11.5, -2.4] };
}

// ---- tubes (centre lines, radius) ------------------------------------------------------------

export const ESOPHAGUS: V3[] = [
  [15.2, 8.0, 0],
  [14.2, 9.4, 0],
  [12.2, 9.75, -0.15],
  [9.6, 9.5, -0.3],
  [7.0, 9.35, -0.35],
  [4.3, 9.3, -0.4],
  [2.6, 9.25, -0.45],
  [1.55, 9.05, -0.5],
];
export const CARDIA: V3 = [1.55, 9.05, -0.5];
export const MOUTH: V3 = [15.3, 7.9, 0];

export const DUODENUM: V3[] = [
  [-3.75, 6.75, 2.6],
  [-2.2, 7.6, 2.75],
  [-0.4, 8.4, 2.75],
  [-1.6, 9.2, 2.85],
  [-4.0, 9.5, 2.85],
  [-6.8, 9.6, 2.75],
  [-8.4, 9.2, 2.45],
  [-8.2, 8.7, 2.0],
  [-6.0, 9.3, 1.75],
  [-4.2, 9.1, 1.7],
];

/** A deterministic tangled path for the jejunum (coils in the right ventral abdomen). */
export function jejunumPath(): V3[] {
  const centre: V3 = [-5.6, 6.9, 2.15];
  const half: V3 = [2.7, 1.25, 0.85];
  const pts: V3[] = [];
  let p: V3 = [-3.6, 7.6, 2.0];
  let d: V3 = [-1, 0, 0];
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  for (let i = 0; i < 460; i++) {
    // wander, but turn back towards the middle when near the edge of the space
    const out = [0, 1, 2].map((k) => (p[k] - centre[k]) / half[k]);
    const r = Math.hypot(out[0], out[1], out[2]);
    const pull = r > 0.75 ? (r - 0.75) * 1.6 : 0;
    d = [d[0] + rnd() * 0.9 - out[0] * pull, d[1] + rnd() * 0.9 - out[1] * pull, d[2] + rnd() * 0.9 - out[2] * pull];
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    d = [d[0] / l, d[1] / l, d[2] / l];
    p = [p[0] + d[0] * 0.16, p[1] + d[1] * 0.16, p[2] + d[2] * 0.16];
    pts.push(p);
  }
  return pts;
}

/** Spiral colon: centripetal then centrifugal coils in a sagittal plane. */
export function colonPath(): V3[] {
  const c: V3 = [-5.3, 8.4, 1.1];
  const pts: V3[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    const inward = t < 0.5;
    const k = inward ? t * 2 : (t - 0.5) * 2;
    const r = inward ? 1.25 - 1.0 * k : 0.25 + 1.0 * k;
    const a = (inward ? k : 1 - k) * Math.PI * 2 * 2 + (inward ? 0 : 0.35);
    pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a) * 0.9, c[2] + (inward ? 0.12 : -0.12)]);
  }
  return pts;
}

export const CAECUM: V3[] = [
  [-6.6, 8.5, 1.9],
  [-8.0, 8.55, 2.05],
  [-9.4, 8.45, 2.15],
  [-10.1, 8.3, 2.1],
];

/** Fat and vessels running in the rumen grooves (decorations). */
export const GROOVE_FAT: V3[][] = [
  [
    [0.6, 7.95, -2.68],
    [-2.0, 7.98, -2.72],
    [-5.0, 7.97, -2.7],
    [-7.6, 7.95, -2.62],
  ],
  [
    [-0.6, 7.85, 0.88],
    [-4.0, 7.83, 0.92],
    [-7.6, 7.8, 0.88],
  ],
];

/** Left paralumbar fossa (trocar site) and the ping areas. */
export const SITES = {
  trocar: [-4.9, 9.9, -3.45] as V3,
  pingLeft: [-1.6, 9.0, -3.5] as V3,
  pingRight: [-2.6, 9.3, 3.4] as V3,
};

// ---- what students learn -------------------------------------------------------------------

export interface OrganInfo {
  name: string;
  where: string;
  facts: string[];
  clinical?: string[];
}

export const ORGANS: Record<OrganId, OrganInfo> = {
  rumen: {
    name: 'Rumen',
    where: 'Fills the LEFT half of the abdomen, from the diaphragm (8th rib) to the pelvis.',
    facts: [
      'Largest compartment: about 100–150 litres in an adult cow (80% of the stomach).',
      'Divided by pillars into dorsal and ventral sacs and caudal blind sacs; grooves on the outside mark the pillars.',
      'A fermentation vat: microbes break down fibre into volatile fatty acids (VFAs) — the cow’s main energy — plus gas (CO₂, methane).',
      'The lining has papillae that absorb VFAs.',
      'Contracts 1–2 times a minute (auscultate in the left paralumbar fossa).',
    ],
    clinical: ['Bloat, acidosis (grain overload), impaction.', 'Rumenotomy is done through the left paralumbar fossa.'],
  },
  reticulum: {
    name: 'Reticulum',
    where: 'Most cranial compartment, against the diaphragm opposite the heart (6th–8th ribs), on the floor.',
    facts: ['Lining is a honeycomb of ridges.', 'Works with the rumen: sorts particles; heavy objects (wire, nails) settle here.', 'Holds about 5–10 litres.'],
    clinical: ['Traumatic reticulitis / reticulopericarditis (“hardware disease”): a wire pierces the reticulum and can reach the heart.', 'A magnet in the reticulum prevents it.'],
  },
  omasum: {
    name: 'Omasum',
    where: 'RIGHT side, between the reticulum and abomasum, at the 7th–11th ribs.',
    facts: ['Filled with about 100 leaves (laminae) of different sizes, like the pages of a book (“bible”, “manyplies”).', 'Absorbs water, minerals and remaining VFAs; grinds particles.', 'About 10–15 litres.'],
    clinical: ['Omasal impaction (dry, hard leaves) with poor water intake.'],
  },
  abomasum: {
    name: 'Abomasum',
    where: 'On the abdominal floor, RIGHT of the midline, from the xiphoid to the pylorus near the 12th rib.',
    facts: ['The “true stomach”: glandular, with spiral folds.', 'Secretes hydrochloric acid and pepsin like a single stomach.', 'In the newborn calf it is the largest compartment.'],
    clinical: ['Left displacement (LDA) after calving; right displacement / torsion (RDA/RVA); ulcers.'],
  },
  esophagus: {
    name: 'Oesophagus',
    where: 'From the pharynx down the left side of the neck, through the thorax above the heart, to the cardia.',
    facts: ['Carries food down — and cud and gas back up (rumination and eructation).', 'Ends at the cardia in the atrium of the rumen; the reticular (oesophageal) groove continues from it.'],
    clinical: ['Choke (oesophageal obstruction) — often with bloat because gas cannot escape.'],
  },
  duodenum: {
    name: 'Duodenum',
    where: 'From the pylorus up to the liver, then back along the RIGHT dorsal flank.',
    facts: ['Receives bile and pancreatic juice.', 'First part of the small intestine.'],
  },
  jejunum: {
    name: 'Jejunum and ileum',
    where: 'Coils in the right ventral abdomen, on the mesentery.',
    facts: ['About 40 m of small intestine in an adult cow.', 'Digests and absorbs protein, fat and starch that escaped the rumen.'],
    clinical: ['Intussusception, intestinal obstruction.'],
  },
  caecum: {
    name: 'Caecum',
    where: 'Right side, blind end pointing to the pelvic inlet.',
    facts: ['Second fermentation site (much smaller than the rumen).'],
    clinical: ['Caecal dilatation and torsion.'],
  },
  colon: {
    name: 'Spiral colon',
    where: 'Right side, a flat disc of coils on the mesentery.',
    facts: ['Coils inwards (centripetal) and then outwards (centrifugal).', 'Absorbs water.'],
  },
  liver: {
    name: 'Liver',
    where: 'Entirely on the RIGHT, against the diaphragm (pushed there by the rumen).',
    facts: ['Makes glucose from propionate (a VFA) — essential in high-yielders.'],
    clinical: ['Liver abscess (after acidosis), fatty liver, liver fluke.', 'Liver biopsy: right 11th intercostal space.'],
  },
  spleen: {
    name: 'Spleen',
    where: 'LEFT side, on the dorsal rumen against the diaphragm.',
    facts: ['Flat and oval in cattle.'],
  },
  heart: {
    name: 'Heart (in the pericardium)',
    where: 'In the thorax, 3rd–6th ribs, just cranial to the diaphragm and the reticulum.',
    facts: ['Only the diaphragm separates the reticulum from the pericardium — a few centimetres.'],
    clinical: ['Traumatic pericarditis: muffled heart sounds, brisket oedema, distended jugular veins.'],
  },
  diaphragm: {
    name: 'Diaphragm',
    where: 'Dome between thorax and abdomen, sloping from the last rib dorsally to the xiphoid ventrally.',
    facts: ['The reticulum lies against its abdominal side; the heart against its thoracic side.'],
  },
};

// ---- food journey --------------------------------------------------------------------------

export type JourneyPath = 'swallow' | 'mix' | 'belch' | 'rumination' | 'toReticulum' | 'toOmasum' | 'toAbomasum' | 'intestine' | 'groove';

export interface JourneyStep {
  id: JourneyPath;
  title: string;
  text: string;
  points: string[];
  focus: OrganId[];
  view: 'left' | 'right' | 'whole';
  /** What travels: feed bolus, gas bubble, cud, digesta, milk. */
  token: 'feed' | 'gas' | 'cud' | 'digesta' | 'milk';
}

export const JOURNEY: JourneyStep[] = [
  {
    id: 'swallow',
    title: '1. Eating and swallowing',
    text: 'The cow wraps grass with her tongue and swallows it after only a little chewing, mixed with lots of saliva (100–150 litres a day).',
    points: ['Saliva contains bicarbonate — it buffers the rumen acids.', 'The bolus goes down the oesophagus to the cardia.'],
    focus: ['esophagus'],
    view: 'whole',
    token: 'feed',
  },
  {
    id: 'mix',
    title: '2. Rumen: mixing and fermentation',
    text: 'Contractions mix the contents. Gas rises to the top, long fibre forms a floating mat, fine particles and liquid sink.',
    points: ['Microbes (bacteria, protozoa, fungi) ferment fibre to volatile fatty acids — acetate, propionate, butyrate.', 'VFAs are absorbed through the papillae and give 60–70% of the cow’s energy.', 'Normal rumen pH about 6–7.'],
    focus: ['rumen', 'reticulum'],
    view: 'left',
    token: 'feed',
  },
  {
    id: 'belch',
    title: '3. Eructation (belching gas)',
    text: 'Fermentation makes 500–1000 litres of gas a day. A contraction pushes the gas cap forward to the cardia and it is belched up the oesophagus.',
    points: ['If gas cannot escape (froth, choke, rumen not moving) the rumen blows up — bloat.'],
    focus: ['rumen', 'esophagus'],
    view: 'left',
    token: 'gas',
  },
  {
    id: 'rumination',
    title: '4. Rumination (chewing the cud)',
    text: 'A bolus of coarse fibre (the cud) is brought back up to the mouth, chewed thoroughly and swallowed again.',
    points: ['About 6–8 hours a day; each cud is chewed 40–60 times.', 'Rumination produces more saliva. A cow that stops ruminating is ill.'],
    focus: ['rumen', 'esophagus'],
    view: 'whole',
    token: 'cud',
  },
  {
    id: 'toReticulum',
    title: '5. Small particles go to the reticulum',
    text: 'When particles are small and heavy enough they sink and move into the reticulum, which sorts them.',
    points: ['Heavy foreign bodies — wire, nails — also end up in the reticulum.'],
    focus: ['reticulum'],
    view: 'left',
    token: 'digesta',
  },
  {
    id: 'toOmasum',
    title: '6. Through the omasum',
    text: 'Digesta passes through the reticulo-omasal orifice into the omasum. Its leaves squeeze out water and absorb minerals and the remaining VFAs.',
    points: [],
    focus: ['omasum'],
    view: 'right',
    token: 'digesta',
  },
  {
    id: 'toAbomasum',
    title: '7. Abomasum — the true stomach',
    text: 'Acid (HCl) and pepsin digest protein — including the microbes themselves, which are an important source of protein for the cow.',
    points: ['pH about 2–3.'],
    focus: ['abomasum'],
    view: 'right',
    token: 'digesta',
  },
  {
    id: 'intestine',
    title: '8. Intestines',
    text: 'In the duodenum bile and pancreatic juice are added; the small intestine absorbs nutrients; the caecum and colon ferment a little more and absorb water.',
    points: [],
    focus: ['duodenum', 'jejunum', 'caecum', 'colon'],
    view: 'right',
    token: 'digesta',
  },
  {
    id: 'groove',
    title: 'The calf: reticular (oesophageal) groove',
    text: 'In a suckling calf, milk does not go into the rumen. The reticular groove closes into a tube and carries milk straight from the cardia to the omasum and abomasum.',
    points: ['Closing is a reflex triggered by suckling — calves drinking quickly from a bucket can get milk in the rumen (ruminal drinking).', 'The rumen develops as the calf starts eating fibre and concentrate.'],
    focus: ['reticulum', 'omasum', 'abomasum'],
    view: 'right',
    token: 'milk',
  },
];

// ---- problems ----------------------------------------------------------------------------------

export type ProblemId = 'frothy' | 'freegas' | 'hardware' | 'lda' | 'rda';

export interface Problem {
  id: ProblemId;
  name: string;
  what: string;
  signs: string[];
  diagnosis: string[];
  treatment: string[];
  prevention: string[];
  view: 'left' | 'right' | 'whole' | 'close';
}

export const PROBLEMS: Problem[] = [
  {
    id: 'frothy',
    name: 'Frothy bloat',
    what: 'Gas is trapped as small bubbles in a stable foam throughout the rumen contents, so it cannot be belched. Common on lush legumes (lucerne, berseem) or finely ground grain.',
    signs: ['Sudden swelling of the LEFT flank (left paralumbar fossa), later both sides.', 'Distress, breathing with open mouth, frequent urination; death can follow quickly.'],
    diagnosis: ['A stomach tube does NOT release much gas — only froth.'],
    treatment: ['Anti-foaming agent by stomach tube (e.g. vegetable/mineral oil, poloxalene) as per your protocol.', 'Trocarization does not help much with froth; emergency rumenotomy if the animal is collapsing.'],
    prevention: ['Introduce legume pastures slowly; feed dry hay before grazing; avoid wet lush legumes.'],
    view: 'left',
  },
  {
    id: 'freegas',
    name: 'Free-gas bloat',
    what: 'A large gas cap above the contents cannot escape — because of choke (obstruction in the oesophagus), rumen atony or abnormal posture.',
    signs: ['Swelling of the left paralumbar fossa; tympanic (drum-like) sound on percussion.'],
    diagnosis: ['A stomach tube releases large amounts of gas.', 'Check for choke along the oesophagus.'],
    treatment: ['Pass a stomach tube to release gas; remove the cause (e.g. choke).', 'Emergency: trocar and cannula in the LEFT paralumbar fossa — midway between the last rib and the tuber coxae, a hand’s width below the transverse processes.'],
    prevention: ['Feed properly; treat the underlying disease.'],
    view: 'left',
  },
  {
    id: 'hardware',
    name: 'Hardware disease (traumatic reticulopericarditis)',
    what: 'A swallowed wire or nail settles in the reticulum. Contractions push it through the reticulum wall, then through the diaphragm into the pericardium.',
    signs: [
      'Sudden drop in milk and appetite; arched back; reluctance to move, grunt when walking downhill.',
      'If the heart is involved: muffled heart sounds, brisket (dewlap) oedema, distended jugular veins.',
    ],
    diagnosis: ['Pain on pressure behind the xiphoid (withers pinch test, pole test).', 'Metal detector; ultrasound; raised fibrinogen / neutrophils.'],
    treatment: ['Early cases: magnet by mouth, antibiotics, confinement (front feet raised).', 'Rumenotomy to remove the wire; pericarditis has a poor outlook.'],
    prevention: ['Magnets for all cattle; keep wire and nails out of feed and sheds.'],
    view: 'close',
  },
  {
    id: 'lda',
    name: 'Left displaced abomasum (LDA)',
    what: 'The abomasum fills with gas and moves from the right floor of the abdomen to the LEFT, rising between the rumen and the left body wall. Most cases within weeks after calving.',
    signs: ['Poor appetite (especially for concentrate), less milk, ketosis; the left rib cage may bulge.'],
    diagnosis: ['Steel-band “PING” on the LEFT side between the 9th and 13th ribs, on simultaneous auscultation and percussion.'],
    treatment: ['Rolling the cow (may recur); toggle-pin or surgical fixation (omentopexy / abomasopexy).'],
    prevention: ['Good transition-cow feeding: enough fibre, avoid sudden grain, prevent milk fever and ketosis.'],
    view: 'left',
  },
  {
    id: 'rda',
    name: 'Right displaced abomasum / volvulus (RDA)',
    what: 'The abomasum distends with gas and fluid and moves up on the RIGHT side; it may twist (volvulus) — an emergency.',
    signs: ['Sudden colic, dehydration, scant dark faeces; the right flank may be distended.'],
    diagnosis: ['PING on the RIGHT side over the last ribs and paralumbar fossa; the distended viscus may be felt per rectum.'],
    treatment: ['Volvulus needs immediate surgery (right flank), fluids for dehydration and metabolic alkalosis.'],
    prevention: ['As for LDA.'],
    view: 'right',
  },
];
