// Bone shapes for the cow, built from signed distance fields.
// Frames: units ≈ 10 cm; x = cranial, y = dorsal/proximal, z = lateral (right
// bone; the left is mirrored). Limb bones hang from the proximal joint at the
// origin down -y. Plate-like bones are cut from outlines; long bones are
// tapering rods with blended processes; grooves, fossae and foramina are carved.

import type { BoneShape } from './cow-bones';
import {
  blend,
  capsule,
  carve,
  chain,
  ellipsoid,
  intersect,
  mirrorZ,
  plane,
  plate,
  prism,
  rotated,
  roundBox,
  roundCone,
  shearZ,
  sphere,
  subtract,
  torus,
  triangle,
  type P2,
  type SDF,
  type V3,
} from './sdf';

// =====================================================================================
// Skull & mandible (origin at the occipital condyles, x rostral, y dorsal)
// =====================================================================================

export function skullShape(): BoneShape {
  // lateral view outline (x, y)
  const side: P2[] = [
    [0.2, 1.28], [0.95, 1.16], [1.8, 1.0], [2.6, 0.86], [3.4, 0.6], [4.2, 0.36], [4.9, 0.12], [5.28, -0.1], [5.38, -0.38], [5.08, -0.56],
    [4.3, -0.56], [3.9, -0.76], [3.0, -0.98], [2.0, -0.98], [1.6, -0.78], [1.0, -0.55], [0.4, -0.52], [-0.25, -0.32], [-0.22, 0.12], [-0.05, 0.62], [0.05, 1.02],
  ];
  // dorsal view outline (x, z): half widths, mirrored
  const half: P2[] = [[-0.28, 0.5], [0.0, 0.92], [0.25, 1.02], [0.9, 0.96], [1.7, 1.02], [2.3, 1.28], [2.9, 1.24], [3.45, 0.92], [4.1, 0.72], [4.7, 0.58], [5.1, 0.5], [5.4, 0.42]];
  const top: P2[] = [...half.map(([x, z]) => [x, z] as P2), ...[...half].reverse().map(([x, z]) => [x, -z] as P2)];
  // cross-section (z, y): flat wide roof, narrower base
  const front: P2[] = [[-1.4, 1.4], [1.4, 1.4], [1.4, 0.15], [0.95, -1.05], [-0.95, -1.05], [-1.4, 0.15]];
  const block = carve(0.3, prism(side, 'xy'), prism(top, 'xz'), prism(front, 'zy'));
  const details = mirrorZ(
    blend(
      0.16,
      chain([[0.32, 1.02, 0.85], [0.15, 1.45, 1.6], [0.35, 1.9, 2.3]], [0.3, 0.2, 0.08]), // horn core
      torus([2.6, 0.38, 1.12], 0.44, 0.1, 'z'), // orbital rim
      capsule([2.25, -0.08, 1.12], [1.0, -0.12, 0.98], 0.12), // zygomatic arch
      sphere([3.2, -0.08, 0.92], 0.16), // facial tuber
      roundBox([3.0, -0.92, 0.52], [1.05, 0.14, 0.17], 0.08), // cheek teeth
      ellipsoid([-0.18, -0.12, 0.33], [0.2, 0.25, 0.17]), // occipital condyle
      capsule([-0.02, -0.25, 0.62], [0.06, -0.9, 0.66], 0.1), // paracondylar process
      sphere([0.45, -0.52, 0.62], 0.2), // tympanic bulla
    ),
  );
  const s = subtract(
    blend(0.18, block, details),
    0.08,
    capsule([-0.7, -0.05, 0], [0.25, -0.05, 0], 0.22), // foramen magnum
    sphere([2.6, 0.36, 1.48], 0.45), // orbits
    sphere([2.6, 0.36, -1.48], 0.45),
    ellipsoid([1.0, 0.45, 1.25], [0.62, 0.38, 0.32]), // temporal fossae
    ellipsoid([1.0, 0.45, -1.25], [0.62, 0.38, 0.32]),
    ellipsoid([5.45, -0.12, 0], [0.38, 0.22, 0.24]), // nasal aperture
    sphere([3.75, -0.12, 0.84], 0.07), // infraorbital foramina
    sphere([3.75, -0.12, -0.84], 0.07),
  );
  return { sdf: s, min: [-0.95, -1.25, -2.55], max: [5.6, 2.15, 2.55] };
}

