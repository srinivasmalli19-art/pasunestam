// Theileria annulata stages: the Hyalomma tick and the parasite in cells (Giemsa-like colours).

import * as THREE from 'three';
import { fbm } from '@/lib/rumen/noise';
import { Kit, Tube, V, hex, rng, speckles, through, type Model } from './kit';

// ---- Hyalomma tick ------------------------------------------------------------------------------

interface TickOpts {
  nymph?: boolean;
  /** See-through body showing gut and salivary glands. */
  xray?: boolean;
  /** Light ghost of the shed skin. */
  ghost?: boolean;
}

export function tickMesh(kit: Kit, o: TickOpts = {}) {
  const group = new THREE.Group();
  const nymph = !!o.nymph;
  const bodyColor = o.ghost ? 0xf2ece0 : nymph ? 0x77707a : 0x7a5f4c;
  const see = o.xray || o.ghost;
  const bodyMat = kit.phys({
    color: bodyColor,
    roughness: 0.35,
    clearcoat: 0.8,
    clearcoatRoughness: 0.25,
    transparent: see,
    opacity: o.ghost ? 0.28 : o.xray ? 0.4 : 1,
    depthWrite: !see,
  });
  const rx = nymph ? 0.6 : 0.52;
  const ry = nymph ? 0.74 : 0.72;
  const rz = nymph ? 0.4 : 0.24;
  const bodyG = new THREE.SphereGeometry(1, 48, 32);
  // folds/grooves on the alloscutum
  const p = bodyG.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = 1 + 0.025 * Math.sin(x * 16) * (z > 0 ? 1 : 0) + 0.02 * fbm(x * 4, y * 4, z * 4);
    p.setXYZ(i, x * rx * f, y * ry * f, z * rz * f);
  }
  bodyG.computeVertexNormals();
  const body = kit.mesh(bodyG, bodyMat);
  group.add(body);
  if (!o.ghost) {
    // scutum: glossy dark shield at the front (small in females and nymphs)
    const sc = kit.mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), kit.phys({ color: 0x4f2716, roughness: 0.2, clearcoat: 1 }));
    sc.scale.set(0.33, 0.06, 0.3);
    sc.rotation.x = Math.PI / 2;
    sc.position.set(0, ry * 0.5, rz * 0.82);
    group.add(sc);
    // eyes at the edge of the scutum
    for (const s of [-1, 1]) {
      const e = kit.mesh(new THREE.SphereGeometry(0.035, 10, 8), kit.phys({ color: 0xf1e3b3, roughness: 0.1, clearcoat: 1 }));
      e.position.set(s * 0.27, ry * 0.52, rz * 0.62);
      group.add(e);
    }
    // festoons along the back edge
    const fMat = kit.std({ color: 0x5e4535 });
    for (let i = 0; i < 11; i++) {
      const a = Math.PI + (i - 5) * 0.12;
      const f = kit.mesh(new THREE.SphereGeometry(0.045, 8, 6), fMat);
      f.position.set(Math.sin(a) * rx * 0.86, Math.cos(a) * ry * 0.96, rz * 0.2);
      group.add(f);
    }
  }
  // capitulum: base, long palps and hypostome going into the skin (−z)
  const cMat = kit.phys({ color: o.ghost ? 0xf2ece0 : 0x4a2a18, roughness: 0.3, clearcoat: 0.8, transparent: !!o.ghost, opacity: o.ghost ? 0.3 : 1 });
  const basis = kit.mesh(new THREE.BoxGeometry(0.26, 0.16, 0.12), cMat);
  basis.position.set(0, ry + 0.02, 0.02);
  group.add(basis);
  const mouthTip = V(0, ry + 0.36, -0.42);
  for (const s of [-1, 0, 1]) {
    const tube = new Tube(kit, 10, 8, (u) => (s === 0 ? 0.035 : 0.045) * (1 - 0.5 * u), (_u, _a, c) => c.set(o.ghost ? 0xf2ece0 : 0x5a3320), cMat);
    tube.set(through([V(s * 0.07, ry + 0.08, 0.02), V(s * 0.08, ry + 0.24, -0.1), V(s * 0.06, ry + 0.34, s === 0 ? -0.42 : -0.3)]));
    group.add(tube.mesh);
  }
  // 4 pairs of long legs with pale bands (Hyalomma)
  const legMat = kit.phys({ vertexColors: true, roughness: 0.35, clearcoat: 0.6, transparent: !!o.ghost, opacity: o.ghost ? 0.3 : 1 });
  const angles = [0.55, 0.85, 1.2, 1.55];
  const spread = [0.4, 1.0, 1.95, 2.45];
  const band = (u: number, c: THREE.Color) => {
    const seg = [0, 0.3, 0.55, 0.8, 1];
    let pale = false;
    for (let k = 1; k < seg.length; k++) if (u < seg[k] && u > seg[k] - 0.07) pale = true;
    c.set(o.ghost ? 0xf2ece0 : pale ? 0xe8d6ab : 0x5c3a24);
  };
  const legs: Array<{ tube: Tube; pts: THREE.Vector3[] }> = [];
  for (const s of [-1, 1])
    angles.forEach((a, i) => {
      const P0 = V(s * Math.sin(a) * rx * 0.8, Math.cos(a) * ry * 0.8, -0.05);
      const d = V(s * Math.sin(spread[i]), Math.cos(spread[i]), 0);
      const L = nymph ? 0.85 : 1;
      const P1 = P0.clone().addScaledVector(d, 0.38 * L).add(V(0, 0, 0.16));
      const P2 = P1.clone().addScaledVector(d, 0.42 * L).add(V(0, 0, 0.05));
      const P3 = P2.clone().addScaledVector(d, 0.36 * L).add(V(0, 0, -0.22));
      const tube = new Tube(kit, 36, 8, (u) => 0.048 - 0.02 * u, (u, _a, c) => band(u, c), legMat);
      const pts = [P0, P1, P2, P3];
      tube.set(through(pts));
      group.add(tube.mesh);
      legs.push({ tube, pts });
    });
  // inside: gut lobes and salivary glands (x-ray view)
  const inner = new THREE.Group();
  if (o.xray) {
    const gutMat = kit.phys({ color: 0x5b2b1e, roughness: 0.5 });
    for (let i = 0; i < 7; i++) {
      const a = -1.2 + i * 0.4;
      const m = kit.mesh(new THREE.CapsuleGeometry(0.07, 0.42, 4, 10), gutMat);
      m.position.set(Math.sin(a) * 0.25, -0.05 - Math.cos(a) * 0.18, 0);
      m.rotation.z = a;
      inner.add(m);
    }
    const glandMat = kit.phys({ color: 0xe7c6b0, roughness: 0.45 });
    for (const s of [-1, 1]) {
      const cl = speckles(kit, 22, V(s * 0.24, 0.38, 0.02), V(0.12, 0.17, 0.08), [0.04, 0.055], [0xe7c6b0, 0xd9a99a], s > 0 ? 8 : 9);
      inner.add(cl);
      const duct = new Tube(kit, 12, 6, () => 0.018, (_u, _a, c) => c.set(0xd8b6a0), glandMat);
      duct.set(through([V(s * 0.24, 0.38, 0.02), V(s * 0.1, 0.62, 0.02), V(0, ry, 0.02)]));
      inner.add(duct.mesh);
    }
  }
  group.add(inner);
  return { group, mouthTip, legs, body, inner };
}

