// Rules for the AI practice mode: where the gun tip is for a given pose,
// whether that pose is physically possible, and how an attempt scores.
// Pure functions (no 3D, no React) so they're unit-tested on their own.
//
// The gun is modelled as a rigid straight rod pivoting at the vulva: the vet
// controls how far it's pushed in (depth) and its angle — pitch (up/down)
// and yaw (left/right). This mirrors the real technique's key lessons:
// enter pointing upward to clear the urethral opening, then level off, line
// up with the cervical canal, work through the rings, and deposit in the
// short uterine body just past the cervix.

import { ENTRY, RADIUS, URETHRAL_TRAP, X, centreY } from './anatomy';

export interface GunPose {
  /** How far the tip is past the vulva, along the gun (cm). Negative = still outside. */
  depth: number;
  /** Up/down angle in degrees (positive = tip up). */
  pitchDeg: number;
  /** Side angle in degrees: positive = towards the cow's right. */
  yawDeg: number;
}

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export type Zone = 'outside' | 'vestibule' | 'urethra' | 'vagina' | 'cervix' | 'uterineBody' | 'horn';
export type Status = 'ok' | 'hint' | 'warn' | 'error' | 'success';

export interface Assessment {
  zone: Zone;
  status: Status;
  message: string;
  /** False when the pose is physically impossible (tip or shaft pushing through a wall): the move is refused. */
  allowed: boolean;
  /** Why the move was refused — used to count bumps of each kind. */
  blockKind?: 'wall' | 'fornix' | 'ring' | 'heldByCervix' | 'tooDeep';
  ringsPassed: number;
  tip: Point3;
}

const RAD = Math.PI / 180;
const TOTAL_RINGS = X.cervicalRings.length;

function direction(pose: GunPose): Point3 {
  const p = pose.pitchDeg * RAD;
  const y = pose.yawDeg * RAD;
  return { x: Math.cos(p) * Math.cos(y), y: Math.sin(p), z: Math.cos(p) * Math.sin(y) };
}

/** A point on the gun shaft `s` cm from the entry point. */
export function pointAlongGun(pose: GunPose, s: number): Point3 {
  const d = direction(pose);
  return { x: ENTRY.x + d.x * s, y: ENTRY.y + d.y * s, z: ENTRY.z + d.z * s };
}

export function tipPosition(pose: GunPose): Point3 {
  return pointAlongGun(pose, pose.depth);
}

/** Open passage radius at distance x along the tract (the gun shaft must stay inside it). */
function passageRadius(x: number): number {
  if (x < X.vestibuleEnd) return RADIUS.vestibule;
  if (x < X.cervixStart) return RADIUS.vagina;
  if (x < X.cervixEnd) return RADIUS.cervicalCanal;
  return RADIUS.uterineBody;
}

function offCentre(p: Point3): { dy: number; off: number } {
  const dy = p.y - centreY(p.x);
  return { dy, off: Math.hypot(dy, p.z) };
}

function ringsPassedAt(x: number): number {
  return X.cervicalRings.filter((r) => x >= r).length;
}

const HORN_LIMIT = X.uterineBodyEnd + 6;

