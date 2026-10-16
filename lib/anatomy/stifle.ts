// The bovine stifle for the patellar-desmotomy lesson: how the patella moves
// with the tibia, where it locks in upward fixation, and the lesson steps.
//
// Frame: the RIGHT femur's own frame (lib/anatomy/cow-shapes.ts) —
// x = cranial, y = proximal, z = lateral (so the medial side is −z).
// Clinical content: to be reviewed by a veterinarian.

export type V3 = [number, number, number];
export type LigamentId = 'medial' | 'middle' | 'lateral';

/** Centre of the stifle joint (between the condyles and the tibial plateau). */
export const JOINT: V3 = [-0.05, -3.6, 0];
/** Tibial angle (degrees about z): 0 = straight down, negative = lower leg swung caudally (stifle flexed). */
export const STANDING = -32;
export const FLEXED = -62;
export const LOCKED = -14;

/** Path of the patella's centre along the trochlear groove, proximal (0) to distal (1). */
const GROOVE: V3[] = [
  [0.82, -2.62, -0.02],
  [0.84, -2.82, -0.01],
  [0.82, -3.02, 0],
  [0.76, -3.2, 0],
  [0.68, -3.34, 0],
];
/** Where the patella sits when it is fixed: over the top of the medial trochlear ridge. */
export const LOCKED_PATELLA: V3 = [0.78, -2.42, -0.2];

/** Points on the tibia (tibia's own frame: plateau at the origin, long axis −y). */
export const TIBIA_POINTS = {
  tuberosityMiddle: [0.56, -0.38, 0] as V3,
  tuberosityMedial: [0.48, -0.46, -0.2] as V3,
  tuberosityLateral: [0.46, -0.44, 0.22] as V3,
};
/** Points on the patella (relative to its centre). */
export const PATELLA_POINTS = {
  apex: [0.05, -0.42, 0] as V3,
  medial: [0.0, -0.08, -0.32] as V3, // medial border / parapatellar fibrocartilage
  lateral: [0.0, -0.06, 0.27] as V3,
  base: [-0.02, 0.38, 0] as V3,
};

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** A tibial point in the femur frame for a given tibial angle. */
export function tibiaToFemur(p: V3, angleDeg: number): V3 {
  const r = (angleDeg * Math.PI) / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return [JOINT[0] + p[0] * c - p[1] * s, JOINT[1] + p[0] * s + p[1] * c, JOINT[2] + p[2]];
}