function skinPatch(kit: Kit, seed: number, avoid: (x: number, y: number) => boolean): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.RingGeometry(0.001, 1.9, 72, 24);
  const p = geo.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, -0.04 * (x * x + y * y) + 0.02 * fbm(x * 5, y * 5, seed));
    c.set(0xe2c8bb).lerp(hex(0xc9a596), fbm(x * 3, y * 3, seed + 3));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const skin = kit.mesh(geo, kit.phys({ vertexColors: true, roughness: 0.65, sheen: 0.4 }));
  g.add(skin);
  // hairs: white and black patches (crossbred cow)
  const N = 700;
  const hg = kit.geo(new THREE.CylinderGeometry(0.008, 0.012, 0.32, 4, 1));
  hg.translate(0, 0.16, 0);
  const hairs = new THREE.InstancedMesh(hg, kit.std({ roughness: 0.5 }), N);
  const r = rng(seed);
  const o = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    const ha = r() * Math.PI * 2;
    const hr = Math.sqrt(r()) * 1.82;
    const x = Math.cos(ha) * hr;
    const y = Math.sin(ha) * hr;
    if (avoid(x, y)) {
      o.scale.setScalar(0.0001);
    } else o.scale.set(1, 0.7 + r() * 0.6, 1);
    o.position.set(x, y, -0.04 * (x * x + y * y));
    o.rotation.set(0.25 + r() * 0.35, 0, (r() - 0.5) * 0.4 + Math.PI);
    o.updateMatrix();
    hairs.setMatrixAt(i, o.matrix);
    hairs.setColorAt(i, hex(fbm(x * 0.8, y * 0.8, seed) > 0.52 ? 0x1d1a18 : 0xf2eee6));
  }
  g.add(hairs);
  return g;
}

