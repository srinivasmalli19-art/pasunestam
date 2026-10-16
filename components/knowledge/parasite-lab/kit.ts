// Small building blocks for the parasite models: a bendable tube (worms,
// larvae, tails, legs, ducts), ribbons (grass), lathe shapes, and a tracker
// so everything is disposed with the scene.

import * as THREE from 'three';
import { fbm } from '@/lib/rumen/noise';

export interface Part {
  name: string;
  at: THREE.Vector3;
  /** Object the point is attached to (defaults to the model group). */
  on?: THREE.Object3D;
}
export interface Model {
  group: THREE.Group;
  parts: Part[];
  update?: (t: number) => void;
  /** Extra magnification inside the bubble (default 1). */
  zoom?: number;
}

export class Kit {
  readonly items: Array<{ dispose(): void }> = [];
  track<T extends { dispose(): void }>(x: T): T {
    this.items.push(x);
    return x;
  }
  phys(p: THREE.MeshPhysicalMaterialParameters): THREE.MeshPhysicalMaterial {
    return this.track(new THREE.MeshPhysicalMaterial({ roughness: 0.5, ...p }));
  }
  std(p: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
    return this.track(new THREE.MeshStandardMaterial({ roughness: 0.6, ...p }));
  }
  basic(p: THREE.MeshBasicMaterialParameters): THREE.MeshBasicMaterial {
    return this.track(new THREE.MeshBasicMaterial(p));
  }
  geo<T extends THREE.BufferGeometry>(g: T): T {
    return this.track(g);
  }
  mesh(g: THREE.BufferGeometry, m: THREE.Material): THREE.Mesh {
    this.track(g);
    return new THREE.Mesh(g, m);
  }
  dispose() {
    for (const d of this.items) d.dispose();
    this.items.length = 0;
  }
}

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const hex = (h: number) => new THREE.Color(h);

/** Deterministic pseudo-random numbers. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    s ^= s >>> 13;
    return (s >>> 0) / 4294967296;
  };
}

// ---- tube along a moving centre line ------------------------------------------------------

export class Tube {
  readonly mesh: THREE.Mesh;
  private readonly pos: Float32Array;
  private readonly geo: THREE.BufferGeometry;
  private readonly pts: THREE.Vector3[];
  private readonly c = new THREE.Vector3();

  constructor(
    kit: Kit,
    private readonly segs: number,
    private readonly radial: number,
    private readonly radius: (u: number) => number,
    color: (u: number, a: number, out: THREE.Color) => void,
    material: THREE.Material,
  ) {
    const n = (segs + 1) * (radial + 1);
    this.pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    const cc = new THREE.Color();
    for (let i = 0; i <= segs; i++)
      for (let j = 0; j <= radial; j++) {
        const k = i * (radial + 1) + j;
        color(i / segs, (j / radial) * Math.PI * 2, cc);
        col[k * 3] = cc.r;
        col[k * 3 + 1] = cc.g;
        col[k * 3 + 2] = cc.b;
        uv[k * 2] = i / segs;
        uv[k * 2 + 1] = j / radial;
      }
    const idx: number[] = [];
    for (let i = 0; i < segs; i++)
      for (let j = 0; j < radial; j++) {
        const a = i * (radial + 1) + j;
        const b = a + radial + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    this.geo = kit.geo(new THREE.BufferGeometry());
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.geo.setIndex(idx);
    this.pts = Array.from({ length: segs + 1 }, () => new THREE.Vector3());
    this.mesh = new THREE.Mesh(this.geo, material);
  }

  /** Re-shape the tube along a centre line c(u), u in [0, 1]. */
  set(center: (u: number, out: THREE.Vector3) => void) {
    const { segs, radial, pts, pos } = this;
    for (let i = 0; i <= segs; i++) center(i / segs, pts[i]);
    const T = new THREE.Vector3();
    const N = new THREE.Vector3();
    const B = new THREE.Vector3();
    for (let i = 0; i <= segs; i++) {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(segs, i + 1)];
      T.subVectors(b, a).normalize();
      if (i === 0) {
        N.set(0, 0, 1);
        if (Math.abs(T.dot(N)) > 0.9) N.set(0, 1, 0);
      }
      N.addScaledVector(T, -N.dot(T)).normalize();
      B.crossVectors(T, N);
      const r = this.radius(i / segs);
      for (let j = 0; j <= radial; j++) {
        const ang = (j / radial) * Math.PI * 2;
        const k = (i * (radial + 1) + j) * 3;
        const ca = Math.cos(ang) * r;
        const sa = Math.sin(ang) * r;
        pos[k] = pts[i].x + N.x * ca + B.x * sa;
        pos[k + 1] = pts[i].y + N.y * ca + B.y * sa;
        pos[k + 2] = pts[i].z + N.z * ca + B.z * sa;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
  }

  /** Centre-line point at u (after the last set). */
  at(u: number, out = this.c): THREE.Vector3 {
    const f = u * this.segs;
    const i = Math.min(this.segs - 1, Math.floor(f));
    return out.lerpVectors(this.pts[i], this.pts[i + 1], f - i);
  }
}