export function mandibleShape(): BoneShape {
  const outline: P2[] = [
    [0.95, 0.27], [1.2, 0.05], [1.82, 0.52], [1.78, 0.1], [1.98, -0.46], [2.4, -0.7], [3.6, -0.74], [4.1, -0.88], [4.6, -0.84], [5.05, -0.66],
    [5.27, -0.68], [5.02, -0.88], [4.3, -1.03], [3.4, -1.18], [2.4, -1.32], [2.06, -1.38], [1.95, -1.31], [1.84, -1.38], [1.3, -1.43], [0.95, -1.15], [0.84, -0.4], [0.85, 0.05],
  ];
  const zAt = (x: number) => 0.8 - Math.min(Math.max(x - 1.0, 0), 4.2) * 0.165;
  const halfJaw = blend(
    0.06,
    shearZ(plate(outline, 'xy', 0, 0.11, 0.07), zAt),
    capsule([0.95, 0.22, 0.6], [0.95, 0.22, 0.95], 0.11), // condylar process (joint surface)
    ...[2.5, 2.85, 3.2, 3.5].map((x) => sphere([x, -0.72, zAt(x)], 0.12)), // cheek teeth crowns
    ...[0.05, 0.13, 0.21, 0.29].map((z, i) => rotated(ellipsoid([5.2 - i * 0.04, -0.62, z], [0.2, 0.05, 0.045]), [5.2, -0.62, z], [0, 0, 22])), // incisors
  );
  const s = subtract(
    halfJaw,
    0.03,
    sphere([4.25, -0.86, zAt(4.25) + 0.12], 0.06), // mental foramen (lateral)
    sphere([1.3, -0.48, zAt(1.3) - 0.12], 0.07), // mandibular foramen (medial)
  );
  return { sdf: mirrorZ(s), min: [0.55, -1.7, -1.1], max: [5.5, 0.75, 1.1] };
}

// =====================================================================================
// Vertebrae (origin at the centre of the body, x cranial, y dorsal)
// =====================================================================================

export interface VertebraParams {
  kind: 'cervical' | 'thoracic' | 'lumbar';
  len: number;
  rad: number;
  canal: number;
  spine: number;
  spineTilt: number; // degrees; + leans caudally
  spineWidth: number;
  transverse: number;
  transverseForamen?: boolean;
  ventralLamina?: boolean;
}

/** A tapering plate in the median plane from (x0,y0) to (x1,y1) — a spinous process. */
function spinePlate(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, half: number): SDF {
  const dx = x1 - x0, dy = y1 - y0;
  const L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L; // along
  const nx = -uy, ny = ux; // across
  const outline: P2[] = [
    [x0 + nx * w0, y0 + ny * w0], [x1 + nx * w1, y1 + ny * w1], [x1 + ux * w1 * 0.8, y1 + uy * w1 * 0.8], [x1 - nx * w1, y1 - ny * w1], [x0 - nx * w0, y0 - ny * w0],
  ];
  return plate(outline, 'xy', 0, half, half * 0.9);
}

