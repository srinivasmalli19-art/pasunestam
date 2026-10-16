// Haemonchus contortus stages: barber's pole worms, strongyle egg and larvae.

import * as THREE from 'three';
import { cells, fbm } from '@/lib/rumen/noise';
import { Kit, Tube, V, hex, ribbon, rng, wave, type Model } from './kit';

const larvaMat = (kit: Kit, opacity = 0.9) => kit.phys({ vertexColors: true, roughness: 0.3, clearcoat: 0.7, transparent: opacity < 1, opacity, sheen: 0.4 });

/** Larva colouring: pale body, darker oesophagus (with a bulb in L1/L2) and granular gut. */
function larvaColor(bulb: boolean, granules: number) {
  const base = hex(0xe9dfc8);
  return (u: number, a: number, c: THREE.Color) => {
    c.copy(base);
    if (u < 0.3) c.lerp(hex(0xcab58c), 0.5);
    if (bulb && u > 0.2 && u < 0.3) c.lerp(hex(0x9c7f52), 0.6);
    if (u > 0.3 && u < 0.85) {
      const n = fbm(u * 40, Math.cos(a) * 2, Math.sin(a) * 2);
      c.lerp(hex(0x8a6d45), granules * (n > 0.5 ? 0.8 : 0.2));
    }
  };
}
const taper = (r: number) => (u: number) => r * Math.min(1, Math.sin(Math.PI * Math.min(1, u * 1.02 + 0.01)) * 1.6) + 0.004;

// ---- adults on the abomasal lining ------------------------------------------------------------

function mucosa(kit: Kit, w: number, h: number, seed: number) {
  const g = new THREE.PlaneGeometry(w, h, 70, 50);
  const p = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    // spiral folds of the abomasum
    const fold = Math.max(0, Math.sin(x * 2.2 + y * 0.8 + 0.5 * fbm(x, y, seed)));
    const z = 0.28 * fold ** 3 + 0.03 * fbm(x * 6, y * 6, seed);
    p.setZ(i, z);
    c.set(0xd77d78).lerp(hex(0xa94c4c), fbm(x * 2, y * 2, seed + 1));
    // pinpoint bleeding where worms fed
    if (cells(x * 4 + seed, y * 4, 0)[0] < 0.12) c.lerp(hex(0x6a0d12), 0.75);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return kit.mesh(g, kit.phys({ vertexColors: true, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.2 }));
}

export function wormAdult(kit: Kit): Model {
  const group = new THREE.Group();
  const lining = mucosa(kit, 3.2, 2.4, 2);
  lining.rotation.x = -1.1;
  lining.position.set(0, -0.7, -0.2);
  group.add(lining);
  const worms: Array<{ tube: Tube; base: THREE.Vector3; dir: number; len: number; phase: number }> = [];
  const female = (u: number, a: number, c: THREE.Color) => {
    // red blood-filled gut twisting around the white ovaries
    const s = Math.sin(a + u * 38);
    c.set(s > 0 ? 0xb3141f : 0xf3eee4);
    if (u < 0.06) c.set(0xd99a88);
  };
  const male = (u: number, _a: number, c: THREE.Color) => c.set(0xc4574b).lerp(hex(0xe2b3a0), u > 0.92 ? 0.6 : 0);
  const mat = kit.phys({ vertexColors: true, roughness: 0.3, clearcoat: 0.8 });
  const list: Array<[number, number, number, number, boolean]> = [
    [-0.9, -0.1, 0.7, 2.4, true],
    [0.4, -0.3, -0.5, 2.2, true],
    [0.9, 0.5, 2.6, 2.0, true],
    [-0.3, 0.45, 1.8, 1.4, false],
    [1.2, -0.6, -1.4, 1.3, false],
  ];
  for (const [x, y, dir, len, fem] of list) {
    const tube = new Tube(kit, 90, 12, taper(fem ? 0.1 : 0.075), fem ? female : male, mat);
    group.add(tube.mesh);
    worms.push({ tube, base: V(x, y, 0), dir, len, phase: x * 3 });
    if (!fem) {
      // the male's bursa: a small fan at the tail
      const b = kit.mesh(new THREE.ConeGeometry(0.15, 0.2, 12, 1, true), kit.phys({ color: 0xe0b0a0, side: THREE.DoubleSide }));
      tube.mesh.userData.bursa = b;
      group.add(b);
    }
  }
  const tmp = V(0, 0, 0);
  const update = (t: number) => {
    for (const w of worms) {
      w.tube.set((u, out) => {
        // the head is anchored in the lining; the body loops up and waves
        const s = u * w.len;
        const ang = w.dir + 0.9 * Math.sin(u * 3 + t * 0.7 + w.phase) * u;
        out.set(w.base.x + Math.cos(ang) * s * 0.5, w.base.y + Math.sin(ang) * s * 0.38, 0.1 + 0.6 * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.75) * (1 - u * 0.3));
      });
      const b = w.tube.mesh.userData.bursa as THREE.Mesh | undefined;
      if (b) {
        w.tube.at(1, tmp);
        b.position.copy(tmp);
        b.lookAt(w.tube.at(0.95).clone());
        b.rotateX(-Math.PI / 2);
      }
    }
  };
  update(0);
  return {
    group,
    zoom: 1.3,
    update,
    parts: [
      { name: 'Female: “barber’s pole” (red gut + white ovaries)', at: V(-0.6, 0.4, 0.6) },
      { name: 'Male: smaller, with a bursa', at: V(-0.3, 0.9, 0.5) },
      { name: 'Bleeding spots in the lining', at: V(1.3, -1.0, 0.2) },
      { name: 'Abomasal fold', at: V(-1.6, -0.8, 0.1) },
    ],
  };
}