/** Point on the groove path, s = 0 (proximal) … 1 (distal). */
export function grooveAt(s: number): V3 {
  const t = Math.min(1, Math.max(0, s)) * (GROOVE.length - 1);
  const i = Math.min(GROOVE.length - 2, Math.floor(t));
  const k = t - i;
  const a = GROOVE[i], b = GROOVE[i + 1];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/** The middle patellar ligament does not stretch: its length when standing. */
export const MIDDLE_LENGTH = dist(add(grooveAt(0.42), PATELLA_POINTS.apex), tibiaToFemur(TIBIA_POINTS.tuberosityMiddle, STANDING));

/** Where the patella sits in the groove for a given tibial angle (pulled down by the middle ligament). */
export function patellaFor(angleDeg: number): { centre: V3; s: number } {
  const tub = tibiaToFemur(TIBIA_POINTS.tuberosityMiddle, angleDeg);
  let best = 0;
  let bestErr = Infinity;
  for (let i = 0; i <= 200; i++) {
    const s = i / 200;
    const err = Math.abs(dist(add(grooveAt(s), PATELLA_POINTS.apex), tub) - MIDDLE_LENGTH);
    if (err < bestErr) {
      bestErr = err;
      best = s;
    }
  }
  return { centre: grooveAt(best), s: best };
}

/** End points of a patellar ligament in the femur frame. */
export function ligament(id: LigamentId, patella: V3, angleDeg: number): [V3, V3] {
  const top = id === 'medial' ? PATELLA_POINTS.medial : id === 'lateral' ? PATELLA_POINTS.lateral : PATELLA_POINTS.apex;
  const bottom = id === 'medial' ? TIBIA_POINTS.tuberosityMedial : id === 'lateral' ? TIBIA_POINTS.tuberosityLateral : TIBIA_POINTS.tuberosityMiddle;
  return [add(patella, top), tibiaToFemur(bottom, angleDeg)];
}

// ---- the lesson ------------------------------------------------------------------------

/** still = standing; walk = bending and straightening; locked = fixed, trying to bend; held = fixed, not moving; free = released, then walking. */
export type StifleMotion = 'still' | 'walk' | 'locked' | 'held' | 'free';
export type StifleView = 'cranial' | 'medial' | 'lateral' | 'craniomedial';

export interface StifleStep {
  id: string;
  title: string;
  text: string;
  points?: string[];
  motion: StifleMotion;
  view: StifleView;
  /** Surgery state shown in 3D. */
  skin?: 'hidden' | 'intact' | 'marked' | 'incised';
  forceps?: boolean;
  cut?: boolean;
  /** Highlight these structures. */
  highlight?: Array<'medialRidge' | 'groove' | 'fibrocartilage' | LigamentId | 'tuberosity'>;
  /** Show the limb diagram (normal vs locked). */
  diagram?: boolean;
  /** Ask the student to pick the ligament before continuing. */
  quiz?: boolean;
}

export const STIFLE_STEPS: StifleStep[] = [
  {
    id: 'anatomy',
    title: 'The stifle and its three patellar ligaments',
    text: 'Cattle have THREE patellar ligaments running from the patella to the tibial tuberosity: medial, middle and lateral. The medial trochlear ridge of the femur is much larger than the lateral one.',
    points: [
      'Medial patellar ligament: from the medial side of the patella (with the parapatellar fibrocartilage) to the medial side of the tibial tuberosity.',
      'Middle patellar ligament: from the apex of the patella to the tibial tuberosity.',
      'Lateral patellar ligament: from the lateral side of the patella to the lateral tibial tuberosity; it blends with the tendon of the biceps femoris.',
      'Parapatellar fibrocartilage: a curved cartilage on the medial border of the patella that glides over the medial trochlear ridge.',
    ],
    motion: 'still',
    view: 'craniomedial',
    skin: 'hidden',
    highlight: ['medialRidge', 'fibrocartilage'],
  },
  {
    id: 'normal',
    title: 'Normal movement',
    text: 'When the stifle bends, the tibia pulls the patella down along the trochlear groove through the patellar ligaments. When the leg straightens, the quadriceps pulls it back up. The patella never goes above the top of the trochlea.',
    motion: 'walk',
    view: 'medial',
    skin: 'hidden',
    highlight: ['groove'],
  },
  {
    id: 'fixation',
    title: 'Upward fixation of the patella',
    text: 'If the patella rides too high, the medial patellar ligament and the parapatellar fibrocartilage hook over the TOP of the medial trochlear ridge. The patella cannot come back down, so the stifle — and, through the reciprocal apparatus, the hock — are locked in extension.',
    points: [
      'Seen in cattle and especially buffaloes (draught bullocks, weak or thin animals, after heavy work); can be one or both legs, and can come and go.',
      'Weakness of the thigh muscles, poor condition, steep straight hind legs and hereditary tendency make it more likely.',
    ],
    motion: 'locked',
    view: 'medial',
    skin: 'hidden',
    highlight: ['medialRidge', 'fibrocartilage', 'medial'],
  },
  {
    id: 'signs',
    title: 'What the farmer sees',
    text: 'The affected hind leg is locked straight and stretched backwards. The animal drags the front of the hoof (the toe) on the ground; the fetlock is flexed. The leg may suddenly release with a jerk and the animal walks normally for a few steps — then it locks again.',
    points: [
      'Make the animal move backwards or push it sideways — the patella may release by itself.',
      'Diagnosis: the patella is felt high up, the medial patellar ligament is tight as a cord, and the leg cannot be flexed.',
      'Mild or occasional cases: rest, good feeding, mineral supplements and exercise to strengthen the thigh muscles. Persistent cases: medial patellar desmotomy.',
    ],
    motion: 'locked',
    view: 'medial',
    skin: 'hidden',
    diagram: true,
  },
  {
    id: 'prepare',
    title: 'Restraint and local anaesthesia',
    text: 'Usually done standing. Restrain the animal in a crush with the affected leg secured. Clip and scrub the medial side of the stifle. Palpate the three ligaments; the medial one is tight like a cord about a hand’s width medial to the middle ligament. Infiltrate local anaesthetic (e.g. lignocaine 2%) under the skin and around the ligament near its insertion on the tibial tuberosity.',
    points: ['Some animals may need sedation or casting in lateral recumbency with the affected leg underneath (so its medial side faces up).'],
    motion: 'locked',
    view: 'medial',
    skin: 'intact',
    highlight: ['tuberosity'],
  },
  {
    id: 'quiz',
    title: 'Which ligament is cut?',
    text: 'Tap the ligament you would cut.',
    motion: 'locked',
    view: 'craniomedial',
    skin: 'hidden',
    quiz: true,
  },
  {
    id: 'incision',
    title: 'Skin incision',
    text: 'Make a short vertical skin incision (about 2–3 cm) over the DISTAL part of the medial patellar ligament, close to its insertion on the tibial tuberosity — the ligament is easiest to isolate here and the joint capsule is avoided.',
    motion: 'locked',
    view: 'medial',
    skin: 'incised',
    highlight: ['medial'],
  },
  {
    id: 'isolate',
    title: 'Isolate the ligament',
    text: 'Separate the tissues by blunt dissection. Pass curved artery forceps under the medial patellar ligament from caudal to cranial so the whole ligament lies on the forceps — the middle ligament must stay outside.',
    motion: 'locked',
    view: 'medial',
    skin: 'incised',
    forceps: true,
    highlight: ['medial'],
  },
  {
    id: 'cut',
    title: 'Cut the medial patellar ligament',
    text: 'Transect the ligament completely over the forceps with a scalpel or tenotome. The cut ends spring apart — the hook over the medial trochlear ridge is gone.',
    motion: 'held',
    view: 'medial',
    skin: 'incised',
    forceps: true,
    cut: true,
    highlight: ['medial'],
  },
  {
    id: 'release',
    title: 'The patella is free',
    text: 'The patella drops back into the trochlear groove and the stifle bends normally. Check by flexing the leg before closing. The middle and lateral ligaments still hold the patella.',
    points: [
      'Close the skin with 1–2 sutures; apply an antiseptic dressing and fly repellent; tetanus cover as per local practice.',
      'Walk the animal; most walk normally at once. Remove sutures in about 10 days.',
      'Possible complications: infection, haemorrhage, incomplete cutting (signs persist), damage to the middle ligament or joint capsule.',
    ],
    motion: 'free',
    view: 'medial',
    skin: 'incised',
    cut: true,
    highlight: ['groove'],
  },
];