export function vertebraShape(p: VertebraParams): BoneShape {
  const L = p.len / 2;
  const R = p.rad;
  const c = p.canal;
  const roofY = R + 2 * c + 0.02;
  const half: SDF[] = [
    roundBox([0, R + c * 0.8, c + 0.07], [L * 0.6, c * 0.95, 0.065], 0.05), // pedicle
    roundBox([0, roofY, c * 0.6], [L * 0.62, 0.07, c * 0.75], 0.05), // lamina (roof)
    capsule([L * 0.55, roofY, c + 0.05], [L + 0.12, roofY + 0.07, c + 0.1], 0.08), // cranial articular process
    capsule([-L * 0.55, roofY + 0.04, c - 0.02], [-L - 0.14, roofY + 0.06, c - 0.02], 0.075), // caudal articular process
  ];
  if (p.kind === 'cervical') {
    half.push(roundCone([-0.05, 0.05, R * 0.8], [-0.3, 0.02, R + 0.35], 0.1, 0.08)); // dorsal tubercle
    half.push(roundCone([0.05, -0.08, R * 0.8], [0.32, -0.32, R + 0.28], 0.1, 0.07)); // ventral tubercle
    if (p.ventralLamina) half.push(plate([[-0.38, -0.02], [0.38, -0.02], [0.32, -0.62], [-0.28, -0.58]], 'xy', R + 0.28, 0.05)); // C6
  } else if (p.kind === 'thoracic') {
    half.push(capsule([0, roofY - 0.05, c + 0.1], [-0.05, roofY + 0.05, R + 0.32], 0.1)); // transverse process
    half.push(sphere([0.04, roofY + 0.14, c + 0.12], 0.07)); // mammillary process
  } else {
    const T = p.transverse;
    half.push(plate([[-0.2, R * 0.7], [0.2, R * 0.7], [0.24, R + T * 0.7], [0.12, R + T], [-0.12, R + T], [-0.18, R + T * 0.7]], 'xz', 0.02, 0.05)); // transverse process
    half.push(sphere([L * 0.75, roofY + 0.1, c + 0.15], 0.09)); // mammillary process
  }
  const tilt = (p.spineTilt * Math.PI) / 180;
  const parts: SDF[] = [
    roundCone([-L, 0, 0], [L, 0, 0], R, R * 0.96), // body
    mirrorZ(blend(0.06, ...half)),
  ];
  if (p.spine > 0.05)
    parts.push(spinePlate(0, roofY, -Math.sin(tilt) * p.spine, roofY + Math.cos(tilt) * p.spine, p.spineWidth / 2, p.spineWidth * 0.3, 0.055));
  const cuts: SDF[] = [capsule([-L - 0.4, R + c - 0.02, 0], [L + 0.4, R + c - 0.02, 0], c)]; // vertebral foramen
  if (p.transverseForamen) cuts.push(mirrorZ(capsule([-L - 0.3, 0.02, R + 0.08], [L + 0.3, 0.02, R + 0.08], 0.065)));
  if (p.kind === 'thoracic') {
    cuts.push(mirrorZ(sphere([L * 1.0, R * 0.6, R * 0.72], 0.11)), mirrorZ(sphere([-L * 1.0, R * 0.6, R * 0.72], 0.11))); // costal foveae
    cuts.push(mirrorZ(sphere([0.1, R + c * 1.3, c + 0.12], 0.045))); // lateral vertebral foramen
  }
  const s = subtract(blend(0.07, ...parts), 0.03, ...cuts);
  const w = p.kind === 'lumbar' ? R + p.transverse + 0.15 : R + 0.5;
  const reach = Math.abs(Math.sin(tilt)) * p.spine;
  return { sdf: s, min: [-L - 0.35 - (tilt > 0 ? reach : 0), -R - 0.7, -w], max: [L + 0.35 + (tilt < 0 ? reach : 0), roofY + p.spine + 0.25, w] };
}

export function atlasShape(): BoneShape {
  const wing: P2[] = [[0.35, 0.3], [0.42, 0.95], [0.12, 1.12], [-0.3, 1.04], [-0.42, 0.6], [-0.3, 0.3]];
  const s = blend(
    0.07,
    torus([0, 0.25, 0], 0.4, 0.12, 'x'), // dorsal and ventral arches
    mirrorZ(plate(wing, 'xz', 0.24, 0.075)), // wings
    sphere([0, 0.68, 0], 0.08), // dorsal tubercle
    sphere([0.05, -0.2, 0], 0.09), // ventral tubercle
    mirrorZ(ellipsoid([0.28, 0.22, 0.3], [0.13, 0.26, 0.18])), // cranial articular surfaces
  );
  const carved = subtract(
    s,
    0.03,
    mirrorZ(ellipsoid([0.42, 0.22, 0.27], [0.13, 0.22, 0.15])), // cranial articular foveae
    mirrorZ(capsule([0.12, 0.5, 0.42], [0.22, 0.5, 0.42], 0.06)), // lateral vertebral foramina
    mirrorZ(capsule([0.08, 0.38, 0.75], [0.08, 0.1, 0.75], 0.05)), // alar foramina
  );
  return { sdf: carved, min: [-0.6, -0.4, -1.25], max: [0.65, 0.9, 1.25] };
}

export function axisShape(): BoneShape {
  const crest: P2[] = [[0.5, 0.45], [0.66, 0.78], [0.2, 1.05], [-0.55, 1.28], [-0.95, 1.05], [-0.85, 0.45]];
  const s = blend(
    0.07,
    roundCone([-0.55, 0, 0], [0.45, 0.05, 0], 0.3, 0.28), // body
    roundCone([0.45, 0.05, 0], [0.84, 0.06, 0], 0.22, 0.16), // dens
    mirrorZ(roundBox([-0.05, 0.25, 0.25], [0.48, 0.2, 0.07], 0.05)), // pedicles
    roundBox([-0.1, 0.45, 0], [0.5, 0.07, 0.3], 0.05), // lamina
    plate(crest, 'xy', 0, 0.07), // spinous process (crest)
    mirrorZ(capsule([-0.5, 0.0, 0.3], [-0.72, -0.18, 0.46], 0.08)), // transverse processes
    mirrorZ(capsule([-0.5, 0.48, 0.22], [-0.78, 0.46, 0.25], 0.08)), // caudal articular processes
  );
  const carved = subtract(s, 0.04, capsule([-1, 0.3, 0], [1, 0.3, 0], 0.16), mirrorZ(capsule([0.25, 0.4, 0.28], [0.32, 0.4, 0.28], 0.05)));
  return { sdf: carved, min: [-1.1, -0.45, -0.75], max: [1.1, 1.45, 0.75] };
}