// ---- egg ------------------------------------------------------------------------------------

export function strongyleEgg(kit: Kit): Model {
  const group = new THREE.Group();
  const R = V(1.3, 0.78, 0.78);
  // morula: a ball of 16–32 cells
  const r = rng(5);
  const cellG = kit.geo(new THREE.SphereGeometry(1, 24, 16));
  const cellMat = kit.phys({ color: 0x8e7b58, roughness: 0.45, clearcoat: 0.4 });
  const N = 24;
  const morula = new THREE.InstancedMesh(cellG, cellMat, N);
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    // points on a squashed ball
    const a = r() * Math.PI * 2;
    const b = Math.acos(2 * r() - 1);
    const rr = 0.45 + r() * 0.25;
    o.position.set(Math.sin(b) * Math.cos(a) * rr * 1.25, Math.sin(b) * Math.sin(a) * rr * 0.7, Math.cos(b) * rr * 0.7);
    o.scale.setScalar(0.24 + r() * 0.06);
    o.updateMatrix();
    morula.setMatrixAt(i, o.matrix);
    morula.setColorAt(i, c.set(0x8e7b58).multiplyScalar(0.85 + r() * 0.3));
  }
  group.add(morula);
  const shellG = new THREE.SphereGeometry(1, 64, 40);
  shellG.scale(R.x, R.y, R.z);
  group.add(kit.mesh(shellG, kit.phys({ color: 0xe8ecdc, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.28, depthWrite: false })));
  // the outline of the thin shell
  const rim = kit.mesh(new THREE.TorusGeometry(1, 0.018, 8, 80), kit.std({ color: 0x8c9478 }));
  rim.scale.set(R.x, R.y, 1);
  group.add(rim);
  return {
    group,
    update: (t) => (morula.rotation.x = 0.1 * Math.sin(t * 0.3)),
    parts: [
      { name: 'Thin, smooth shell', at: V(1.15, 0.5, 0.2) },
      { name: 'Morula: 16–32 cells', at: V(0, 0.1, 0.65) },
      { name: '“Strongyle-type” egg', at: V(-1.0, -0.6, 0.2) },
    ],
  };
}

function bacteria(kit: Kit, n: number, seed: number, spread: THREE.Vector3) {
  const g = kit.geo(new THREE.CapsuleGeometry(0.025, 0.06, 3, 6));
  const im = new THREE.InstancedMesh(g, kit.std({ color: 0x7f9a5a }), n);
  const r = rng(seed);
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    o.position.set((r() - 0.5) * spread.x, (r() - 0.5) * spread.y, (r() - 0.5) * spread.z);
    o.rotation.set(r() * 3, r() * 3, r() * 3);
    o.updateMatrix();
    im.setMatrixAt(i, o.matrix);
  }
  return im;
}

