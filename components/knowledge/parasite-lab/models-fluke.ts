// Liver fluke (Fasciola gigantica) stages, modelled in code.

import * as THREE from 'three';
import { cells, fbm } from '@/lib/rumen/noise';
import { Kit, Tube, V, hex, latheX, rng, speckles, ribbon, type Model } from './kit';

// ---- the adult fluke: a leaf with its organs painted on ----------------------------------------

/** Half-width of F. gigantica along its length (y from tail −1.3 to cone tip +1.3). */
const GIGANTICA: Array<[number, number]> = [
  [1.3, 0.05], [1.22, 0.1], [1.06, 0.14], [0.99, 0.22], [0.93, 0.33], [0.82, 0.38], [0.55, 0.42], [0.2, 0.42], [-0.2, 0.41], [-0.6, 0.38], [-0.9, 0.32], [-1.1, 0.24], [-1.22, 0.15], [-1.3, 0.04],
];

function flukeTexture(kit: Kit, seed: number): THREE.CanvasTexture {
  const W = 256;
  const H = 692;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  const r = rng(seed);
  const X = (x: number) => ((x + 0.5) / 1.0) * W; // x in [-0.5, 0.5]
  const Y = (y: number) => ((1.3 - y) / 2.6) * H; // y from tip (top) to tail
  ctx.fillStyle = '#8f7a66';
  ctx.fillRect(0, 0, W, H);
  // vitellaria: fine yellowish granules in the side fields
  for (let i = 0; i < 2600; i++) {
    const y = -1.25 + r() * 2.2;
    const side = r() < 0.5 ? -1 : 1;
    const x = side * (0.22 + r() * 0.17);
    ctx.fillStyle = `rgba(214, 190, 128, ${0.25 + r() * 0.35})`;
    ctx.fillRect(X(x), Y(y), 2, 2);
  }
  // branched testes in the middle (lighter, dendritic)
  ctx.strokeStyle = 'rgba(200, 176, 150, 0.85)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    const y0 = 0.25 - r() * 1.2;
    const x0 = (r() - 0.5) * 0.18;
    ctx.beginPath();
    ctx.moveTo(X(x0), Y(y0));
    let x = x0, y = y0;
    for (let k = 0; k < 4; k++) {
      x += (r() - 0.5) * 0.12;
      y += (r() - 0.5) * 0.1;
      ctx.lineTo(X(x), Y(y));
    }
    ctx.stroke();
  }
  // branched gut (two dark trunks with side branches)
  ctx.strokeStyle = '#3b2b21';
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(1.12));
    ctx.quadraticCurveTo(X(s * 0.12), Y(1.0), X(s * 0.14), Y(0.85));
    ctx.lineTo(X(s * 0.15), Y(-1.18));
    ctx.stroke();
    for (let y = 0.8; y > -1.15; y -= 0.07 + r() * 0.03) {
      // outer branches, themselves branching
      ctx.lineWidth = 3.4;
      const len = 0.18 + r() * 0.06;
      const ex = s * (0.15 + len);
      const ey = y - 0.06 - r() * 0.05;
      ctx.beginPath();
      ctx.moveTo(X(s * 0.15), Y(y));
      ctx.quadraticCurveTo(X(s * (0.15 + len * 0.5)), Y(y - 0.01), X(ex), Y(ey));
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(s * (0.15 + len * 0.55)), Y(y - 0.02));
      ctx.lineTo(X(s * (0.15 + len * 0.85)), Y(y + 0.04));
      ctx.stroke();
      if (r() < 0.55) {
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(X(s * 0.15), Y(y - 0.02));
        ctx.lineTo(X(s * 0.06), Y(y - 0.06));
        ctx.stroke();
      }
    }
  }
  // uterus: a dark coiled rosette between the ventral sucker and the shoulders
  ctx.strokeStyle = '#4a2f1d';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let a = 0; a < 30; a += 0.25) {
    const rr = 0.02 + a * 0.0028;
    const x = Math.cos(a * 1.7) * rr * 1.6;
    const y = 0.6 + Math.sin(a * 1.7) * rr;
    if (a === 0) ctx.moveTo(X(x), Y(y));
    else ctx.lineTo(X(x), Y(y));
  }
  ctx.stroke();
  // suckers
  const sucker = (y: number, rr: number) => {
    const g = ctx.createRadialGradient(X(0), Y(y), 1, X(0), Y(y), rr * W);
    g.addColorStop(0, '#5b4434');
    g.addColorStop(0.55, '#b49a80');
    g.addColorStop(1, 'rgba(160,138,115,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(X(0), Y(y), rr * W, 0, Math.PI * 2);
    ctx.fill();
  };
  sucker(1.24, 0.06);
  sucker(0.86, 0.085);
  // tegument spines and sheen
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = `rgba(60, 45, 35, ${r() * 0.18})`;
    ctx.fillRect(r() * W, r() * H, 1.5, 1.5);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return kit.track(t);
}