export function sacrumShape(): BoneShape {
  const crest: P2[] = [[1.6, 0.4], [1.4, 0.98], [0.85, 1.04], [0.3, 0.96], [-0.3, 0.92], [-0.9, 0.82], [-1.5, 0.62], [-1.95, 0.32], [-1.9, 0.15], [1.5, 0.2]];
  const s = blend(
    0.12,
    chain([[1.75, 0, 0], [0.5, 0.05, 0], [-0.8, -0.05, 0], [-1.85, -0.18, 0]], [0.3, 0.26, 0.21, 0.14]), // fused bodies
    triangle([1.6, 0.32, 1.0], [1.6, 0.32, -1.0], [-1.9, 0.12, 0], 0.08), // roof, wide in front
    triangle([1.6, 0.32, 0.35], [-1.9, 0.12, 0.28], [-1.9, 0.12, -0.28], 0.08),
    triangle([1.6, 0.32, -0.35], [-1.9, 0.12, -0.28], [1.6, 0.32, 0.35], 0.08),
    mirrorZ(ellipsoid([1.4, 0.08, 0.95], [0.38, 0.22, 0.32])), // wings (auricular surface faces the ilium)
    plate(crest, 'xy', 0, 0.07), // median sacral crest
  );
  const carved = subtract(
    s,
    0.03,
    chain([[2.3, 0.2, 0], [0, 0.18, 0], [-2.3, -0.02, 0]], [0.15, 0.12, 0.08]), // sacral canal
    ...[1.0, 0.25, -0.5, -1.2].map((x) => mirrorZ(sphere([x, 0.3, 0.45 - x * 0.05], 0.075))), // dorsal sacral foramina
  );
  return { sdf: carved, min: [-2.15, -0.55, -1.4], max: [2.15, 1.3, 1.4] };
}

export function caudalShape(len: number, rad: number, haemal: boolean): BoneShape {
  const L = len / 2;
  const parts: SDF[] = [roundCone([-L, 0, 0], [L, 0, 0], rad, rad * 0.9)];
  if (rad > 0.12) {
    parts.push(mirrorZ(plate([[-L * 0.6, rad * 0.6], [L * 0.6, rad * 0.6], [L * 0.3, rad + 0.2], [-L * 0.4, rad + 0.18]], 'xz', 0, 0.04))); // transverse processes
    parts.push(mirrorZ(capsule([L * 0.6, rad * 0.9, rad * 0.4], [L + 0.08, rad * 1.05, rad * 0.4], 0.05))); // cranial articular processes
  }
  if (haemal) parts.push(mirrorZ(capsule([L * 0.5, -rad * 0.8, 0.07], [L * 0.6, -rad - 0.14, 0.05], 0.042)));
  return { sdf: blend(0.05, ...parts), min: [-L - rad - 0.15, -rad - 0.3, -rad - 0.35], max: [L + rad + 0.15, rad * 1.5 + 0.1, rad + 0.35] };
}

// =====================================================================================
// Forelimb (right). Origin at the proximal joint; the bone hangs down -y.
// =====================================================================================