function particles(kit: Kit, n: number, color: number, size: number, onTop = true) {
  const g = kit.geo(new THREE.SphereGeometry(size, 10, 8));
  const m = kit.phys({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.3, depthTest: !onTop, transparent: true });
  const im = new THREE.InstancedMesh(g, m, n);
  im.renderOrder = 5;
  return im;
}

export function tick(kit: Kit): Model {
  const group = new THREE.Group();
  const t = tickMesh(kit);
  t.group.position.set(0, -0.25, 0.28);
  t.group.rotation.z = 0.15;
  group.add(skinPatch(kit, 3, (x, y) => Math.hypot(x / 0.7, (y + 0.25) / 0.95) < 1));
  group.add(t.group);
  // sporozoites going into the skin with the saliva
  const N = 14;
  const spz = particles(kit, N, 0xe0569a, 0.045);
  group.add(spz);
  const o = new THREE.Object3D();
  const tip = t.mouthTip.clone().applyMatrix4(new THREE.Matrix4().compose(t.group.position, t.group.quaternion, t.group.scale));
  const update = (time: number) => {
    for (let i = 0; i < N; i++) {
      const k = (time * 0.35 + i / N) % 1;
      const a = i * 2.4;
      o.position.set(tip.x + Math.cos(a) * k * 0.5, tip.y + Math.sin(a) * k * 0.35 + 0.05, tip.z - 0.05 - k * 0.12);
      o.scale.setScalar(1 - k * 0.6);
      o.updateMatrix();
      spz.setMatrixAt(i, o.matrix);
    }
    spz.instanceMatrix.needsUpdate = true;
    t.body.scale.setScalar(1 + 0.015 * Math.sin(time * 1.5));
  };
  update(0);
  return {
    group,
    update,
    parts: [
      { name: 'Long mouthparts in the skin', at: V(0.15, 0.85, 0.3) },
      { name: 'Scutum (shield)', at: V(-0.05, 0.12, 0.6) },
      { name: 'Pale-banded legs', at: V(1.05, 0.55, 0.2) },
      { name: 'Eyes', at: V(-0.32, 0.15, 0.48) },
      { name: 'Sporozoites in the saliva', at: V(-0.35, 0.95, 0.1) },
      { name: 'Festoons', at: V(0.0, -1.05, 0.4) },
    ],
  };
}

export function tickNymph(kit: Kit): Model {
  const group = new THREE.Group();
  const t = tickMesh(kit, { nymph: true });
  t.group.position.set(0, -0.25, 0.42);
  group.add(skinPatch(kit, 5, (x, y) => Math.hypot(x / 0.8, (y + 0.25) / 0.95) < 1));
  group.add(t.group);
  const N = 12;
  const rbc = particles(kit, N, 0xc0303a, 0.06);
  group.add(rbc);
  const o = new THREE.Object3D();
  const tip = t.mouthTip.clone().applyMatrix4(new THREE.Matrix4().compose(t.group.position, t.group.quaternion, t.group.scale));
  const update = (time: number) => {
    for (let i = 0; i < N; i++) {
      const k = 1 - ((time * 0.3 + i / N) % 1);
      const a = i * 2.1;
      o.position.set(tip.x + Math.cos(a) * k * 0.6, tip.y + Math.sin(a) * k * 0.3 + 0.05, tip.z - 0.02);
      o.scale.set(1, 1, 0.5);
      o.updateMatrix();
      rbc.setMatrixAt(i, o.matrix);
    }
    rbc.instanceMatrix.needsUpdate = true;
    t.body.scale.setScalar(1 + 0.03 * Math.sin(time * 0.8));
  };
  update(0);
  return {
    group,
    update,
    parts: [
      { name: 'Nymph filling with blood', at: V(0.3, -0.4, 0.85) },
      { name: 'Infected red cells taken in', at: V(-0.4, 0.95, 0.2) },
      { name: 'Small scutum', at: V(0, 0.2, 0.9) },
    ],
  };
}

