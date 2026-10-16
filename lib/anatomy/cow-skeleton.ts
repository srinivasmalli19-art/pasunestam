// Assembles the cow skeleton: which bone goes where. Pure data, so the 3D
// scene only has to build meshes and place them.
//
// World frame: x = cranial (head to the right of the screen), y = up
// (ground at 0, withers ≈ 13.6 ≈ 1.36 m), z = the cow's right side.

import {
  atlasShape,
  axisShape,
  cannonShape,
  carpusShape,
  caudalShape,
  coxaeShape,
  femurShape,
  humerusShape,
  mandibleShape,
  patellaShape,
  phalanxShape,
  radiusUlnaShape,
  scapulaShape,
  sacrumShape,
  skullShape,
  sternumShape,
  tarsusShape,
  tibiaShape,
  vertebraShape,
  type VertebraParams,
} from './cow-shapes';
import type { BoneShape, Region } from './cow-bones';
import type { V3 } from './sdf';

export interface Piece {
  /** Unique id of this piece in the skeleton. */
  id: string;
  /** Key into BONES (what the student learns about it). */
  bone: string;
  /** Region, when it differs from the bone's usual one (digits of the hindlimb). */
  region?: Region;
  /** What to call this particular piece, e.g. "Thoracic vertebra T5 (right)". */
  label: string;
  /** Mesh cache key — pieces with the same key share one mesh. */
  key: string;
  shape?: () => BoneShape;
  /** For ribs and cartilages: a tube through these world points. */
  tube?: { points: V3[]; radius: number; cartilage?: boolean };
  pos: V3;
  /** Rotation about z (degrees, counter-clockwise seen from the right side). */
  rotZ: number;
  /** Tilt about the bone's own cranial axis (degrees); negative brings the top towards the midline. */
  rotX?: number;
  scale: number;
  mirror: boolean;
}

const deg = (r: number) => (r * 180) / Math.PI;

/** Rotation (about z) that turns the local -y axis to point from a to b. */
function hang(a: readonly [number, number], b: readonly [number, number]) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return { rotZ: deg(Math.atan2(dy, dx)) + 90, dist: Math.hypot(dx, dy) };
}

// ---- spine curve ----------------------------------------------------------------------
const SPINE: Array<[number, number]> = [
  [16.0, 11.55], [14.6, 11.1], [13.2, 10.7], [11.9, 10.35], [10.7, 10.2], [9.6, 10.35], [8.0, 10.75], [6.0, 11.1],
  [4.0, 11.3], [2.0, 11.4], [0, 11.45], [-2.2, 11.5], [-3.2, 11.55], [-5.5, 11.65], [-8.0, 11.8], [-9.0, 11.85],
  [-12.6, 11.6], [-13.4, 11.3], [-14.2, 10.2], [-14.6, 8.0], [-14.8, 5.0],
];

/** Dense polyline through the spine points (Catmull-Rom), for arc-length lookup. */
function densify(pts: Array<[number, number]>, per = 24) {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const DENSE = densify(SPINE);
const ARC: number[] = [0];
for (let i = 1; i < DENSE.length; i++) ARC.push(ARC[i - 1] + Math.hypot(DENSE[i][0] - DENSE[i - 1][0], DENSE[i][1] - DENSE[i - 1][1]));
export const SPINE_LENGTH = ARC[ARC.length - 1];

/** Point and tangent angle (degrees, of the cranial→caudal direction) at arc distance s. */
export function spineAt(s: number): { p: [number, number]; angle: number } {
  const t = Math.min(SPINE_LENGTH, Math.max(0, s));
  let i = 1;
  while (i < ARC.length - 1 && ARC[i] < t) i++;
  const k = (t - ARC[i - 1]) / (ARC[i] - ARC[i - 1] || 1);
  const a = DENSE[i - 1], b = DENSE[i];
  return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], angle: deg(Math.atan2(a[1] - b[1], a[0] - b[0])) };
}

// ---- vertebral column ------------------------------------------------------------------
const THORACIC_SPINE = [2.55, 2.9, 2.95, 2.85, 2.6, 2.35, 2.1, 1.9, 1.72, 1.58, 1.46, 1.36, 1.3];
const THORACIC_TILT = [28, 26, 24, 23, 22, 21, 20, 18, 16, 14, 11, 8, 4];
const LUMBAR_TRANSVERSE = [1.5, 1.9, 2.1, 2.15, 2.0, 1.55];

