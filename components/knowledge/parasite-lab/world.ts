// The setting around the host: pasture, a canal with reeds and snails (fluke),
// a dung pat or pellets, and a cracked shed wall (Theileria).

import * as THREE from 'three';
import type { AnchorId, ParasiteId } from '@/lib/parasites/cycles';
import { fbm } from '@/lib/rumen/noise';
import { Kit, V, hex, rng } from './kit';
import { snailMesh } from './models-fluke';
import { tickMesh } from './models-theileria';

const canalZ = (x: number) => 7.4 + 0.9 * Math.sin(x * 0.16 + 0.6);
const CANAL_HALF = 1.5;

export interface World {
  group: THREE.Group;
  anchor(id: AnchorId): THREE.Vector3 | null;
  update(t: number): void;
}

export function buildWorld(kit: Kit, id: ParasiteId): World {
  const group = new THREE.Group();
  const canal = id === 'fluke';
  const shed = id === 'theileria';
  const r = rng(id.length * 7 + 1);

  // ground
  const R = 34;
  const dense = new THREE.PlaneGeometry(2 * R, 2 * R, 160, 160);
  dense.rotateX(-Math.PI / 2);
  const p = dense.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const n = fbm(x * 0.15, 0, z * 0.15);
    let y = 0.12 * (n - 0.5);
    c.set(0x7b9a45).lerp(hex(0x5f7f33), n).lerp(hex(0xa39a6a), Math.max(0, fbm(x * 0.05 + 4, 1, z * 0.05) - 0.55) * 1.5);
    if (canal) {
      const d = Math.abs(z - canalZ(x));
      if (d < CANAL_HALF + 0.9) {
        const k = Math.max(0, 1 - Math.max(0, d - CANAL_HALF * 0.6) / (CANAL_HALF * 0.4 + 0.9));
        y -= 0.75 * k;
        c.lerp(hex(0x5b4a33), k * 0.85); // wet mud banks
      }
    }
    if (shed && z < -6) c.lerp(hex(0x9b8a70), Math.min(1, (-6 - z) / 3)); // trampled earth by the shed
    p.setY(i, y);
    col.set([c.r, c.g, c.b], i * 3);
  }
  dense.setAttribute('color', new THREE.BufferAttribute(col, 3));
  dense.computeVertexNormals();
  const ground = kit.mesh(dense, kit.std({ vertexColors: true, roughness: 0.95 }));
  ground.receiveShadow = false;
  group.add(ground);

  // grass tufts (instanced blades)
  const bladeG = kit.geo(new THREE.BufferGeometry());
  bladeG.setAttribute('position', new THREE.Float32BufferAttribute([-0.04, 0, 0, 0.04, 0, 0, 0, 0.5, 0.05], 3));
  bladeG.setIndex([0, 1, 2]);
  bladeG.computeVertexNormals();
  const N = 7000;
  const grass = new THREE.InstancedMesh(bladeG, kit.std({ side: THREE.DoubleSide, roughness: 0.8 }), N);
  const o = new THREE.Object3D();
  let k = 0;
  for (let i = 0; i < N * 2 && k < N; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * (R - 4);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (canal && Math.abs(z - canalZ(x)) < CANAL_HALF * 0.8) continue;
    if (shed && z < -10.5) continue;
    o.position.set(x, 0, z);
    o.rotation.set((r() - 0.5) * 0.5, r() * Math.PI, (r() - 0.5) * 0.5);
    o.scale.setScalar(0.6 + r() * 1.1);
    o.updateMatrix();
    grass.setMatrixAt(k, o.matrix);
    grass.setColorAt(k, c.set(0x5d8a2a).lerp(hex(0xa6c35a), r()));
    k++;
  }
  grass.count = k;
  group.add(grass);

  const anchors: Partial<Record<AnchorId, THREE.Vector3>> = {};
  let water: THREE.Mesh | null = null;

  if (canal) {
    // water surface following the canal
    const wg = new THREE.PlaneGeometry(2 * R, CANAL_HALF * 2.2, 120, 2);
    wg.rotateX(-Math.PI / 2);
    const wp = wg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < wp.count; i++) wp.setZ(i, wp.getZ(i) + canalZ(wp.getX(i)));
    wg.computeVertexNormals();
    water = kit.mesh(wg, kit.phys({ color: 0x4f8ea3, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.78, metalness: 0.1 }));
    water.position.y = -0.3;
    group.add(water);
    // reeds and water plants along both banks
    const reedG = kit.geo(new THREE.ConeGeometry(0.05, 1.6, 4));
    reedG.translate(0, 0.8, 0);
    const NR = 520;
    const reeds = new THREE.InstancedMesh(reedG, kit.std({ roughness: 0.7 }), NR);
    for (let i = 0; i < NR; i++) {
      const x = -R + 3 + r() * (2 * R - 6);
      const side = r() < 0.5 ? -1 : 1;
      const z = canalZ(x) + side * (CANAL_HALF * (0.55 + r() * 0.5));
      o.position.set(x, -0.35, z);
      o.rotation.set((r() - 0.5) * 0.35, r() * 3, (r() - 0.5) * 0.35);
      o.scale.set(1, 0.6 + r() * 0.9, 1);
      o.updateMatrix();
      reeds.setMatrixAt(i, o.matrix);
      reeds.setColorAt(i, c.set(0x4c7a2a).lerp(hex(0x8aa24a), r()));
    }
    group.add(reeds);
    // snails on the muddy bank (life size would be invisible — shown a little enlarged)
    for (let i = 0; i < 5; i++) {
      const s = snailMesh(kit, false).group;
      const x = -6.5 + i * 0.8 + r() * 0.3;
      s.scale.setScalar(0.12);
      s.position.set(x, -0.45, canalZ(x) - CANAL_HALF * 0.65);
      s.rotation.y = r() * 3;
      group.add(s);
    }
    anchors.canal = V(-10, -0.3, canalZ(-10));
    anchors.snailBank = V(-5, -0.4, canalZ(-5) - CANAL_HALF * 0.65);
    anchors.canalEdge = V(5.5, -0.2, canalZ(5.5) - CANAL_HALF * 0.75);
  }

  // dung: a buffalo dung pat (fluke) or a pile of pellets (sheep)
  const dungMat = kit.phys({ color: 0x4a3a26, roughness: 0.55, clearcoat: 0.35 });
  if (id === 'fluke') {
    const dg = new THREE.SphereGeometry(1, 40, 20);
    const dp = dg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < dp.count; i++) {
      const x = dp.getX(i), y = dp.getY(i), z = dp.getZ(i);
      const f = 1 + 0.15 * (fbm(x * 2, y * 2, z * 2) - 0.5);
      dp.setXYZ(i, x * 0.9 * f, Math.max(-0.1, y) * 0.22 * f, z * 0.8 * f);
    }
    dg.computeVertexNormals();
    const pat = kit.mesh(dg, dungMat);
    pat.position.set(-7.5, 0.05, -2.2);
    group.add(pat);
    anchors.dung = V(-7.5, 0.25, -2.2);
  } else if (id === 'haemonchus') {
    const pg = kit.geo(new THREE.SphereGeometry(0.11, 12, 10));
    const pel = new THREE.InstancedMesh(pg, dungMat, 46);
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 0.55;
      o.position.set(-6.8 + Math.cos(a) * d, 0.08 + r() * 0.06, -1.6 + Math.sin(a) * d);
      o.rotation.set(r() * 3, r() * 3, r() * 3);
      o.scale.set(1, 0.85, 1.25);
      o.updateMatrix();
      pel.setMatrixAt(i, o.matrix);
    }
    group.add(pel);
    anchors.dung = V(-6.8, 0.2, -1.6);
    // a lush, wet patch where larvae climb
    anchors.pasture = V(6.5, 0.25, 4.5);
    const tuftG = kit.geo(new THREE.ConeGeometry(0.04, 0.9, 3));
    tuftG.translate(0, 0.45, 0);
    const tuft = new THREE.InstancedMesh(tuftG, kit.std({ roughness: 0.6 }), 180);
    for (let i = 0; i < 180; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 1.2;
      o.position.set(6.5 + Math.cos(a) * d, 0, 4.5 + Math.sin(a) * d);
      o.rotation.set((r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5);
      o.scale.set(1, 0.6 + r() * 0.6, 1);
      o.updateMatrix();
      tuft.setMatrixAt(i, o.matrix);
      tuft.setColorAt(i, c.set(0x3f7a24).lerp(hex(0x7fb045), r()));
    }
    group.add(tuft);
  }

  if (shed) {
    // the back wall of a cattle shed, plastered, with cracks where ticks hide
    const wg = new THREE.BoxGeometry(30, 5.5, 0.7, 150, 28, 1);
    const wp = wg.attributes.position as THREE.BufferAttribute;
    const wc = new Float32Array(wp.count * 3);
    for (let i = 0; i < wp.count; i++) {
      const x = wp.getX(i), y = wp.getY(i);
      const n = fbm(x * 0.6, y * 0.6, 3);
      c.set(0xd9cbb2).lerp(hex(0xa8957a), n * 0.8);
      if (y < -2.0) c.lerp(hex(0x7d6d58), 0.5); // dirty lower wall
      // cracks: thin dark meandering lines
      const crack = Math.abs(Math.sin(x * 0.9 + 3 * fbm(x * 0.4, y * 0.8, 9)) * 3 + y * 0.6 - 1.2);
      if (crack < 0.12 && fbm(x * 0.3, y * 0.3, 2) > 0.45) c.set(0x3b3127);
      wc.set([c.r, c.g, c.b], i * 3);
    }
    wg.setAttribute('color', new THREE.BufferAttribute(wc, 3));
    wg.computeVertexNormals();
    const wall = kit.mesh(wg, kit.std({ vertexColors: true, roughness: 0.95 }));
    wall.position.set(2, 2.75, -12.5);
    group.add(wall);
    // a few ticks on the wall near the cracks
    for (let i = 0; i < 6; i++) {
      const t = tickMesh(kit, { nymph: i % 2 === 0 }).group;
      t.scale.setScalar(0.16);
      t.position.set(7 + i * 1.1 + r() * 0.4, 0.7 + r() * 1.6, -12.1);
      t.rotation.z = r() * 6;
      group.add(t);
    }
    // a manger
    const manger = kit.mesh(new THREE.BoxGeometry(6, 0.9, 1.2), kit.std({ color: 0x9a8b74, roughness: 0.9 }));
    manger.position.set(-4, 0.45, -11.4);
    group.add(manger);
    anchors.wall = V(10.5, 1.4, -12.1);
  }

  return {
    group,
    anchor: (a) => anchors[a]?.clone() ?? null,
    update(t) {
      if (water) water.position.y = -0.3 + 0.015 * Math.sin(t * 0.8);
    },
  };
}