export function scapulaShape(): BoneShape {
  const blade: P2[] = [
    [0.3, 0.85], [0.55, 1.6], [0.85, 2.6], [1.12, 3.55], [1.28, 4.08], [0.6, 4.22], [-0.3, 4.22], [-1.22, 4.06], [-1.0, 3.2], [-0.62, 2.0], [-0.32, 1.1], [-0.26, 0.85],
  ];
  const spine: P2[] = [[0.0, 0.95], [0.3, 0.9], [0.4, 1.5], [0.34, 3.0], [0.24, 4.1], [0.0, 4.15]]; // (z, y)
  const s = blend(
    0.1,
    plate(blade, 'xy', 0, 0.065),
    rotated(plate(spine, 'zy', 0.1, 0.06), [0.1, 0.95, 0], [0, 0, -6.2]), // scapular spine
    roundCone([0.12, 0.95, 0.3], [0.08, 0.58, 0.28], 0.09, 0.07), // acromion
    capsule([-0.3, 1.05, -0.02], [-1.18, 3.95, -0.02], 0.08), // thick caudal border
    roundCone([0, 0.25, 0], [0, 1.0, 0], 0.3, 0.2), // neck
    ellipsoid([0, 0.05, 0], [0.42, 0.24, 0.36]), // glenoid region
    sphere([0.38, 0.2, 0], 0.17), // supraglenoid tubercle
    sphere([0.42, 0.12, -0.15], 0.1), // coracoid process
  );
  return { sdf: subtract(s, 0.05, sphere([0, -0.35, 0], 0.4)), min: [-1.45, -0.4, -0.5], max: [1.5, 4.4, 0.62] };
}

/** Phalanges of one digit (frame: proximal joint at the origin, long axis -y). */
export function phalanxShape(which: 'p1' | 'p2' | 'p3'): BoneShape {
  if (which === 'p1') {
    const s = blend(0.07, ellipsoid([0, -0.06, 0], [0.15, 0.09, 0.14]), roundCone([0, -0.1, 0], [0, -0.55, 0], 0.11, 0.1), ellipsoid([0, -0.59, 0], [0.13, 0.08, 0.13]));
    return { sdf: subtract(s, 0.03, ellipsoid([0, -0.69, 0], [0.18, 0.05, 0.025])), min: [-0.28, -0.8, -0.28], max: [0.28, 0.1, 0.28] };
  }
  if (which === 'p2') {
    const s = blend(0.07, ellipsoid([0, -0.06, 0], [0.14, 0.09, 0.13]), roundCone([0, -0.1, 0], [0, -0.36, 0], 0.11, 0.1), ellipsoid([0, -0.39, 0], [0.13, 0.07, 0.12]));
    return { sdf: s, min: [-0.28, -0.58, -0.28], max: [0.28, 0.1, 0.28] };
  }
  const side: P2[] = [[-0.16, 0.08], [0.1, 0.13], [0.78, -0.34], [0.66, -0.43], [-0.2, -0.43], [-0.32, -0.26], [-0.24, -0.02]];
  const top: P2[] = [[-0.3, -0.12], [-0.26, 0.15], [0.2, 0.18], [0.6, 0.09], [0.8, 0.0], [0.62, -0.09], [0.0, -0.12]];
  const s = carve(0.06, prism(side, 'xy'), prism(top, 'xz'));
  return { sdf: s, min: [-0.45, -0.55, -0.3], max: [0.9, 0.25, 0.3] };
}

// =====================================================================================
// Hindlimb (right)
// =====================================================================================

