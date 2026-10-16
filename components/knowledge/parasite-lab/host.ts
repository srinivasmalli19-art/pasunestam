// The host animals (buffalo, crossbred cow, Nellore-type sheep), modelled from
// signed distance fields, with the organs the parasites use inside them.
// Head points to +x, the animal's right side is +z, the ground is y = 0.

import * as THREE from 'three';
import { meshSdf } from '@/lib/anatomy/mesher';
import { blend, capsule, chain, ellipsoid, rotated, roundBox, sphere, union, type SDF, type V3 } from '@/lib/anatomy/sdf';
import type { AnchorId, HostKind, HostPathId } from '@/lib/parasites/cycles';
import type { OrganId as MapOrgan } from '@/lib/parasites/organs';
import { fbm } from '@/lib/rumen/noise';
import { ABOMASUM_PATH, CARDIA, DUODENUM, abomasumShape, colonPath, heartShape, jejunumPath, liverShape, omasumShape, reticulumShape, rumenShape, type OrganShape } from '@/lib/rumen/organs';
import { Kit, Tube, V, hex, through } from './kit';

interface Spec {
  sdf: SDF;
  min: V3;
  max: V3;
  cell: number;
  color: (x: number, y: number, z: number, c: THREE.Color) => void;
}

const legs = (fx: number, hx: number, fz: number, hz: number, s: number): SDF[] => {
  const out: SDF[] = [];
  for (const side of [-1, 1]) {
    out.push(
      chain(
        [
          [fx, 3.2 * s, side * fz],
          [fx + 0.15 * s, 2.3 * s, side * fz],
          [fx + 0.05 * s, 1.45 * s, side * fz],
          [fx + 0.07 * s, 0.55 * s, side * fz],
          [fx + 0.14 * s, 0.2 * s, side * fz],
        ],
        [0.55 * s, 0.33 * s, 0.19 * s, 0.16 * s, 0.17 * s],
      ),
      roundBox([fx + 0.18 * s, 0.11 * s, side * fz], [0.2 * s, 0.11 * s, 0.15 * s], 0.06 * s),
      chain(
        [
          [hx, 3.45 * s, side * hz],
          [hx + 0.2 * s, 2.45 * s, side * hz],
          [hx - 0.35 * s, 1.55 * s, side * hz],
          [hx - 0.2 * s, 0.55 * s, side * hz],
          [hx - 0.1 * s, 0.2 * s, side * hz],
        ],
        [0.72 * s, 0.45 * s, 0.19 * s, 0.15 * s, 0.17 * s],
      ),
      roundBox([hx - 0.06 * s, 0.11 * s, side * hz], [0.2 * s, 0.11 * s, 0.15 * s], 0.06 * s),
    );
  }
  return out;
};

