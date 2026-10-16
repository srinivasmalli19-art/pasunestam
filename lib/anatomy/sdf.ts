// Tiny signed-distance-field toolkit for modelling bones in code.
// A shape is a function returning the distance from a point to its surface
// (negative inside). Shapes are combined with smooth unions (so processes
// blend into the bone like real bone) and smooth subtractions (grooves,
// fossae, foramina). lib/anatomy/mesher.ts turns a shape into a mesh.

export type SDF = (x: number, y: number, z: number) => number;
export type V3 = readonly [number, number, number];

const len3 = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);

export const sphere =
  (c: V3, r: number): SDF =>
  (x, y, z) =>
    len3(x - c[0], y - c[1], z - c[2]) - r;

/** Ellipsoid (good approximation of the true distance near the surface). */
export const ellipsoid = (c: V3, r: V3): SDF => {
  const [rx, ry, rz] = r;
  return (x, y, z) => {
    const px = (x - c[0]) / rx;
    const py = (y - c[1]) / ry;
    const pz = (z - c[2]) / rz;
    const k0 = len3(px, py, pz);
    const k1 = len3(px / rx, py / ry, pz / rz);
    return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
  };
};

/** A cone with rounded ends between points a (radius r1) and b (radius r2). */
export const roundCone = (a: V3, b: V3, r1: number, r2: number): SDF => {
  const bax = b[0] - a[0];
  const bay = b[1] - a[1];
  const baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  return (x, y, z) => {
    const pax = x - a[0];
    const pay = y - a[1];
    const paz = z - a[2];
    const yy = pax * bax + pay * bay + paz * baz;
    const zz = yy - l2;
    const qx = pax * l2 - bax * yy;
    const qy = pay * l2 - bay * yy;
    const qz = paz * l2 - baz * yy;
    const x2 = qx * qx + qy * qy + qz * qz;
    const y2 = yy * yy * l2;
    const z2 = zz * zz * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
  };
};

export const capsule = (a: V3, b: V3, r: number): SDF => roundCone(a, b, r, r);

/** A chain of round cones through points with radii (a tapering, bending rod). */
export const chain = (pts: V3[], radii: number[]): SDF => {
  const parts: SDF[] = [];
  for (let i = 0; i < pts.length - 1; i++) parts.push(roundCone(pts[i], pts[i + 1], radii[i], radii[i + 1]));
  return union(...parts);
};

/** Rotation (degrees, applied x then y then z) of a shape about point c. */
export function rotated(sdf: SDF, c: V3, deg: V3): SDF {
  const [ax, ay, az] = deg.map((d) => (d * Math.PI) / 180);
  // inverse rotation = transpose of R = Rz*Ry*Rx
  const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
  const m = [
    cy * cz, cz * sx * sy - cx * sz, cx * cz * sy + sx * sz,
    cy * sz, cx * cz + sx * sy * sz, cx * sy * sz - cz * sx,
    -sy, cy * sx, cx * cy,
  ];
  return (x, y, z) => {
    const px = x - c[0];
    const py = y - c[1];
    const pz = z - c[2];
    // R^T * p
    return sdf(
      c[0] + m[0] * px + m[3] * py + m[6] * pz,
      c[1] + m[1] * px + m[4] * py + m[7] * pz,
      c[2] + m[2] * px + m[5] * py + m[8] * pz,
    );
  };
}

/** Box with rounded edges; `half` = half sizes; optional rotation in degrees. */
export const roundBox = (c: V3, half: V3, r: number, deg?: V3): SDF => {
  const f: SDF = (x, y, z) => {
    const qx = Math.abs(x - c[0]) - half[0] + r;
    const qy = Math.abs(y - c[1]) - half[1] + r;
    const qz = Math.abs(z - c[2]) - half[2] + r;
    return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
  };
  return deg ? rotated(f, c, deg) : f;
};

/** Torus around an axis through c. */
export const torus = (c: V3, R: number, r: number, axis: 'x' | 'y' | 'z'): SDF => (x, y, z) => {
  const px = x - c[0];
  const py = y - c[1];
  const pz = z - c[2];
  const [a, b, h] = axis === 'x' ? [py, pz, px] : axis === 'y' ? [px, pz, py] : [px, py, pz];
  const q = Math.sqrt(a * a + b * b) - R;
  return Math.sqrt(q * q + h * h) - r;
};

/** Half-space: keeps the side where (p - c)·n < 0. */
export const plane = (c: V3, n: V3): SDF => {
  const l = len3(n[0], n[1], n[2]);
  const nx = n[0] / l, ny = n[1] / l, nz = n[2] / l;
  return (x, y, z) => (x - c[0]) * nx + (y - c[1]) * ny + (z - c[2]) * nz;
};

// ---- combinators ------------------------------------------------------------------

export const union =
  (...s: SDF[]): SDF =>
  (x, y, z) => {
    let d = Infinity;
    for (const f of s) {
      const v = f(x, y, z);
      if (v < d) d = v;
    }
    return d;
  };

const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

/** Smooth union: parts blend with fillets of size ~k. */
export const blend =
  (k: number, ...s: SDF[]): SDF =>
  (x, y, z) => {
    let d = s[0](x, y, z);
    for (let i = 1; i < s.length; i++) d = smin(d, s[i](x, y, z), k);
    return d;
  };

/** Cut `cut` out of `base` (smooth edge of size k; k = 0 for a sharp edge). */
export const subtract =
  (base: SDF, k: number, ...cuts: SDF[]): SDF =>
  (x, y, z) => {
    let d = base(x, y, z);
    for (const c of cuts) {
      const v = -c(x, y, z);
      d = k > 0 ? -smin(-d, -v, k) : Math.max(d, v);
    }
    return d;
  };