// ---- cells (Giemsa colours: blue cytoplasm, purple nuclei, pink-red red cells) ------------------------------

function cellBody(kit: Kit, r: number, color: number, ruffle: number, seed: number, opacity = 0.62) {
  const g = new THREE.SphereGeometry(r, 64, 48);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = 1 + ruffle * (fbm(x * 3 + seed, y * 3, z * 3) - 0.5);
    p.setXYZ(i, x * f, y * f, z * f);
  }
  g.computeVertexNormals();
  return kit.mesh(g, kit.phys({ color, roughness: 0.35, clearcoat: 0.6, transparent: true, opacity, depthWrite: false, sheen: 0.5, sheenColor: hex(0xffffff) }));
}

function nucleus(kit: Kit, r: number, color = 0x4b2367) {
  const g = new THREE.SphereGeometry(r, 40, 28);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // kidney-shaped, lumpy chromatin
    const f = 1 - 0.28 * Math.max(0, x / r) ** 2 + 0.06 * (fbm(x * 9, y * 9, z * 9) - 0.5);
    p.setXYZ(i, x * f, y * f * 1.1, z * f * 0.8);
  }
  g.computeVertexNormals();
  return kit.mesh(g, kit.phys({ color, roughness: 0.6 }));
}

export function sporozoite(kit: Kit): Model {
  const group = new THREE.Group();
  group.add(cellBody(kit, 1.15, 0xc9c3e6, 0.22, 1));
  const n = nucleus(kit, 0.5);
  n.position.set(-0.3, 0.1, 0);
  group.add(n);
  group.add(speckles(kit, 40, V(0.3, -0.1, 0), V(0.6, 0.6, 0.6), [0.03, 0.05], [0xb3a6d8, 0x9c8fc8], 3));
  const N = 9;
  const sg = kit.geo(new THREE.SphereGeometry(1, 16, 12));
  const spz = new THREE.InstancedMesh(sg, kit.phys({ color: 0xd94f8f, roughness: 0.3, clearcoat: 0.8 }), N);
  group.add(spz);
  const o = new THREE.Object3D();
  const r = rng(4);
  const dirs = Array.from({ length: N }, () => V(r() - 0.5, r() - 0.5, r() * 0.8 + 0.2).normalize());
  const update = (t: number) => {
    for (let i = 0; i < N; i++) {
      const k = (t * 0.12 + i / N) % 1;
      // from outside the cell to just inside it
      const d = 2.0 - 1.4 * Math.min(1, k * 1.3);
      o.position.copy(dirs[i]).multiplyScalar(d);
      o.lookAt(0, 0, 0);
      o.scale.set(0.06, 0.06, 0.15);
      o.updateMatrix();
      spz.setMatrixAt(i, o.matrix);
    }
    spz.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return {
    group,
    update,
    parts: [
      { name: 'White cell (macrophage / B-cell)', at: V(0.8, 0.85, 0.3) },
      { name: 'Sporozoites (pink) entering', at: V(0.6, -0.9, 1.3) },
      { name: 'Cell nucleus', at: V(-0.4, 0.2, 0.45) },
    ],
  };
}

function schizontMass(kit: Kit, seed: number) {
  const g = new THREE.Group();
  const blob = cellBody(kit, 0.42, 0x4e66c9, 0.5, seed, 0.75);
  g.add(blob);
  g.add(speckles(kit, 34, V(0, 0, 0), V(0.36, 0.36, 0.36), [0.035, 0.055], [0x6b1f6f, 0x8a2a7a, 0x4a1a5e], seed + 10));
  return g;
}

export function schizont(kit: Kit): Model {
  const group = new THREE.Group();
  const cells: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const c = new THREE.Group();
    c.add(cellBody(kit, 0.95, 0x9fc0ea, 0.12, s + 3, 0.55));
    const n = nucleus(kit, 0.36, 0x5a1f5e);
    n.position.set(s * 0.25, 0.32, 0.1);
    c.add(n);
    const m = schizontMass(kit, s + 5);
    m.position.set(-s * 0.15, -0.25, 0.15);
    c.add(m);
    group.add(c);
    cells.push(c);
  }
  const update = (t: number) => {
    const k = 0.55 + 0.25 * (0.5 + 0.5 * Math.sin(t * 0.5));
    cells[0].position.x = -k;
    cells[1].position.x = k;
  };
  update(0);
  return {
    group,
    update,
    parts: [
      { name: 'Koch’s blue body (schizont)', at: V(0.75, -0.3, 0.6) },
      { name: 'White cell nucleus', at: V(-1.1, 0.4, 0.5) },
      { name: 'Cell dividing — both halves infected', at: V(0, 0.9, 0.4) },
    ],
  };
}