function bovineSpec(kind: 'buffalo' | 'cow'): Spec {
  const buf = kind === 'buffalo';
  const w = buf ? 1.12 : 1;
  const parts: SDF[] = [
    ellipsoid([-0.2, 3.55, 0], [2.9, 1.38, 1.3 * w]),
    ellipsoid([1.9, 3.75, 0], [1.6, 1.42, 1.12 * w]),
    ellipsoid([-2.4, 3.85, 0], [1.45, 1.22, 1.15 * w]),
    capsule([-2.7, 4.72, 0], [2.0, 4.85, 0], 0.48),
    // neck and head
    ellipsoid([3.55, 4.35, 0], [1.1, 0.8, 0.62 * w]),
    capsule([4.35, 4.85, 0], [5.4, 3.78, 0], 0.4),
    sphere([4.45, 4.9, 0], 0.5),
    ellipsoid([5.5, 3.62, 0], [0.38, 0.36, 0.38]),
    // ears
    rotated(ellipsoid([4.3, 4.85, 0.62], [0.36, 0.1, 0.22]), [4.3, 4.85, 0.62], [0, 0, -18]),
    rotated(ellipsoid([4.3, 4.85, -0.62], [0.36, 0.1, 0.22]), [4.3, 4.85, -0.62], [0, 0, -18]),
    // tail
    chain(
      [
        [-3.75, 4.55, 0],
        [-3.98, 3.7, 0],
        [-3.95, 2.2, 0],
        [-3.9, 1.6, 0],
      ],
      [0.15, 0.08, 0.06, 0.06],
    ),
    ellipsoid([-3.9, 1.4, 0], [0.13, 0.36, 0.13]),
    // udder and teats
    ellipsoid([-1.75, 2.2, 0], [0.8, 0.55, 0.62]),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => capsule([-1.75 + sx * 0.35, 1.8, sz * 0.3], [-1.75 + sx * 0.38, 1.45, sz * 0.32], 0.07))),
    ...legs(2.25, -2.45, 0.62 * w, 0.6 * w, 1),
  ];
  const horns: SDF[] = buf
    ? [-1, 1].map((s) =>
        chain(
          [
            [4.35, 5.25, s * 0.38],
            [4.0, 5.55, s * 0.95],
            [3.35, 5.45, s * 1.3],
            [3.05, 5.0, s * 1.15],
            [3.25, 4.75, s * 0.85],
          ],
          [0.2, 0.17, 0.12, 0.08, 0.04],
        ),
      )
    : [-1, 1].map((s) =>
        chain(
          [
            [4.45, 5.3, s * 0.35],
            [4.5, 5.55, s * 0.62],
            [4.65, 5.7, s * 0.72],
          ],
          [0.11, 0.07, 0.03],
        ),
      );
  const body = blend(0.42, ...parts);
  const hornU = union(...horns);
  const sdf = union(body, hornU);
  const isHoof = (y: number) => y < 0.24;
  return {
    sdf,
    min: [-4.5, -0.05, -1.95],
    max: [6.1, 6.1, 1.95],
    cell: 0.085,
    color: (x, y, z, c) => {
      if (hornU(x, y, z) < 0.04) {
        c.set(buf ? 0x2a2420 : 0xd8c9a8);
        return;
      }
      if (isHoof(y)) {
        c.set(0x2b2420);
        return;
      }
      const muzzle = Math.hypot(x - 5.55, y - 3.6, z) < 0.42;
      const udder = Math.hypot((x + 1.75) / 0.85, (y - 2.1) / 0.62, z / 0.68) < 1 && y < 2.4;
      const n = fbm(x * 1.5, y * 1.5, z * 1.5);
      if (buf) {
        c.set(0x2c2b2e).lerp(hex(0x4a4642), Math.max(0, 1.2 - y) * 0.6 + n * 0.25);
        if (muzzle) c.set(0x1a1a1c);
        if (udder) c.set(0x3d3638);
      } else {
        const patch = fbm(x * 0.32 + 3.1, y * 0.32 + 1.7, z * 0.32) > 0.5 && y > 1.3;
        c.set(patch ? 0x1f1d1c : 0xf1ede6).multiplyScalar(0.93 + 0.1 * n);
        if (muzzle) c.set(0x9a8580);
        if (udder) c.set(0xe8b8ad);
      }
    },
  };
}

function sheepSpec(): Spec {
  const ears = [-1, 1].map((s) => rotated(ellipsoid([2.9, 3.75, s * 0.46], [0.13, 0.42, 0.06]), [2.9, 4.0, s * 0.42], [s * 25, 0, -20]));
  const parts: SDF[] = [
    ellipsoid([-0.1, 2.75, 0], [2.05, 0.95, 0.85]),
    ellipsoid([1.3, 2.88, 0], [1.1, 1.0, 0.8]),
    ellipsoid([-1.65, 2.95, 0], [1.0, 0.85, 0.8]),
    capsule([1.8, 3.15, 0], [2.85, 3.95, 0], 0.45),
    capsule([2.95, 4.1, 0], [3.78, 3.45, 0], 0.3),
    sphere([3.0, 4.15, 0], 0.36),
    ellipsoid([3.82, 3.38, 0], [0.22, 0.22, 0.21]),
    ...ears,
    chain(
      [
        [-2.6, 3.25, 0],
        [-2.8, 2.6, 0],
        [-2.85, 2.1, 0],
      ],
      [0.12, 0.08, 0.06],
    ),
  ];
  const lg: SDF[] = [];
  for (const side of [-1, 1]) {
    lg.push(
      chain(
        [
          [1.5, 2.35, side * 0.42],
          [1.62, 1.6, side * 0.42],
          [1.55, 1.0, side * 0.42],
          [1.57, 0.35, side * 0.42],
          [1.62, 0.12, side * 0.42],
        ],
        [0.36, 0.2, 0.12, 0.1, 0.11],
      ),
      chain(
        [
          [-1.75, 2.6, side * 0.42],
          [-1.62, 1.9, side * 0.42],
          [-2.0, 1.15, side * 0.42],
          [-1.92, 0.35, side * 0.42],
          [-1.88, 0.12, side * 0.42],
        ],
        [0.48, 0.28, 0.12, 0.1, 0.11],
      ),
    );
  }
  const sdf = blend(0.3, ...parts, ...lg);
  const earU = union(...ears);
  return {
    sdf,
    min: [-3.1, -0.05, -1.2],
    max: [4.15, 4.6, 1.2],
    cell: 0.06,
    color: (x, y, z, c) => {
      const n = fbm(x * 2, y * 2, z * 2);
      if (y < 0.18) {
        c.set(0x2b2420);
        return;
      }
      c.set(0x8e4a2a).lerp(hex(0x6a3219), Math.max(0, (y - 3.2) * 0.8) + n * 0.25);
      if (y < 2.0 && Math.abs(z) < 0.6 && x > -1.6 && x < 1.6) c.lerp(hex(0xb7845c), 0.35);
      if (Math.hypot(x - 3.82, y - 3.38, z) < 0.24) c.set(0x3e241a);
      if (earU(x, y, z) < 0.03) c.lerp(hex(0x6a3219), 0.4);
    },
  };
}

