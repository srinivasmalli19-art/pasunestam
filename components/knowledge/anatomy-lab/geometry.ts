// Shared helpers: turn bone shapes / rib tubes into three.js geometry.

import * as THREE from 'three';
import { meshSdf } from '@/lib/anatomy/mesher';
import type { BoneShape } from '@/lib/anatomy/cow-bones';
import type { Piece } from '@/lib/anatomy/cow-skeleton';

export function shapeGeometry(shape: BoneShape, cell: number): THREE.BufferGeometry {
  const m = meshSdf(shape.sdf, shape.min, shape.max, cell);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
  g.setIndex(new THREE.BufferAttribute(m.indices, 1));
  g.computeBoundingSphere();
  return g;
}

/** Cell size for a shape: `cells` across its largest dimension (with limits). */
export function cellFor(shape: BoneShape, cells: number, lo: number, hi: number) {
  const d = Math.max(shape.max[0] - shape.min[0], shape.max[1] - shape.min[1], shape.max[2] - shape.min[2]);
  return Math.min(hi, Math.max(lo, d / cells));
}

export function tubeCurve(piece: Piece) {
  return new THREE.CatmullRomCurve3(piece.tube!.points.map((p) => new THREE.Vector3(...p)));
}

export function tubeGeometry(piece: Piece, segments = 48, radial = 10): THREE.BufferGeometry {
  const t = piece.tube!;
  const g = new THREE.TubeGeometry(tubeCurve(piece), segments, t.radius, radial, false);
  if (!t.cartilage) {
    // ox ribs are broad and flat: flatten the tube across its width
    const pos = g.attributes.position as THREE.BufferAttribute;
    const curve = tubeCurve(piece);
    const frames = curve.computeFrenetFrames(segments, false);
    const c = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / (radial + 1));
      curve.getPointAt(ring / segments, c);
      const off = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(c);
      const b = frames.binormals[ring];
      const along = off.dot(b);
      off.addScaledVector(b, along * 0.9); // widen in one direction
      const n = frames.normals[ring];
      off.addScaledVector(n, -off.dot(n) * 0.35); // thin in the other
      pos.setXYZ(i, c.x + off.x, c.y + off.y, c.z + off.z);
    }
    g.computeVertexNormals();
  }
  return g;
}

export function pieceMatrix(piece: Piece): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  if (piece.tube) {
    if (piece.mirror) m.makeScale(1, 1, -1);
    return m;
  }
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (piece.rotZ * Math.PI) / 180);
  if (piece.rotX) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ((piece.mirror ? -piece.rotX : piece.rotX) * Math.PI) / 180)); // the mirror flips z, so the tilt flips too
  m.compose(new THREE.Vector3(...piece.pos), q, new THREE.Vector3(piece.scale, piece.scale, piece.mirror ? -piece.scale : piece.scale));
  return m;
}