export const intersect =
  (...s: SDF[]): SDF =>
  (x, y, z) => {
    let d = -Infinity;
    for (const f of s) {
      const v = f(x, y, z);
      if (v > d) d = v;
    }
    return d;
  };

/** Mirror across the z = 0 plane (one side defined, both sides built). */
export const mirrorZ =
  (s: SDF): SDF =>
  (x, y, z) =>
    s(x, y, Math.abs(z));

/** Move a point onto the surface (a few Newton steps along the gradient). */
export function toSurface(sdf: SDF, p: V3, steps = 12): [number, number, number] {
  let [x, y, z] = p;
  const e = 1e-3;
  for (let i = 0; i < steps; i++) {
    const d = sdf(x, y, z);
    const gx = sdf(x + e, y, z) - sdf(x - e, y, z);
    const gy = sdf(x, y + e, z) - sdf(x, y - e, z);
    const gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    const g = len3(gx, gy, gz) || 1;
    x -= (d * gx) / g;
    y -= (d * gy) / g;
    z -= (d * gz) / g;
  }
  return [x, y, z];
}

// ---- outlines and plates ------------------------------------------------------------

export type P2 = readonly [number, number];

/** Signed distance to a closed 2D polygon (negative inside). */
export function polygon2(v: P2[]): (u: number, w: number) => number {
  const n = v.length;
  return (px, py) => {
    let d = (px - v[0][0]) ** 2 + (py - v[0][1]) ** 2;
    let s = 1;
    for (let i = 0, j = n - 1; i < n; j = i, i++) {
      const ex = v[j][0] - v[i][0];
      const ey = v[j][1] - v[i][1];
      const wx = px - v[i][0];
      const wy = py - v[i][1];
      const t = Math.min(1, Math.max(0, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
      const bx = wx - ex * t;
      const by = wy - ey * t;
      d = Math.min(d, bx * bx + by * by);
      const c1 = py >= v[i][1];
      const c2 = py < v[j][1];
      const c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
    }
    return s * Math.sqrt(d);
  };
}

type PlaneName = 'xy' | 'xz' | 'zy';
const split = (plane: PlaneName, x: number, y: number, z: number): [number, number, number] =>
  plane === 'xy' ? [x, y, z] : plane === 'xz' ? [x, z, y] : [z, y, x];

/** A flat plate cut to an outline: polygon in `plane`, centred at `offset` along the plane's normal, ±half thick, rounded edges. */
export function plate(poly: P2[], plane: PlaneName, offset: number, half: number, round = Math.min(half, 0.05)): SDF {
  const d2 = polygon2(poly);
  const h = Math.max(1e-4, half - round);
  return (x, y, z) => {
    const [u, w, n] = split(plane, x, y, z);
    const a = d2(u, w) + round;
    const b = Math.abs(n - offset) - h;
    return Math.min(Math.max(a, b), 0) + Math.sqrt(Math.max(a, 0) ** 2 + Math.max(b, 0) ** 2) - round;
  };
}

/** An infinite prism with this outline (used to carve a bone from two or three views). */
export function prism(poly: P2[], plane: PlaneName): SDF {
  const d2 = polygon2(poly);
  return (x, y, z) => {
    const [u, w] = split(plane, x, y, z);
    return d2(u, w);
  };
}

/** Smooth intersection (rounded edges of size k). */
export const carve =
  (k: number, ...s: SDF[]): SDF =>
  (x, y, z) => {
    let d = s[0](x, y, z);
    for (let i = 1; i < s.length; i++) {
      const b = s[i](x, y, z);
      const h = Math.max(k - Math.abs(d - b), 0) / k;
      d = Math.max(d, b) + h * h * k * 0.25;
    }
    return d;
  };

/** A thick triangle (plate through three points) with rounded edges. */
export function triangle(a: V3, b: V3, c: V3, half: number): SDF {
  const sub = (p: V3 | number[], q: V3 | number[]) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
  const cross = (p: number[], q: number[]) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  const dot = (p: number[], q: number[]) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const ba = sub(b, a), cb = sub(c, b), ac = sub(a, c);
  const nor = cross(ba, ac);
  const nn = dot(nor, nor);
  const c1 = cross(ba, nor), c2 = cross(cb, nor), c3 = cross(ac, nor);
  const seg = (e: number[], p: number[]) => {
    const t = Math.min(1, Math.max(0, dot(e, p) / dot(e, e)));
    const q = [e[0] * t - p[0], e[1] * t - p[1], e[2] * t - p[2]];
    return dot(q, q);
  };
  return (x, y, z) => {
    const pa = [x - a[0], y - a[1], z - a[2]];
    const pb = [x - b[0], y - b[1], z - b[2]];
    const pc = [x - c[0], y - c[1], z - c[2]];
    const inside = Math.sign(dot(c1, pa)) + Math.sign(dot(c2, pb)) + Math.sign(dot(c3, pc)) >= 2;
    const d2 = inside ? (dot(nor, pa) ** 2) / nn : Math.min(seg(ba, pa), seg(cb, pb), seg(ac, pc));
    return Math.sqrt(d2) - half;
  };
}

/** Shift the shape along z by f(x) — bends a flat part (e.g. one half of the jaw) into a V. */
export const shearZ =
  (s: SDF, f: (x: number) => number): SDF =>
  (x, y, z) =>
    s(x, y, z - f(x));