/** Polyline helper for Tube.set: a smooth curve through points. */
export function through(points: THREE.Vector3[]) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  return (u: number, out: THREE.Vector3) => curve.getPointAt(Math.min(1, Math.max(0, u)), out);
}

/** A swimming worm: straight along x with a travelling wave in z (and a little in y). */
export function wave(len: number, amp: (u: number) => number, k: number, t: number, speed = 3, bend = 0) {
  return (u: number, out: THREE.Vector3) => {
    const x = (0.5 - u) * len;
    const w = Math.sin(u * k * Math.PI * 2 - t * speed);
    out.set(x, amp(u) * w * 0.35 + bend * (u - 0.5) ** 2, amp(u) * w);
  };
}

// ---- other shapes -----------------------------------------------------------------------------

/** A grass blade or leaf: a curved, tapering ribbon. */
export function ribbon(kit: Kit, height: number, width: number, lean: number, twist: number, material: THREE.Material, seed = 1): THREE.Mesh {
  const g = new THREE.PlaneGeometry(width, height, 2, 16);
  g.translate(0, height / 2, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  const base = hex(0x4f8a2b);
  const tip = hex(0x9cc45a);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const v = Math.min(1, Math.max(0, y / height));
    const w = 1 - Math.pow(v, 2.2);
    const bend = lean * v * v * height;
    const a = twist * v;
    const xx = x * w;
    p.setXYZ(i, xx * Math.cos(a) + bend * 0.15, y - Math.abs(bend) * 0.12 * v, xx * Math.sin(a) + bend);
    c.copy(base).lerp(tip, v);
    // a faint central vein
    if (Math.abs(x) < width * 0.12) c.multiplyScalar(0.9);
    c.multiplyScalar(0.92 + 0.12 * fbm(seed + x * 9, y * 4, seed));
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return kit.mesh(g, material);
}

/** A lathe shape given as (radius, y) points, turned to lie along x. */
export function latheX(kit: Kit, profile: Array<[number, number]>, material: THREE.Material, segments = 40): THREE.Mesh {
  const g = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
  g.rotateZ(-Math.PI / 2);
  g.computeVertexNormals();
  return kit.mesh(g, material);
}

/** Scatter n instanced spheres inside an ellipsoid. */
export function speckles(
  kit: Kit,
  n: number,
  center: THREE.Vector3,
  radii: THREE.Vector3,
  size: [number, number],
  colors: number[],
  seed: number,
  surface = false,
): THREE.InstancedMesh {
  const r = rng(seed);
  const g = kit.geo(new THREE.SphereGeometry(1, 10, 8));
  const m = kit.std({ roughness: 0.5 });
  const im = new THREE.InstancedMesh(g, m, n);
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = 0;
    do {
      x = r() * 2 - 1;
      y = r() * 2 - 1;
      z = r() * 2 - 1;
    } while (x * x + y * y + z * z > 1);
    if (surface) {
      const l = Math.hypot(x, y, z) || 1;
      x /= l;
      y /= l;
      z /= l;
    }
    o.position.set(center.x + x * radii.x, center.y + y * radii.y, center.z + z * radii.z);
    o.scale.setScalar(size[0] + r() * (size[1] - size[0]));
    o.updateMatrix();
    im.setMatrixAt(i, o.matrix);
    im.setColorAt(i, c.set(colors[i % colors.length]).multiplyScalar(0.85 + r() * 0.3));
  }
  return im;
}

/** A soft radial-gradient texture (bubble backdrops). */
export function radialTexture(kit: Kit, inner: string, outer: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 58, 6, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return kit.track(t);
}