// ---- organs and landmarks ----------------------------------------------------------------------------
// The organs come from the 3D ruminant digestive lab (same shapes), scaled into each animal.

interface Fit {
  s: number;
  o: V3;
}
const BOV_FIT: Fit = { s: 0.322, o: [0.67, 0.72, 0] };
const SHEEP_FIT: Fit = { s: 0.2, o: [0.22, 0.96, 0] };
const T = (f: Fit, p: V3): V3 => [p[0] * f.s + f.o[0], p[1] * f.s + f.o[1], p[2] * f.s + f.o[2]];

interface Layout {
  fit: Fit;
  anchors: Partial<Record<AnchorId, V3>>;
  paths: Partial<Record<HostPathId, V3[]>>;
  oesophagus: V3[];
  nodes?: { pre: V3; fem: V3 };
  jugular?: V3[];
  eye: V3;
  jaw?: V3;
  /** Organ-map hotspots (host-local). */
  spots: Record<MapOrgan, V3>;
  lungs: { c: V3; r: V3 };
  brain: { c: V3; r: V3 };
}

const LIVER_PT: V3 = [2.0, 9.2, 2.6];
const RUMEN_PT: V3 = [-4.0, 8.0, -1.5];
const ABO_PT: V3 = [0.6, 5.8, 1.2];
const GUT_OUT = (f: Fit): V3[] => [
  ...ABOMASUM_PATH.normal.slice(2).map((q) => T(f, q[0])),
  ...DUODENUM.map((q) => T(f, q)),
  ...jejunumPath()
    .filter((_, i) => i % 40 === 0)
    .map((q) => T(f, q)),
  ...colonPath()
    .filter((_, i) => i % 20 === 0)
    .map((q) => T(f, q)),
];