/** An adult F. gigantica lying along x (head +x), cupped by `cup`. */
export function flukeLeaf(kit: Kit, seed: number, cup = 0.25, scale = 1): THREE.Mesh {
  const shape = new THREE.Shape();
  const pts = [...GIGANTICA.map(([y, w]) => new THREE.Vector2(w, y)), ...[...GIGANTICA].reverse().map(([y, w]) => new THREE.Vector2(-w, y))];
  shape.setFromPoints(pts);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -0.02);
  // more vertices across the leaf for the cupping
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    uv.setXY(i, x + 0.5, (y + 1.3) / 2.6);
    p.setZ(i, p.getZ(i) - cup * x * x * 2 + 0.03 * Math.sin(y * 4 + seed));
  }
  g.rotateZ(-Math.PI / 2);
  g.scale(scale, scale, scale);
  g.computeVertexNormals();
  const mat = kit.phys({ map: flukeTexture(kit, seed), roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.35, sheen: 0.4, sheenColor: hex(0xffe0c8) });
  return kit.mesh(g, mat);
}

export function flukeAdult(kit: Kit): Model {
  const group = new THREE.Group();
  // a bile duct, cut open towards you: thick pale wall, bile-stained lining
  const L = 3.6;
  const outer = new THREE.CylinderGeometry(1.0, 1.0, L, 48, 8, true, Math.PI / 2, Math.PI);
  const inner = new THREE.CylinderGeometry(0.8, 0.8, L, 48, 8, true, Math.PI / 2, Math.PI);
  const colorize = (g: THREE.BufferGeometry, a: number, b: number, spots: boolean) => {
    const p = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      c.set(a).lerp(hex(b), fbm(x * 3, y * 3, z * 3));
      if (spots && cells(x * 4, y * 4, z * 4)[0] < 0.18) c.lerp(hex(0xf4f0e6), 0.7); // calcified plaques
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  };
  colorize(outer, 0xd9ccb8, 0xb9a58c, true);
  colorize(inner, 0xa77a3c, 0x7d5527, false);
  for (const g of [outer, inner]) g.rotateZ(Math.PI / 2);
  const wallMat = kit.phys({ vertexColors: true, roughness: 0.55, clearcoat: 0.3 });
  const liningMat = kit.phys({ vertexColors: true, roughness: 0.35, clearcoat: 0.8, side: THREE.BackSide });
  group.add(kit.mesh(outer, wallMat), kit.mesh(inner, liningMat));
  // cut edges of the wall
  const edgeMat = kit.std({ color: 0xcbbca4, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const e = kit.mesh(new THREE.PlaneGeometry(L, 0.2), edgeMat);
    e.rotation.x = -Math.PI / 2;
    e.position.set(0, s * 0.9, 0);
    group.add(e);
  }
  // two flukes inside, curved to the duct
  const f1 = flukeLeaf(kit, 3, 0.32, 1.05);
  f1.position.set(0.05, 0.1, -0.45);
  f1.rotation.z = 0.06;
  const f2 = flukeLeaf(kit, 8, 0.3, 0.9);
  f2.position.set(-0.4, -0.38, -0.25);
  f2.rotation.set(0.5, 0, Math.PI - 0.12);
  group.add(f1, f2);
  // eggs in the bile
  const eggs = speckles(kit, 26, V(0.6, 0, 0.0), V(1.4, 0.6, 0.3), [0.03, 0.04], [0xc69a3b, 0xb8862e], 5);
  eggs.scale.set(1, 1, 1);
  group.add(eggs);
  const update = (t: number) => {
    f1.position.y = 0.1 + Math.sin(t * 0.6) * 0.03;
    f2.rotation.x = 0.5 + Math.sin(t * 0.5 + 1) * 0.05;
    eggs.position.x = ((t * 0.12) % 0.6) - 0.3;
  };
  return {
    group,
    update,
    parts: [
      { name: 'Oral sucker', at: V(1.42, 0.1, -0.4) },
      { name: 'Ventral sucker', at: V(0.95, 0.1, -0.35) },
      { name: 'Cephalic cone', at: V(1.2, 0.35, -0.4) },
      { name: 'Branched gut', at: V(-0.4, 0.38, -0.4) },
      { name: 'Thick, calcified bile duct wall', at: V(-1.3, 0.85, -0.5) },
      { name: 'Eggs in the bile', at: V(1.3, -0.45, 0.1) },
    ],
  };
}

// ---- egg ----------------------------------------------------------------------------------------

export function flukeEgg(kit: Kit): Model {
  const group = new THREE.Group();
  const R = V(1.25, 0.76, 0.76);
  const yolk = speckles(kit, 52, V(-0.12, 0, 0), V(0.95, 0.58, 0.58), [0.12, 0.17], [0xdcb460, 0xcfa24a, 0xe4c477], 11);
  group.add(yolk);
  // the egg cell, near the lid end (undeveloped)
  const ovum = kit.mesh(new THREE.SphereGeometry(0.2, 24, 16), kit.phys({ color: 0xf3e9cc, roughness: 0.4, transparent: true, opacity: 0.9 }));
  ovum.position.set(0.78, 0.05, 0.12);
  const nucleus = kit.mesh(new THREE.SphereGeometry(0.08, 16, 12), kit.std({ color: 0x9a7a3c }));
  nucleus.position.copy(ovum.position).add(V(0.02, 0.02, 0.1));
  group.add(ovum, nucleus);
  const shellG = new THREE.SphereGeometry(1, 64, 40);
  shellG.scale(R.x, R.y, R.z);
  const shell = kit.mesh(shellG, kit.phys({ color: 0xc89b3d, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15, transparent: true, opacity: 0.5, depthWrite: false }));
  group.add(shell);
  // the lid (operculum): a thin line around one end
  const xo = 1.1;
  const ro = R.y * Math.sqrt(1 - (xo / R.x) ** 2);
  const rim = kit.mesh(new THREE.TorusGeometry(ro, 0.022, 10, 48), kit.std({ color: 0x5e3f17 }));
  rim.rotation.y = Math.PI / 2;
  rim.position.x = xo;
  group.add(rim);
  return {
    group,
    parts: [
      { name: 'Lid (operculum)', at: V(1.2, 0.2, 0.1) },
      { name: 'Yellow-brown shell (bile-stained)', at: V(-0.3, 0.74, 0.1) },
      { name: 'Yolk cells', at: V(-0.6, -0.1, 0.4) },
      { name: 'Egg cell — not developed yet', at: V(0.78, 0.05, 0.3) },
    ],
  };
}

// ---- miracidium ----------------------------------------------------------------------------------

export function miracidium(kit: Kit): Model {
  const group = new THREE.Group();
  const prof: Array<[number, number]> = [
    [0, 1.12], [0.1, 1.08], [0.2, 0.98], [0.42, 0.8], [0.55, 0.52], [0.58, 0.2], [0.55, -0.2], [0.46, -0.6], [0.32, -0.92], [0.16, -1.12], [0, -1.2],
  ];
  const body = latheX(kit, prof, kit.phys({ vertexColors: true, roughness: 0.35, clearcoat: 0.5, transparent: true, opacity: 0.85 }), 48);
  // epidermal plates in tiers: colour bands with thin seams
  const p = body.geometry.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const tier = Math.floor((x + 1.2) / 0.48);
    c.set(tier % 2 ? 0xe9dcc4 : 0xdccdb1);
    const seam = Math.abs(((x + 1.2) / 0.48) % 1);
    if (seam < 0.05 || seam > 0.95) c.multiplyScalar(0.8);
    col.set([c.r, c.g, c.b], i * 3);
  }
  body.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  group.add(body);
  // germ cells inside (they will multiply in the snail)
  group.add(speckles(kit, 14, V(-0.35, 0, 0), V(0.45, 0.3, 0.3), [0.07, 0.1], [0xc9b28a], 4));
  // eye spots
  const eyeMat = kit.std({ color: 0x1a1410 });
  for (const s of [-1, 1]) {
    const e = kit.mesh(new THREE.SphereGeometry(0.07, 12, 10), eyeMat);
    e.scale.set(1, 0.6, 1.4);
    e.position.set(0.52, 0.32, s * 0.12);
    group.add(e);
  }
  const papilla = kit.mesh(new THREE.SphereGeometry(0.11, 16, 12), kit.phys({ color: 0xf2e4c9, roughness: 0.3 }));
  papilla.position.set(1.12, 0, 0);
  group.add(papilla);
  // cilia: many short hairs that beat in waves
  const N = 900;
  const ciliaG = kit.geo(new THREE.CylinderGeometry(0.006, 0.01, 0.16, 4, 1));
  ciliaG.translate(0, 0.08, 0);
  const cilia = new THREE.InstancedMesh(ciliaG, kit.std({ color: 0xf6efe0 }), N);
  const r = rng(9);
  const base: Array<{ p: THREE.Vector3; n: THREE.Vector3; x: number }> = [];
  for (let i = 0; i < N; i++) {
    const t = r();
    const x = 1.05 - t * 2.15;
    // radius at x from the profile
    let rad = 0;
    for (let k = 0; k < prof.length - 1; k++) {
      const [r0, y0] = prof[k];
      const [r1, y1] = prof[k + 1];
      if (x <= y0 && x >= y1) rad = r0 + ((r1 - r0) * (y0 - x)) / (y0 - y1);
    }
    const a = r() * Math.PI * 2;
    const n = V(0.25, Math.cos(a), Math.sin(a)).normalize();
    base.push({ p: V(x, Math.cos(a) * rad, Math.sin(a) * rad), n, x });
  }
  group.add(cilia);
  const o = new THREE.Object3D();
  const up = V(0, 1, 0);
  const q = new THREE.Quaternion();
  const tilt = new THREE.Quaternion();
  const update = (t: number) => {
    for (let i = 0; i < N; i++) {
      const b = base[i];
      o.position.copy(b.p);
      q.setFromUnitVectors(up, b.n);
      // metachronal wave: the beat travels back along the body
      tilt.setFromAxisAngle(V(0, b.n.z, -b.n.y).normalize(), 0.6 * Math.sin(t * 9 - b.x * 7));
      o.quaternion.copy(tilt).multiply(q);
      o.updateMatrix();
      cilia.setMatrixAt(i, o.matrix);
    }
    cilia.instanceMatrix.needsUpdate = true;
    group.rotation.x = t * 0.5;
  };
  update(0);
  return {
    group,
    update,
    parts: [
      { name: 'Cilia (beating hairs)', at: V(-0.2, 0.62, 0) },
      { name: 'Eye spots', at: V(0.55, 0.35, 0.15) },
      { name: 'Pointed front: bores into the snail', at: V(1.2, 0, 0) },
      { name: 'Germ cells', at: V(-0.4, -0.1, 0.2) },
    ],
  };
}