/** Where the tip is and whether this pose is possible. */
export function assess(pose: GunPose): Assessment {
  const tip = tipPosition(pose);
  const base = { tip, ringsPassed: ringsPassedAt(tip.x) };

  if (tip.x < 0.5) {
    return {
      ...base,
      zone: 'outside',
      status: 'hint',
      allowed: true,
      message: 'Gun is outside. Point it upward (about 30°), then push it in.',
    };
  }

  // The shaft behind the tip must also fit the passage — once it's through
  // the cervix, the cervix holds it and the angle can't swing freely.
  const d = direction(pose);
  for (let x = 1; x < tip.x - 0.25; x += 0.5) {
    // Right behind the tip, the tip's own check below gives the better
    // message (fornix / ring); the cervix only "holds" the shaft once the tip
    // is properly into it.
    if (x >= X.cervixStart && x > tip.x - 1) continue;
    const s = (x - ENTRY.x) / d.x;
    const p = pointAlongGun(pose, s);
    if (offCentre(p).off > passageRadius(x) + 0.05) {
      const heldByCervix = x >= X.cervixStart;
      return {
        ...base,
        zone: zoneAt(tip.x),
        status: 'warn',
        allowed: false,
        blockKind: heldByCervix ? 'heldByCervix' : 'wall',
        message: heldByCervix
          ? 'The cervix is holding the gun — you can’t swing the angle while it’s through the cervix. Pull back first.'
          : 'The gun shaft is pressing on the wall. Change the angle.',
      };
    }
  }

  const { dy, off } = offCentre(tip);

  if (tip.x < X.vestibuleEnd) {
    if (tip.x >= URETHRAL_TRAP.fromX && tip.x <= URETHRAL_TRAP.toX && dy < -URETHRAL_TRAP.belowCentre) {
      return {
        ...base,
        zone: 'urethra',
        status: 'error',
        allowed: true,
        message:
          'The tip dropped into the urethral opening / suburethral diverticulum. Pull back and re-enter pointing upward (about 30°).',
      };
    }
    if (off > RADIUS.vestibule) {
      return { ...base, zone: 'vestibule', status: 'warn', allowed: false, blockKind: 'wall', message: 'Tip pressing on the vestibule wall — the angle is too steep or too far sideways.' };
    }
    if (tip.x < URETHRAL_TRAP.fromX && pose.pitchDeg < 10) {
      return { ...base, zone: 'vestibule', status: 'hint', allowed: true, message: 'Raise the angle before going deeper — the urethral opening is just ahead on the floor.' };
    }
    return { ...base, zone: 'vestibule', status: 'ok', allowed: true, message: 'In the vestibule, sliding along the roof. Good.' };
  }

  if (tip.x < X.cervixStart) {
    if (off > RADIUS.vagina) {
      return { ...base, zone: 'vagina', status: 'warn', allowed: false, blockKind: 'wall', message: 'Tip pressing on the vaginal wall. Lower the angle so the gun runs level.' };
    }
    if (tip.x > X.cervixStart - 5 && off > RADIUS.cervicalCanal) {
      return { ...base, zone: 'vagina', status: 'hint', allowed: true, message: 'Approaching the cervix. Line the tip up with its opening (the centre) before pushing on.' };
    }
    return { ...base, zone: 'vagina', status: 'ok', allowed: true, message: 'In the vagina, past the urethral opening. Bring the gun level and advance to the cervix.' };
  }

  if (tip.x < X.cervixEnd) {
    if (off > RADIUS.cervicalCanal) {
      const passed = ringsPassedAt(tip.x);
      return passed === 0
        ? { ...base, zone: 'cervix', status: 'warn', allowed: false, blockKind: 'fornix', message: 'Tip lodged in the fornix beside the cervix. Pull back a little and line up with the cervical opening.' }
        : { ...base, zone: 'cervix', status: 'warn', allowed: false, blockKind: 'ring', message: `Caught on cervical ring ${passed + 1}. Make small angle corrections — in a real cow, work the cervix over the tip with your rectal hand.` };
    }
    return {
      ...base,
      zone: 'cervix',
      status: 'ok',
      allowed: true,
      message: `In the cervical canal — through ${base.ringsPassed} of ${TOTAL_RINGS} rings. Keep going, gently.`,
    };
  }

  if (tip.x <= X.uterineBodyEnd) {
    if (off > RADIUS.uterineBody) {
      return { ...base, zone: 'uterineBody', status: 'warn', allowed: false, blockKind: 'wall', message: 'Tip pressing on the uterine wall. Ease off.' };
    }
    return { ...base, zone: 'uterineBody', status: 'success', allowed: true, message: 'Correct site: uterine body, just past the cervix. Deposit the semen now, slowly.' };
  }

  if (tip.x <= HORN_LIMIT) {
    // +z is the cow's right (x forward, y up).
    const side = tip.z >= 0 ? 'right' : 'left';
    return {
      ...base,
      zone: 'horn',
      status: 'warn',
      allowed: true,
      message: `Too deep — the tip is entering the ${side} uterine horn. Pull back to just past the cervix.`,
    };
  }

  return { ...base, zone: 'horn', status: 'error', allowed: false, blockKind: 'tooDeep', message: 'Stop — far too deep. Pull back.' };
}

function zoneAt(x: number): Zone {
  if (x < 0.5) return 'outside';
  if (x < X.vestibuleEnd) return 'vestibule';
  if (x < X.cervixStart) return 'vagina';
  if (x < X.cervixEnd) return 'cervix';
  if (x <= X.uterineBodyEnd) return 'uterineBody';
  return 'horn';
}

// ---- A practice attempt -------------------------------------------------

export interface PracticeState {
  pose: GunPose;
  assessment: Assessment;
  /** Tip is in the urethral opening/diverticulum: only pulling back is possible until it's out. */
  trapped: boolean;
  urethraEntries: number;
  wallBumps: number;
  ringCatches: number;
  /** The last refused move's kind, so holding a button against a wall counts as one bump, not dozens. */
  lastBlock?: Assessment['blockKind'];
  /** Feedback for the most recent move (may be a refusal while `assessment` stays on the last valid pose). */
  feedback: Pick<Assessment, 'status' | 'message'>;
}

export const START_POSE: GunPose = { depth: -6, pitchDeg: 0, yawDeg: 0 };

/** Where the tip ends up when it drops into the opening: in the suburethral diverticulum, below the vestibule floor. */
const TRAPPED_TIP = { x: X.urethralOpening - 1.2, y: centreY(X.urethralOpening) - RADIUS.vestibule - 0.6 };