function redCell(kit: Kit) {
  const prof: Array<[number, number]> = [
    [0.001, 0.13], [0.3, 0.16], [0.6, 0.27], [0.84, 0.3], [0.97, 0.18], [1.0, 0], [0.97, -0.18], [0.84, -0.3], [0.6, -0.27], [0.3, -0.16], [0.001, -0.13],
  ];
  const g = new THREE.LatheGeometry(
    prof.map(([r, y]) => new THREE.Vector2(r, y)),
    48,
  );
  g.computeVertexNormals();
  return kit.geo(g);
}

export function merozoite(kit: Kit): Model {
  const group = new THREE.Group();
  // the burst cell: fragments of the membrane drifting apart
  const fragMat = kit.phys({ color: 0x9fc0ea, roughness: 0.4, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const frags: THREE.Mesh[] = [];
  const r = rng(8);
  for (let i = 0; i < 10; i++) {
    const f = kit.mesh(new THREE.SphereGeometry(0.9, 16, 12, r() * 6, 0.9, r() * 2.5, 0.8), fragMat);
    group.add(f);
    frags.push(f);
  }
  const n = nucleus(kit, 0.3, 0x5a1f5e);
  n.position.set(-0.2, 0.1, -0.2);
  group.add(n);
  const N = 70;
  const mg = kit.geo(new THREE.SphereGeometry(1, 10, 8));
  const mz = new THREE.InstancedMesh(mg, kit.phys({ color: 0x3e2f9a, roughness: 0.35, clearcoat: 0.5 }), N);
  group.add(mz);
  const dirs = Array.from({ length: N }, () => V(r() - 0.5, r() - 0.5, r() - 0.5).normalize());
  const rbcG = redCell(kit);
  const rbcMat = kit.phys({ color: 0xc8424a, roughness: 0.45, clearcoat: 0.4 });
  for (const [x, y, z] of [
    [1.4, 0.9, -0.4],
    [-1.4, -0.9, -0.3],
  ]) {
    const c = new THREE.Mesh(rbcG, rbcMat);
    c.scale.setScalar(0.42);
    c.position.set(x, y, z);
    c.rotation.set(1.1, 0.3, 0);
    group.add(c);
  }
  const o = new THREE.Object3D();
  const update = (t: number) => {
    const k = (t * 0.12) % 1;
    frags.forEach((f, i) => f.position.copy(dirs[i]).multiplyScalar(k * 0.5));
    for (let i = 0; i < N; i++) {
      o.position.copy(dirs[i]).multiplyScalar(0.25 + ((i * 0.37) % 0.5) + k * 1.0);
      o.scale.setScalar(0.045 * (1 - k * 0.3));
      o.updateMatrix();
      mz.setMatrixAt(i, o.matrix);
    }
    mz.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return {
    group,
    update,
    parts: [
      { name: 'Burst cell (microschizont)', at: V(-0.6, 0.6, 0.5) },
      { name: 'Merozoites (tiny, purple)', at: V(0.7, -0.2, 0.7) },
      { name: 'Red blood cell', at: V(1.4, 0.9, -0.2) },
    ],
  };
}

export function piroplasm(kit: Kit): Model {
  const group = new THREE.Group();
  const g = redCell(kit);
  const mat = kit.phys({ color: 0xcf4a50, roughness: 0.45, clearcoat: 0.45, sheen: 0.4, sheenColor: hex(0xffc0c0) });
  const ringMat = kit.phys({ color: 0x3f2a85, roughness: 0.4 });
  const dotMat = kit.phys({ color: 0x8c1f5a, roughness: 0.4 });
  const cellsArr: THREE.Group[] = [];
  const pos: Array<[number, number, number, number]> = [
    [-0.85, 0.55, 0, 0],
    [0.75, 0.6, -0.2, 1],
    [0.1, -0.5, 0.25, 2],
    [-1.0, -0.75, -0.4, 3],
    [1.05, -0.65, -0.5, -1],
  ];
  for (const [x, y, z, kind] of pos) {
    const c = new THREE.Group();
    const m = new THREE.Mesh(g, mat);
    c.add(m);
    const top = 0.3;
    if (kind === 0 || kind === 3) {
      // signet ring: a ring with a chromatin dot
      const ring = kit.mesh(new THREE.TorusGeometry(0.12, 0.035, 10, 24), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0.3, top, 0.1);
      const dot = kit.mesh(new THREE.SphereGeometry(0.05, 10, 8), dotMat);
      dot.position.set(0.42, top + 0.02, 0.1);
      c.add(ring, dot);
      if (kind === 3) {
        const r2 = ring.clone();
        r2.position.set(-0.35, top, -0.25);
        c.add(r2);
      }
    }
    if (kind === 1) {
      // comma form
      const comma = new Tube(kit, 16, 8, (u) => 0.05 * (1 - u * 0.6), (_u, _a, cc) => cc.set(0x3f2a85), ringMat);
      comma.set(through([V(-0.2, top, 0.1), V(0, top, 0.25), V(0.18, top, 0.18)]));
      c.add(comma.mesh);
    }
    if (kind === 2) {
      // rod form
      const rod = kit.mesh(new THREE.CapsuleGeometry(0.04, 0.22, 4, 8), ringMat);
      rod.rotation.z = Math.PI / 2;
      rod.position.set(-0.2, top + 0.02, 0.2);
      c.add(rod);
      const dot = kit.mesh(new THREE.SphereGeometry(0.05, 10, 8), dotMat);
      dot.position.set(-0.35, top + 0.03, 0.2);
      c.add(dot);
    }
    c.position.set(x, y, z);
    c.scale.setScalar(0.62);
    c.rotation.set(1.15, 0, 0.2 * kind);
    group.add(c);
    cellsArr.push(c);
  }
  return {
    group,
    update: (t) => cellsArr.forEach((c, i) => (c.rotation.z = 0.2 * i + 0.25 * Math.sin(t * 0.4 + i))),
    parts: [
      { name: 'Signet-ring piroplasm', at: V(-0.65, 0.75, 0.5) },
      { name: 'Comma form', at: V(0.75, 0.85, 0.3) },
      { name: 'Rod form', at: V(0.05, -0.25, 0.6) },
      { name: 'Red blood cell', at: V(1.15, -0.5, 0) },
    ],
  };
}

export function rayBodies(kit: Kit): Model {
  const group = new THREE.Group();
  // gut wall: a curved sheet of cells behind
  const wallG = new THREE.CylinderGeometry(2.4, 2.4, 3, 40, 12, true, Math.PI * 0.7, Math.PI * 0.6);
  const wp = wallG.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < wp.count; i++) {
    const x = wp.getX(i), y = wp.getY(i), z = wp.getZ(i);
    const f = 1 + 0.03 * Math.sin(x * 8) * Math.sin(y * 8);
    wp.setXYZ(i, x * f, y, z * f);
  }
  wallG.computeVertexNormals();
  const wall = kit.mesh(wallG, kit.phys({ color: 0xe6c9b2, roughness: 0.5, side: THREE.BackSide }));
  wall.position.z = 1.2;
  group.add(wall);
  const bumps = speckles(kit, 90, V(0, 0, -1.15), V(1.6, 1.4, 0.05), [0.12, 0.18], [0xead2bf, 0xdfbfa8], 6);
  group.add(bumps);
  // gametes: spheres with spikes ("ray bodies")
  const spikeG = kit.geo(new THREE.ConeGeometry(0.03, 0.26, 5));
  spikeG.translate(0, 0.13, 0);
  const gMat = kit.phys({ color: 0xc373b5, roughness: 0.35, clearcoat: 0.6 });
  const makeGamete = () => {
    const gg = new THREE.Group();
    gg.add(kit.mesh(new THREE.SphereGeometry(0.15, 20, 14), gMat));
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Mesh(spikeG, gMat);
      const a = (i / 9) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0);
      s.rotation.z = a - Math.PI / 2;
      gg.add(s);
    }
    return gg;
  };
  const free: THREE.Group[] = [];
  const r = rng(3);
  for (let i = 0; i < 5; i++) {
    const g = makeGamete();
    g.position.set((r() - 0.5) * 2.4, (r() - 0.5) * 1.8, (r() - 0.3) * 0.6);
    group.add(g);
    free.push(g);
  }
  const a = makeGamete();
  const b = makeGamete();
  group.add(a, b);
  const zyg = kit.mesh(new THREE.SphereGeometry(0.28, 28, 20), kit.phys({ color: 0x8a5bb0, roughness: 0.35, clearcoat: 0.6 }));
  const zn = nucleus(kit, 0.12);
  zyg.add(zn);
  zn.position.set(0.08, 0.05, 0.12);
  zyg.position.set(0.6, -0.2, 0.3);
  group.add(zyg);
  const update = (t: number) => {
    const k = (t * 0.15) % 1;
    const d = Math.max(0, 0.7 * (1 - k * 1.4));
    a.position.set(-0.4 - d, 0.3, 0.3);
    b.position.set(-0.4 + d, 0.3, 0.3);
    a.visible = b.visible = k < 0.75;
    a.rotation.z = t * 0.5;
    b.rotation.z = -t * 0.5;
    free.forEach((g, i) => (g.rotation.z = t * 0.3 * (i % 2 ? 1 : -1)));
    zyg.scale.setScalar(k > 0.7 ? 1 : 0.9);
  };
  update(0);
  return {
    group,
    update,
    parts: [
      { name: 'Gametes (“ray bodies”)', at: V(-0.4, 0.7, 0.4) },
      { name: 'Zygote (two gametes fused)', at: V(0.6, -0.5, 0.5) },
      { name: 'Tick gut wall', at: V(1.3, 1.1, -0.9) },
    ],
  };
}