// ---- snail (Lymnaea) with rediae inside -------------------------------------------------------------

function spiralShell(kit: Kit, turns: number, b: number, a: number, h: number, tubeK: number, flare: number, material: THREE.Material, colorFn?: (th: number, phi: number, c: THREE.Color) => void) {
  const thMax = turns * Math.PI * 2;
  const segs = Math.round(turns * 64);
  const radial = 36;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i <= segs; i++) {
    const th = (i / segs) * thMax;
    const e = Math.exp(b * th);
    const rc = a * e;
    const yc = -h * e;
    const end = Math.max(0, (th - (thMax - 1.2)) / 1.2);
    const rt = tubeK * rc * (1 + flare * end * end);
    const cx = Math.cos(th), sx = Math.sin(th);
    for (let j = 0; j <= radial; j++) {
      const phi = (j / radial) * Math.PI * 2;
      const ox = Math.cos(phi) * rt;
      const oy = Math.sin(phi) * rt;
      pos.push(rc * cx + ox * cx, yc + oy, rc * sx + ox * sx);
      if (colorFn) colorFn(th, phi, c);
      else c.set(0xffffff);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < radial; j++) {
      const k = i * (radial + 1) + j;
      idx.push(k, k + 1, k + radial + 1, k + 1, k + radial + 2, k + radial + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return kit.mesh(g, material);
}

export function snailMesh(kit: Kit, inside: boolean): { group: THREE.Group; rediae: THREE.Mesh[]; tentacles: THREE.Mesh[] } {
  const group = new THREE.Group();
  const shellMat = kit.phys({
    vertexColors: true,
    roughness: 0.3,
    clearcoat: 0.7,
    side: THREE.DoubleSide,
    transparent: inside,
    opacity: inside ? 0.42 : 1,
    depthWrite: !inside,
  });
  const shell = spiralShell(kit, 3, 0.165, 0.05, 0.05, 0.98, 0.28, shellMat, (th, phi, c) => {
    // horn-brown, darker at the apex, with growth lines
    c.set(0xb3864e).lerp(hex(0x6e4a25), Math.max(0, 1 - th / 10));
    c.multiplyScalar(0.9 + 0.1 * Math.sin(th * 26) + 0.05 * Math.sin(phi * 3));
  });
  group.add(shell);
  // body: foot and head coming out of the opening (opening at +x, facing +z)
  const bodyMat = kit.phys({ color: 0x6f6553, roughness: 0.4, clearcoat: 0.6, sheen: 0.4 });
  const foot = kit.mesh(new THREE.SphereGeometry(1, 32, 20), bodyMat);
  foot.scale.set(0.95, 0.22, 0.62);
  foot.position.set(1.0, -1.85, 0.75);
  group.add(foot);
  const head = kit.mesh(new THREE.SphereGeometry(0.3, 24, 16), bodyMat);
  head.position.set(1.15, -1.62, 1.25);
  group.add(head);
  const tentacles: THREE.Mesh[] = [];
  const tg = new THREE.ConeGeometry(0.22, 0.5, 3);
  tg.scale(1, 1, 0.25);
  for (const s of [-1, 1]) {
    const t = kit.mesh(s < 0 ? tg : tg.clone(), bodyMat);
    t.position.set(1.15 + s * 0.24, -1.45, 1.45);
    t.rotation.set(1.0, 0, s * -0.7);
    group.add(t);
    tentacles.push(t);
    const eye = kit.mesh(new THREE.SphereGeometry(0.035, 8, 8), kit.std({ color: 0x111111 }));
    eye.position.set(1.15 + s * 0.13, -1.47, 1.5);
    group.add(eye);
  }
  const rediae: THREE.Mesh[] = [];
  if (inside) {
    // digestive gland (where the rediae live), coiled inside the shell
    const glandMat = kit.phys({ vertexColors: true, roughness: 0.5 });
    const gland = spiralShell(kit, 2.6, 0.165, 0.05, 0.05, 0.62, 0, glandMat, (th, phi, c) => {
      c.set(0xa86a2c).lerp(hex(0x6d3f17), 0.4 * fbm(th, phi, 1));
    });
    group.add(gland);
    const redMat = kit.phys({ color: 0xf08a35, emissive: 0x7a2c00, emissiveIntensity: 0.35, roughness: 0.35, clearcoat: 0.6, transparent: true, opacity: 0.9 });
    const r = rng(17);
    for (let i = 0; i < 7; i++) {
      const th = 3.6 * Math.PI + i * 0.36;
      const e = Math.exp(0.165 * th);
      const rc = 0.05 * e;
      const m = kit.mesh(new THREE.CapsuleGeometry(0.07, 0.34, 4, 10), redMat);
      m.position.set(Math.cos(th) * rc + (r() - 0.5) * 0.12, -0.05 * e + (r() - 0.5) * 0.2, Math.sin(th) * rc + 0.05);
      m.rotation.set(r() * 3, r() * 3, r() * 3);
      group.add(m);
      rediae.push(m);
      // cercariae balls inside each redia
      const balls = speckles(kit, 5, V(0, 0, 0), V(0.04, 0.17, 0.04), [0.035, 0.05], [0xfff0d0], 30 + i);
      m.add(balls);
    }
  }
  group.position.y = 0.6;
  return { group, rediae, tentacles };
}

export function snail(kit: Kit): Model {
  const { group: s, rediae, tentacles } = snailMesh(kit, true);
  const group = new THREE.Group();
  group.add(s);
  return {
    group,
    update: (t) => {
      rediae.forEach((m, i) => m.scale.setScalar(1 + 0.08 * Math.sin(t * 2 + i)));
      tentacles.forEach((m, i) => (m.rotation.z = (i ? -0.7 : 0.7) + 0.12 * Math.sin(t * 1.3 + i)));
    },
    parts: [
      { name: 'Shell: opening on the RIGHT', at: V(1.1, -0.5, 0.6) },
      { name: 'Flat triangular tentacles', at: V(1.15, -0.85, 1.5) },
      { name: 'Rediae (orange) making cercariae', at: V(0.0, -0.55, 0.0) },
      { name: 'Foot', at: V(1.5, -1.3, 1.1) },
      { name: 'Digestive gland', at: V(-0.4, 0.2, 0.1) },
    ],
  };
}

// ---- cercaria ----------------------------------------------------------------------------------------

export function cercaria(kit: Kit): Model {
  const group = new THREE.Group();
  const bodyMat = kit.phys({ color: 0xe1d0b0, roughness: 0.35, clearcoat: 0.6, transparent: true, opacity: 0.88 });
  const body = kit.mesh(new THREE.SphereGeometry(1, 40, 28), bodyMat);
  body.scale.set(0.62, 0.42, 0.18);
  body.position.x = 0.75;
  group.add(body);
  // cyst-making glands: brown granules in the body
  group.add(speckles(kit, 70, V(0.75, 0, 0), V(0.5, 0.33, 0.1), [0.025, 0.04], [0x7a5530, 0x8d6a3e], 21));
  const suckerMat = kit.phys({ color: 0xcdb48d, roughness: 0.4 });
  const oral = kit.mesh(new THREE.TorusGeometry(0.08, 0.035, 10, 24), suckerMat);
  oral.position.set(1.3, 0, 0.06);
  const ventral = kit.mesh(new THREE.TorusGeometry(0.1, 0.04, 10, 24), suckerMat);
  ventral.position.set(0.7, 0, 0.17);
  group.add(oral, ventral);
  const tail = new Tube(kit, 60, 10, (u) => 0.11 * (1 - u) ** 0.7 + 0.012, (u, _a, c) => c.set(0xe8dcc5).multiplyScalar(0.95 + 0.05 * Math.sin(u * 40)), bodyMat);
  group.add(tail.mesh);
  const update = (t: number) => {
    tail.set((u, out) => {
      const x = 0.18 - u * 2.3;
      out.set(x, 0.05 * Math.sin(u * 6 - t * 9) * u, (0.06 + 0.5 * u * u) * Math.sin(u * 7 - t * 9));
    });
    body.rotation.y = 0.08 * Math.sin(t * 9 + 1);
  };
  update(0);
  return {
    group,
    update,
    parts: [
      { name: 'Oral sucker', at: V(1.36, 0.08, 0.1) },
      { name: 'Ventral sucker', at: V(0.7, -0.12, 0.2) },
      { name: 'Cyst-making glands', at: V(0.55, 0.28, 0.1) },
      { name: 'Long simple tail (dropped later)', at: V(-1.4, 0, 0.3) },
    ],
  };
}

// ---- metacercaria on a plant at the water's edge ---------------------------------------------------------

export function metacercaria(kit: Kit): Model {
  const group = new THREE.Group();
  const leafMat = kit.std({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.45 });
  const blade = ribbon(kit, 2.8, 0.5, 0.25, 0.4, leafMat, 2);
  blade.position.set(0.1, -1.5, -0.35);
  blade.rotation.z = -0.35;
  group.add(blade);
  const blade2 = ribbon(kit, 2.4, 0.32, -0.2, -0.3, leafMat, 7);
  blade2.position.set(-0.8, -1.5, -0.6);
  blade2.rotation.z = 0.3;
  group.add(blade2);
  // the water surface
  const water = kit.mesh(new THREE.CircleGeometry(1.3, 48), kit.phys({ color: 0x6fb3d6, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.95;
  group.add(water);
  // small cysts on the blade
  const cystMat = kit.phys({ color: 0xf2ead6, roughness: 0.35, clearcoat: 0.8 });
  for (const [x, y] of [
    [0.45, -1.1],
    [0.25, -0.55],
    [-0.75, -1.2],
  ]) {
    const c = kit.mesh(new THREE.SphereGeometry(0.11, 16, 12), cystMat);
    c.position.set(x, y, -0.1);
    group.add(c);
  }
  // a big cyst, cut open to show the young fluke curled inside
  const big = new THREE.Group();
  const outer = kit.mesh(new THREE.SphereGeometry(0.62, 48, 32, Math.PI * 0.725, Math.PI * 1.55), kit.phys({ color: 0xefe6cf, roughness: 0.4, clearcoat: 0.6, side: THREE.DoubleSide }));
  const innerW = kit.mesh(new THREE.SphereGeometry(0.5, 40, 28, Math.PI * 0.725, Math.PI * 1.55), kit.phys({ color: 0xc9a46d, roughness: 0.5, side: THREE.DoubleSide }));
  big.add(outer, innerW);
  const curled = new Tube(kit, 48, 12, (u) => 0.13 * Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.02)) + 0.01, (u, _a, c) => c.set(0xd8bf98).multiplyScalar(0.9 + 0.1 * Math.sin(u * 30)), kit.phys({ vertexColors: true, roughness: 0.4, clearcoat: 0.5 }));
  curled.set((u, out) => {
    const a = -0.6 + u * 4.2;
    out.set(Math.cos(a) * 0.25, Math.sin(a) * 0.25, (u - 0.5) * 0.12);
  });
  curled.mesh.scale.set(1, 1, 0.7);
  big.add(curled.mesh);
  big.position.set(0.5, 0.35, 0.25);
  big.rotation.y = 0.25;
  big.scale.setScalar(1.35);
  group.add(big);
  return {
    group,
    update: (t) => {
      water.position.y = -0.95 + 0.02 * Math.sin(t * 1.2);
    },
    parts: [
      { name: 'Tough cyst wall', at: V(1.15, 1.05, 0.35) },
      { name: 'Young fluke curled inside', at: V(0.65, 0.3, 0.75) },
      { name: 'Grass / water plant', at: V(-0.5, 0.0, -0.5) },
      { name: 'Water surface', at: V(-1.3, -0.95, 0.6) },
      { name: 'More cysts', at: V(0.45, -1.1, 0.05) },
    ],
  };
}

// ---- out of the cyst in the intestine ---------------------------------------------------------------------

export function excyst(kit: Kit): Model {
  const group = new THREE.Group();
  const baseG = new THREE.PlaneGeometry(3.6, 2.6, 40, 30);
  const p = baseG.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, -0.12 * x * x + 0.05 * Math.sin(x * 5 + y * 3));
  }
  baseG.computeVertexNormals();
  const base = kit.mesh(baseG, kit.phys({ color: 0xd88b85, roughness: 0.4, clearcoat: 0.8 }));
  base.rotation.x = -1.05;
  base.position.y = -0.7;
  group.add(base);
  // villi
  const vg = kit.geo(new THREE.CapsuleGeometry(0.07, 0.42, 4, 8));
  const villi = new THREE.InstancedMesh(vg, kit.phys({ color: 0xeea39a, roughness: 0.35, clearcoat: 0.8, sheen: 0.5, sheenColor: hex(0xffd0c8) }), 170);
  const r = rng(12);
  const o = new THREE.Object3D();
  base.updateMatrix();
  for (let i = 0; i < 170; i++) {
    const x = (r() - 0.5) * 3.4;
    const y = (r() - 0.5) * 2.4;
    if (Math.hypot(x + 0.1, y - 0.15) < 0.38) {
      o.scale.setScalar(0.0001);
    } else {
      o.scale.set(1, 0.8 + r() * 0.5, 1);
    }
    o.position.set(x, y, -0.12 * x * x + 0.26);
    o.rotation.set(Math.PI / 2 + (r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3);
    o.updateMatrix();
    o.matrix.premultiply(base.matrix);
    villi.setMatrixAt(i, o.matrix);
  }
  group.add(villi);
  // the empty cyst, split open
  const shellMat = kit.phys({ color: 0xeee3c8, roughness: 0.4, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const h = kit.mesh(new THREE.SphereGeometry(0.32, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), shellMat);
    h.position.set(-0.7 + s * 0.12, 0.25 + s * 0.05, 0.55);
    h.rotation.set(s * 1.1, 0, s * 0.5);
    group.add(h);
  }
  // young fluke boring in
  const fluke = new Tube(kit, 40, 12, (u) => 0.12 * Math.sin(Math.PI * Math.min(1, u * 1.02 + 0.01)) + 0.01, (u, _a, c) => c.set(0xe2c7a0).multiplyScalar(0.85 + 0.15 * u), kit.phys({ vertexColors: true, roughness: 0.4, clearcoat: 0.5 }));
  fluke.mesh.scale.set(1, 1, 0.5);
  group.add(fluke.mesh);
  const update = (t: number) => {
    const k = 0.5 + 0.5 * Math.sin(t * 0.8);
    fluke.set((u, out) => {
      const x = -0.4 + (0.5 - u) * 0.9 + 0.35 * k;
      out.set(x, -0.05 - 0.25 * k + 0.05 * Math.sin(u * 8 - t * 4), 0.35 - 0.35 * k * (1 - u));
    });
  };
  update(0);
  return {
    group,
    update,
    parts: [
      { name: 'Empty cyst', at: V(-0.75, 0.5, 0.7) },
      { name: 'Young fluke boring into the wall', at: V(0.1, -0.1, 0.4) },
      { name: 'Intestinal lining (villi)', at: V(1.2, -0.4, 0.4) },
    ],
  };
}

// ---- young flukes in the liver -----------------------------------------------------------------------------

export function flukeJuvenile(kit: Kit): Model {
  const group = new THREE.Group();
  const g = new THREE.BoxGeometry(3.2, 2.2, 1.2, 48, 34, 16);
  const p = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  // the migration track (on the front face)
  const track = new THREE.CatmullRomCurve3([V(-1.5, -0.7, 0.6), V(-0.9, -0.2, 0.6), V(-0.2, -0.55, 0.6), V(0.4, 0.1, 0.6), V(1.0, 0.25, 0.6), V(1.25, 0.65, 0.6)]);
  const trackPts = track.getSpacedPoints(120);
  const distToTrack = (x: number, y: number) => {
    let d = 9;
    for (const q of trackPts) d = Math.min(d, Math.hypot(q.x - x, q.y - y));
    return d;
  };
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i);
    const z = p.getZ(i);
    // round the block's edges
    const k = 0.25;
    x = Math.sign(x) * (Math.abs(x) - k * Math.max(0, Math.abs(x) - 1.3) ** 2);
    y = Math.sign(y) * (Math.abs(y) - k * Math.max(0, Math.abs(y) - 0.8) ** 2);
    const n = fbm(x * 2, y * 2, z * 2);
    const front = z > 0.59;
    let dz = 0;
    // lobules: pale borders around darker lobules
    const [f1, f2] = cells(x * 3.2, y * 3.2, z * 3.2);
    c.set(0x7e3426).lerp(hex(0x5e2219), n * 0.6);
    if (f2 - f1 < 0.08) c.lerp(hex(0xa8604c), 0.55);
    if (front) {
      const d = distToTrack(x, y);
      if (d < 0.11) {
        c.set(0x3d0b0b);
        dz = -0.08 * (1 - d / 0.11);
      } else if (d < 0.26) c.lerp(hex(0xc58a5a), 0.5 * (1 - (d - 0.11) / 0.15)); // pale damaged rim
    }
    p.setXYZ(i, x, y, z + dz + (n - 0.5) * 0.05);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  group.add(kit.mesh(g, kit.phys({ vertexColors: true, roughness: 0.4, clearcoat: 0.85, clearcoatRoughness: 0.3 })));
  // bleeding spots
  group.add(speckles(kit, 18, V(0, 0, 0.62), V(1.5, 1.0, 0.01), [0.025, 0.05], [0x5a0808], 33));
  // the young fluke (spiny lancet shape) at the end of its track
  const juv = kit.mesh(new THREE.SphereGeometry(1, 24, 16), kit.phys({ color: 0xd9c09a, roughness: 0.35, clearcoat: 0.6 }));
  juv.scale.set(0.24, 0.09, 0.035);
  group.add(juv);
  const tmp = V(0, 0, 0);
  const update = (t: number) => {
    const u = 0.86 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.4));
    track.getPointAt(u, tmp);
    juv.position.set(tmp.x, tmp.y, 0.58);
    const tg = track.getTangentAt(u);
    juv.rotation.z = Math.atan2(tg.y, tg.x);
  };
  update(0);
  return {
    group,
    update,
    parts: [
      { name: 'Bleeding migration track', at: V(-0.6, -0.35, 0.65) },
      { name: 'Young fluke (spiny)', at: V(1.15, 0.5, 0.7) },
      { name: 'Liver tissue (lobules)', at: V(-1.1, 0.75, 0.6) },
    ],
  };
}