/**
 * The pose to draw. Normally the gun exactly as controlled; when the tip has
 * dropped into the urethral opening, it's drawn dipping into the pouch below
 * the floor, so the picture matches the "stuck" message.
 */
export function displayPose(state: Pick<PracticeState, 'pose' | 'trapped'>): GunPose {
  if (!state.trapped) return state.pose;
  const dx = TRAPPED_TIP.x - ENTRY.x;
  const dy = TRAPPED_TIP.y - ENTRY.y;
  return { depth: Math.hypot(dx, dy), pitchDeg: (Math.atan2(dy, dx) * 180) / Math.PI, yawDeg: 0 };
}

export function startPractice(pose: GunPose = START_POSE): PracticeState {
  const assessment = assess(pose);
  return {
    pose,
    assessment,
    trapped: false,
    urethraEntries: 0,
    wallBumps: 0,
    ringCatches: 0,
    feedback: { status: assessment.status, message: assessment.message },
  };
}

export const LIMITS = { pitch: [-10, 40], yaw: [-15, 15], depth: [-8, 60] } as const;

const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v));

/** Tries to move the gun; an impossible move is refused and the gun stays where it was. */
export function move(state: PracticeState, next: GunPose): PracticeState {
  const pose: GunPose = {
    depth: clamp(next.depth, LIMITS.depth),
    pitchDeg: clamp(next.pitchDeg, LIMITS.pitch),
    yawDeg: clamp(next.yawDeg, LIMITS.yaw),
  };

  if (state.trapped) {
    const pullingBack = pose.depth < state.pose.depth && pose.pitchDeg === state.pose.pitchDeg && pose.yawDeg === state.pose.yawDeg;
    if (!pullingBack) {
      return { ...state, feedback: { status: 'error', message: 'The tip is stuck in the urethral opening. Pull back first, then re-enter pointing upward.' } };
    }
  }

  const a = assess(pose);
  if (!a.allowed) {
    const sameAsLast = state.lastBlock === a.blockKind;
    return {
      ...state,
      wallBumps: state.wallBumps + (!sameAsLast && (a.blockKind === 'wall' || a.blockKind === 'fornix') ? 1 : 0),
      ringCatches: state.ringCatches + (!sameAsLast && a.blockKind === 'ring' ? 1 : 0),
      lastBlock: a.blockKind,
      feedback: { status: a.status, message: a.message },
    };
  }

  const enteringTrap = a.zone === 'urethra' && !state.trapped;
  const trapped = a.zone === 'urethra';
  return {
    ...state,
    pose,
    assessment: a,
    trapped,
    urethraEntries: state.urethraEntries + (enteringTrap ? 1 : 0),
    lastBlock: undefined,
    feedback: { status: a.status, message: a.message },
  };
}

export interface DepositResult {
  score: number;
  verdict: 'excellent' | 'acceptable' | 'poor';
  site: string;
  comments: string[];
}

/** Scores an attempt when the vet deposits semen at the current tip position. */
export function deposit(state: PracticeState): DepositResult {
  const { zone, tip } = state.assessment;
  let score = 100;
  let verdict: DepositResult['verdict'];
  let site: string;
  const comments: string[] = [];

  if (zone === 'uterineBody') {
    verdict = 'excellent';
    site = 'Uterine body — correct site';
  } else if (zone === 'cervix' && tip.x >= X.cervicalRings[X.cervicalRings.length - 2]) {
    score -= 25;
    verdict = 'acceptable';
    site = 'Deep in the cervix';
    comments.push('Cervical deposition gives lower conception rates. Aim 1–2 cm past the cervix.');
  } else if (zone === 'horn') {
    score -= 30;
    verdict = 'poor';
    site = 'Uterine horn — too deep';
    comments.push('Depositing deep in one horn risks injury and may put semen on the side without the ovulating follicle.');
  } else {
    score -= 60;
    verdict = 'poor';
    site = zone === 'cervix' ? 'Shallow in the cervix' : zone === 'urethra' ? 'Urethral opening' : 'Vagina / vestibule';
    comments.push('Semen deposited before the cervix very rarely results in pregnancy.');
  }

  if (state.urethraEntries) {
    score -= 15 * state.urethraEntries;
    comments.push(`Entered the urethral opening ${state.urethraEntries}×. Enter pointing upward (about 30°), then level off.`);
  }
  if (state.wallBumps) {
    score -= 4 * state.wallBumps;
    comments.push(`Pressed against the wall ${state.wallBumps}×. Smaller, gentler corrections.`);
  }
  if (state.ringCatches) {
    score -= 4 * state.ringCatches;
    comments.push(`Caught on cervical rings ${state.ringCatches}×. Line up before each ring.`);
  }
  if (verdict === 'excellent' && comments.length === 0) comments.push('Clean pass: no wall contact, no urethral entry. Well done.');

  return { score: Math.max(0, Math.round(score)), verdict, site, comments };
}