export function larvaL1(kit: Kit): Model {
  const group = new THREE.Group();
  const shellMat = kit.phys({ color: 0xe8ecdc, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
  for (const s of [-1, 1]) {
    const h = kit.mesh(new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), shellMat);
    h.scale.set(0.6, 1, 0.6);
    h.position.set(-1.2 + s * 0.15, -0.6 + s * 0.25, -0.2);
    h.rotation.z = s * 1.2 + 0.4;
    group.add(h);
  }
  const larva = new Tube(kit, 70, 10, taper(0.11), larvaColor(true, 0.4), larvaMat(kit));
  group.add(larva.mesh);
  group.add(bacteria(kit, 50, 3, V(2.6, 1.6, 0.8)));
  const update = (t: number) => {
    larva.set(wave(2.0, (u) => 0.12 + 0.15 * u, 1.1, t, 4));
    larva.mesh.position.set(0.3, 0.2, 0.2);
  };
  update(0);
  return {
    group,
    zoom: 1.2,
    update,
    parts: [
      { name: 'L1 larva hatched', at: V(0.5, 0.45, 0.4) },
      { name: 'Oesophagus with a bulb', at: V(1.0, 0.0, 0.3) },
      { name: 'Empty egg shell', at: V(-1.25, -0.25, 0.3) },
      { name: 'Bacteria (food)', at: V(1.4, -0.9, 0.3) },
    ],
  };
}

export function larvaL2(kit: Kit): Model {
  const group = new THREE.Group();
  const larva = new Tube(kit, 80, 10, taper(0.13), larvaColor(true, 0.7), larvaMat(kit));
  group.add(larva.mesh);
  // the shed L1 skin
  const skin = new Tube(kit, 60, 10, taper(0.11), (_u, _a, c) => c.set(0xf6f2e6), kit.phys({ vertexColors: true, transparent: true, opacity: 0.35, roughness: 0.2, depthWrite: false }));
  skin.set((u, out) => out.set(-0.4 + (0.5 - u) * 1.7, -0.95 + 0.12 * Math.sin(u * 7), -0.2));
  group.add(skin.mesh);
  const food = bacteria(kit, 55, 8, V(2.8, 1.8, 0.8));
  group.add(food);
  const update = (t: number) => {
    larva.set(wave(2.6, (u) => 0.1 + 0.18 * u, 1.0, t, 3.2));
    larva.mesh.position.set(0, 0.35, 0.2);
  };
  update(0);
  return {
    group,
    zoom: 1.2,
    update,
    parts: [
      { name: 'L2 feeding and growing', at: V(0.2, 0.7, 0.4) },
      { name: 'Old skin shed at the moult', at: V(-0.4, -1.0, 0.0) },
      { name: 'Bacteria (food)', at: V(1.4, -0.6, 0.3) },
    ],
  };
}

export function larvaL3(kit: Kit): Model {
  const group = new THREE.Group();
  const larva = new Tube(kit, 80, 10, taper(0.12), larvaColor(false, 1), larvaMat(kit));
  const sheath = new Tube(
    kit,
    90,
    12,
    (u) => (u > 0.82 ? 0.18 * Math.max(0.05, (1 - u) / 0.18) ** 1.4 : 0.18 * Math.min(1, Math.sin(Math.PI * Math.min(1, u * 3 + 0.05)) * 1.3)) + 0.006,
    (_u, _a, c) => c.set(0xf4f1e6),
    kit.phys({ vertexColors: true, transparent: true, opacity: 0.38, roughness: 0.15, clearcoat: 1, depthWrite: false }),
  );
  group.add(larva.mesh, sheath.mesh);
  const update = (t: number) => {
    const w = (L: number) => wave(L, (u) => 0.08 + 0.1 * u, 0.7, t, 1.6);
    larva.set(w(2.7));
    const sw = w(3.4);
    sheath.set((u, out) => {
      sw(u, out);
    });
    larva.mesh.position.x = 0.32;
  };
  update(0);
  return {
    group,
    zoom: 1.15,
    update,
    parts: [
      { name: 'Sheath (the old L2 skin)', at: V(-1.4, 0.25, 0.2) },
      { name: 'L3 inside: cannot feed', at: V(0.6, 0.3, 0.2) },
      { name: 'Food store (dark gut cells)', at: V(0.0, -0.3, 0.2) },
      { name: 'Sheath tail', at: V(-1.65, -0.2, 0.1) },
    ],
  };
}

export function grassL3(kit: Kit): Model {
  const group = new THREE.Group();
  const leafMat = kit.std({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.4 });
  const blades = [
    ribbon(kit, 3.6, 0.42, 0.12, 0.3, leafMat, 1),
    ribbon(kit, 3.0, 0.36, -0.25, -0.4, leafMat, 4),
    ribbon(kit, 2.6, 0.3, 0.35, 0.6, leafMat, 9),
  ];
  blades[0].position.set(0, -1.8, 0);
  blades[1].position.set(-0.7, -1.8, -0.3);
  blades[2].position.set(0.7, -1.8, -0.25);
  group.add(...blades);
  // dung pellets at the base
  const pelMat = kit.phys({ color: 0x3b2a1c, roughness: 0.6, clearcoat: 0.3 });
  for (const [x, z] of [
    [-0.5, 0.4],
    [0.1, 0.55],
    [0.6, 0.3],
  ]) {
    const p = kit.mesh(new THREE.SphereGeometry(0.22, 20, 14), pelMat);
    p.scale.set(1, 0.85, 1.2);
    p.position.set(x, -1.72, z);
    group.add(p);
  }
  // dew drops along the blades
  const dewMat = kit.phys({ color: 0xbfe3f5, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.55, depthWrite: false, ior: 1.33, sheen: 1, sheenColor: hex(0xffffff) });
  const drops: Array<[number, number, number, number]> = [
    [0.02, -1.1, 0.12, 0.22],
    [0.04, -0.2, 0.14, 0.17],
    [-0.62, -1.3, -0.15, 0.18],
    [0.75, -0.9, -0.1, 0.16],
    [0.06, 0.6, 0.12, 0.13],
  ];
  for (const [x, y, z, rr] of drops) {
    const d = kit.mesh(new THREE.SphereGeometry(rr, 24, 16), dewMat);
    d.scale.set(1, 1.15, 0.8);
    d.position.set(x, y, z);
    group.add(d);
  }
  // L3 larvae climbing in the water film
  const ls: Array<{ tube: Tube; at: THREE.Vector3; phase: number }> = [];
  const lm = larvaMat(kit, 0.95);
  for (const [x, y, z] of [
    [0.03, -1.15, 0.16],
    [0.04, -0.25, 0.18],
    [-0.6, -1.32, -0.05],
  ]) {
    const tb = new Tube(kit, 30, 8, taper(0.045), (u, _a, c) => c.set(0xf4e9d0).lerp(hex(0x6b4f2a), u > 0.3 && u < 0.85 ? 0.45 : 0), lm);
    group.add(tb.mesh);
    ls.push({ tube: tb, at: V(x, y, z), phase: x * 9 });
  }
  const update = (t: number) => {
    for (const l of ls) {
      const f = wave(0.55, () => 0.05, 0.8, t + l.phase, 3);
      l.tube.set(f);
      l.tube.mesh.position.copy(l.at);
      l.tube.mesh.rotation.z = Math.PI / 2;
    }
  };
  update(0);
  return {
    group,
    update,
    parts: [
      { name: 'Dew drop', at: V(0.3, -0.05, 0.3) },
      { name: 'L3 climbing in the water film', at: V(0.25, -1.2, 0.35) },
      { name: 'Dung pellets', at: V(-0.6, -1.7, 0.7) },
      { name: 'Most larvae stay in the lowest 5 cm', at: V(-1.1, -1.4, 0.2) },
    ],
  };
}

export function exsheath(kit: Kit): Model {
  const group = new THREE.Group();
  // rumen fluid: bits of plant fibre
  const fg = kit.geo(new THREE.CapsuleGeometry(0.03, 0.5, 3, 6));
  const fib = new THREE.InstancedMesh(fg, kit.std({ color: 0x9c9a5c, transparent: true, opacity: 0.55 }), 24);
  const r = rng(14);
  const o = new THREE.Object3D();
  for (let i = 0; i < 24; i++) {
    o.position.set((r() - 0.5) * 3.0, (r() - 0.5) * 2.0, -0.9 - r() * 0.6);
    o.rotation.set(r() * 3, r() * 3, r() * 3);
    o.scale.set(1, 0.6 + r(), 1);
    o.updateMatrix();
    fib.setMatrixAt(i, o.matrix);
    fib.setColorAt(i, hex(r() < 0.5 ? 0xa9a46a : 0x8a9a5a));
  }
  group.add(fib);
  const sheath = new Tube(kit, 60, 12, (u) => 0.17 * Math.min(1, u * 8) + 0.006, (_u, _a, c) => c.set(0xf4f1e6), kit.phys({ vertexColors: true, transparent: true, opacity: 0.32, roughness: 0.15, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }));
  sheath.set((u, out) => out.set(-1.7 + u * 1.9, -0.25 + 0.15 * Math.sin(u * 3), 0));
  group.add(sheath.mesh);
  const larva = new Tube(kit, 80, 10, taper(0.12), larvaColor(false, 1), larvaMat(kit));
  group.add(larva.mesh);
  const update = (t: number) => {
    const out = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.35));
    larva.set((u, p) => {
      const x = 0.2 - 2.6 * u + out * 1.3;
      const free = Math.max(0, x - 0.2);
      p.set(x, -0.25 + 0.15 * Math.sin((1 - u) * 3) + 0.25 * free * Math.sin(u * 9 - t * 3), 0.02 + 0.2 * free * Math.cos(u * 9 - t * 3));
    });
  };
  update(0);
  return {
    group,
    update,
    parts: [
      { name: 'Larva leaving its sheath', at: V(1.0, 0.3, 0.3) },
      { name: 'Empty sheath', at: V(-1.3, -0.05, 0.25) },
      { name: 'Rumen fluid and fibres', at: V(-1.1, 1.0, -0.5) },
    ],
  };
}