function bovineLayout(): Layout {
  const f = BOV_FIT;
  return {
    fit: f,
    anchors: {
      liver: T(f, LIVER_PT),
      duodenum: T(f, DUODENUM[2]),
      mouth: [5.6, 3.55, 0],
      rumen: T(f, RUMEN_PT),
      abomasum: T(f, ABO_PT),
      prescapular: [3.0, 4.15, 1.05],
      prefemoral: [-1.85, 3.45, 1.22],
      udder: [-1.75, 2.35, 0.62],
      perineum: [-3.85, 3.75, 0.22],
      jugular: [3.5, 4.0, 0.7],
    },
    paths: {
      liverToRectum: [T(f, LIVER_PT), T(f, [0.6, 8.6, 2.9]), ...DUODENUM.slice(2).map((q) => T(f, q)), ...colonPath().filter((_, i) => i % 24 === 0).map((q) => T(f, q)), [-3.1, 3.95, 0.2], [-3.75, 4.15, 0], [-4.2, 4.0, 0], [-4.35, 2.6, 0], [-4.4, 0.4, 0]],
      gutToLiver: [T(f, DUODENUM[2]), T(f, [-0.2, 8.9, 3.6]), T(f, [0.9, 9.3, 3.3]), T(f, LIVER_PT)],
      biteToNode: [
        [-1.75, 2.35, 0.62],
        [-1.85, 2.75, 0.95],
        [-1.9, 3.1, 1.15],
        [-1.85, 3.45, 1.22],
      ],
      nodeToBlood: [
        [3.0, 4.15, 1.05],
        [3.4, 4.05, 0.85],
        [3.6, 4.0, 0.7],
        [3.0, 3.75, 0.55],
        [2.2, 3.25, 0.25],
        [1.0, 3.0, 0.3],
        [-0.5, 3.0, 0.6],
        [-1.8, 3.5, 0.9],
      ],
    },
    oesophagus: [[5.45, 3.7, 0], [4.4, 4.25, 0], T(f, [9.6, 9.5, -0.3]), T(f, [4.3, 9.3, -0.4]), T(f, CARDIA)],
    nodes: { pre: [3.0, 4.15, 1.05], fem: [-1.85, 3.45, 1.22] },
    jugular: [
      [4.6, 4.2, 0.62],
      [3.9, 4.05, 0.72],
      [3.1, 3.8, 0.78],
      [2.6, 3.6, 0.6],
    ],
    spots: {
      skin: [0.4, 4.35, 1.32],
      nose: [5.55, 3.78, 0.22],
      eye: [4.75, 4.55, 0.45],
      brain: [4.5, 4.95, 0],
      oesophagus: [3.9, 4.25, 0.1],
      lungs: [2.2, 4.4, 0.55],
      muscle: [-2.6, 3.95, 1.05],
      blood: [3.5, 4.0, 0.72],
      liver: T(f, LIVER_PT),
      pancreas: T(f, [-1.0, 9.6, 1.6]),
      rumen: T(f, RUMEN_PT),
      abomasum: T(f, ABO_PT),
      smallInt: T(f, [-5.6, 6.9, 2.15]),
      largeInt: T(f, [-8.6, 8.45, 2.1]),
      gutVeins: T(f, [-3.8, 8.2, 2.6]),
      peritoneum: [-0.6, 2.35, 0.95],
      repro: [-2.9, 3.35, 0.2],
    },
    lungs: { c: [2.15, 4.35, 0], r: [0.95, 0.75, 0.5] },
    brain: { c: [4.5, 4.95, 0], r: [0.26, 0.2, 0.2] },
    eye: [4.75, 4.55, 0.4],
  };
}

function sheepLayout(): Layout {
  const f = SHEEP_FIT;
  return {
    fit: f,
    anchors: {
      liver: T(f, LIVER_PT),
      mouth: [3.9, 3.35, 0],
      rumen: T(f, RUMEN_PT),
      abomasum: T(f, ABO_PT),
      jaw: [3.25, 3.32, 0.25],
    },
    paths: {
      abomasumToRectum: [T(f, ABO_PT), ...GUT_OUT(f), [-2.0, 3.0, 0.2], [-2.55, 3.15, 0], [-2.85, 3.0, 0], [-2.95, 2.0, 0], [-3.0, 0.4, 0]],
      rumenToAbomasum: [T(f, RUMEN_PT), T(f, [-1.0, 7.0, -0.8]), T(f, [2.6, 6.6, -0.4]), T(f, [1.0, 7.65, 2.0]), T(f, ABO_PT)],
    },
    oesophagus: [[3.7, 3.5, 0], [2.9, 3.9, 0], [2.1, 3.3, -0.05], T(f, [4.3, 9.3, -0.4]), T(f, CARDIA)],
    spots: {
      skin: [0.0, 3.6, 0.88],
      nose: [3.8, 3.5, 0.15],
      eye: [3.25, 4.12, 0.32],
      brain: [3.0, 4.2, 0],
      oesophagus: [2.5, 3.6, 0.1],
      lungs: [1.3, 3.15, 0.4],
      muscle: [-1.75, 2.95, 0.8],
      blood: [2.5, 3.5, 0.35],
      liver: T(f, LIVER_PT),
      pancreas: T(f, [-1.0, 9.6, 1.6]),
      rumen: T(f, RUMEN_PT),
      abomasum: T(f, ABO_PT),
      smallInt: T(f, [-5.6, 6.9, 2.15]),
      largeInt: T(f, [-8.6, 8.45, 2.1]),
      gutVeins: T(f, [-3.8, 8.2, 2.6]),
      peritoneum: [-0.4, 1.95, 0.6],
      repro: [-2.05, 2.75, 0.1],
    },
    lungs: { c: [1.25, 3.1, 0], r: [0.62, 0.48, 0.36] },
    brain: { c: [3.0, 4.2, 0], r: [0.17, 0.13, 0.13] },
    eye: [3.25, 4.12, 0.3],
    jaw: [3.25, 3.32, 0],
  };
}

