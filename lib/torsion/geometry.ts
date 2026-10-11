// Shape of the 3D torsion model: the tract's radius along its length, where
// the twist sits for each torsion type, and the path each broad ligament takes
// around the twisted uterus. Pure maths (no three.js) so it can be tested.
//
// Coordinates: x runs from the vulva (0) forward to the tip of the gravid
// uterus (100); y is up; z is the cow's RIGHT (so looking from behind the
// cow, +z is on the viewer's right too). Angles φ are measured in the
// cross-section (z, y) plane: z = r·cos φ, y = r·sin φ. A torsion that is
// clockwise as seen from behind turns everything towards smaller φ.

import type { TorsionType } from './rules';

export const TRACT = {
  vaginaEnd: 30,
  cervixStart: 31.5,
  cervixEnd: 40,
  uterusFull: 62,
  uterusEnd: 100,
} as const;

/** Where the twist is: in front of the cervix (pre) or in the front of the vagina, taking the cervix with it (post). */
export function twistZone(type: TorsionType): [number, number] | null {
  if (type === 'pre') return [40.5, 48];
  if (type === 'post') return [15, 30];
  return null;
}

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** Signed rotation (degrees, + = clockwise from behind) of the tract at distance x. */
export function twistAt(x: number, type: TorsionType, thetaDeg: number): number {
  const zone = twistZone(type);
  if (!zone) return 0;
  const [a, b] = zone;
  return thetaDeg * smooth((x - a) / (b - a));
}

/** Untwisted radius of the tract at x: vagina, narrow cervix, then the big gravid uterus. */
export function baseRadius(x: number): number {
  if (x < 1) return 4.5 + (1 - x) * 0.8;
  if (x < TRACT.vaginaEnd) return 4.5;
  if (x < TRACT.cervixStart) return 4.5 - 1.5 * smooth((x - TRACT.vaginaEnd) / (TRACT.cervixStart - TRACT.vaginaEnd));
  if (x < TRACT.cervixEnd) return 3;
  if (x < TRACT.uterusFull) return 3 + 12 * smooth((x - TRACT.cervixEnd) / (TRACT.uterusFull - TRACT.cervixEnd));
  if (x < 84) return 15;
  const t = Math.min(1, (x - 84) / (TRACT.uterusEnd - 84));
  return 15 * Math.sqrt(Math.max(0, 1 - t * t));
}

/** The twisted part is pinched — more so the tighter the torsion. */
export function radiusAt(x: number, type: TorsionType, thetaDeg: number): number {
  const zone = twistZone(type);
  const r = baseRadius(x);
  if (!zone) return r;
  const [a, b] = zone;
  const t = (x - a) / (b - a);
  if (t <= 0 || t >= 1) return r;
  const tightness = Math.min(1, Math.abs(thetaDeg) / 360);
  return r * (1 - 0.5 * tightness * Math.sin(Math.PI * t));
}

/** The broad ligaments hang from the roof of the abdomen on each side… */
export const LIGAMENT_TOP = { y: 24, z: 20 } as const;
/** …and attach to the upper side of the uterus (cross-section angle, degrees). */
export const LIGAMENT_ATTACH_DEG = { left: 150, right: 30 } as const;
export const LIGAMENT_X = { from: 42, to: 94 } as const;

type P2 = [number, number]; // (z, y)

const DEG = Math.PI / 180;
const mod = (a: number, n: number) => ((a % n) + n) % n;

/**
 * The cross-section path of one broad ligament at distance x: from its fixed
 * top attachment down to where it joins the (rotated) uterus. When the
 * twist carries the attachment out of direct reach, the ligament is pulled
 * taut and wraps around the uterus — over the top or underneath depending
 * on the direction — which is exactly what's felt per rectum.
 * Returns `points` evenly spaced points (z, y).
 */
export function ligamentPath(side: 'left' | 'right', x: number, twistDeg: number, uterusRadius: number, points = 40): P2[] {
  const q: P2 = [side === 'left' ? -LIGAMENT_TOP.z : LIGAMENT_TOP.z, LIGAMENT_TOP.y];
  const rho = uterusRadius + 0.6;
  const attachDeg = LIGAMENT_ATTACH_DEG[side] - twistDeg; // clockwise twist → smaller angle
  const a: P2 = [rho * Math.cos(attachDeg * DEG), rho * Math.sin(attachDeg * DEG)];

  const path: P2[] = [q];
  // A small twist may still leave a straight run to the attachment; a big
  // one (and certainly a full turn, which brings the attachment back round
  // to where it started) always wraps the ligament around the uterus.
  if (Math.abs(twistDeg) < 90 && !segmentBlocked(q, a, rho)) {
    path.push(a);
  } else {
    const clockwise = twistDeg >= 0;
    const psi = tangentAngle(q, rho, clockwise);
    const base = clockwise ? mod(psi - attachDeg, 360) : mod(attachDeg - psi, 360);
    const turns = Math.round((Math.abs(twistDeg) - base) / 360);
    const sweep = Math.max(0, base + 360 * turns);
    const steps = Math.max(2, Math.ceil(sweep / 5));
    for (let i = 0; i <= steps; i++) {
      const ang = (psi + (clockwise ? -1 : 1) * (sweep * i) / steps) * DEG;
      path.push([rho * Math.cos(ang), rho * Math.sin(ang)]);
    }
  }
  return resample(path, points);
}

/** Does the straight line from q to a (a point on the circle) pass through the uterus? */
function segmentBlocked(q: P2, a: P2, rho: number): boolean {
  const dz = a[0] - q[0];
  const dy = a[1] - q[1];
  const t = Math.min(1, Math.max(0, -(q[0] * dz + q[1] * dy) / (dz * dz + dy * dy)));
  if (t > 0.999) return false;
  return Math.hypot(q[0] + t * dz, q[1] + t * dy) < rho * 0.995;
}

/** The angle of the tangent point from q onto the circle, on the side that leads round in the given direction. */
function tangentAngle(q: P2, rho: number, clockwise: boolean): number {
  const d = Math.hypot(q[0], q[1]);
  const beta = Math.atan2(q[1], q[0]);
  const alpha = Math.acos(Math.min(1, rho / d));
  for (const psi of [beta + alpha, beta - alpha]) {
    const tz = rho * Math.cos(psi);
    const ty = rho * Math.sin(psi);
    const travel: P2 = clockwise ? [Math.sin(psi), -Math.cos(psi)] : [-Math.sin(psi), Math.cos(psi)];
    if ((tz - q[0]) * travel[0] + (ty - q[1]) * travel[1] > 0) return psi / DEG;
  }
  return beta / DEG;
}

function resample(path: P2[], n: number): P2[] {
  const lengths = [0];
  for (let i = 1; i < path.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  }
  const total = lengths[lengths.length - 1] || 1;
  const out: P2[] = [];
  let seg = 1;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1);
    while (seg < path.length - 1 && lengths[seg] < target) seg++;
    const l0 = lengths[seg - 1];
    const l1 = lengths[seg];
    const f = l1 > l0 ? (target - l0) / (l1 - l0) : 0;
    out.push([path[seg - 1][0] + f * (path[seg][0] - path[seg - 1][0]), path[seg - 1][1] + f * (path[seg][1] - path[seg - 1][1])]);
  }
  return out;
}
