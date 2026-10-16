// 3D estrous cycle scene (plain three.js): the cow's reproductive tract
// (same measurements as the AI lab), a schematic brain with the hypothalamus
// and anterior pituitary, hormones drawn as coloured particles flowing along
// the routes they travel, a live right ovary (follicle waves, ovulation, the
// corpus luteum) and — in pregnancy — the embryo's journey down the oviduct
// into the uterine horn. Everything is driven by lib/estrous/cycle.ts.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RADIUS, X, centreY, hornPath } from '@/lib/ai-lab/anatomy';
import {
  OVULATION_DAY,
  corpusLuteum,
  dominantFollicle,
  embryo,
  hormoneLevel,
  type Hormone,
  type Outcome,
} from '@/lib/estrous/cycle';
import { HORMONE_COLORS } from '@/lib/estrous/colors';
import { embryoSvg, embryoStageName } from './embryo-svg';
import { TOKEN_NAMES, type MovieFrame, type RouteId, type ShotId, type SiteId, type TokenKind } from '@/lib/estrous/movie';

export type EstrousView = 'overview' | 'ovary' | 'oviduct' | 'uterus';

export interface EstrousScene {
  setState(day: number, outcome: Outcome): void;
  setView(view: EstrousView): void;
  setLabelsVisible(on: boolean): void;
  /** Guided movie: draw this frame (null = back to free exploring). `key` changes per scene. */
  setMovieFrame(frame: MovieFrame | null, key?: string): void;
  dispose(): void;
}


const TOKEN_COLORS: Record<TokenKind, string> = { ...HORMONE_COLORS, sperm: '#5b6472' } as Record<TokenKind, string>;
/** Dark text on the lighter hormone colours, white on the darker ones. */
const DARK_TEXT = new Set<TokenKind>(['fsh', 'lh', 'pgf2a', 'progesterone']);