export interface HostModel {
  group: THREE.Group;
  /** Anchor in host-local coordinates (multiply by group.matrixWorld for world). */
  anchor(id: AnchorId): THREE.Vector3 | null;
  path(id: HostPathId): THREE.Vector3[] | null;
  setXray(on: boolean): void;
  setFocus(id: AnchorId | null): void;
  setSigns(s: { nodes?: boolean; bottleJaw?: boolean }): void;
  spot(id: MapOrgan): THREE.Vector3;
  update(t: number): void;
}

function organMesh(kit: Kit, shape: OrganShape, cell: number, f: Fit, base: number, dark: number): THREE.Mesh {
  const m = meshSdf(shape.sdf, shape.min, shape.max, cell);
  const pos = m.positions;
  const col = new Float32Array(pos.length);
  const c = new THREE.Color();
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2];
    c.set(base).lerp(hex(dark), fbm(x * 1.4, y * 1.4, z * 1.4) * 0.7);
    col.set([c.r, c.g, c.b], i);
    pos[i] = x * f.s + f.o[0];
    pos[i + 1] = y * f.s + f.o[1];
    pos[i + 2] = z * f.s + f.o[2];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(m.indices, 1));
  g.computeVertexNormals();
  return kit.mesh(g, kit.phys({ vertexColors: true, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.3, emissive: 0xff5a3c, emissiveIntensity: 0 }));
}