/** Os coxae (ilium + ischium + pubis). Origin = centre of the acetabulum. */
export function coxaeShape(): BoneShape {
  const TC: V3 = [2.8, 1.4, 1.1]; // tuber coxae
  const TS: V3 = [1.8, 1.92, -1.3]; // tuber sacrale
  const IT: V3 = [-3.05, 0.55, -0.7]; // ischial tuber
  const SY1: V3 = [-0.6, -1.25, -1.9]; // cranial end of the symphysis
  const SY2: V3 = [-2.7, -1.15, -1.92]; // caudal end of the symphysis
  const s = blend(
    0.16,
    triangle([0.45, 0.35, -0.05], TC, TS, 0.075), // wing of the ilium
    roundCone([0.2, 0.12, -0.05], [1.2, 0.7, -0.05], 0.36, 0.3), // body (shaft) of the ilium
    roundCone([1.2, 0.7, -0.05], TC, 0.22, 0.22),
    ellipsoid(TC, [0.32, 0.42, 0.34]), // tuber coxae (hook)
    sphere(TS, 0.2), // tuber sacrale
    sphere([0, 0, 0], 0.55), // acetabulum
    roundCone([-0.3, 0.05, -0.12], IT, 0.3, 0.22), // body of the ischium
    triangle([-0.4, -0.3, -0.4], IT, SY2, 0.09), // ischial plate
    triangle([-0.4, -0.3, -0.4], SY2, SY1, 0.09), // pubis / floor
    roundCone([-0.25, -0.25, -0.2], SY1, 0.24, 0.16), // cranial ramus of the pubis
    sphere([-3.1, 0.82, -0.72], 0.19), // ischial tuber: dorsal process
    sphere([-3.2, 0.48, -0.45], 0.19), // lateral process
    sphere([-2.95, 0.25, -0.9], 0.17), // ventral process
    capsule(SY1, SY2, 0.14), // symphysis edge
  );
  const carved = subtract(
    s,
    0.08,
    sphere([0, -0.08, 0.45], 0.45), // acetabular cavity
    capsule([-0.15, -0.45, 0.3], [-0.05, -0.55, 0.55], 0.12), // acetabular notch
    ellipsoid([-1.25, -0.62, -1.0], [0.62, 0.4, 0.55]), // obturator foramen
  );
  const half = intersect(carved, plane([0, 0, -1.95], [0, 0, -1])); // stop at the midline (symphysis)
  return { sdf: half, min: [-3.6, -1.65, -2.1], max: [3.4, 2.35, 1.6] };
}
export function humerusShape(): BoneShape {
  const s = blend(
    0.14,
    sphere([-0.25, -0.05, 0], 0.43), // head
    ellipsoid([0.3, 0.12, 0.17], [0.33, 0.36, 0.28]), // greater tubercle (cranial + caudal parts)
    ellipsoid([0.27, -0.05, -0.28], [0.22, 0.25, 0.2]), // lesser tubercle
    chain([[0.05, -0.45, 0], [0.15, -1.3, 0], [0.02, -2.3, 0]], [0.32, 0.25, 0.27]), // shaft
    ellipsoid([0.2, -0.9, 0.27], [0.13, 0.32, 0.1]), // deltoid tuberosity
    ellipsoid([-0.2, -0.95, -0.25], [0.1, 0.18, 0.08]), // teres major tuberosity
    capsule([0.12, -2.62, -0.36], [0.12, -2.62, 0.32], 0.26), // condyle
    sphere([0.1, -2.6, -0.34], 0.3), // larger medial part of the condyle
    ellipsoid([-0.15, -2.42, -0.4], [0.2, 0.22, 0.14]), // medial epicondyle
    ellipsoid([-0.15, -2.42, 0.38], [0.18, 0.2, 0.13]), // lateral epicondyle
  );
  const carved = subtract(
    s,
    0.06,
    capsule([0.47, 0.25, -0.03], [0.42, -0.45, -0.03], 0.11), // intertubercular groove
    ellipsoid([-0.34, -2.45, 0], [0.2, 0.3, 0.2]), // olecranon fossa
    ellipsoid([0.36, -2.4, 0], [0.12, 0.16, 0.18]), // radial fossa
    capsule([-0.1, -0.75, 0.33], [0.3, -1.95, 0.27], 0.07), // brachialis (musculospiral) groove
    torus([0.12, -2.62, -0.05], 0.3, 0.06, 'z'), // shallow trochlear groove
  );
  return { sdf: carved, min: [-0.85, -3.05, -0.85], max: [0.8, 0.6, 0.65] };
}

export function radiusUlnaShape(): BoneShape {
  const radius = blend(
    0.12,
    ellipsoid([0.1, -0.12, 0], [0.26, 0.16, 0.4]), // head
    roundBox([0.12, -1.5, 0], [0.18, 1.3, 0.31], 0.14), // shaft
    ellipsoid([0.1, -2.84, 0], [0.28, 0.18, 0.43]), // distal end (trochlea)
    sphere([0.3, -0.38, -0.16], 0.1), // radial tuberosity
    sphere([0.0, -2.9, -0.42], 0.12), // medial styloid process
  );
  const ulna = blend(
    0.1,
    roundCone([-0.25, -0.1, 0], [-0.55, 0.92, 0], 0.22, 0.2), // olecranon
    sphere([-0.1, 0.24, 0], 0.11), // anconeal process
    roundCone([-0.25, -0.35, 0.06], [-0.1, -2.7, 0.26], 0.15, 0.07), // body of the ulna (fused)
    sphere([-0.1, -2.88, 0.43], 0.12), // lateral styloid process (= distal ulna)
  );
  const s = subtract(
    blend(0.08, radius, ulna),
    0.04,
    capsule([0.12, 0.13, -0.38], [0.12, 0.13, 0.38], 0.26), // trochlear notch (for the humerus)
    ellipsoid([-0.1, -0.5, 0.12], [0.05, 0.12, 0.12]), // proximal interosseous space
    ellipsoid([-0.04, -2.45, 0.22], [0.04, 0.1, 0.1]), // distal interosseous space
  );
  return { sdf: s, min: [-0.85, -3.15, -0.65], max: [0.55, 1.2, 0.65] };
}