export function larvaL4(kit: Kit): Model {
  const group = new THREE.Group();
  // a block of abomasal lining cut to show the glands
  const g = new THREE.BoxGeometry(3.2, 2.0, 1.4, 64, 40, 8);
  const p = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  const glandX = (x: number) => Math.abs(((x + 1.6) / 0.64) % 1 - 0.5) < 0.2;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    c.set(0xd98a84);
    const front = z > 0.69;
    if (front) {
      // glands: tubes running down from the surface (pink lumen, darker walls)
      if (y > -0.7 && glandX(x)) c.set(0xf2c3bd);
      else if (y > -0.7) c.set(0xb75d5a);
      else c.set(0xe7b9a0); // submucosa
    }
    if (y > 0.99) c.set(0xc9605e).lerp(hex(0x8d2f33), fbm(x * 5, z * 5, 1) * 0.6);
    p.setXYZ(i, x, y + (y > 0.99 ? 0.04 * fbm(x * 6, z * 6, 2) : 0), z);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const block = kit.mesh(g, kit.phys({ vertexColors: true, roughness: 0.35, clearcoat: 0.7 }));
  block.rotation.x = 0.3;
  group.add(block);
  const lm = kit.phys({ vertexColors: true, roughness: 0.3, clearcoat: 0.7 });
  const lc = (u: number, _a: number, cc: THREE.Color) => cc.set(0xa3121b).lerp(hex(0xf3eee4), u < 0.15 ? 0.6 : Math.sin(u * 40) > 0.3 ? 0.5 : 0);
  const coiled: Tube[] = [];
  for (const gx of [-1.28, 0]) {
    const tb = new Tube(kit, 50, 8, taper(0.085), lc, lm);
    coiled.push(tb);
    tb.mesh.position.set(gx, 0.15, 0.72);
    block.add(tb.mesh);
  }
  const emerging = new Tube(kit, 50, 8, taper(0.085), lc, lm);
  emerging.mesh.position.set(0.64, 0, 0.72);
  block.add(emerging.mesh);
  const update = (t: number) => {
    coiled.forEach((tb, i) =>
      tb.set((u, out) => {
        const a = u * 9 + t * 0.4 + i;
        out.set(Math.cos(a) * 0.07, 0.5 - u * 0.95, Math.sin(a) * 0.07 + 0.08);
      }),
    );
    emerging.set((u, out) => {
      const k = 0.5 + 0.5 * Math.sin(t * 0.5);
      const y = 1.05 + 0.4 * k - u * 1.3;
      out.set(y > 1.0 ? 0.25 * (y - 1.0) * Math.sin(u * 8 - t * 2) : 0, y, y > 1.0 ? 0.2 * (y - 1.0) : 0);
    });
  };
  update(0);
  return {
    group,
    update,
    parts: [
      { name: 'Gastric glands', at: V(0.3, -0.35, 0.95) },
      { name: 'L4 inside a gland (can wait for months)', at: V(-1.28, 0.45, 1.0) },
      { name: 'Young worm coming out to feed', at: V(0.7, 1.4, 0.8) },
      { name: 'Abomasal lining', at: V(-1.2, 1.15, 0.2) },
    ],
  };
}
