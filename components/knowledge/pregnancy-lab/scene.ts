// 3D pregnancy month by month: a faint skeleton (pelvis highlighted), a see-
// through body, the rumen on the left, and the reproductive tract with a fetus
// that grows and moves. A rectal-palpation arm shows what can be reached.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildSkeleton } from '@/lib/anatomy/cow-skeleton';
import { BODY, type FetalPose, type PregnancyState } from '@/lib/pregnancy/months';
import { cellFor, pieceMatrix, shapeGeometry, tubeGeometry } from '../anatomy-lab/geometry';

export type PregView = 'side' | 'above' | 'whole';
export interface PregOptions {
  skeleton: boolean;
  hand: boolean;
  labels: boolean;
}
export interface PregScene {
  setState(s: PregnancyState): void;
  setOptions(o: PregOptions): void;
  setView(v: PregView): void;
  dispose(): void;
}

const v3 = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
const UZ = 0.9; // the gravid uterus lies to the right of the rumen

export function createPregnancyScene(container: HTMLElement, events: { onProgress: (k: number) => void }): PregScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xf3f1eb);
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  const labelLayer = document.createElement('div');
  labelLayer.className = 'lab-labels';
  container.appendChild(labelLayer);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.3, 300);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa69c8c, 1.3));
  scene.add(camera);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(6, 10, 12);
  camera.add(key);

  const disposables: Array<{ dispose(): void }> = [];
  const mat = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
    disposables.push(m);
    return m;
  };
  const glass = (color: number, opacity: number) => mat(color, { transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });

  // ---- skeleton (built in the background) ------------------------------------------------
  const skel = new THREE.Group();
  scene.add(skel);
  const boneFaint = glass(0xd9cfb8, 0.35);
  const pelvisMat = mat(0xe9dcbc, { roughness: 0.7 });
  const pieces = buildSkeleton().filter((p) => !p.id.startsWith('cart'));
  const geoCache = new Map<string, THREE.BufferGeometry>();
  let built = 0;
  let cancelled = false;
  const step = () => {
    if (cancelled) return;
    const t0 = performance.now();
    while (built < pieces.length && performance.now() - t0 < 25) {
      const p = pieces[built++];
      let g = geoCache.get(p.key);
      if (!g) {
        if (p.tube) g = tubeGeometry(p, 24, 6);
        else {
          const s = p.shape!();
          g = shapeGeometry(s, cellFor(s, 28, 0.06, 0.16));
        }
        geoCache.set(p.key, g);
      }
      const pelvic = p.bone === 'coxae' || p.bone === 'sacrum';
      const m = new THREE.Mesh(g, pelvic ? pelvisMat : boneFaint);
      m.matrixAutoUpdate = false;
      m.matrix.copy(pieceMatrix(p));
      skel.add(m);
    }
    events.onProgress(built / pieces.length);
    if (built < pieces.length) setTimeout(step, 0);
  };
  setTimeout(step, 20);

  // ---- body, abdominal floor, rumen -----------------------------------------------------------
  const bodyGeo = new THREE.SphereGeometry(1, 48, 32);
  disposables.push(bodyGeo);
  const body = new THREE.Mesh(bodyGeo, glass(0xb08a6e, 0.07));
  body.scale.set(12.6, 4.25, 3.3);
  body.position.set(-1.6, 8.95, 0);
  scene.add(body);
  const rumen = new THREE.Mesh(bodyGeo, glass(0x6aa36f, 0.2));
  rumen.scale.set(5.2, 3.0, 1.9);
  rumen.position.set(-1.5, 8.0, -1.25);
  scene.add(rumen);

  // ---- tract ---------------------------------------------------------------------------------
  const tractMat = mat(0xd98c8c, { transparent: true, opacity: 0.75 });
  const cervixMat = mat(0xb35c6b);
  const uterusMat = glass(0xe39aa4, 0.38);
  const fluidMat = glass(0xbfe0ee, 0.22);
  const rectumMat = glass(0x9b7a64, 0.25);
  let dyn: THREE.Object3D[] = [];
  const addDyn = (o: THREE.Object3D) => {
    scene.add(o);
    dyn.push(o);
    return o;
  };
  const clearDyn = () => {
    for (const o of dyn) {
      scene.remove(o);
      o.traverse((c) => {
        if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
      });
    }
    dyn = [];
  };
  const tube = (pts: THREE.Vector3[], r: number, m: THREE.Material, seg = 30) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 12, false), m);

  // fetus parts
  const fetusSkin = mat(0x9c6b4c, { roughness: 0.75 });
  const hoofMat = mat(0x3d332b);
  const placentaMat = mat(0xa8485c);
  const arteryMat = mat(0xc62828);
  const armMat = mat(0x6d8fb3, { transparent: true, opacity: 0.6 });
  const reachMat = new THREE.LineDashedMaterial({ color: 0x2a78d6, dashSize: 0.35, gapSize: 0.25 });
  disposables.push(reachMat);

  // reach circle (around the anus)
  const ring = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => v3(BODY.anus[0] + BODY.reach * Math.cos((i / 96) * Math.PI * 2), BODY.anus[1] + BODY.reach * Math.sin((i / 96) * Math.PI * 2), UZ))),
    reachMat,
  );
  ring.computeLineDistances();
  scene.add(ring);
  disposables.push(ring.geometry);
  // rectum and vagina (static)
  const rectum = tube([v3(BODY.anus[0], BODY.anus[1], 0), v3(-12.5, 10.55, 0.1), v3(-10.5, 10.75, 0.2), v3(-8.5, 10.7, 0.2)], 0.45, rectumMat);
  scene.add(rectum);
  disposables.push(rectum.geometry);

  /** Fetus model (head towards −x), length 1 → scaled. */
  function buildFetus(pose: FetalPose): THREE.Group {
    const g = new THREE.Group();
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, p: THREE.Vector3, s?: THREE.Vector3) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.copy(p);
      if (s) mesh.scale.copy(s);
      g.add(mesh);
      return mesh;
    };
    const sph = new THREE.SphereGeometry(1, 20, 14);
    const limb = (from: THREE.Vector3, mid: THREE.Vector3, to: THREE.Vector3, r: number) => {
      g.add(tube([from, mid, to], r, fetusSkin, 10));
      add(sph, hoofMat, to, v3(r * 1.2, r * 1.2, r * 1.2));
    };
    if (pose === 'embryo') {
      // C-shaped embryo with a big head
      const arc = Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI * 0.15 + (i / 8) * Math.PI * 1.25;
        return v3(0.25 * Math.cos(a), 0.25 * Math.sin(a), 0);
      });
      g.add(tube(arc, 0.11, fetusSkin, 20));
      add(sph, fetusSkin, arc[0].clone().add(v3(-0.05, 0.08, 0)), v3(0.2, 0.2, 0.18));
      return g;
    }
    const curled = pose === 'curled';
    const birth = pose === 'birth';
    add(sph, fetusSkin, v3(0.12, 0, 0), v3(0.33, 0.17, 0.14)); // body
    const headPos = curled ? v3(-0.22, -0.12, 0) : birth ? v3(-0.44, -0.02, 0) : v3(-0.36, 0.05, 0);
    g.add(tube([v3(-0.12, 0.05, 0), headPos.clone().lerp(v3(-0.12, 0.05, 0), 0.5).add(v3(0, 0.04, 0)), headPos], 0.075, fetusSkin, 10)); // neck
    add(sph, fetusSkin, headPos, v3(curled ? 0.14 : 0.13, 0.085, 0.075)).rotation.z = curled ? -0.9 : birth ? 0.15 : -0.2; // head
    for (const z of [0.07, -0.07]) {
      // forelimbs
      const sh = v3(-0.1, -0.1, z);
      if (birth) limb(sh, v3(-0.32, -0.16, z), v3(-0.62, -0.13, z), 0.035);
      else limb(sh, v3(-0.08, -0.2, z), v3(-0.2, -0.18, z), 0.035);
      // hindlimbs
      const hip = v3(0.34, -0.08, z);
      if (birth) limb(hip, v3(0.46, -0.14, z), v3(0.56, -0.12, z), 0.04);
      else limb(hip, v3(0.24, -0.2, z), v3(0.36, -0.22, z), 0.04);
    }
    if (curled) g.rotation.z = 0.5;
    return g;
  }
  let fetus: THREE.Group | null = null;
  let fetusPose: FetalPose | null = null;

  // ---- labels ------------------------------------------------------------------------------------
  type Label = { el: HTMLElement; pos: () => THREE.Vector3 | null; cls?: string };
  const labels: Label[] = [];
  const addLabel = (text: string, pos: () => THREE.Vector3 | null, cls = '') => {
    const el = document.createElement('span');
    el.className = `lab-label ${cls}`;
    el.textContent = text;
    labelLayer.appendChild(el);
    const l = { el, pos };
    labels.push(l);
    return l;
  };
  let st: PregnancyState | null = null;
  let opts: PregOptions = { skeleton: true, hand: true, labels: true };
  addLabel('Pelvic brim', () => v3(BODY.pelvicBrim[0] + 0.3, BODY.pelvicBrim[1] + 0.55, 1.6), 'pg-key');
  addLabel('Vulva', () => v3(BODY.vulva[0] - 0.9, BODY.vulva[1], 0));
  addLabel('Anus', () => v3(BODY.anus[0] - 0.9, BODY.anus[1] + 0.3, 0));
  addLabel('Cervix', () => (st ? v3(st.cervix[0], st.cervix[1] - 0.7, UZ * 0.5) : null));
  const fetusLabel = addLabel('Fetus', () => (st && st.crl > 0.2 ? v3(st.centre[0], st.centre[1] + Math.max(0.6, st.crl * 0.22), UZ + 0.3) : st ? v3(st.centre[0], st.centre[1] + 0.7, UZ) : null), 'pg-fetus');
  addLabel('Pregnant uterus', () => (st && st.rx > 1.5 ? v3(st.centre[0] + st.rx * 0.6, st.centre[1] - st.ry * 0.85, UZ + 1) : null));
  addLabel('Rumen (left side)', () => v3(1.5, 10.6, -1.25));
  addLabel('Abdominal floor', () => v3(2.5, 4.5, 2));
  addLabel('Placentomes', () => (st && st.placentome > 1.5 ? v3(st.centre[0] + st.rx * 0.25, st.centre[1] - st.ry * 1.05, UZ + 0.4) : null));
  addLabel('Middle uterine artery', () => (st && st.fremitus > 0.2 ? v3(-8.6, 10.2, UZ + 1.2) : null), 'pg-artery');
  const reachLabel = addLabel('Hand reach (~70 cm)', () => (opts.hand ? v3(BODY.anus[0] + BODY.reach * 0.87, BODY.anus[1] + BODY.reach * 0.5, UZ) : null), 'pg-reach');

  // ---- build the tract for the current state --------------------------------------------------------
  let artery: THREE.Mesh | null = null;
  let arm: THREE.Group | null = null;
  function rebuild() {
    if (!st) return;
    clearDyn();
    const s = st;
    const cervix = v3(s.cervix[0], s.cervix[1], 0.15);
    const centre = v3(s.centre[0], s.centre[1], UZ);
    // vagina and cervix
    addDyn(tube([v3(BODY.vulva[0], BODY.vulva[1], 0), v3(-13.2, 9.35, 0), cervix.clone().add(v3(-0.9, 0, 0)), cervix.clone().add(v3(-0.45, 0, 0))], 0.33, tractMat));
    const dir = centre.clone().sub(cervix);
    const cerv = addDyn(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 16), cervixMat)) as THREE.Mesh;
    cerv.position.copy(cervix);
    cerv.quaternion.setFromUnitVectors(v3(0, 1, 0), dir.clone().normalize());
    // uterine body leading to the gravid horn
    const neck = cervix.clone().add(dir.clone().normalize().multiplyScalar(0.6));
    const entry = centre.clone().add(dir.clone().normalize().multiplyScalar(-s.rx * 0.85));
    addDyn(tube([neck, neck.clone().lerp(entry, 0.5).add(v3(0, 0.1, 0)), entry], Math.min(0.55, 0.25 + s.ry * 0.25), uterusMat));
    // non-pregnant horn (small), curling beside
    addDyn(tube([entry, entry.clone().add(v3(0.6, 0.5, -0.7)), entry.clone().add(v3(0.2, 0.9, -1.1))], 0.2 + s.ry * 0.05, uterusMat));
    // gravid uterus
    const ut = addDyn(new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), uterusMat)) as THREE.Mesh;
    ut.scale.set(s.rx, s.ry, s.ry * 0.95);
    ut.position.copy(centre);
    ut.rotation.z = Math.atan2(dir.y, dir.x) * 0.5;
    const fluid = addDyn(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 22), fluidMat)) as THREE.Mesh;
    fluid.scale.set(s.rx * 0.9, s.ry * 0.88, s.ry * 0.85);
    fluid.position.copy(centre);
    fluid.rotation.z = ut.rotation.z;
    // placentomes on the ventral and lateral uterine wall
    if (s.placentome > 0.3) {
      const pg = new THREE.Group();
      const r = 0.05 + s.placentome * 0.035;
      const geo = new THREE.SphereGeometry(1, 10, 8);
      for (let i = 0; i < 26; i++) {
        const a = -Math.PI * 0.95 + (i % 13) * (Math.PI * 0.95 / 6.5);
        const b = i < 13 ? 0.35 : -0.25;
        const p = v3(Math.cos(a) * Math.cos(b), Math.sin(a) * Math.cos(b) * 0.6 - 0.35, Math.sin(b) + 0.4).normalize();
        const m = new THREE.Mesh(geo, placentaMat);
        m.position.set(p.x * s.rx * 0.96, p.y * s.ry * 0.96, p.z * s.ry * 0.92);
        m.scale.set(r, r * 0.6, r);
        pg.add(m);
      }
      pg.position.copy(centre);
      pg.rotation.z = ut.rotation.z;
      addDyn(pg);
    }
    // middle uterine artery (from the aorta under the spine to the uterus)
    artery = addDyn(tube([v3(-8.2, 11.0, 0.2), v3(-8.6, 10.0, UZ + 0.9), centre.clone().add(v3(-s.rx * 0.2, s.ry * 0.85, 0.3))], 0.06 + 0.07 * s.fremitus, arteryMat)) as THREE.Mesh;
    // fetus
    if (fetusPose !== s.pose || !fetus) {
      if (fetus) {
        scene.remove(fetus);
        fetus.traverse((c) => (c as THREE.Mesh).geometry?.dispose());
      }
      fetus = buildFetus(s.pose);
      fetusPose = s.pose;
      scene.add(fetus);
    }
    // crown–rump length is measured along the curved back; the fetus model is drawn a little shorter so it fits inside the uterus
    const len = Math.max(0.12, s.crl * (s.pose === 'lying' || s.pose === 'birth' ? 0.82 : 1));
    fetus.scale.setScalar(len);
    if (s.pose === 'birth') fetus.position.set(BODY.pelvicBrim[0] + len * 0.62, 9.0, 0.3);
    else fetus.position.set(centre.x + (s.pose === 'lying' ? len * 0.03 : 0), centre.y + (s.pose === 'lying' ? -s.ry * 0.12 : 0), UZ);
    fetus.rotation.z = s.pose === 'birth' ? -0.12 : s.pose === 'curled' ? 0.5 : 0.04;
    // palpation arm
    arm = new THREE.Group();
    const target = s.reach === 'no' ? v3(BODY.anus[0], BODY.anus[1], 0).add(v3(s.nearestFetal[0] - BODY.anus[0], s.nearestFetal[1] - BODY.anus[1], 0).setLength(BODY.reach)) : s.crl < 0.4 ? cervix.clone() : v3(s.nearestFetal[0], s.nearestFetal[1] + 0.3, 0.4);
    const start = v3(BODY.anus[0] - 2.2, BODY.anus[1] + 0.4, 0);
    const mid = v3(BODY.anus[0] + 0.6, BODY.anus[1] + 0.45, 0.1);
    arm.add(tube([start, v3(BODY.anus[0], BODY.anus[1], 0), mid, target.clone().lerp(mid, 0.25), target], 0.36, armMat, 30));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), armMat);
    hand.position.copy(target);
    arm.add(hand);
    addDyn(arm);
    arm.visible = opts.hand;
    // fetus label: name the size
    fetusLabel.el.textContent = s.crl < 0.2 ? 'Embryo (tiny)' : 'Fetus';
  }

  // ---- views ------------------------------------------------------------------------------------
  const VIEWS: Record<PregView, { target: THREE.Vector3; pos: THREE.Vector3 }> = {
    side: { target: v3(-7.5, 8.1, 0), pos: v3(-7.5, 9.4, 24) },
    above: { target: v3(-6.5, 8, 0), pos: v3(-6.5, 30, 6) },
    whole: { target: v3(0, 7.4, 0), pos: v3(1, 10, 40) },
  };
  let fly: { fp: THREE.Vector3; ft: THREE.Vector3; tp: THREE.Vector3; tt: THREE.Vector3; start: number } | null = null;
  const pose = (name: PregView) => {
    const p = VIEWS[name];
    const widen = Math.max(1, 1.5 / Math.max(camera.aspect, 0.3));
    return { target: p.target.clone(), pos: p.target.clone().add(p.pos.clone().sub(p.target).multiplyScalar(widen)) };
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
    const p = pose('side');
    camera.position.copy(p.pos);
    controls.target.copy(p.target);
    controls.update();
  }

  const tmp = new THREE.Vector3();
  let raf = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (fly) {
      const k = Math.min(1, (now - fly.start) / 800);
      const e = k * k * (3 - 2 * k);
      camera.position.lerpVectors(fly.fp, fly.tp, e);
      controls.target.lerpVectors(fly.ft, fly.tt, e);
      if (k >= 1) fly = null;
    }
    if (artery && st) {
      const p = st.fremitus > 0 ? 1 + 0.35 * st.fremitus * Math.max(0, Math.sin(now / 110)) : 1;
      artery.scale.set(1, 1, 1);
      (artery.material as THREE.MeshStandardMaterial).emissive.setHex(0xff3030);
      (artery.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 * st.fremitus * (p - 1) * 3;
    }
    controls.update();
    renderer.render(scene, camera);
    if (opts.labels) {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const placed: Array<[number, number, number, number]> = [];
      for (const l of labels) {
        const p = l.pos();
        if (!p) {
          l.el.style.display = 'none';
          continue;
        }
        tmp.copy(p).project(camera);
        if (tmp.z > 1 || Math.abs(tmp.x) > 1.05 || Math.abs(tmp.y) > 1.05) {
          l.el.style.display = 'none';
          continue;
        }
        l.el.style.display = '';
        const hw = l.el.offsetWidth / 2 + 3;
        const hh = l.el.offsetHeight / 2 + 2;
        const x = Math.min(w - hw, Math.max(hw, ((tmp.x + 1) / 2) * w));
        const y = Math.min(h - hh, Math.max(hh, ((1 - tmp.y) / 2) * h));
        if (placed.some(([px, py, pw, ph]) => Math.abs(px - x) < pw + hw && Math.abs(py - y) < ph + hh)) {
          l.el.style.display = 'none';
          continue;
        }
        placed.push([x, y, hw, hh]);
        l.el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      }
    }
  };
  raf = requestAnimationFrame(loop);
  void reachLabel;

  return {
    setState(s) {
      st = s;
      rebuild();
    },
    setOptions(o) {
      opts = o;
      skel.visible = o.skeleton;
      ring.visible = o.hand;
      if (arm) arm.visible = o.hand;
      labelLayer.style.display = o.labels ? '' : 'none';
    },
    setView(name) {
      const p = pose(name);
      fly = { fp: camera.position.clone(), ft: controls.target.clone(), tp: p.pos, tt: p.target, start: performance.now() };
    },
    dispose() {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      clearDyn();
      if (fetus) fetus.traverse((c) => (c as THREE.Mesh).geometry?.dispose());
      for (const g of geoCache.values()) g.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      labelLayer.remove();
    },
  };
}