export function carpusShape(): BoneShape {
  const b = (c: V3, h: V3) => roundBox(c, h, 0.07);
  const s = blend(
    0.035,
    b([0.12, -0.13, -0.24], [0.22, 0.12, 0.12]), // radial carpal
    b([0.12, -0.13, 0.03], [0.22, 0.12, 0.13]), // intermediate carpal
    b([0.08, -0.13, 0.3], [0.2, 0.12, 0.12]), // ulnar carpal
    ellipsoid([-0.32, -0.12, 0.28], [0.2, 0.16, 0.1]), // accessory carpal
    b([0.12, -0.42, -0.12], [0.22, 0.12, 0.18]), // fused 2nd + 3rd carpal
    b([0.1, -0.42, 0.24], [0.2, 0.12, 0.13]), // 4th carpal
  );
  return { sdf: s, min: [-0.65, -0.65, -0.5], max: [0.45, 0.1, 0.55] };
}

export function cannonShape(length: number, hind: boolean): BoneShape {
  const L = length;
  const w = hind ? 0.26 : 0.3;
  const s = blend(
    0.12,
    ellipsoid([0, -0.1, 0], [0.28, 0.13, 0.43]), // proximal articular surface
    roundBox([0, -L / 2, 0], [hind ? 0.22 : 0.2, L / 2 - 0.15, w], 0.13), // shaft
    ellipsoid([0, -L + 0.05, 0.2], [0.24, 0.2, 0.15]), // lateral trochlea (digit IV)
    ellipsoid([0, -L + 0.05, -0.2], [0.24, 0.2, 0.15]), // medial trochlea (digit III)
    ...(hind ? [] : [roundCone([-0.1, -0.12, 0.42], [-0.12, -0.55, 0.42], 0.07, 0.03)]), // metacarpal V
  );
  const carved = subtract(
    s,
    0.04,
    capsule([hind ? 0.27 : 0.24, -0.25, 0], [hind ? 0.27 : 0.24, -L + 0.4, 0], hind ? 0.07 : 0.05), // dorsal longitudinal groove
    ellipsoid([0, -L - 0.12, 0], [0.32, 0.25, 0.05]), // intertrochlear notch
    capsule([-0.4, -L + 0.33, 0], [0.4, -L + 0.33, 0], 0.045), // distal canal
    capsule([-0.4, -0.3, 0], [0.4, -0.3, 0], 0.04), // proximal canal
  );
  return { sdf: carved, min: [-0.45, -L - 0.3, -0.62], max: [0.45, 0.15, 0.62] };
}

export function femurShape(): BoneShape {
  const s = blend(
    0.14,
    sphere([0.05, 0.02, -0.38], 0.42), // head
    roundCone([0.05, 0, -0.3], [0.0, -0.25, 0.05], 0.3, 0.3), // neck
    ellipsoid([-0.08, 0.22, 0.42], [0.38, 0.45, 0.28]), // greater trochanter
    ellipsoid([-0.25, -0.62, -0.3], [0.15, 0.18, 0.13]), // lesser trochanter
    chain([[0, -0.35, 0.12], [0.06, -1.7, 0.05], [0.0, -2.8, 0.03]], [0.34, 0.27, 0.33]), // shaft
    ellipsoid([-0.15, -3.33, -0.33], [0.38, 0.3, 0.2]), // medial condyle
    ellipsoid([-0.15, -3.33, 0.33], [0.36, 0.29, 0.19]), // lateral condyle
    capsule([0.36, -2.82, -0.3], [0.3, -3.28, -0.28], 0.21), // medial trochlear ridge (larger)
    capsule([0.32, -2.92, 0.27], [0.29, -3.28, 0.25], 0.15), // lateral trochlear ridge
  );
  const carved = subtract(
    s,
    0.06,
    ellipsoid([-0.4, 0.0, 0.25], [0.2, 0.25, 0.15]), // trochanteric fossa
    capsule([0.5, -2.88, -0.01], [0.44, -3.36, -0.01], 0.12), // trochlear groove
    ellipsoid([-0.3, -3.5, 0], [0.38, 0.26, 0.1]), // intercondylar fossa
    ellipsoid([-0.38, -2.72, 0.24], [0.12, 0.16, 0.12]), // supracondylar fossa
    sphere([0.1, 0.25, -0.62], 0.08), // fovea of the head
    capsule([0.15, -3.35, 0.5], [0.1, -3.35, 0.6], 0.07), // extensor fossa
  );
  return { sdf: carved, min: [-0.85, -3.8, -0.95], max: [0.85, 0.75, 0.9] };
}