export function vertebraParams(kind: 'C' | 'T' | 'L', n: number): VertebraParams {
  if (kind === 'C') {
    const i = n - 3; // C3..C7
    return {
      kind: 'cervical',
      len: n === 7 ? 0.75 : 0.95,
      rad: 0.3,
      canal: 0.22,
      spine: [0.18, 0.24, 0.34, 0.55, 1.6][i],
      spineTilt: [-8, -5, 0, 5, 12][i],
      spineWidth: 0.35,
      transverse: 0,
      transverseForamen: n < 7,
      ventralLamina: n === 6,
    };
  }
  if (kind === 'T') {
    return {
      kind: 'thoracic',
      len: 0.68,
      rad: 0.27,
      canal: 0.18,
      spine: THORACIC_SPINE[n - 1],
      spineTilt: THORACIC_TILT[n - 1],
      spineWidth: 0.38 + n * 0.012,
      transverse: 0,
    };
  }
  return { kind: 'lumbar', len: 0.85, rad: 0.3, canal: 0.18, spine: 1.15, spineTilt: -6, spineWidth: 0.6, transverse: LUMBAR_TRANSVERSE[n - 1] };
}

export function buildSkeleton(): Piece[] {
  const pieces: Piece[] = [];
  const both = (p: Omit<Piece, 'mirror' | 'id' | 'label'> & { id: string; label: string }) => {
    pieces.push({ ...p, id: `${p.id}-R`, label: `${p.label} (right)`, mirror: false });
    pieces.push({ ...p, id: `${p.id}-L`, label: `${p.label} (left)`, pos: [p.pos[0], p.pos[1], -p.pos[2]], mirror: true });
  };

  // spine: walk along the curve
  let s = 0.25;
  const place = (len: number) => {
    const mid = spineAt(s + len / 2);
    s += len + 0.08;
    return mid;
  };
  const atlas = place(0.7);
  pieces.push({ id: 'C1', bone: 'atlas', label: 'Atlas (C1)', key: 'atlas', shape: atlasShape, pos: [atlas.p[0], atlas.p[1], 0], rotZ: atlas.angle, scale: 1, mirror: false });
  // skull and mandible sit in front of the atlas, pointing down and forward
  const skullPos: V3 = [atlas.p[0] + 0.55, atlas.p[1] + 0.25, 0];
  pieces.push({ id: 'skull', bone: 'skull', label: 'Skull', key: 'skull', shape: skullShape, pos: skullPos, rotZ: -38, scale: 1, mirror: false });
  pieces.push({ id: 'mandible', bone: 'mandible', label: 'Mandible', key: 'mandible', shape: mandibleShape, pos: skullPos, rotZ: -38, scale: 1, mirror: false });
  const axis = place(1.45);
  pieces.push({ id: 'C2', bone: 'axis', label: 'Axis (C2)', key: 'axis', shape: axisShape, pos: [axis.p[0], axis.p[1], 0], rotZ: axis.angle, scale: 1, mirror: false });
  for (let n = 3; n <= 7; n++) {
    const prm = vertebraParams('C', n);
    const m = place(prm.len + 0.15);
    pieces.push({ id: `C${n}`, bone: 'cervical', label: `Cervical vertebra C${n}`, key: `C${n}`, shape: () => vertebraShape(prm), pos: [m.p[0], m.p[1], 0], rotZ: m.angle, scale: 1, mirror: false });
  }
  const thoracic: Array<{ p: [number, number]; angle: number }> = [];
  for (let n = 1; n <= 13; n++) {
    const prm = vertebraParams('T', n);
    const m = place(prm.len + 0.12);
    thoracic.push(m);
    pieces.push({ id: `T${n}`, bone: 'thoracic', label: `Thoracic vertebra T${n}`, key: `T${n}`, shape: () => vertebraShape(prm), pos: [m.p[0], m.p[1], 0], rotZ: m.angle, scale: 1, mirror: false });
  }
  for (let n = 1; n <= 6; n++) {
    const prm = vertebraParams('L', n);
    const m = place(prm.len + 0.12);
    pieces.push({ id: `L${n}`, bone: 'lumbar', label: `Lumbar vertebra L${n}`, key: `L${n}`, shape: () => vertebraShape(prm), pos: [m.p[0], m.p[1], 0], rotZ: m.angle, scale: 1, mirror: false });
  }
  const sac = place(3.9);
  pieces.push({ id: 'sacrum', bone: 'sacrum', label: 'Sacrum', key: 'sacrum', shape: sacrumShape, pos: [sac.p[0], sac.p[1] + 0.05, 0], rotZ: sac.angle, scale: 1, mirror: false });
  for (let n = 1; n <= 18; n++) {
    const len = 0.75 - n * 0.022;
    const rad = Math.max(0.07, 0.24 - n * 0.009);
    const m = place(len);
    pieces.push({ id: `Cy${n}`, bone: 'caudal', label: `Caudal vertebra Cy${n}`, key: `Cy${n}`, shape: () => caudalShape(len, rad, n >= 2 && n <= 6), pos: [m.p[0], m.p[1], 0], rotZ: m.angle, scale: 1, mirror: false });
  }

  // sternum
  const MANUBRIUM: V3 = [8.75, 5.65, 0];
  const sternumRot = -2;
  pieces.push({ id: 'sternum', bone: 'sternum', label: 'Sternum', key: 'sternum', shape: sternumShape, pos: MANUBRIUM, rotZ: sternumRot, scale: 1, mirror: false });
  const sternumPoint = (k: number): V3 => {
    // along the sternum chain in its local frame, then placed
    const lx = -0.2 - (k - 1) * 0.72;
    const ly = -0.03 * (k - 1) * 3.5 * 0.05 - (k - 1) * 0.13;
    const r = (sternumRot * Math.PI) / 180;
    return [MANUBRIUM[0] + lx * Math.cos(r) - ly * Math.sin(r), MANUBRIUM[1] + lx * Math.sin(r) + ly * Math.cos(r), 0.28];
  };

  // ribs and costal cartilages (right; left mirrored)
  const WIDTH = [1.9, 2.35, 2.75, 3.1, 3.4, 3.65, 3.85, 4.0, 4.05, 4.05, 3.95, 3.8, 3.55];
  const ASTERNAL_END = [5.75, 6.1, 6.7, 7.5, 8.5];
  let prevEnd: V3 = [0, 0, 0];
  for (let i = 1; i <= 13; i++) {
    const v = thoracic[i - 1];
    const [xv, yv] = v.p;
    const w = WIDTH[i - 1];
    const yEnd = i <= 8 ? 5.55 - (i - 1) * 0.06 : ASTERNAL_END[i - 9];
    const drop = yv - yEnd;
    const pts: V3[] = [
      [xv - 0.05, yv - 0.05, 0.3],
      [xv - 0.12, yv + 0.32, 0.75],
      [xv - 0.3, yv + 0.12, w * 0.45],
      [xv - 0.55 - 0.04 * i, yv - drop * 0.35, w * 0.95],
      [xv - 0.85 - 0.07 * i, yv - drop * 0.7, w * 0.88],
      [xv - 1.0 - 0.09 * i, yEnd, w * (i <= 8 ? 0.6 : 0.82)],
    ];
    both({ id: `rib${i}`, bone: 'rib', label: `Rib ${i}`, key: `rib${i}`, tube: { points: pts, radius: 0.12 + Math.min(i, 8) * 0.004 }, pos: [0, 0, 0], rotZ: 0, scale: 1 });
    const end = pts[pts.length - 1];
    const cart: V3[] =
      i <= 8
        ? [end, [end[0] + 0.15, end[1] - 0.3, end[2] * 0.75], sternumPoint(i)]
        : [end, [end[0] + 0.25, end[1] - 0.15, end[2] * 0.95], [prevEnd[0] - 0.05, prevEnd[1] + 0.25, prevEnd[2] * 0.98]];
    both({ id: `cart${i}`, bone: 'rib', label: `Costal cartilage ${i}`, key: `cart${i}`, tube: { points: cart, radius: 0.1, cartilage: true }, pos: [0, 0, 0], rotZ: 0, scale: 1 });
    prevEnd = cart[1];
  }

  // forelimb (right; left mirrored). Joints chosen for a standing cow.
  const FZ = 2.05;
  // the scapula lies against the chest wall: its top leans in towards the spine
  const scap = hang([7.7, 9.6], [5.8, 12.95]);
  both({ id: 'scapula', bone: 'scapula', label: 'Scapula', key: 'scapula', shape: scapulaShape, pos: [7.7, 9.6, 2.45], rotZ: scap.rotZ - 180, rotX: -17, scale: scap.dist / 4.12 });
  const limb = (id: string, bone: string, label: string, key: string, shape: () => BoneShape, a: [number, number], b: [number, number], modelLen: number, z: number) => {
    const h = hang(a, b);
    both({ id, bone, label, key, shape, pos: [a[0], a[1], z], rotZ: h.rotZ, scale: h.dist / modelLen });
  };
  limb('humerus', 'humerus', 'Humerus', 'humerus', humerusShape, [7.7, 9.6], [6.5, 7.0], 2.62, FZ);
  limb('radius', 'radiusUlna', 'Radius and ulna', 'radiusUlna', radiusUlnaShape, [6.5, 7.0], [6.65, 4.0], 2.95, FZ);
  limb('carpus', 'carpus', 'Carpus', 'carpus', carpusShape, [6.65, 4.0], [6.65, 3.42], 0.55, FZ);
  limb('metacarpal', 'metacarpal', 'Large metacarpal bone', 'metacarpal', () => cannonShape(2.1, false), [6.65, 3.42], [6.75, 1.32], 2.05, FZ);
  const digits = (prefix: 'f' | 'h', base: [number, number], p1End: [number, number], p2End: [number, number], z: number) => {
    const first = pieces.length;
    const foot = prefix === 'f' ? 'fore' : 'hind';
    for (const [d, dz] of [['III', -0.32], ['IV', 0.32]] as const) {
      limb(`${prefix}p1${d}`, 'p1', `Proximal phalanx, ${foot} digit ${d}`, 'p1', () => phalanxShape('p1'), base, p1End, 0.62, z + dz);
      limb(`${prefix}p2${d}`, 'p2', `Middle phalanx, ${foot} digit ${d}`, 'p2', () => phalanxShape('p2'), p1End, p2End, 0.42, z + dz);
      both({ id: `${prefix}p3${d}`, bone: 'p3', label: `Distal phalanx, ${foot} digit ${d}`, key: 'p3', shape: () => phalanxShape('p3'), pos: [p2End[0], p2End[1], z + dz], rotZ: -6, scale: 1 });
    }
    for (let k = first; k < pieces.length; k++) pieces[k].region = prefix === 'f' ? 'forelimb' : 'hindlimb';
  };
  digits('f', [6.75, 1.32], [7.12, 0.86], [7.42, 0.56], FZ);

  // hindlimb
  const ACET: V3 = [-10.4, 11.5, 1.9];
  both({ id: 'coxae', bone: 'coxae', label: 'Os coxae', key: 'coxae', shape: coxaeShape, pos: ACET, rotZ: 0, scale: 1 });
  const HZ = ACET[2] + 0.38;
  const fem = hang([-10.4, 11.5], [-9.2, 8.15]);
  both({ id: 'femur', bone: 'femur', label: 'Femur', key: 'femur', shape: femurShape, pos: [-10.4, 11.5, HZ], rotZ: fem.rotZ, scale: fem.dist / 3.35 });
  // patella: in the femur's frame at the trochlea
  {
    const r = (fem.rotZ * Math.PI) / 180;
    const sc = fem.dist / 3.35;
    const lx = 0.72, ly = -3.0;
    both({ id: 'patella', bone: 'patella', label: 'Patella', key: 'patella', shape: patellaShape, pos: [-10.4 + sc * (lx * Math.cos(r) - ly * Math.sin(r)), 11.5 + sc * (lx * Math.sin(r) + ly * Math.cos(r)), HZ], rotZ: fem.rotZ, scale: sc });
  }
  limb('tibia', 'tibia', 'Tibia (with fibula)', 'tibia', tibiaShape, [-9.2, 8.15], [-10.6, 4.6], 3.85, HZ);
  limb('tarsus', 'tarsus', 'Tarsus', 'tarsus', tarsusShape, [-10.6, 4.6], [-10.6, 3.6], 1.0, HZ);
  limb('metatarsal', 'metatarsal', 'Large metatarsal bone', 'metatarsal', () => cannonShape(2.4, true), [-10.6, 3.6], [-10.45, 1.25], 2.35, HZ);
  digits('h', [-10.45, 1.25], [-10.06, 0.82], [-9.76, 0.52], HZ);

  return pieces;
}
