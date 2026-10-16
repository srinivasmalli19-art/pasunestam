// 3D egg-formation scene (plain three.js): the hen's left ovary with its
// follicle hierarchy, the oviduct in its five coloured parts, schematic brain,
// liver, kidney, intestine and leg bone, and an egg that is built layer by
// layer as it travels. The egg can be cut in half (facing the camera) so the
// layers can be seen forming. Everything is driven by lib/poultry/egg.ts.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SEGMENTS, SEGMENT_INFO, SEGMENT_SPAN, eggAt, type EggState } from '@/lib/poultry/egg';
import { EGG_TOKENS, type EggMovieFrame, type EggRouteId, type EggShotId, type EggSiteId } from '@/lib/poultry/movie';

export type EggView = 'overview' | 'ovary' | 'oviduct' | 'egg';
export interface EggLabOptions {
  cut: boolean;
  fertile: boolean;
  brown: boolean;
  labels: boolean;
}
export interface EggLabScene {
  setHour(h: number): void;
  setOptions(o: EggLabOptions): void;
  setView(v: EggView): void;
  setMovieFrame(frame: EggMovieFrame | null, key?: string): void;
  dispose(): void;
}

type Seg = (typeof SEGMENTS)[number];
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---- layout (units ≈ cm) ---------------------------------------------------------
const OVARY = v(0, 2, 0);
const F1 = v(2.3, 0.9, 1.6);
const HYPO = v(-14, 12.6, 0);
const PITU = v(-14.6, 10.2, 0);
const POST_PITU = v(-13.1, 10.3, 0);
const LIVER = v(-6.5, -1.5, -4);
const KIDNEY = v(13, 3, -7);
const GUT = v(-3, -17, -3);
const BONE = v(-11, -15, 1);

const PIECES: Record<Seg, THREE.Vector3[]> = {
  infundibulum: [v(5.6, -0.4, 3.4), v(7.8, -2.4, 3), v(10, -4, 1.5), v(11.5, -5.5, 0)],
  magnum: [
    v(11.5, -5.5, 0), v(10, -8.5, -2), v(7, -8, -0.5), v(6, -10.5, 1.5), v(9, -12.5, 2.5), v(13, -11.5, 1), v(16, -9, -1),
    v(19, -11, -2), v(18, -14, 0), v(15, -16, 2), v(17, -19, 2), v(21, -18, 0), v(23, -17, -0.5),
  ],
  isthmus: [v(23, -17, -0.5), v(25, -17.5, -0.8), v(26.5, -19.2, 0), v(27.5, -20.8, 0.3)],
  uterus: [v(27.5, -20.8, 0.3), v(29.5, -22.4, 0.5), v(32, -22.7, 0.4), v(34, -21.3, 0)],
  vagina: [v(34, -21.3, 0), v(35.6, -19.6, 0), v(37, -21, 0), v(38.6, -23.4, 0), v(41, -24, 0)],
};
const CLOACA = v(42, -24, 0);

/** Resting radius of the oviduct along each part (u = 0–1 within the part). */
function baseRadius(seg: Seg, u: number): number {
  switch (seg) {
    case 'infundibulum':
      return 0.95 + 2.2 * Math.max(0, 1 - u / 0.4) ** 2; // the funnel
    case 'magnum':
      return 1.35;
    case 'isthmus':
      return 1.05;
    case 'uterus':
      return 1.3 + 1.6 * Math.sin(Math.PI * u); // the pouch
    case 'vagina':
      return 0.95 + 0.5 * Math.max(0, (u - 0.8) / 0.2);
  }
}

// egg sizes
const YOLK_R = 1.55;
const DENSE = { a: 2.25, b: 1.85 }; // albumen after the magnum (before plumping)
const PLUMP = { a: 2.6, b: 2.0 };
const MEMBRANE = { a: 2.63, b: 2.03 };