export function buildHost(kit: Kit, kind: HostKind): HostModel {
  const spec = kind === 'sheep' ? sheepSpec() : bovineSpec(kind);
  const lay = kind === 'sheep' ? sheepLayout() : bovineLayout();
  const f = lay.fit;
  const m = meshSdf(spec.sdf, spec.min, spec.max, spec.cell);
  const pos = m.positions;
  const col = new Float32Array(pos.length);
  const c = new THREE.Color();
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2];
    // slight unevenness: muscle and skin folds
    const d = 0.025 * (fbm(x * 2.5, y * 2.5, z * 2.5) - 0.5);
    pos[i] += m.normals[i] * d;
    pos[i + 1] += m.normals[i + 1] * d;
    pos[i + 2] += m.normals[i + 2] * d;
    spec.color(x, y, z, c);
    col[i] = c.r;
    col[i + 1] = c.g;
    col[i + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(m.indices, 1));
  g.computeVertexNormals();
  const skinMat = kit.phys({ vertexColors: true, roughness: kind === 'buffalo' ? 0.42 : 0.6, clearcoat: kind === 'buffalo' ? 0.35 : 0.05, sheen: 0.5, sheenColor: hex(0xffffff) });
  const body = kit.mesh(g, skinMat);
  const group = new THREE.Group();
  group.add(body);
  const eyeMat = kit.phys({ color: 0x120d0b, roughness: 0.1, clearcoat: 1 });
  for (const s of [-1, 1]) {
    const e = kit.mesh(new THREE.SphereGeometry(kind === 'sheep' ? 0.09 : 0.13, 16, 12), eyeMat);
    e.position.set(lay.eye[0], lay.eye[1], s * lay.eye[2]);
    group.add(e);
  }

  // ---- organs (shown when the animal is see-through) ----
  const organs = new THREE.Group();
  organs.visible = false;
  group.add(organs);
  const byAnchor = new Map<AnchorId, THREE.Mesh[]>();
  const add = (id: AnchorId | null, mesh: THREE.Mesh) => {
    organs.add(mesh);
    if (id) byAnchor.set(id, [...(byAnchor.get(id) ?? []), mesh]);
    return mesh;
  };
  add('liver', organMesh(kit, liverShape(), 0.16, f, 0x7d3a2c, 0x5a2219));
  add('rumen', organMesh(kit, rumenShape(), 0.24, f, 0xcfa99c, 0xa98476));
  add('rumen', organMesh(kit, reticulumShape(), 0.16, f, 0xd5a399, 0xb08075));
  add(null, organMesh(kit, omasumShape(), 0.14, f, 0xc59a88, 0xa27a6a));
  add('abomasum', organMesh(kit, abomasumShape('normal'), 0.16, f, 0xdea79b, 0xbb7f74));
  add(null, organMesh(kit, heartShape(), 0.16, f, 0xa0353a, 0x7a2228));
  for (const sz of [-1, 1]) {
    const lung = kit.mesh(new THREE.SphereGeometry(1, 32, 24), kit.phys({ color: 0xe7a1a6, roughness: 0.5, transparent: true, opacity: 0.55, depthWrite: false }));
    lung.scale.set(lay.lungs.r[0], lay.lungs.r[1], lay.lungs.r[2]);
    lung.position.set(lay.lungs.c[0], lay.lungs.c[1], sz * (lay.lungs.r[2] * 0.95));
    add(null, lung);
  }
  {
    const brain = kit.mesh(new THREE.SphereGeometry(1, 24, 16), kit.phys({ color: 0xf0c9c0, roughness: 0.45 }));
    brain.scale.set(lay.brain.r[0], lay.brain.r[1], lay.brain.r[2]);
    brain.position.set(...lay.brain.c);
    add(null, brain);
  }
  const tube = (pts: V3[], r: number, color: number, id: AnchorId | null, segs = 200) => {
    const t = new Tube(kit, segs, 8, () => r, (_u, _a, cc) => cc.set(color), kit.phys({ vertexColors: true, roughness: 0.4, clearcoat: 0.6, emissive: 0xff5a3c, emissiveIntensity: 0 }));
    t.set(through(pts.map((q) => V(...q))));
    return add(id, t.mesh);
  };
  tube(DUODENUM.map((q) => T(f, q)), 0.3 * f.s, 0xe4a596, 'duodenum', 80);
  tube(jejunumPath().map((q) => T(f, q)), 0.26 * f.s, 0xe9a597, 'duodenum', 900);
  tube(colonPath().map((q) => T(f, q)), 0.3 * f.s, 0xd99c8a, null, 200);
  tube(lay.oesophagus, kind === 'sheep' ? 0.07 : 0.11, 0xd98a7c, 'mouth', 60);
  const nodes: THREE.Mesh[] = [];
  const nodeMat = kit.phys({ color: 0xd7a47c, roughness: 0.4, clearcoat: 0.6, emissive: 0xff5a3c, emissiveIntensity: 0 });
  const NODE_R: Record<'prescapular' | 'prefemoral', V3> = { prescapular: [0.16, 0.26, 0.09], prefemoral: [0.1, 0.28, 0.08] };
  if (lay.nodes) {
    for (const [key, cc] of [
      ['prescapular', lay.nodes.pre],
      ['prefemoral', lay.nodes.fem],
    ] as const) {
      for (const s of [-1, 1]) {
        const n = kit.mesh(new THREE.SphereGeometry(1, 24, 16), nodeMat);
        n.position.set(cc[0], cc[1], s * cc[2]);
        n.userData.r = NODE_R[key];
        add(s > 0 ? key : null, n);
        nodes.push(n);
      }
    }
  }
  if (lay.jugular) tube(lay.jugular, 0.08, 0x3a4fa0, 'jugular', 30);
  // bottle jaw (sheep): a soft swelling under the jaw
  let jaw: THREE.Mesh | null = null;
  if (lay.jaw) {
    jaw = kit.mesh(new THREE.SphereGeometry(1, 28, 20), kit.phys({ color: 0x9a5a38, roughness: 0.6 }));
    jaw.scale.set(0.34, 0.26, 0.28);
    jaw.position.set(lay.jaw[0] - 0.05, lay.jaw[1] - 0.12, 0);
    jaw.visible = false;
    group.add(jaw);
  }

  let xray = false;
  let focus: AnchorId | null = null;
  let swollen = false;
  const apply = () => {
    for (const n of nodes) {
      const r = n.userData.r as V3;
      const k = swollen ? 1.9 : 1;
      n.scale.set(r[0] * k, r[1] * k, r[2] * k);
    }
  };
  apply();
  return {
    group,
    anchor(id) {
      const a = lay.anchors[id];
      return a ? V(...a) : null;
    },
    spot(id) {
      return V(...lay.spots[id]);
    },
    path(id) {
      const pts = lay.paths[id];
      return pts ? pts.map((q) => V(...q)) : null;
    },
    setXray(on) {
      if (on === xray) return;
      xray = on;
      skinMat.transparent = on;
      skinMat.opacity = on ? 0.3 : 1;
      skinMat.depthWrite = !on;
      skinMat.needsUpdate = true;
      organs.visible = on;
    },
    setFocus(id) {
      focus = id;
    },
    setSigns(s) {
      swollen = !!s.nodes;
      apply();
      if (jaw) jaw.visible = !!s.bottleJaw;
    },
    update(t) {
      if (!xray) return;
      for (const [id, list] of byAnchor) {
        const on = id === focus;
        for (const mm of list) (mm.material as THREE.MeshPhysicalMaterial).emissiveIntensity = on ? 0.25 + 0.2 * Math.sin(t * 3) : 0;
      }
    },
  };
}
