// The guided AI procedure, step by step: what the vet does, what the 3D view
// highlights, and where the gun moves. Plain data so the wording can be
// reviewed and edited (or translated) without touching the 3D code.
// Technique: standard recto-vaginal artificial insemination in cattle.

import type { PartId } from './anatomy';
import type { GunPose } from './practice';

export type CameraPresetName = 'overview' | 'vulva' | 'cervix' | 'uterus';

export interface ProcedureStep {
  title: string;
  text: string;
  /** Key point shown under the text. */
  tip?: string;
  highlight: PartId[];
  camera: CameraPresetName;
  gun: { visible: boolean; from: GunPose; to: GunPose };
  hand: boolean;
  target?: boolean;
  deposit?: boolean;
}

/** Gun angle that lines up with the cervical canal (it pivots at the vulva, 3 cm below the tract's centre). */
export const ALIGNED_PITCH = (Math.atan(3 / 40) * 180) / Math.PI;

const OUTSIDE: GunPose = { depth: -8, pitchDeg: 0, yawDeg: 0 };
const READY: GunPose = { depth: -6, pitchDeg: 25, yawDeg: 0 };
const PAST_URETHRA: GunPose = { depth: 13, pitchDeg: 25, yawDeg: 0 };
const AT_CERVIX: GunPose = { depth: 32.4, pitchDeg: ALIGNED_PITCH, yawDeg: 0 };
const THROUGH_CERVIX: GunPose = { depth: 43.4, pitchDeg: ALIGNED_PITCH, yawDeg: 0 };
const DEPOSIT_SITE: GunPose = { depth: 44.6, pitchDeg: ALIGNED_PITCH, yawDeg: 0 };

export const PROCEDURE: ProcedureStep[] = [
  {
    title: 'Prepare the straw',
    text: 'Thaw the semen straw in clean water at 35–37 °C for about 40 seconds (follow the semen supplier’s instructions). Dry it, check the bull’s name and number, load it into a warmed gun, cut the sealed end squarely and fit the sheath.',
    tip: 'Protect the loaded gun from cold and direct sunlight, and inseminate within a few minutes of thawing.',
    highlight: [],
    camera: 'overview',
    gun: { visible: true, from: OUTSIDE, to: OUTSIDE },
    hand: false,
  },
  {
    title: 'Restrain and clean',
    text: 'Restrain the cow in a crush, move the tail aside, and wipe the vulva clean and dry with a paper towel.',
    tip: 'Dirt carried in on the gun is a common cause of uterine infection.',
    highlight: ['vulva'],
    camera: 'vulva',
    gun: { visible: false, from: OUTSIDE, to: OUTSIDE },
    hand: false,
  },
  {
    title: 'Hand in the rectum, find the cervix',
    text: 'With a gloved, lubricated hand, enter the rectum, clear out dung, and locate the cervix: a firm, ribbed structure on the floor of the pelvis, like a turkey’s neck. Hold it.',
    tip: 'Work slowly — let rectal contractions pass before moving on.',
    highlight: ['rectum', 'cervix'],
    camera: 'overview',
    gun: { visible: false, from: OUTSIDE, to: OUTSIDE },
    hand: true,
  },
  {
    title: 'Insert the gun pointing upward',
    text: 'Press down on the vulva with the arm in the rectum to open the lips. Insert the gun pointing upward (about 30°) so the tip slides along the roof of the vestibule.',
    tip: 'The upward angle carries the tip over the urethral opening and the suburethral diverticulum on the floor.',
    highlight: ['urethralOpening', 'diverticulum'],
    camera: 'vulva',
    gun: { visible: true, from: READY, to: PAST_URETHRA },
    hand: true,
  },
  {
    title: 'Level off and advance to the cervix',
    text: 'Once the tip is past the urethral opening (about 12–15 cm in), bring the gun level and slide it forward to the cervix. Push the cervix forward with the rectal hand to straighten the vaginal folds.',
    tip: 'If the tip stops short of the cervix, it is usually caught in a vaginal fold or the fornix — pull back slightly and redirect.',
    highlight: ['vagina', 'fornix'],
    camera: 'cervix',
    gun: { visible: true, from: PAST_URETHRA, to: AT_CERVIX },
    hand: true,
  },
  {
    title: 'Work through the cervix',
    text: 'Guide the cervix onto the gun ring by ring (usually 3–4 rings), bending and moving the cervix with your hand rather than forcing the gun.',
    tip: 'Move the cervix, not the gun. Forcing the gun can injure the cervical lining.',
    highlight: ['cervix'],
    camera: 'cervix',
    gun: { visible: true, from: AT_CERVIX, to: THROUGH_CERVIX },
    hand: true,
  },
  {
    title: 'Check the tip position',
    text: 'With your index finger, feel the tip just past the end of the cervix: 1–2 cm into the uterine body.',
    tip: 'Not deeper — the uterine body is short, and pushing on enters one horn.',
    highlight: ['uterineBody'],
    camera: 'uterus',
    gun: { visible: true, from: THROUGH_CERVIX, to: DEPOSIT_SITE },
    hand: true,
    target: true,
  },
  {
    title: 'Deposit the semen slowly',
    text: 'Push the plunger slowly, over about 5 seconds, keeping the gun still so the semen goes into the uterine body.',
    tip: 'If the tip moved back into the cervix, reposition before depositing.',
    highlight: ['uterineBody'],
    camera: 'uterus',
    gun: { visible: true, from: DEPOSIT_SITE, to: DEPOSIT_SITE },
    hand: true,
    target: true,
    deposit: true,
  },
  {
    title: 'Withdraw and record',
    text: 'Withdraw the gun gently. Check the sheath for blood or pus, discard it, and record the date, cow, bull and straw details.',
    tip: 'Blood or pus on the sheath is worth noting for follow-up.',
    highlight: [],
    camera: 'overview',
    gun: { visible: true, from: DEPOSIT_SITE, to: OUTSIDE },
    hand: false,
  },
];