/** Bend a unit sphere into an egg shape, pointed end towards +x. */
function ovoid(geo: THREE.BufferGeometry, k = 0.13) {
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const f = 1 - k * x;
    p.setXYZ(i, x, p.getY(i) * f, p.getZ(i) * f);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createEggScene(container: HTMLElement): EggLabScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xf4f2ec);
  renderer.localClippingEnabled = true;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  const labelLayer = document.createElement('div');
  labelLayer.className = 'lab-labels';
  container.appendChild(labelLayer);
  const movieLayer = document.createElement('div');
  movieLayer.className = 'em-layer';
  container.appendChild(movieLayer);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.3, 900);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a99a, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(20, 40, 60);
  scene.add(key);

  const disposables: Array<{ dispose(): void }> = [];
  const mat = (color: number | string, opts: THREE.MeshStandardMaterialParameters = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.02, ...opts });
    disposables.push(m);
    return m;
  };
  const add = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = scene) => {
    disposables.push(g);
    const mesh = new THREE.Mesh(g, m);
    parent.add(mesh);
    return mesh;
  };

  // ---- ovary: follicle hierarchy ------------------------------------------------
  add(new THREE.SphereGeometry(1.3, 20, 14).translate(OVARY.x, OVARY.y, OVARY.z), mat(0xd8b7a6));
  const yolkMat = mat(0xf2b705, { roughness: 0.45 });
  const f1 = add(new THREE.SphereGeometry(2, 32, 22), yolkMat);
  f1.position.copy(F1);
  const stigmaMat = mat(0xffffff, { transparent: true, opacity: 0.5 });
  const stigma = add(new THREE.TorusGeometry(2.01, 0.09, 8, 48), stigmaMat);
  stigma.position.copy(F1);
  stigma.rotation.set(0.5, 0.9, 0);
  const pof = add(new THREE.SphereGeometry(1, 16, 12).scale(0.9, 0.6, 0.9), mat(0xe2a3a8, { roughness: 0.9 }));
  pof.position.copy(F1);
  const stalkMat = mat(0xd8b7a6);
  const follicleList: Array<[THREE.Vector3, number, number]> = [
    [v(-1.9, 2.4, 1.2), 1.65, 0xf2bd1e],
    [v(-0.4, 4.4, 0.6), 1.35, 0xf4c63a],
    [v(1.8, 3.9, -1.2), 1.05, 0xf6d05a],
    [v(-2.2, 0.4, -1.4), 0.8, 0xf7d978],
  ];
  for (const [p, r, c] of follicleList) {
    const pos = OVARY.clone().add(p);
    add(new THREE.SphereGeometry(r, 24, 16).translate(pos.x, pos.y, pos.z), mat(c, { roughness: 0.45 }));
    const mid = pos.clone().add(OVARY).multiplyScalar(0.5);
    const len = pos.distanceTo(OVARY);
    const st = add(new THREE.CylinderGeometry(0.18, 0.25, len, 8), stalkMat);
    st.position.copy(mid);
    st.lookAt(pos);
    st.rotateX(Math.PI / 2);
  }
  const smallFollicles: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39996;
    const r = 1.35 + (i % 3) * 0.15;
    const p = OVARY.clone().add(v(r * Math.cos(a), r * Math.sin(a) * 0.8, ((i % 5) - 2) * 0.45));
    smallFollicles.push(add(new THREE.SphereGeometry(0.22 + (i % 4) * 0.07, 10, 8).translate(p.x, p.y, p.z), mat(0xf5f0e6)));
  }

  // ---- oviduct: one tube per part, bulging around the egg --------------------------
  interface Tube {
    seg: Seg;
    curve: THREE.CatmullRomCurve3;
    geo: THREE.TubeGeometry;
    centres: THREE.Vector3[];
    offsets: Float32Array; // unit offsets per vertex
    ringArc: number[]; // arc position (world units, from the funnel) per ring
    ringBase: number[];
  }
  const TUBULAR = { infundibulum: 60, magnum: 220, isthmus: 60, uterus: 70, vagina: 70 } as const;
  const RADIAL = 26;
  const tubes: Tube[] = [];
  const tubeMats: THREE.MeshStandardMaterial[] = [];
  const pieceStart: Record<Seg, number> = {} as Record<Seg, number>;
  let arcSoFar = 0;
  for (const seg of SEGMENTS) {
    const curve = new THREE.CatmullRomCurve3(PIECES[seg], false, 'centripetal');
    const n = TUBULAR[seg];
    const geo = new THREE.TubeGeometry(curve, n, 1, RADIAL, false);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const centres: THREE.Vector3[] = [];
    const ringArc: number[] = [];
    const ringBase: number[] = [];
    const len = curve.getLength();
    pieceStart[seg] = arcSoFar;
    for (let i = 0; i <= n; i++) {
      centres.push(curve.getPointAt(i / n));
      ringArc.push(arcSoFar + len * (i / n));
      ringBase.push(baseRadius(seg, i / n));
    }
    const offsets = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / (RADIAL + 1));
      const c = centres[ring];
      offsets[i * 3] = pos.getX(i) - c.x;
      offsets[i * 3 + 1] = pos.getY(i) - c.y;
      offsets[i * 3 + 2] = pos.getZ(i) - c.z;
    }
    arcSoFar += len;
    const m = mat(SEGMENT_INFO[seg].color, { transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide, roughness: 0.5 });
    tubeMats.push(m);
    add(geo, m);
    tubes.push({ seg, curve, geo, centres, offsets, ringArc, ringBase });
  }
  // cloaca
  add(new THREE.TorusGeometry(1.4, 0.45, 12, 28).rotateY(Math.PI / 2).translate(CLOACA.x, CLOACA.y, CLOACA.z), mat(0x9c4a5a));

  /** World point and tangent for global position s (0–1 along the oviduct, by part). */
  const tubeAt = (s: number) => {
    const clamped = Math.min(1, Math.max(0, s));
    const seg = SEGMENTS.find((g) => clamped <= SEGMENT_SPAN[g][1] + 1e-9) ?? 'vagina';
    const [a, b] = SEGMENT_SPAN[seg];
    const u = (clamped - a) / (b - a);
    const t = tubes.find((x) => x.seg === seg)!;
    return { seg, u, point: t.curve.getPointAt(u), tangent: t.curve.getTangentAt(u), arc: pieceStart[seg] + t.curve.getLength() * u };
  };

  // ---- other organs (schematic) ----------------------------------------------------
  add(new THREE.SphereGeometry(1, 28, 18).scale(6, 3.4, 4).translate(-14, 15.4, 0), mat(0xe9d6dc, { transparent: true, opacity: 0.45, depthWrite: false }));
  add(new THREE.SphereGeometry(0.9, 18, 12).translate(HYPO.x, HYPO.y, HYPO.z), mat(0x6250d6));
  add(new THREE.CylinderGeometry(0.3, 0.3, 1.6, 8).translate(-14.2, 11.5, 0), mat(0xb7a9d9));
  add(new THREE.SphereGeometry(0.85, 18, 12).translate(PITU.x, PITU.y, PITU.z), mat(0x1baf7a));
  add(new THREE.SphereGeometry(0.65, 18, 12).translate(POST_PITU.x, POST_PITU.y, POST_PITU.z), mat(0x455a64));
  const liverMat = mat(0x8b3a2b, { roughness: 0.5 });
  add(new THREE.SphereGeometry(1, 24, 16).scale(3.4, 1.4, 2.4).translate(LIVER.x, LIVER.y, LIVER.z), liverMat);
  add(new THREE.SphereGeometry(1, 24, 16).scale(2.6, 1.2, 2).translate(LIVER.x + 2.2, LIVER.y - 1.6, LIVER.z - 0.6), liverMat);
  const kidneyMat = mat(0x6e2134);
  for (const [dx, sx] of [[-2.4, 1.5], [0, 1.7], [2.4, 1.4]] as const)
    add(new THREE.SphereGeometry(1, 18, 12).scale(sx, 0.9, 1).translate(KIDNEY.x + dx, KIDNEY.y, KIDNEY.z), kidneyMat);
  const gutCurve = new THREE.CatmullRomCurve3([
    GUT.clone().add(v(-4, 2, 0)), GUT.clone().add(v(-1, 3, 1)), GUT.clone().add(v(2, 1.5, 0)), GUT.clone().add(v(0, -0.5, -1)),
    GUT.clone().add(v(-3, -1, 0)), GUT.clone().add(v(-1, -3, 1)), GUT.clone().add(v(3, -2.5, 0)), GUT.clone().add(v(5, -1, -1)),
  ]);
  add(new THREE.TubeGeometry(gutCurve, 120, 0.6, 12, false), mat(0xd9a38f));
  // leg bone with medullary bone inside
  add(new THREE.CylinderGeometry(0.95, 0.95, 9, 20, 1, true).rotateZ(0.35).translate(BONE.x, BONE.y, BONE.z), mat(0xeee6d3, { transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
  add(new THREE.CylinderGeometry(0.62, 0.62, 8.2, 16).rotateZ(0.35).translate(BONE.x, BONE.y, BONE.z), mat(0xf7f0dc, { roughness: 0.95 }));
  for (const sgn of [1, -1]) {
    const end = v(-Math.sin(0.35) * 4.6 * sgn, Math.cos(0.35) * 4.6 * sgn, 0).add(BONE);
    add(new THREE.SphereGeometry(1.3, 18, 12).translate(end.x, end.y, end.z), mat(0xeee6d3));
  }

  // ---- the egg (built layer by layer) ---------------------------------------------
  const cutPlane = new THREE.Plane(v(0, 0, -1), 0);
  const eggMats: THREE.Material[] = [];
  const emat = (color: number, opts: THREE.MeshStandardMaterialParameters = {}) => {
    const m = mat(color, { side: THREE.DoubleSide, ...opts });
    eggMats.push(m);
    return m;
  };
  const egg = new THREE.Group();
  scene.add(egg);
  const yolkLayers = [
    add(new THREE.SphereGeometry(YOLK_R, 40, 28), emat(0xf0ad00, { roughness: 0.5 }), egg),
    add(new THREE.SphereGeometry(YOLK_R * 0.74, 32, 22), emat(0xf8cf45, { roughness: 0.5 }), egg),
    add(new THREE.SphereGeometry(YOLK_R * 0.46, 28, 18), emat(0xf0ad00, { roughness: 0.5 }), egg),
    add(new THREE.SphereGeometry(YOLK_R * 0.18, 18, 12), emat(0xfff3d0), egg), // latebra
  ];
  void yolkLayers;
  const discMat = emat(0xffffff, { roughness: 0.4 });
  const disc = add(new THREE.CircleGeometry(0.28, 24).rotateX(-Math.PI / 2).translate(0, YOLK_R + 0.01, 0), discMat, egg);
  const ring = add(new THREE.TorusGeometry(0.4, 0.07, 8, 32).rotateX(Math.PI / 2).translate(0, YOLK_R + 0.02, 0), discMat, egg);
  const vitMat = emat(0xffffff, { transparent: true, opacity: 0, depthWrite: false });
  add(new THREE.SphereGeometry(YOLK_R + 0.05, 32, 22), vitMat, egg);
  const albMat = emat(0xfff4d6, { transparent: true, opacity: 0.4, depthWrite: false, roughness: 0.2 });
  const albumen = add(ovoid(new THREE.SphereGeometry(1, 48, 32)), albMat, egg);
  const memMat = emat(0xffffff, { transparent: true, opacity: 0, depthWrite: false, roughness: 0.8 });
  const membranes = add(ovoid(new THREE.SphereGeometry(1, 48, 32)), memMat, egg);
  const shellMat = emat(0xfbf8f2, { transparent: true, opacity: 0, roughness: 0.9 });
  const shell = add(ovoid(new THREE.SphereGeometry(1, 56, 36)), shellMat, egg);
  // chalazae: two twisted cords from the yolk towards each end
  const chalMat = emat(0xfffbf0, { roughness: 0.6 });
  let chalazae: THREE.Mesh[] = [];
  let chalKey = '';
  const buildChalazae = (twist: number, reach: number) => {
    const k = `${twist.toFixed(2)}-${reach.toFixed(2)}`;
    if (k === chalKey) return;
    chalKey = k;
    for (const c of chalazae) {
      egg.remove(c);
      c.geometry.dispose();
    }
    chalazae = [];
    if (reach <= 0.05) return;
    for (const dir of [1, -1]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const x = dir * (YOLK_R * 0.95 + reach * t);
        const ang = twist * 6 * t * dir;
        pts.push(v(x, 0.16 * Math.cos(ang), 0.16 * Math.sin(ang)));
      }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.11, 8, false), chalMat);
      egg.add(m);
      chalazae.push(m);
    }
  };
  // mammillary knobs (first shell seeds) on the membrane
  const knobGeo = new THREE.SphereGeometry(0.07, 6, 4);
  disposables.push(knobGeo);
  const knobs = new THREE.InstancedMesh(knobGeo, emat(0xffffff), 160);
  egg.add(knobs);
  {
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 160; i++) {
      const y = 1 - (2 * (i + 0.5)) / 160;
      const r = Math.sqrt(1 - y * y);
      const a = i * 2.39996;
      const ux = r * Math.cos(a);
      const f = 1 - 0.13 * ux;
      m4.makeTranslation(ux * MEMBRANE.a, y * MEMBRANE.b * f, r * Math.sin(a) * MEMBRANE.b * f);
      knobs.setMatrixAt(i, m4);
    }
  }

  // ---- labels -------------------------------------------------------------------------
  type Label = { el: HTMLElement; pos: () => THREE.Vector3 | null; closeOnly?: boolean };
  const labels: Label[] = [];
  const addLabel = (text: string, pos: () => THREE.Vector3 | null, cls = '', closeOnly = false) => {
    const el = document.createElement('span');
    el.className = `lab-label ${cls}`;
    el.textContent = text;
    labelLayer.appendChild(el);
    const l = { el, pos, closeOnly };
    labels.push(l);
    return l;
  };
  addLabel('Brain (schematic)', () => v(-21.5, 16, 0));
  addLabel('Hypothalamus', () => HYPO.clone().add(v(-4.2, 0.6, 0)));
  addLabel('Anterior pituitary', () => PITU.clone().add(v(-4.4, -0.6, 0)));
  addLabel('Posterior pituitary', () => POST_PITU.clone().add(v(4.4, -0.8, 0)));
  addLabel('Ovary (left)', () => OVARY.clone().add(v(-2.5, 5.6, 0)));
  const f1Label = addLabel('Largest yolk (F1)', () => F1.clone().add(v(0.5, -2.8, 1)), 'lab-label-accent');
  addLabel('Liver', () => LIVER.clone().add(v(-3, -2.4, 1)));
  addLabel('Kidney', () => KIDNEY.clone().add(v(0, 2, 0)));
  addLabel('Intestine', () => GUT.clone().add(v(0, -4.6, 0)));
  addLabel('Leg bone (medullary bone)', () => BONE.clone().add(v(-1, -6.4, 0)));
  for (const seg of SEGMENTS) {
    const t = tubes.find((x) => x.seg === seg)!;
    const at = seg === 'magnum' ? 0.62 : 0.5;
    addLabel(SEGMENT_INFO[seg].name, () => t.curve.getPointAt(at).add(v(0, -baseRadius(seg, at) - 1.2, 1)), 'egl-seg');
  }
  addLabel('Cloaca', () => CLOACA.clone().add(v(1.5, -2.2, 0)));
  // layer labels on the cut egg (close views only)
  let state: EggState = eggAt(-8);
  const eggLocal = (x: number, y: number) => egg.localToWorld(v(x, y, 0));
  addLabel('Yolk', () => (egg.visible ? eggLocal(-0.2, 0.2) : null), 'egl-layer', true);
  addLabel('Chalaza', () => (egg.visible && state.chalazae > 0.15 ? eggLocal(YOLK_R + 0.45, -0.45) : null), 'egl-layer', true);
  addLabel('Albumen', () => (egg.visible && state.albumen > 0.2 ? eggLocal(-YOLK_R - 0.35, -1.25) : null), 'egl-layer', true);
  addLabel('Shell membranes', () => (egg.visible && state.membranes > 0.3 && state.shell < 0.5 ? eggLocal(0.4, MEMBRANE.b + 0.35) : null), 'egl-layer', true);
  addLabel('Shell', () => (egg.visible && state.shell >= 0.5 ? eggLocal(0.4, MEMBRANE.b + 0.5) : null), 'egl-layer', true);

  // ---- hormone routes & sites ---------------------------------------------------------
  const route = (pts: THREE.Vector3[]) => new THREE.CatmullRomCurve3(pts);
  const uterusMid = () => tubes.find((x) => x.seg === 'uterus')!.curve.getPointAt(0.45);
  const ROUTES: Record<EggRouteId, THREE.CatmullRomCurve3> = {
    hypoToPitu: route([HYPO.clone().add(v(0, -0.8, 0.2)), v(-14.3, 11.4, 0.4), PITU.clone().add(v(0, 0.8, 0))]),
    pituToOvary: route([PITU.clone().add(v(0.2, -0.9, 0.5)), v(-9, 6.5, 3), v(-4, 4.5, 3), OVARY.clone().add(v(-0.6, 1.4, 1.2))]),
    pituToF1: route([PITU.clone().add(v(0.2, -0.9, 0.5)), v(-9, 6.5, 3.5), v(-2, 3.5, 4), F1.clone().add(v(0, 1.4, 1.6))]),
    ovaryToLiver: route([OVARY.clone().add(v(-1, -0.6, 1)), v(-3, -0.5, 1.5), LIVER.clone().add(v(1.4, 1.4, 2))]),
    liverToF1: route([LIVER.clone().add(v(1.6, 1.2, 2.2)), v(-2, 1.5, 3.4), F1.clone().add(v(-1, 0.6, 1.8))]),
    f1ToHypo: route([F1.clone().add(v(0, 1.8, 1.2)), v(-3, 7, 3.5), v(-10, 11, 2.5), HYPO.clone().add(v(0.7, 0.2, 0.6))]),
    kidneyToGut: route([KIDNEY.clone().add(v(-2, -1, 1.5)), v(9, -6, -1), v(3, -13, -1), GUT.clone().add(v(1, 1.6, 1))]),
    gutToUterus: route([GUT.clone().add(v(3, 0, 1.2)), v(10, -21, 2), v(22, -24.5, 2.5), uterusMid().add(v(0, -1, 2.6))]),
    boneToUterus: route([BONE.clone().add(v(1, 0, 1)), v(5, -24, 2), v(20, -25.5, 2.5), uterusMid().add(v(0, -1, 2.6))]),
    postPituToUterus: route([POST_PITU.clone().add(v(0.4, -0.6, 0.5)), v(-6, 5, 4), v(10, -9, 5), v(25, -18, 3.5), uterusMid().add(v(0, 1.4, 2.6))]),
    pofToUterus: route([F1.clone().add(v(0, -1, 1.4)), v(12, -8, 5), v(25, -18, 3.5), uterusMid().add(v(0, 1.4, 2.6))]),
  };
  const siteSpot = (site: EggSiteId): THREE.Vector3 => {
    switch (site) {
      case 'hypothalamus':
        return HYPO.clone();
      case 'pituitary':
        return PITU.clone();
      case 'postPituitary':
        return POST_PITU.clone();
      case 'ovary':
        return OVARY.clone();
      case 'f1':
        return F1.clone();
      case 'liver':
        return LIVER.clone().add(v(1, -0.6, 0));
      case 'kidney':
        return KIDNEY.clone();
      case 'gut':
        return GUT.clone();
      case 'bone':
        return BONE.clone();
      case 'egg':
        return egg.visible ? egg.position.clone() : F1.clone();
      default:
        return tubes.find((x) => x.seg === site)!.curve.getPointAt(site === 'magnum' ? 0.55 : 0.5);
    }
  };
  const glowSize = (site: EggSiteId) =>
    site === 'magnum' ? 7 : site === 'uterus' ? 4.2 : site === 'infundibulum' || site === 'vagina' || site === 'isthmus' ? 3.6 : site === 'liver' ? 4 : site === 'egg' ? 3.3 : site === 'ovary' ? 4.2 : 2.4;

  // ---- camera shots -------------------------------------------------------------------
  const SHOTS: Record<Exclude<EggShotId, 'followToken' | 'followEgg'>, { target: THREE.Vector3; dir: THREE.Vector3; dist: number }> = {
    overview: { target: v(13, -5, 0), dir: v(0, 0.12, 1).normalize(), dist: 82 },
    brain: { target: v(-13.5, 12, 0), dir: v(0.1, 0.12, 1).normalize(), dist: 19 },
    ovary: { target: OVARY.clone().add(v(2, -0.6, 1)), dir: v(0.15, 0.25, 1).normalize(), dist: 17 },
    liver: { target: v(-3, 0, -1), dir: v(0.1, 0.25, 1).normalize(), dist: 24 },
    calcium: { target: v(12, -11, -1), dir: v(0, 0.1, 1).normalize(), dist: 58 },
    oviduct: { target: v(22, -14, 0), dir: v(0, 0.15, 1).normalize(), dist: 46 },
  };
  const VIEW_SHOT: Record<EggView, EggShotId> = { overview: 'overview', ovary: 'ovary', oviduct: 'oviduct', egg: 'followEgg' };
  let exploreShot: EggShotId = 'overview';
  let userOrbit = false;
  controls.addEventListener('start', () => {
    userOrbit = true;
  });

  // ---- tokens, glows, callout ---------------------------------------------------------
  interface Token {
    ball: THREE.Mesh;
    trail: THREE.InstancedMesh;
    mat: THREE.MeshBasicMaterial;
    badge: HTMLDivElement;
  }
  const tokenGeo = new THREE.SphereGeometry(0.55, 14, 10);
  const trailGeo = new THREE.SphereGeometry(0.24, 8, 6);
  disposables.push(tokenGeo, trailGeo);
  const tokenPool: Token[] = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
    disposables.push(m);
    const ball = new THREE.Mesh(tokenGeo, m);
    ball.visible = false;
    scene.add(ball);
    const trail = new THREE.InstancedMesh(trailGeo, m, 6);
    trail.frustumCulled = false;
    trail.visible = false;
    scene.add(trail);
    const badge = document.createElement('div');
    badge.className = 'em-token';
    badge.style.display = 'none';
    movieLayer.appendChild(badge);
    tokenPool.push({ ball, trail, mat: m, badge });
  }
  const setBadge = (el: HTMLDivElement, kind: keyof typeof EGG_TOKENS) => {
    if (el.dataset.kind === kind) return;
    const t = EGG_TOKENS[kind];
    el.dataset.kind = kind;
    el.style.setProperty('--c', t.color);
    el.classList.toggle('em-token-dark', !!t.dark);
    el.innerHTML = `<b>${t.short}</b><small>${t.name}</small>`;
  };
  const glowGeo = new THREE.SphereGeometry(1, 20, 14);
  disposables.push(glowGeo);
  const glows = Array.from({ length: 6 }, () => {
    const m = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.25, depthWrite: false });
    disposables.push(m);
    const g = new THREE.Mesh(glowGeo, m);
    g.visible = false;
    scene.add(g);
    return g;
  });
  const calloutEl = document.createElement('div');
  calloutEl.className = 'em-callout';
  calloutEl.style.display = 'none';
  movieLayer.appendChild(calloutEl);
  const magnifier = document.createElement('div');
  magnifier.className = 'em-magnifier';
  magnifier.style.display = 'none';
  container.appendChild(magnifier);

  // ---- state ---------------------------------------------------------------------------
  let hour = -8;
  let opts: EggLabOptions = { cut: true, fertile: true, brown: true, labels: true };
  let movie: EggMovieFrame | null = null;
  let movieKey = '';
  let lastCut: boolean | null = null;
  let tubeOpen = false;
  const tmp = new THREE.Vector3();
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const X = v(1, 0, 0);

  function eggSize(e: EggState) {
    const alb = { a: YOLK_R + (DENSE.a - YOLK_R) * e.albumen, b: YOLK_R + (DENSE.b - YOLK_R) * e.albumen };
    alb.a += (PLUMP.a - DENSE.a) * e.plumping;
    alb.b += (PLUMP.b - DENSE.b) * e.plumping;
    if (e.albumen === 0) {
      alb.a = YOLK_R + 0.06;
      alb.b = YOLK_R + 0.06;
    }
    const half = e.membranes > 0 ? Math.max(alb.a, MEMBRANE.a) : alb.a;
    const rad = e.membranes > 0 ? Math.max(alb.b, MEMBRANE.b) : alb.b;
    return { alb, half: half + 0.12 * e.shell, rad: rad + 0.12 * e.shell };
  }

  function applyState() {
    state = eggAt(hour);
    const e = state;
    // ovary: F1 until ovulation, then the empty follicle
    const ovulated = hour >= 0;
    f1.visible = !ovulated;
    stigma.visible = !ovulated;
    pof.visible = ovulated;
    stigmaMat.opacity = hour > -5 ? 0.5 + 0.5 * Math.min(1, (hour + 5) / 4.6) : 0.35;
    f1Label.el.textContent = ovulated ? 'Empty follicle (POF)' : 'Largest yolk (F1)';
    for (const s of smallFollicles) s.scale.setScalar(1);

    // egg position
    egg.visible = ovulated && e.segment !== 'laid';
    const size = eggSize(e);
    if (egg.visible) {
      const t = tubeAt(e.s);
      if (hour < 0.08) egg.position.lerpVectors(F1, t.point, hour / 0.08);
      else egg.position.copy(t.point);
      qa.setFromUnitVectors(X, t.tangent.clone().normalize());
      qb.setFromAxisAngle(v(0, 1, 0), Math.PI * e.turned);
      egg.quaternion.copy(qa).multiply(qb);
    } else if (e.segment === 'laid') {
      egg.visible = true;
      const k = Math.min(1, (hour - 24.5) / 0.15);
      egg.position.copy(CLOACA).add(v(0.5 + 3.5 * k, -1.4 * k, 0));
      egg.quaternion.setFromAxisAngle(v(0, 0, 1), Math.PI); // blunt end first
    }

    // layers
    vitMat.opacity = 0.3 * e.vitelline;
    albumen.visible = e.albumen > 0;
    albumen.scale.set(size.alb.a, size.alb.b, size.alb.b);
    albMat.opacity = 0.62 - 0.32 * e.plumping; // thick and cloudy, then clearer as water comes in
    membranes.visible = e.membranes > 0;
    membranes.scale.set(MEMBRANE.a, MEMBRANE.b, MEMBRANE.b);
    memMat.opacity = 0.55 * e.membranes;
    knobs.visible = e.membranes >= 0.95 && e.shell < 0.15;
    knobs.scale.setScalar(1 + 0.02 * e.shell);
    shell.visible = e.shell > 0;
    const sa = MEMBRANE.a + 0.03 + 0.12 * e.shell;
    const sb = MEMBRANE.b + 0.03 + 0.12 * e.shell;
    shell.scale.set(sa, sb, sb);
    shellMat.opacity = Math.min(1, 0.15 + 0.85 * e.shell);
    const solid = shellMat.opacity >= 0.999;
    if (solid === shellMat.transparent) {
      shellMat.transparent = !solid;
      shellMat.depthWrite = solid;
      shellMat.needsUpdate = true;
    }
    const white = new THREE.Color(0xfbf8f2);
    const brown = new THREE.Color(0xb07a4f);
    shellMat.color.copy(white).lerp(brown, opts.brown ? e.pigment : 0);
    shellMat.roughness = 0.9 - 0.45 * e.cuticle;
    buildChalazae(e.chalazae, Math.max(0, (size.alb.a - YOLK_R) * 0.75 * Math.min(1, e.chalazae * 2)));
    disc.visible = !opts.fertile || hour < 0.1;
    ring.visible = opts.fertile && hour >= 0.1;
    // the finished, laid egg is shown whole
    const cutEgg = opts.cut && e.segment !== 'laid';
    if (lastCut !== cutEgg) {
      lastCut = cutEgg;
      for (const m of eggMats) {
        m.clippingPlanes = cutEgg ? [cutPlane] : [];
        m.needsUpdate = true;
      }
    }

    // bulge the oviduct around the egg
    const eggArc = egg.visible && e.segment !== 'laid' && hour >= 0.08 ? tubeAt(e.s).arc : -1e9;
    for (const t of tubes) {
      const pos = t.geo.attributes.position as THREE.BufferAttribute;
      for (let r = 0; r < t.centres.length; r++) {
        const d = t.ringArc[r] - eggArc;
        let rad = t.ringBase[r];
        if (Math.abs(d) < size.half * 1.5) {
          const k = Math.abs(d) / size.half;
          const eggR = k < 1 ? size.rad * Math.sqrt(1 - k * k) : 0;
          const smooth = k < 1.5 ? (size.rad + 0.25) * Math.max(0, 1 - Math.max(0, k - 0.8) / 0.7) : 0;
          rad = Math.max(rad, eggR + 0.25, Math.min(smooth, size.rad + 0.25));
        }
        const c = t.centres[r];
        for (let j = 0; j <= RADIAL; j++) {
          const i = r * (RADIAL + 1) + j;
          pos.setXYZ(i, c.x + t.offsets[i * 3] * rad, c.y + t.offsets[i * 3 + 1] * rad, c.z + t.offsets[i * 3 + 2] * rad);
        }
      }
      pos.needsUpdate = true;
      t.geo.computeVertexNormals();
    }

    // the germinal disc, magnified
    const showMag = hour >= 0;
    magnifier.style.display = showMag ? '' : 'none';
    const magKey = `${opts.fertile}-${hour >= 0.1}`;
    if (showMag && magnifier.dataset.key !== magKey) {
      magnifier.dataset.key = magKey;
      const fertile = opts.fertile && hour >= 0.1;
      magnifier.innerHTML = `<small>Germinal disc · magnified</small><span class="em-mag-art">${discSvg(fertile)}</span><b>${
        fertile ? 'Fertile: blastoderm (ring)' : hour < 0.1 && opts.fertile ? 'Not yet fertilised' : 'Infertile: blastodisc (spot)'
      }</b>`;
    }
  }

  // ---- render loop ------------------------------------------------------------------
  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const shotPose = (shot: EggShotId, lead: THREE.Vector3 | null) => {
    const widen = Math.max(1, 1.6 / Math.max(camera.aspect, 0.3));
    if (shot === 'followToken' && lead) {
      const len = movie?.tokens[0] ? ROUTES[movie.tokens[0].route].getLength() : 20;
      const dir = v(0.12, 0.25, 1).normalize();
      return { target: lead.clone(), pos: lead.clone().addScaledVector(dir, (len > 30 ? 30 : len > 12 ? 22 : 15) * widen), k: 4 };
    }
    if (shot === 'followEgg') {
      const t = egg.visible ? egg.position.clone() : F1.clone();
      const dir = v(0.08, 0.3, 1).normalize();
      return { target: t, pos: t.clone().addScaledVector(dir, 11 * widen), k: 3 };
    }
    const p = SHOTS[shot === 'followToken' ? 'overview' : shot];
    return { target: p.target.clone(), pos: p.target.clone().addScaledVector(p.dir, p.dist * widen), k: 2.4 };
  };
  {
    const p = shotPose('overview', null);
    camera.position.copy(p.pos);
    controls.target.copy(p.target);
    controls.update();
  }
  const project = (p: THREE.Vector3, w: number, h: number) => {
    tmp.copy(p).project(camera);
    return tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1 ? { x: ((tmp.x + 1) / 2) * w, y: ((1 - tmp.y) / 2) * h } : null;
  };

  let raf = 0;
  let lastNow = performance.now();
  const m4 = new THREE.Matrix4();
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - lastNow) / 1000);
    lastNow = now;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const boxes: Array<[number, number, number, number]> = [];

    // tokens
    let lead: THREE.Vector3 | null = null;
    tokenPool.forEach((tk, i) => {
      const t = movie?.tokens[i];
      if (!t) {
        tk.ball.visible = false;
        tk.trail.visible = false;
        tk.badge.style.display = 'none';
        return;
      }
      const curve = ROUTES[t.route];
      const p = curve.getPointAt(t.u);
      if (t.lead) lead = p.clone();
      tk.mat.color.set(EGG_TOKENS[t.kind].color);
      const pulse = movie!.phase === 'release' ? 1 + 0.12 * Math.sin(now / 160) : 1;
      tk.ball.visible = !t.lead;
      tk.ball.position.copy(p);
      tk.ball.scale.setScalar(t.scale * pulse);
      const moving = t.u > 0 && t.u < 1;
      tk.trail.visible = moving;
      if (moving) {
        for (let j = 0; j < 6; j++) {
          curve.getPointAt(Math.max(0, t.u - 0.018 * (j + 1)), tmp);
          const sc = 1 - j * 0.14;
          m4.makeScale(sc, sc, sc).setPosition(tmp);
          tk.trail.setMatrixAt(j, m4);
        }
        tk.trail.instanceMatrix.needsUpdate = true;
      }
      if (t.lead) {
        setBadge(tk.badge, t.kind);
        const sp = project(p, w, h);
        if (sp) {
          tk.badge.style.display = '';
          tk.badge.style.transform = `translate(-50%, -50%) translate(${sp.x}px, ${sp.y}px) scale(${(t.scale * pulse).toFixed(3)})`;
          boxes.push([sp.x, sp.y, 34, 34]);
        } else tk.badge.style.display = 'none';
      } else tk.badge.style.display = 'none';
    });

    // glows (not in egg close-ups, where they would fog the egg)
    glows.forEach((g, i) => {
      const site = movie && movie.shot !== 'followEgg' ? movie.glow[i] : undefined;
      g.visible = !!site;
      if (!site) return;
      g.position.copy(siteSpot(site));
      g.scale.setScalar(glowSize(site) * (1 + 0.12 * Math.sin(now / 220)));
      (g.material as THREE.MeshBasicMaterial).opacity = 0.16 + 0.07 * Math.sin(now / 220);
    });

    // camera
    const shot: EggShotId = movie ? movie.shot : exploreShot;
    if (!userOrbit) {
      const pose = shotPose(shot, lead);
      const k = 1 - Math.exp(-dt * pose.k);
      camera.position.lerp(pose.pos, k);
      controls.target.lerp(pose.target, k);
    }
    controls.update();

    // cut the egg on the side facing the camera; in close-ups the oviduct is opened the same way
    const n = egg.position.clone().sub(camera.position).normalize();
    cutPlane.set(n, -n.dot(egg.position));
    const openTube = opts.cut && egg.visible && state.segment !== 'laid' && camera.position.distanceTo(egg.position) < 26;
    if (openTube !== tubeOpen) {
      tubeOpen = openTube;
      for (const m of tubeMats) {
        m.clippingPlanes = openTube ? [cutPlane] : [];
        m.opacity = openTube ? 0.75 : 0.42;
        m.needsUpdate = true;
      }
    }

    renderer.render(scene, camera);

    // callout
    if (movie?.callout) {
      calloutEl.textContent = movie.callout.text;
      const sp = project(siteSpot(movie.callout.site), w, h);
      if (sp) {
        calloutEl.style.display = '';
        const hw = calloutEl.offsetWidth / 2 + 4;
        const x = Math.min(w - hw, Math.max(hw, sp.x));
        const y = Math.min(h - 20, Math.max(20, sp.y - (movie.callout.site === 'egg' ? 70 : 46)));
        calloutEl.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        boxes.push([x, y, hw, 16]);
      } else calloutEl.style.display = 'none';
    } else calloutEl.style.display = 'none';

    // labels
    if (opts.labels) {
      const camDist = camera.position.distanceTo(controls.target);
      const placed = [...boxes];
      for (let li = labels.length - 1; li >= 0; li--) {
        const l = labels[li];
        const p = l.pos();
        const tooFar = l.closeOnly && (camDist > 20 || !lastCut); // layer names only on the cut egg
        const behind = !!p && camDist < 30 && p.distanceTo(camera.position) > camDist * 1.6;
        const sp = p && !tooFar && !behind ? project(p, w, h) : null;
        if (!sp) {
          l.el.style.display = 'none';
          continue;
        }
        l.el.style.display = '';
        const hw = l.el.offsetWidth / 2 + 3;
        const hh = l.el.offsetHeight / 2 + 2;
        const sx = Math.min(w - hw, Math.max(hw, sp.x));
        const sy = Math.min(h - hh, Math.max(hh, sp.y));
        if (placed.some(([x, y, pw, ph]) => Math.abs(x - sx) < pw + hw && Math.abs(y - sy) < ph + hh)) {
          l.el.style.display = 'none';
          continue;
        }
        placed.push([sx, sy, hw, hh]);
        l.el.style.transform = `translate(-50%, -50%) translate(${sx}px, ${sy}px)`;
      }
    }
  };
  applyState();
  raf = requestAnimationFrame(loop);

  return {
    setHour(h) {
      if (h === hour) return;
      hour = h;
      applyState();
    },
    setOptions(o) {
      opts = o;
      labelLayer.style.display = o.labels ? '' : 'none';
      magnifier.dataset.key = '';
      applyState();
    },
    setView(view) {
      exploreShot = VIEW_SHOT[view];
      userOrbit = false;
    },
    setMovieFrame(frame, key = '') {
      if (frame && (key !== movieKey || frame.shot !== movie?.shot)) userOrbit = false;
      if (!frame && movie) userOrbit = false;
      movieKey = key;
      movie = frame;
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      for (const c of chalazae) c.geometry.dispose();
      for (const t of tokenPool) t.trail.dispose();
      knobs.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      labelLayer.remove();
      movieLayer.remove();
      magnifier.remove();
    },
  };
}

/** Germinal disc as seen on the yolk: infertile spot vs fertile "bull's-eye". */
function discSvg(fertile: boolean): string {
  const yolk = '<circle cx="60" cy="50" r="46" fill="#f2b705"/>';
  if (!fertile)
    return `<svg viewBox="0 0 120 100" aria-hidden="true">${yolk}<path d="M52 44 C 58 38, 68 42, 66 50 C 70 56, 60 60, 54 56 C 48 54, 47 47, 52 44 Z" fill="#fffdf5"/></svg>`;
  return `<svg viewBox="0 0 120 100" aria-hidden="true">${yolk}<circle cx="60" cy="50" r="17" fill="#fffdf5"/><circle cx="60" cy="50" r="9" fill="#f6e7b8"/></svg>`;
}