const OVARY_SCALE = 1.7; // ovaries drawn larger than life so follicles and the CL are visible
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function createEstrousScene(container: HTMLElement): EstrousScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xf2f4ee);
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  const labelLayer = document.createElement('div');
  labelLayer.className = 'lab-labels';
  container.appendChild(labelLayer);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 800);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a99a, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(30, 70, 80);
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

  // ---- the reproductive tract ---------------------------------------------
  const tractMat = mat(0xd98c8c, { transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  const cervixMat = mat(0xb35c6b);
  const uterusMat = mat(0xe39aa4, { transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
  const line = (x0: number, x1: number) => new THREE.CatmullRomCurve3(Array.from({ length: 12 }, (_, i) => v(x0 + ((x1 - x0) * i) / 11, centreY(x0 + ((x1 - x0) * i) / 11), 0)));
  add(new THREE.TubeGeometry(line(0, X.cervixStart), 40, RADIUS.vagina, 24, false), tractMat);
  add(new THREE.TubeGeometry(line(X.cervixStart, X.cervixEnd), 20, RADIUS.cervixOuter, 20, false), cervixMat);
  add(new THREE.TubeGeometry(line(X.cervixEnd - 0.2, X.uterineBodyEnd + 0.6), 10, RADIUS.uterineBody + 0.3, 20, false), uterusMat);

  const horns: Record<1 | -1, THREE.CatmullRomCurve3> = {} as Record<1 | -1, THREE.CatmullRomCurve3>;
  const oviducts: Record<1 | -1, THREE.CatmullRomCurve3> = {} as Record<1 | -1, THREE.CatmullRomCurve3>;
  const ovaryPos: Record<1 | -1, THREE.Vector3> = { 1: v(52, -2.8, 9.4), [-1]: v(52, -2.8, -9.4) } as Record<1 | -1, THREE.Vector3>;
  for (const side of [1, -1] as const) {
    const curve = new THREE.CatmullRomCurve3(hornPath(side).map(([x, y, z]) => v(x, y, z)));
    horns[side] = curve;
    const tube = new THREE.TubeGeometry(curve, 80, 1, 18, false);
    // taper the horn towards its tip
    const pos = tube.attributes.position as THREE.BufferAttribute;
    const centre = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / 19);
      const t = ring / 80;
      curve.getPointAt(t, centre);
      const p = v(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(centre).multiplyScalar(2.2 - 1.3 * t).add(centre);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    tube.computeVertexNormals();
    add(tube, uterusMat);
    const tip = curve.getPointAt(1);
    const o = ovaryPos[side];
    oviducts[side] = new THREE.CatmullRomCurve3([
      o.clone().add(v(-1.4, 2.2, -1.2 * side)), // infundibulum, cupping the ovary
      v(tip.x + 2.6, tip.y + 4.6, tip.z + 3.2 * side),
      v(tip.x + 0.4, tip.y + 3.4, tip.z + 1.6 * side),
      v(tip.x - 0.4, tip.y + 1.4, tip.z + 0.4 * side),
      tip.clone(),
    ]);
    add(new THREE.TubeGeometry(oviducts[side], 50, 0.3, 8, false), mat(0xe39aa4));
    const ov = new THREE.SphereGeometry(1, 28, 18).scale(1.9 * OVARY_SCALE, 1.25 * OVARY_SCALE, 1.25 * OVARY_SCALE);
    ov.translate(o.x, o.y, o.z);
    add(ov, mat(0xf0d2b8));
  }

  // ---- brain (schematic: placed above the tract, not anatomically) --------
  const HYPO = v(18, 22, 0);
  const PITU = v(18, 17.6, 0);
  add(new THREE.SphereGeometry(1, 28, 18).scale(12, 6.5, 8).translate(18, 27, 0), mat(0xe9d6dc, { transparent: true, opacity: 0.45, depthWrite: false }));
  add(new THREE.SphereGeometry(1.5, 20, 14).translate(HYPO.x, HYPO.y, HYPO.z), mat(0x6250d6));
  add(new THREE.CylinderGeometry(0.45, 0.45, 2.6, 10).translate(18, 19.6, 0), mat(0xb7a9d9));
  add(new THREE.SphereGeometry(1.6, 20, 14).translate(PITU.x, PITU.y, PITU.z), mat(0x1baf7a));

  // ---- the right ovary's follicles and corpus luteum ---------------------
  // (Cows ovulate more often from the right ovary; this model uses the right.)
  const R = ovaryPos[1];
  const follicleMat = mat(0xfff3c4, { transparent: true, opacity: 0.85, roughness: 0.2 });
  const follicle = add(new THREE.SphereGeometry(1, 24, 16), follicleMat);
  const follicleDir = v(0.35, 0.55, 0.75).normalize();
  const clMat = mat(0xe8a33c);
  const cl = add(new THREE.SphereGeometry(1, 24, 16), clMat);
  const clDir = v(-0.2, -0.3, 0.93).normalize();
  const smallFollicles: THREE.Mesh[] = [];
  for (const [dx, dy, dz, side] of [
    [1.6, 1.2, 1.5, 1], [-1.8, 0.9, 1.6, 1], [0.8, -1.5, 1.5, 1],
    [1.4, 1.1, -1.6, -1], [-1.6, 0.8, -1.7, -1], [0.4, -1.4, -1.7, -1],
  ] as const) {
    const sf = add(new THREE.SphereGeometry(0.42, 12, 8), follicleMat);
    sf.position.set(ovaryPos[side].x + dx * 1.2, ovaryPos[side].y + dy, ovaryPos[side].z + dz);
    smallFollicles.push(sf);
  }

  // ---- embryo, its elongated form, and the placentomes --------------------
  const embryoMat = mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.25 });
  const embryoMesh = add(new THREE.SphereGeometry(0.55, 16, 12), embryoMat);
  const filamentMat = mat(0xf6f0e6, { transparent: true, opacity: 0.9 });
  let filament: THREE.Mesh | null = null;
  const placentomes = new THREE.Group();
  scene.add(placentomes);
  {
    const pm = mat(0xa8485c);
    const hornR = horns[1];
    for (let i = 0; i < 9; i++) {
      const t = 0.12 + i * 0.09;
      const p = hornR.getPointAt(t);
      const n = v(0, 1, 0.4).normalize().multiplyScalar(2.2 - 1.3 * t);
      add(new THREE.SphereGeometry(0.5, 10, 8).scale(1, 0.6, 1).translate(p.x + n.x, p.y + n.y, p.z + n.z), pm, placentomes);
    }
  }
  const egg = add(new THREE.SphereGeometry(0.4, 12, 8), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.3 }));

  // ---- hormone particles ---------------------------------------------------
  const route = (pts: THREE.Vector3[]) => new THREE.CatmullRomCurve3(pts);
  const toOvary = (side: 1 | -1) => route([PITU.clone().add(v(0, -1.6, 0)), v(28, 13, 3 * side), v(42, 6, 7 * side), ovaryPos[side].clone().add(v(-0.5, 1.8, 0))]);
  const fromOvaryToBrain = route([R.clone().add(v(0.5, 2, 0)), v(44, 9, 10), v(30, 16, 6), HYPO.clone().add(v(1.4, 0, 0.6))]);
  const hornMid = horns[1].getPointAt(0.35);
  const pgfRoute = route([hornMid.clone().add(v(0, 1.5, 1)), v(hornMid.x - 1, hornMid.y + 3.5, (hornMid.z + R.z) / 2 + 1), R.clone().add(v(-1, 1.2, 0))]);
  const p4ToUterus = route([R.clone().add(v(-1.2, 0.5, -1)), v(hornMid.x + 1, hornMid.y + 2.5, hornMid.z + 2), hornMid.clone().add(v(0, 1.5, 0))]);
  const ifnRoute = route([horns[1].getPointAt(0.15), horns[1].getPointAt(0.35), horns[1].getPointAt(0.55), horns[1].getPointAt(0.75)]);

  interface Flow {
    hormone: Hormone | 'gnrh';
    curves: THREE.CatmullRomCurve3[];
    mesh: THREE.InstancedMesh;
    count: number;
    speed: number;
    level: number;
  }
  const flows: Flow[] = [];
  const particleGeo = new THREE.SphereGeometry(0.42, 8, 6);
  disposables.push(particleGeo);
  const makeFlow = (hormone: Flow['hormone'], curves: THREE.CatmullRomCurve3[], count: number, speed: number) => {
    const m = new THREE.MeshBasicMaterial({ color: HORMONE_COLORS[hormone] });
    disposables.push(m);
    const mesh = new THREE.InstancedMesh(particleGeo, m, count);
    mesh.frustumCulled = false;
    scene.add(mesh);
    flows.push({ hormone, curves, mesh, count, speed, level: 0 });
  };
  makeFlow('gnrh', [route([HYPO.clone().add(v(0, -1.2, 0)), v(18.6, 19.6, 0.6), PITU.clone().add(v(0, 1.2, 0))])], 10, 0.5);
  makeFlow('fsh', [toOvary(1), toOvary(-1)], 36, 0.16);
  makeFlow('lh', [toOvary(1), toOvary(-1)], 36, 0.16);
  makeFlow('estradiol', [fromOvaryToBrain], 30, 0.14);
  makeFlow('progesterone', [fromOvaryToBrain, p4ToUterus], 34, 0.13);
  makeFlow('pgf2a', [pgfRoute], 20, 0.35);
  makeFlow('ifnTau', [ifnRoute], 24, 0.25);

  // ---- labels -------------------------------------------------------------
  type Label = { el: HTMLElement; pos: () => THREE.Vector3 | null };
  const labels: Label[] = [];
  const addLabel = (text: string | (() => string), pos: () => THREE.Vector3 | null, cls = '') => {
    const el = document.createElement('span');
    el.className = `lab-label ${cls}`;
    el.textContent = typeof text === 'string' ? text : text();
    labelLayer.appendChild(el);
    const l = { el, pos, text };
    labels.push(l);
    return l;
  };
  let day = 0;
  let outcome: Outcome = 'notPregnant';
  addLabel('Brain (schematic)', () => v(-1, 28, 0));
  addLabel('Hypothalamus', () => v(11.5, 22.6, 0));
  addLabel('Anterior pituitary', () => v(10.5, 17, 0));
  addLabel('Right ovary', () => R.clone().add(v(3, -4.4, 1)));
  addLabel('Left ovary', () => ovaryPos[-1].clone().add(v(3, -4.4, -1)));
  addLabel('Oviduct', () => oviducts[1].getPointAt(0.35).add(v(0, 2, 1.5)));
  addLabel('Uterine horn', () => horns[1].getPointAt(0.5).add(v(0, -4, 2)));
  addLabel('Cervix', () => v(36, -5.5, 0));
  addLabel('Vagina', () => v(14, -6.5, 0));
  const follicleLabel = addLabel('Follicle', () => (follicle.visible ? follicle.position.clone().add(v(0, follicle.scale.y + 1.2, 0)) : null), 'lab-label-accent');
  const clLabel = addLabel('Corpus luteum', () => (cl.visible ? cl.position.clone().add(v(0, -cl.scale.y - 1.2, 0)) : null), 'lab-label-cl');
  addLabel('Embryo', () => (embryoMesh.visible ? embryoMesh.position.clone().add(v(0, 1.6, 0)) : null), 'lab-label-embryo');

  // magnified embryo (it is microscopic in real life) — top-right of the stage
  const magnifier = document.createElement('div');
  magnifier.className = 'em-magnifier';
  magnifier.style.display = 'none';
  container.appendChild(magnifier);
  let magKey = '';

  // ---- views ----------------------------------------------------------------
  const VIEWS: Record<EstrousView, { target: THREE.Vector3; dir: THREE.Vector3; dist: number }> = {
    overview: { target: v(32, 9, 0), dir: v(-0.08, 0.2, 1).normalize(), dist: 76 },
    ovary: { target: R.clone(), dir: v(0.15, 0.35, 1).normalize(), dist: 22 },
    oviduct: { target: v(52, -1, 8), dir: v(0.35, 0.55, 1).normalize(), dist: 22 },
    uterus: { target: v(51, -4, 0), dir: v(0.3, 1, 0.45).normalize(), dist: 40 },
  };
  let flight: { fromPos: THREE.Vector3; fromTarget: THREE.Vector3; toPos: THREE.Vector3; toTarget: THREE.Vector3; start: number } | null = null;
  const viewPose = (name: EstrousView) => {
    const p = VIEWS[name];
    const widen = Math.max(1, 1.6 / Math.max(camera.aspect, 0.3));
    return { pos: p.target.clone().addScaledVector(p.dir, p.dist * widen), target: p.target.clone() };
  };

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
  {
    const s = viewPose('overview');
    camera.position.copy(s.pos);
    controls.target.copy(s.target);
    controls.update();
  }

  // ---- apply the model for the current day --------------------------------
  const MM = OVARY_SCALE / 10 / 2; // follicle diameter (mm) → radius in scene units
  function apply() {
    // hormone levels (GnRH follows the LH pattern: basal pulses plus the surge)
    for (const f of flows) f.level = f.hormone === 'gnrh' ? Math.min(1, 0.25 + hormoneLevel('lh', day, outcome)) : hormoneLevel(f.hormone, day, outcome);

    const cycleD = outcome === 'notPregnant' ? day % 21 : day;
    const fol = dominantFollicle(day, outcome);
    const justOvulated = Math.abs(cycleD - OVULATION_DAY) < 0.12;
    follicle.visible = !justOvulated && fol.sizeMm > 4;
    const fr = fol.sizeMm * MM;
    follicle.scale.setScalar(fr);
    follicle.position.copy(R).addScaledVector(follicleDir, 1.25 * OVARY_SCALE * 0.95 + fr * 0.45);
    follicleMat.color.set(fol.ovulatory ? 0xfff0b0 : 0xfff6dc);
    follicleLabel.el.textContent = fol.ovulatory ? `Ovulatory follicle · ${Math.round(fol.sizeMm)} mm` : `Dominant follicle · ${Math.round(fol.sizeMm)} mm`;

    const c = corpusLuteum(day, outcome);
    cl.visible = c.state !== 'none';
    const cr = Math.max(0.4, c.sizeMm * MM);
    cl.scale.setScalar(cr);
    cl.position.copy(R).addScaledVector(clDir, 1.25 * OVARY_SCALE * 0.9 + cr * 0.4);
    clMat.color.set({ none: 0xe8a33c, haemorrhagicum: 0x9e2a2a, luteum: 0xe8a33c, regressing: 0xead48f, albicans: 0xf2efe6 }[c.state]);
    clLabel.el.textContent = {
      none: '',
      haemorrhagicum: 'Corpus haemorrhagicum',
      luteum: `Corpus luteum · ${Math.round(c.sizeMm)} mm`,
      regressing: 'CL regressing',
      albicans: 'Corpus albicans',
    }[c.state];

    for (const s of smallFollicles) s.scale.setScalar(0.8 + 0.6 * hormoneLevel('fsh', day, outcome));

    // the egg leaving the ovary at ovulation (both outcomes), then the embryo (pregnant)
    const e = embryo(day);
    egg.visible = outcome === 'notPregnant' && cycleD >= OVULATION_DAY - 0.05 && cycleD < OVULATION_DAY + 1;
    if (egg.visible) egg.position.copy(oviducts[1].getPointAt(Math.min(0.3, (cycleD - OVULATION_DAY + 0.05) * 0.5)));

    const pregnant = outcome === 'pregnant';
    embryoMesh.visible = pregnant && e.stage !== 'none' && e.stage !== 'elongating' && e.stage !== 'attaching' && e.stage !== 'placentomes forming';
    if (embryoMesh.visible) {
      const p = e.site === 'oviduct' ? oviducts[1].getPointAt(Math.min(1, e.progress)) : horns[1].getPointAt(1 - Math.min(1, e.progress));
      embryoMesh.position.copy(p);
      embryoMesh.scale.setScalar(e.stage === 'blastocyst' || e.stage === 'hatched blastocyst' ? 1.25 : 1);
    }
    const tiny = pregnant && ['oocyte', 'zygote', '2-cell', '4-8 cell', 'morula', 'blastocyst', 'hatched blastocyst'].includes(e.stage);
    magnifier.style.display = tiny ? '' : 'none';
    const key = `${e.stage}-${e.cells}`;
    if (tiny && key !== magKey) {
      magKey = key;
      magnifier.innerHTML = `<small>Magnified ×100</small><span class="em-mag-art">${embryoSvg(e)}</span><b>${embryoStageName(e)}</b>`;
    }
    const elongated = pregnant && (e.stage === 'elongating' || e.stage === 'attaching' || e.stage === 'placentomes forming');
    if (filament) {
      scene.remove(filament);
      filament.geometry.dispose();
      filament = null;
    }
    if (elongated) {
      const length = Math.min(0.85, 0.15 + (day - 13) * 0.11);
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 20; i++) pts.push(horns[1].getPointAt(0.95 - (length * i) / 20));
      filament = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, e.stage === 'elongating' ? 0.35 : 0.6, 10, false), filamentMat);
      scene.add(filament);
    }
    placentomes.visible = pregnant && e.stage === 'placentomes forming';
    placentomes.scale.setScalar(1);

    // uterine tone/colour livens up under oestradiol
    const e2 = hormoneLevel('estradiol', day, outcome);
    uterusMat.emissive.set(0xff5577);
    uterusMat.emissiveIntensity = 0.25 * e2;
  }

  // ---- guided movie: routes, sites, camera shots, tokens --------------------
  const follicleSpot = () => R.clone().addScaledVector(follicleDir, 3.4);
  const clSpot = () => R.clone().addScaledVector(clDir, 3.6);
  const cervixSpot = v(39, centreY(39), 0);
  const ROUTES: Record<RouteId, THREE.CatmullRomCurve3> = {
    hypoToPitu: route([HYPO.clone().add(v(0, -1.2, 0)), v(18.5, 19.8, 0.5), v(18.2, 19.2, 0.3), PITU.clone().add(v(0, 1.1, 0))]),
    pituToOvary: toOvary(1),
    follicleToBrain: route([follicleSpot(), v(46, 7, 12), v(32, 16, 7), HYPO.clone().add(v(1.4, 0, 0.8))]),
    follicleToTract: route([follicleSpot(), v(47, 5, 9), v(42, 3.5, 3), cervixSpot.clone().add(v(0, 1.4, 0.6))]),
    clToUterus: route([clSpot(), v(hornMid.x + 1, hornMid.y + 2.5, hornMid.z + 3), hornMid.clone().add(v(0, 1.6, 0.4))]),
    clToBrain: route([clSpot(), v(46, 7, 13), v(32, 16, 7), HYPO.clone().add(v(1.4, 0, 0.8))]),
    uterusToCl: route([hornMid.clone().add(v(0, 1.5, 1)), v(hornMid.x - 1, hornMid.y + 3.5, (hornMid.z + R.z) / 2 + 1), clSpot()]),
    embryoToUterus: route([horns[1].getPointAt(0.62), horns[1].getPointAt(0.5).add(v(0, 1.2, 0.8)), horns[1].getPointAt(0.36).add(v(0, 2, 1))]),
    spermToAmpulla: route([
      ...[0.25, 0.45, 0.65, 0.85, 1].map((t) => horns[1].getPointAt(t)),
      ...[0.85, 0.65, 0.45, 0.3].map((t) => oviducts[1].getPointAt(t)),
    ]),
  };
  const siteSpot = (site: SiteId): THREE.Vector3 => {
    switch (site) {
      case 'hypothalamus':
        return HYPO.clone();
      case 'pituitary':
        return PITU.clone();
      case 'follicle':
        return follicle.visible ? follicle.position.clone() : follicleSpot();
      case 'ovary':
        return R.clone();
      case 'cl':
        return cl.visible ? cl.position.clone() : clSpot();
      case 'uterus':
        return hornMid.clone();
      case 'cervix':
        return cervixSpot.clone();
      case 'oviduct':
        return oviducts[1].getPointAt(0.3);
      case 'embryo':
        if (embryoMesh.visible) return embryoMesh.position.clone();
        if (filament) return horns[1].getPointAt(0.6);
        return egg.visible ? egg.position.clone() : oviducts[1].getPointAt(0.3);
    }
  };
  const SHOTS: Record<Exclude<ShotId, 'followToken' | 'followEmbryo'>, { target: THREE.Vector3; dir: THREE.Vector3; dist: number }> = {
    ...VIEWS,
    brain: { target: v(15, 20, 0), dir: v(0.12, 0.15, 1).normalize(), dist: 27 },
    tract: { target: v(36, -1, 0), dir: v(0.05, 0.35, 1).normalize(), dist: 32 },
  };

  // movie tokens: lead token = named circle (HTML); other pulses = coloured balls; each with a short trail
  const movieLayer = document.createElement('div');
  movieLayer.className = 'em-layer';
  container.appendChild(movieLayer);
  interface Token {
    ball: THREE.Mesh;
    trail: THREE.InstancedMesh;
    mat: THREE.MeshBasicMaterial;
    badge: HTMLDivElement;
  }
  const tokenGeo = new THREE.SphereGeometry(0.75, 16, 12);
  const trailGeo = new THREE.SphereGeometry(0.32, 8, 6);
  disposables.push(tokenGeo, trailGeo);
  const tokenPool: Token[] = [];
  for (let i = 0; i < 8; i++) {
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
  const glowGeo = new THREE.SphereGeometry(1, 20, 14);
  disposables.push(glowGeo);
  const glows = Array.from({ length: 3 }, () => {
    const m = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.35, depthWrite: false });
    disposables.push(m);
    const g = new THREE.Mesh(glowGeo, m);
    g.visible = false;
    scene.add(g);
    return g;
  });
  const blockedEl = document.createElement('div');
  blockedEl.className = 'em-blocked';
  movieLayer.appendChild(blockedEl);
  const calloutEl = document.createElement('div');
  calloutEl.className = 'em-callout';
  movieLayer.appendChild(calloutEl);
  // explore mode: a name circle rides on one particle of each strong hormone flow
  const flowBadges = flows.map((f) => {
    const b = document.createElement('div');
    b.className = 'em-token em-token-sm';
    b.style.display = 'none';
    setBadge(b, f.hormone);
    labelLayer.appendChild(b);
    return b;
  });
  function setBadge(el: HTMLDivElement, kind: TokenKind) {
    if (el.dataset.kind === kind) return;
    el.dataset.kind = kind;
    el.style.setProperty('--c', TOKEN_COLORS[kind]);
    el.classList.toggle('em-token-dark', DARK_TEXT.has(kind));
    el.innerHTML = `<b>${TOKEN_NAMES[kind].short}</b><small>${TOKEN_NAMES[kind].name}</small>`;
  }

  let movie: MovieFrame | null = null;
  let movieKey = '';
  let userOrbit = false;
  controls.addEventListener('start', () => {
    if (movie) userOrbit = true;
  });
  const shotPose = (shot: ShotId, lead: THREE.Vector3 | null) => {
    const widen = Math.max(1, 1.6 / Math.max(camera.aspect, 0.3));
    if (shot === 'followToken' && lead) {
      const dir = v(0.15, 0.3, 1).normalize();
      // long journeys are filmed from further back so the start and the end stay in view
      const len = movie?.tokens[0] ? ROUTES[movie.tokens[0].route].getLength() : 20;
      return { target: lead.clone(), pos: lead.clone().addScaledVector(dir, (len > 30 ? 36 : len > 15 ? 26 : 20) * widen), k: 4 };
    }
    if (shot === 'followEmbryo') {
      const t = siteSpot('embryo');
      const dir = v(0.25, 1, 0.5).normalize(); // from above, so the ovary and CL do not block the view
      return { target: t, pos: t.clone().addScaledVector(dir, (filament ? 30 : 20) * widen), k: 3 };
    }
    const p = SHOTS[shot === 'followToken' ? 'overview' : shot];
    return { target: p.target.clone(), pos: p.target.clone().addScaledVector(p.dir, p.dist * widen), k: 2.4 };
  };
  const project = (p: THREE.Vector3, w: number, h: number) => {
    tmp.copy(p).project(camera);
    return tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1 ? { x: ((tmp.x + 1) / 2) * w, y: ((1 - tmp.y) / 2) * h } : null;
  };
  const leadPos = new THREE.Vector3();
  let lastNow = performance.now();
  /** Draws the movie layer; returns screen boxes so plain labels can avoid them. */
  function drawMovie(now: number): Array<[number, number, number, number]> {
    const boxes: Array<[number, number, number, number]> = [];
    const w = container.clientWidth;
    const h = container.clientHeight;
    const dt = Math.min(0.1, (now - lastNow) / 1000);
    lastNow = now;
    if (!movie) {
      for (const tk of tokenPool) {
        tk.ball.visible = false;
        tk.trail.visible = false;
        tk.badge.style.display = 'none';
      }
      for (const g of glows) g.visible = false;
      blockedEl.style.display = 'none';
      calloutEl.style.display = 'none';
      return boxes;
    }
    let lead: THREE.Vector3 | null = null;
    tokenPool.forEach((tk, i) => {
      const t = movie!.tokens[i];
      if (!t) {
        tk.ball.visible = false;
        tk.trail.visible = false;
        tk.badge.style.display = 'none';
        return;
      }
      const curve = ROUTES[t.route];
      curve.getPointAt(t.u, tmp);
      const p = tmp.clone();
      if (t.lead) {
        lead = p.clone();
        leadPos.copy(p);
      }
      tk.mat.color.set(TOKEN_COLORS[t.kind]);
      const pulse = movie!.phase === 'release' ? 1 + 0.12 * Math.sin(now / 160) : 1;
      tk.ball.visible = !t.lead;
      tk.ball.position.copy(p);
      tk.ball.scale.setScalar(t.scale * pulse * (t.kind === 'sperm' ? 0.45 : 1));
      // trail behind a moving token
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

    glows.forEach((g, i) => {
      const site = movie!.glow[i];
      g.visible = !!site;
      if (!site) return;
      g.position.copy(siteSpot(site));
      const base = site === 'ovary' || site === 'uterus' ? 3.8 : site === 'hypothalamus' || site === 'pituitary' ? 2.6 : 3;
      g.scale.setScalar(base * (1 + 0.15 * Math.sin(now / 220)));
      (g.material as THREE.MeshBasicMaterial).opacity = 0.2 + 0.08 * Math.sin(now / 220);
    });

    const pin = (el: HTMLDivElement, info: { site: SiteId; text: string } | undefined, dy: number) => {
      if (!info) {
        el.style.display = 'none';
        return;
      }
      el.textContent = info.text;
      const sp = project(siteSpot(info.site), w, h);
      if (!sp) {
        el.style.display = 'none';
        return;
      }
      el.style.display = '';
      const hw = el.offsetWidth / 2 + 4;
      const x = Math.min(w - hw, Math.max(hw, sp.x));
      const y = Math.min(h - 20, Math.max(20, sp.y + dy));
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      boxes.push([x, y, hw, 16]);
    };
    pin(blockedEl, movie.blocked, -44);
    pin(calloutEl, movie.callout, movie.blocked && movie.blocked.site === movie.callout?.site ? 44 : -46);

    // camera
    if (!userOrbit) {
      const pose = shotPose(movie.shot, lead);
      const k = 1 - Math.exp(-dt * pose.k);
      camera.position.lerp(pose.pos, k);
      controls.target.lerp(pose.target, k);
    }
    return boxes;
  }

  // ---- render loop --------------------------------------------------------
  let labelsOn = true;
  const tmp = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  let raf = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const t = now / 1000;
    for (const [fi, f] of flows.entries()) {
      f.mesh.visible = !movie;
      flowBadges[fi].style.display = 'none';
      if (movie) continue;
      const visible = Math.round(f.count * f.level);
      for (let i = 0; i < f.count; i++) {
        if (i >= visible) {
          f.mesh.setMatrixAt(i, hidden);
          continue;
        }
        const curve = f.curves[i % f.curves.length];
        const u = (i / f.count + t * f.speed) % 1;
        curve.getPointAt(u, tmp);
        m4.makeTranslation(tmp.x, tmp.y, tmp.z);
        f.mesh.setMatrixAt(i, m4);
      }
      f.mesh.instanceMatrix.needsUpdate = true;
    }
    if (flight && !movie) {
      const k = Math.min(1, (now - flight.start) / 700);
      const ease = k * k * (3 - 2 * k);
      camera.position.lerpVectors(flight.fromPos, flight.toPos, ease);
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, ease);
      if (k >= 1) flight = null;
    }
    const movieBoxes = drawMovie(now);
    controls.update();
    renderer.render(scene, camera);
    if (labelsOn) {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const placed: Array<[number, number, number, number]> = [...movieBoxes];
      // explore mode: name circles on the strongest flows (one particle each)
      if (!movie) {
        flows.forEach((f, fi) => {
          const b = flowBadges[fi];
          if (f.level < 0.35) return;
          const u = (t * f.speed) % 1;
          f.curves[0].getPointAt(u, tmp);
          const sp = project(tmp.clone(), w, h);
          if (!sp || placed.some(([x, y, pw, ph]) => Math.abs(x - sp.x) < pw + 26 && Math.abs(y - sp.y) < ph + 26)) return;
          b.style.display = '';
          b.style.transform = `translate(-50%, -50%) translate(${sp.x}px, ${sp.y}px)`;
          placed.push([sp.x, sp.y, 26, 26]);
        });
      }
      // Later labels (follicle, CL, embryo) win; an overlapping, less important label hides.
      for (let li = labels.length - 1; li >= 0; li--) {
        const l = labels[li];
        const p = l.pos();
        // In close-ups, hide labels for parts far behind the focus (they would sit on top of nearer parts).
        const far = !!p && p.distanceTo(camera.position) > camera.position.distanceTo(controls.target) * 1.45 && camera.position.distanceTo(controls.target) < 60;
        const show = !!p && !far && !!l.el.textContent && (tmp.copy(p).project(camera), tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05);
        if (!show) {
          l.el.style.display = 'none';
          continue;
        }
        l.el.style.display = '';
        const hw = l.el.offsetWidth / 2 + 3;
        const hh = l.el.offsetHeight / 2 + 2;
        // keep labels inside the stage
        const sx = Math.min(w - hw, Math.max(hw, ((tmp.x + 1) / 2) * w));
        const sy = Math.min(h - hh, Math.max(hh, ((1 - tmp.y) / 2) * h));
        if (placed.some(([x, y, pw, ph]) => Math.abs(x - sx) < pw + hw && Math.abs(y - sy) < ph + hh)) {
          l.el.style.display = 'none';
          continue;
        }
        placed.push([sx, sy, hw, hh]);
        l.el.style.transform = `translate(-50%, -50%) translate(${sx}px, ${sy}px)`;
      }
    }
  };
  apply();
  raf = requestAnimationFrame(loop);

  return {
    setState(d, o) {
      if (d === day && o === outcome) return;
      day = d;
      outcome = o;
      apply();
    },
    setMovieFrame(frame, key = '') {
      if (frame && (key !== movieKey || frame.shot !== movie?.shot)) userOrbit = false;
      if (!frame && movie) flight = null;
      movieKey = key;
      movie = frame;
    },
    setView(name) {
      if (movie) return;
      const to = viewPose(name);
      flight = { fromPos: camera.position.clone(), fromTarget: controls.target.clone(), toPos: to.pos, toTarget: to.target, start: performance.now() };
    },
    setLabelsVisible(on) {
      labelsOn = on;
      labelLayer.style.display = on ? '' : 'none';
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      if (filament) filament.geometry.dispose();
      for (const f of flows) f.mesh.dispose();
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