export function patellaShape(): BoneShape {
  const s = blend(0.1, ellipsoid([0, 0, 0], [0.28, 0.4, 0.27]), roundCone([0, 0.1, 0], [0.05, -0.38, 0], 0.22, 0.08));
  return { sdf: subtract(s, 0.05, ellipsoid([-0.32, 0, 0], [0.12, 0.3, 0.2])), min: [-0.45, -0.6, -0.45], max: [0.45, 0.6, 0.45] };
}

export function tibiaShape(): BoneShape {
  const s = blend(
    0.13,
    ellipsoid([-0.02, -0.12, 0], [0.48, 0.2, 0.52]), // plateau (medial + lateral condyles)
    sphere([0.0, 0.04, -0.08], 0.09), // intercondylar eminence
    sphere([0.0, 0.04, 0.1], 0.09),
    ellipsoid([0.42, -0.32, 0], [0.18, 0.25, 0.15]), // tibial tuberosity
    roundCone([0.42, -0.32, 0], [0.22, -1.45, 0], 0.13, 0.06), // tibial crest
    chain([[0, -0.4, 0], [0.02, -2.0, 0], [0, -3.5, 0]], [0.32, 0.23, 0.26]), // shaft
    ellipsoid([0, -3.7, 0], [0.32, 0.16, 0.38]), // distal end
    sphere([0.0, -3.82, -0.4], 0.12), // medial malleolus
    sphere([0.0, -3.78, 0.44], 0.13), // malleolar bone (lateral malleolus)
    roundCone([-0.05, -0.25, 0.5], [-0.05, -0.68, 0.46], 0.12, 0.04), // head of fibula (shaft absent)
  );
  const carved = subtract(
    s,
    0.05,
    capsule([0.32, -0.15, 0.4], [0.35, -0.5, 0.42], 0.1), // extensor groove
    capsule([-0.4, -3.88, -0.15], [0.4, -3.88, -0.15], 0.08), // cochlea grooves
    capsule([-0.4, -3.88, 0.15], [0.4, -3.88, 0.15], 0.08),
  );
  return { sdf: carved, min: [-0.75, -4.15, -0.8], max: [0.8, 0.4, 0.8] };
}

export function tarsusShape(): BoneShape {
  const s = blend(
    0.08,
    ellipsoid([0.05, -0.25, 0], [0.3, 0.3, 0.3]), // talus
    capsule([-0.2, 0.0, -0.13], [0.3, 0.0, -0.13], 0.11), // proximal trochlea of talus
    capsule([-0.2, 0.0, 0.13], [0.3, 0.0, 0.13], 0.11),
    capsule([-0.15, -0.5, -0.12], [0.3, -0.5, -0.12], 0.1), // distal trochlea of talus
    capsule([-0.15, -0.5, 0.12], [0.3, -0.5, 0.12], 0.1),
    roundCone([-0.28, -0.55, 0.16], [-0.6, 0.85, 0.12], 0.19, 0.16), // calcaneus
    sphere([-0.64, 0.92, 0.12], 0.2), // calcaneal tuber (point of the hock)
    sphere([-0.25, -0.3, -0.26], 0.11), // sustentaculum tali
    roundBox([0.02, -0.75, 0], [0.3, 0.12, 0.38], 0.07), // centroquartal bone
    roundBox([0.12, -0.95, -0.12], [0.2, 0.07, 0.18], 0.05), // fused 2nd + 3rd tarsal
  );
  return { sdf: s, min: [-1.0, -1.15, -0.55], max: [0.5, 1.3, 0.55] };
}

export function sternumShape(): BoneShape {
  const s = blend(
    0.1,
    chain([[0, 0, 0], [-1.2, -0.3, 0], [-2.6, -0.6, 0], [-4.1, -0.85, 0], [-5.4, -1.05, 0]], [0.18, 0.24, 0.27, 0.28, 0.24]),
    ellipsoid([-5.85, -1.12, 0], [0.45, 0.06, 0.4]), // xiphoid
    roundCone([0, 0, 0], [0.45, 0.15, 0], 0.18, 0.1), // manubrium
  );
  return { sdf: s, min: [-6.5, -1.5, -0.6], max: [0.8, 0.5, 0.6] };
}