export function kinete(kit: Kit): Model {
  const group = new THREE.Group();
  // two blocks of plaster/brick with a crack between
  const blockMat = kit.phys({ vertexColors: true, roughness: 0.9 });
  const block = (sx: number) => {
    const g = new THREE.BoxGeometry(1.6, 3.2, 1.4, 16, 32, 12);
    const p = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      // a rough crack face on the inner side
      const inner = sx * x < -0.79;
      const n = fbm(x * 3 + sx * 5, y * 3, z * 3);
      const dx = inner ? sx * (0.18 * n + 0.08 * Math.sin(y * 3)) : 0;
      p.setXYZ(i, x + dx, y, z + (z > 0.69 ? 0.03 * n : 0));
      c.set(0xcdbfa6).lerp(hex(0x8f7f68), n * (inner ? 1 : 0.5));
      if (inner) c.multiplyScalar(0.7);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = kit.mesh(g, blockMat);
    m.position.set(sx * 1.25, 0, -0.5);
    return m;
  };
  group.add(block(-1), block(1));
  // the moulted tick (see-through) and its old skin
  const t = tickMesh(kit, { xray: true });
  t.group.scale.setScalar(0.85);
  t.group.position.set(0.0, 0.35, 0.05);
  t.group.rotation.z = 0.25;
  group.add(t.group);
  const ghost = tickMesh(kit, { ghost: true, nymph: true });
  ghost.group.scale.setScalar(0.6);
  ghost.group.position.set(0.05, -1.05, -0.2);
  ghost.group.rotation.z = -0.4;
  group.add(ghost.group);
  // kinetes: glowing, moving from the gut to the salivary glands
  const N = 6;
  const kg = kit.geo(new THREE.CapsuleGeometry(0.03, 0.12, 4, 8));
  const kin = new THREE.InstancedMesh(kg, kit.phys({ color: 0xff4fb0, emissive: 0xd0127a, emissiveIntensity: 0.8, depthTest: false, transparent: true }), N);
  kin.renderOrder = 6;
  t.group.add(kin);
  const o = new THREE.Object3D();
  const update = (time: number) => {
    for (let i = 0; i < N; i++) {
      const k = (time * 0.2 + i / N) % 1;
      const s = i % 2 ? 1 : -1;
      o.position.set(s * (0.1 + 0.14 * k), -0.2 + 0.58 * k, 0.12);
      o.rotation.z = -s * 0.5;
      o.updateMatrix();
      kin.setMatrixAt(i, o.matrix);
    }
    kin.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return {
    group,
    update,
    parts: [
      { name: 'Crack in the shed wall', at: V(-0.9, 1.3, 0.3) },
      { name: 'Old skin left after moulting', at: V(0.1, -1.15, 0.2) },
      { name: 'Kinetes moving to the salivary glands', at: V(0.25, 0.25, 0.35) },
      { name: 'Salivary glands', at: V(-0.15, 0.75, 0.3) },
    ],
  };
}

export function salivary(kit: Kit): Model {
  const group = new THREE.Group();
  const ductMat = kit.phys({ color: 0xd8b6a0, roughness: 0.4, clearcoat: 0.5 });
  const acMat = kit.phys({ color: 0xebd0bf, roughness: 0.35, clearcoat: 0.6, sheen: 0.5 });
  const infMat = kit.phys({ color: 0xb35aa4, emissive: 0x5a1050, emissiveIntensity: 0.4, roughness: 0.35, clearcoat: 0.7 });
  const r = rng(21);
  const acG = kit.geo(new THREE.SphereGeometry(1, 16, 12));
  const tips: THREE.Vector3[] = [];
  const infected: THREE.Vector3[] = [];
  // a branching duct tree
  const branch = (from: THREE.Vector3, dir: THREE.Vector3, len: number, depth: number) => {
    const to = from.clone().addScaledVector(dir, len);
    const tube = new Tube(kit, 8, 8, () => 0.035 * (depth + 1) * 0.6, (_u, _a, c) => c.set(0xd8b6a0), ductMat);
    tube.set(through([from, from.clone().lerp(to, 0.5).add(V(0, 0, 0.05)), to]));
    group.add(tube.mesh);
    if (depth === 0) {
      tips.push(to);
      return;
    }
    for (let i = 0; i < 2; i++) {
      const d = dir.clone().applyAxisAngle(V(0, 0, 1), (i ? 1 : -1) * (0.45 + r() * 0.3)).applyAxisAngle(V(1, 0, 0), (r() - 0.5) * 0.6);
      branch(to, d, len * 0.72, depth - 1);
    }
  };
  branch(V(0, -1.8, 0), V(0, 1, 0), 0.75, 3);
  const N = tips.length * 5;
  const ac = new THREE.InstancedMesh(acG, acMat, N);
  const o = new THREE.Object3D();
  let k = 0;
  tips.forEach((tp, i) => {
    for (let j = 0; j < 5; j++) {
      o.position.copy(tp).add(V((r() - 0.5) * 0.3, (r() - 0.5) * 0.3, (r() - 0.5) * 0.3));
      o.scale.setScalar(0.11 + r() * 0.05);
      o.updateMatrix();
      ac.setMatrixAt(k++, o.matrix);
    }
    if (i % 3 === 1) {
      const m = new THREE.Mesh(acG, infMat);
      m.scale.setScalar(0.24);
      m.position.copy(tp).add(V(0.12, 0.1, 0.12));
      group.add(m);
      infected.push(m.position.clone());
    }
  });
  group.add(ac);
  const S = 40;
  const spz = particles(kit, S, 0xe0569a, 0.03);
  group.add(spz);
  const update = (t: number) => {
    for (let i = 0; i < S; i++) {
      const src = infected[i % infected.length];
      const q = (t * 0.25 + i / S) % 1;
      o.position.copy(src).lerp(V(0, -1.8, 0.1), q).add(V(Math.sin(i * 3.1) * 0.12 * (1 - q), Math.cos(i * 2.3) * 0.1 * (1 - q), 0.08));
      o.scale.setScalar(1);
      o.updateMatrix();
      spz.setMatrixAt(i, o.matrix);
    }
    spz.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return {
    group,
    update,
    parts: [
      { name: 'Salivary gland (acini)', at: V(-0.9, 0.6, 0.2) },
      { name: 'Infected cell (sporoblast)', at: infected[0]?.clone().add(V(0.1, 0.2, 0.2)) ?? V(0, 0.5, 0) },
      { name: 'Sporozoites released when the tick feeds', at: V(0.25, -1.3, 0.2) },
    ],
  };
}
