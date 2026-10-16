// 3D stifle for the medial patellar desmotomy lesson: distal femur, proximal
// tibia, patella with its parapatellar fibrocartilage, the three patellar
// ligaments, and (for the surgery) skin, incision and forceps.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { femurShape, patellaShape, tibiaShape } from '@/lib/anatomy/cow-shapes';
import { intersect, plane } from '@/lib/anatomy/sdf';
import {
  FLEXED,
  JOINT,
  LOCKED,
  LOCKED_PATELLA,
  PATELLA_POINTS,
  STANDING,
  grooveAt,
  ligament,
  patellaFor,
  tibiaToFemur,
  type LigamentId,
  type StifleStep,
  type StifleView,
  type V3,
} from '@/lib/anatomy/stifle';
import { shapeGeometry } from '../anatomy-lab/geometry';

export interface StifleScene {
  setStep(step: StifleStep): void;
  setView(v: StifleView): void;
  setLabels(on: boolean): void;
  /** In the quiz: colour the picked ligament green (right) or red (wrong). */
  markPick(id: LigamentId | null, correct: boolean): void;
  dispose(): void;
}

const v = (a: V3 | number[]) => new THREE.Vector3(a[0], a[1], a[2]);
const LIG_COLOR: Record<LigamentId, number> = { medial: 0xd8b26a, middle: 0xd8b26a, lateral: 0xd8b26a };

export function createStifleScene(container: HTMLElement, events: { onPick: (id: LigamentId) => void }): StifleScene {
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
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2.2;
  controls.maxDistance = 12;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa0968a, 1.25));
  scene.add(camera);
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(3, 5, 6);
  camera.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-5, -1, 2);
  camera.add(fill);

  const disposables: Array<{ dispose(): void }> = [];
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xeee3c9, roughness: 0.7 });
  disposables.push(boneMat);

  // bones
  const femurFull = femurShape();
  const femurGeo = shapeGeometry({ sdf: intersect(femurFull.sdf, plane([0, -1.9, 0], [0, 1, 0])), min: [-0.85, -3.8, -0.95], max: [0.85, -1.75, 0.9] }, 0.022);
  const femur = new THREE.Mesh(femurGeo, boneMat);
  scene.add(femur);
  const tibiaFull = tibiaShape();
  const tibiaGeo = shapeGeometry({ sdf: intersect(tibiaFull.sdf, plane([0, -1.7, 0], [0, -1, 0])), min: [-0.75, -1.85, -0.8], max: [0.8, 0.4, 0.8] }, 0.022);
  const tibia = new THREE.Mesh(tibiaGeo, boneMat);
  tibia.position.copy(v(JOINT));
  scene.add(tibia);
  const patellaGeo = shapeGeometry(patellaShape(), 0.018);
  const patellaMat = boneMat.clone();
  disposables.push(femurGeo, tibiaGeo, patellaGeo, patellaMat);
  const patella = new THREE.Group();
  patella.add(new THREE.Mesh(patellaGeo, patellaMat));
  scene.add(patella);
  // parapatellar fibrocartilage (medial border of the patella)
  const fibroMat = new THREE.MeshStandardMaterial({ color: 0xbfd9e3, roughness: 0.4 });
  const fibroGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v([0.12, 0.28, -0.24]), v([0.02, 0.05, -0.4]), v([-0.04, -0.22, -0.34]), v([0.0, -0.36, -0.2])]), 30, 0.07, 10, false);
  disposables.push(fibroMat, fibroGeo);
  const fibro = new THREE.Mesh(fibroGeo, fibroMat);
  patella.add(fibro);

  // highlight overlays
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff9f1a, transparent: true, opacity: 0.38, depthWrite: false });
  disposables.push(glowMat);
  const ridgeGeo = new THREE.CapsuleGeometry(0.23, 0.42, 8, 16);
  disposables.push(ridgeGeo);
  const ridgeGlow = new THREE.Mesh(ridgeGeo, glowMat);
  ridgeGlow.position.set(0.33, -3.05, -0.29);
  ridgeGlow.rotation.z = 0.13;
  scene.add(ridgeGlow);
  const grooveCurve = new THREE.CatmullRomCurve3([0, 0.25, 0.5, 0.75, 1].map((s) => v(grooveAt(s)).add(new THREE.Vector3(-0.3, 0, 0))));
  const grooveGeo = new THREE.TubeGeometry(grooveCurve, 30, 0.05, 8, false);
  disposables.push(grooveGeo);
  const grooveGlow = new THREE.Mesh(grooveGeo, glowMat);
  scene.add(grooveGlow);
  const tubGlowGeo = new THREE.SphereGeometry(0.2, 16, 12);
  disposables.push(tubGlowGeo);
  const tubGlow = new THREE.Mesh(tubGlowGeo, glowMat);
  scene.add(tubGlow);

  // ligaments (rebuilt each frame — they follow the bones)
  const ligMats: Record<LigamentId, THREE.MeshStandardMaterial> = {
    medial: new THREE.MeshStandardMaterial({ color: LIG_COLOR.medial, roughness: 0.45 }),
    middle: new THREE.MeshStandardMaterial({ color: LIG_COLOR.middle, roughness: 0.45 }),
    lateral: new THREE.MeshStandardMaterial({ color: LIG_COLOR.lateral, roughness: 0.45 }),
  };
  disposables.push(...Object.values(ligMats));
  const ligMeshes: Array<{ id: LigamentId; mesh: THREE.Mesh }> = [];
  const quadMat = new THREE.MeshStandardMaterial({ color: 0xc9a15e, roughness: 0.5, transparent: true, opacity: 0.85 });
  disposables.push(quadMat);
  let quad: THREE.Mesh | null = null;
  const tube = (pts: THREE.Vector3[], r: number, m: THREE.Material) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 10, false), m);

  // skin, incision, forceps, scalpel
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x8a6a55, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide, roughness: 0.9 });
  const skinGeo = new THREE.SphereGeometry(1, 40, 28);
  disposables.push(skinMat, skinGeo);
  const skin = new THREE.Mesh(skinGeo, skinMat);
  skin.scale.set(1.15, 1.35, 0.78);
  skin.position.set(0.25, -3.45, -0.02);
  scene.add(skin);
  const slitMat = new THREE.MeshBasicMaterial({ color: 0x7a1020 });
  const slitGeo = new THREE.CapsuleGeometry(0.028, 0.3, 6, 10);
  disposables.push(slitMat, slitGeo);
  const slit = new THREE.Mesh(slitGeo, slitMat);
  scene.add(slit);
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x9aa4ad, metalness: 0.85, roughness: 0.3 });
  disposables.push(steelMat);
  let forceps: THREE.Mesh | null = null;
  const bladeGeo = new THREE.ConeGeometry(0.05, 0.4, 3);
  disposables.push(bladeGeo);
  const blade = new THREE.Mesh(bladeGeo, steelMat);
  scene.add(blade);

  // labels
  type Label = { el: HTMLElement; pos: () => THREE.Vector3 | null; key?: string };
  const labels: Label[] = [];
  const addLabel = (text: string, pos: () => THREE.Vector3 | null, cls = '', key?: string) => {
    const el = document.createElement('span');
    el.className = `lab-label ${cls}`;
    el.textContent = text;
    labelLayer.appendChild(el);
    labels.push({ el, pos, key });
  };

  // ---- state -------------------------------------------------------------------------
  let step: StifleStep | null = null;
  let stepStart = performance.now();
  let angle = STANDING;
  const pat = v(patellaFor(STANDING).centre);
  let patTilt = 0;
  let pick: { id: LigamentId; correct: boolean } | null = null;
  let labelsOn = true;
  const medialAt = (t: number) => {
    const [a, b] = ligament('medial', [pat.x, pat.y, pat.z], angle);
    return v(a).lerp(v(b), t);
  };

  addLabel('Femur', () => new THREE.Vector3(-0.2, -2.15, 0.2));
  addLabel('Medial trochlear ridge (larger)', () => new THREE.Vector3(0.3, -2.75, -0.62), 'st-key', 'medialRidge');
  addLabel('Lateral trochlear ridge', () => new THREE.Vector3(0.3, -2.85, 0.6));
  addLabel('Patella', () => pat.clone().add(new THREE.Vector3(0.38, 0.2, 0)));
  addLabel('Parapatellar fibrocartilage', () => pat.clone().add(new THREE.Vector3(0.0, 0.12, -0.58)), 'st-key', 'fibrocartilage');
  addLabel('Medial patellar ligament', () => medialAt(0.55).add(new THREE.Vector3(0, 0, -0.3)), 'st-lig', 'medial');
  addLabel('Middle patellar ligament', () => {
    const [a, b] = ligament('middle', [pat.x, pat.y, pat.z], angle);
    return v(a).lerp(v(b), 0.5).add(new THREE.Vector3(0.22, 0, 0));
  });
  addLabel('Lateral patellar ligament', () => {
    const [a, b] = ligament('lateral', [pat.x, pat.y, pat.z], angle);
    return v(a).lerp(v(b), 0.5).add(new THREE.Vector3(0, 0, 0.3));
  });
  addLabel('Tibial tuberosity', () => v(tibiaToFemur([0.62, -0.55, -0.1], angle)).add(new THREE.Vector3(0.25, -0.1, 0)), 'st-key', 'tuberosity');
  addLabel('Tibia', () => v(tibiaToFemur([-0.2, -1.3, 0.2], angle)));
  addLabel('Medial condyle', () => new THREE.Vector3(-0.25, -3.45, -0.6));
  addLabel('Incision', () => (slit.visible ? slit.position.clone().add(new THREE.Vector3(0, -0.35, -0.1)) : null), 'st-cut');

  // ---- views -------------------------------------------------------------------------
  const TARGET = new THREE.Vector3(0.35, -3.25, 0);
  const VIEWS: Record<StifleView, THREE.Vector3> = {
    medial: new THREE.Vector3(0.3, 0.12, -1),
    craniomedial: new THREE.Vector3(0.85, 0.2, -0.7),
    cranial: new THREE.Vector3(1, 0.15, 0.05),
    lateral: new THREE.Vector3(0.3, 0.12, 1),
  };
  let fly: { from: THREE.Vector3; to: THREE.Vector3; start: number } | null = null;
  const viewPos = (name: StifleView) => {
    const widen = Math.max(1, 1.25 / Math.max(camera.aspect, 0.3));
    return TARGET.clone().addScaledVector(VIEWS[name].clone().normalize(), 5.2 * widen);
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
  camera.position.copy(viewPos('craniomedial'));
  controls.target.copy(TARGET);
  controls.update();

  // ---- picking (quiz) --------------------------------------------------------------------
  const ray = new THREE.Raycaster();
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    down = null;
    if (!step?.quiz) return;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    ray.params.Mesh = {};
    // ligaments are thin: test with a generous threshold by checking the closest ligament to the ray
    let best: LigamentId | null = null;
    let bestD = 0.18;
    for (const id of ['medial', 'middle', 'lateral'] as LigamentId[]) {
      const [a, b] = ligament(id, [pat.x, pat.y, pat.z], angle);
      for (let i = 0; i <= 10; i++) {
        const p = v(a).lerp(v(b), i / 10);
        const d = ray.ray.distanceToPoint(p);
        if (d < bestD) {
          bestD = d;
          best = id;
        }
      }
    }
    if (best) events.onPick(best);
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);

  // ---- per-frame update ------------------------------------------------------------------
  const tmp = new THREE.Vector3();
  let raf = 0;
  let last = performance.now();
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const t = (now - stepStart) / 1000;
    const motion = step?.motion ?? 'still';

    // target pose
    let targetAngle = STANDING;
    let targetPat = v(patellaFor(STANDING).centre);
    let locked = false;
    if (motion === 'walk' || (motion === 'free' && t > 1.6)) {
      const tt = motion === 'free' ? t - 1.6 : t;
      targetAngle = STANDING + (FLEXED - STANDING) * (0.5 - 0.5 * Math.cos((2 * Math.PI * tt) / 3.4));
      targetPat = v(patellaFor(targetAngle).centre);
    } else if (motion === 'locked' || motion === 'held' || (motion === 'free' && t <= 1.6)) {
      locked = motion !== 'free';
      targetAngle = LOCKED;
      targetPat = v(LOCKED_PATELLA);
      if (motion === 'locked') {
        // the animal tries to bend the leg: a small jerk every few seconds, but it stays locked
        const ph = t % 2.8;
        if (ph < 0.5) targetAngle = LOCKED - 6 * Math.sin((ph / 0.5) * Math.PI);
      }
      if (motion === 'free') {
        // released: the patella drops back into the groove
        const k = Math.min(1, t / 1.4);
        targetAngle = LOCKED + (STANDING - LOCKED) * k;
        targetPat = v(LOCKED_PATELLA).lerp(v(patellaFor(STANDING).centre), k * k * (3 - 2 * k));
      }
    }
    const follow = motion === 'walk' || motion === 'free' ? 1 : 1 - Math.exp(-dt * 5);
    angle += (targetAngle - angle) * follow;
    pat.lerp(targetPat, follow);
    const wantTilt = locked ? -0.18 : 0;
    patTilt += (wantTilt - patTilt) * (1 - Math.exp(-dt * 5));

    tibia.rotation.z = (angle * Math.PI) / 180;
    patella.position.copy(pat);
    patella.rotation.set(0, 0, patTilt + (motion === 'locked' && t % 2.8 < 0.5 ? 0.02 * Math.sin(t * 40) : 0));

    // ligaments
    for (const l of ligMeshes) {
      scene.remove(l.mesh);
      l.mesh.geometry.dispose();
    }
    ligMeshes.length = 0;
    const cutDone = !!step?.cut;
    for (const id of ['medial', 'middle', 'lateral'] as LigamentId[]) {
      const [a0, b0] = ligament(id, [pat.x, pat.y, pat.z], angle);
      const a = v(a0);
      const b = v(b0);
      const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0.06, 0, id === 'medial' ? -0.04 : id === 'lateral' ? 0.04 : 0));
      const r = id === 'middle' ? 0.075 : 0.06;
      if (id === 'medial' && cutDone) {
        // two retracted ends with a gap at the cut
        const cutT = 0.74;
        const gap = Math.min(0.14, 0.14 * (t / 0.6));
        const c1 = a.clone().lerp(b, cutT - gap);
        const c2 = a.clone().lerp(b, cutT + gap * 0.6);
        const m1 = tube([a, a.clone().lerp(c1, 0.5).add(new THREE.Vector3(0.05, 0, -0.04)), c1], r, ligMats.medial);
        const m2 = tube([c2, b], r, ligMats.medial);
        scene.add(m1, m2);
        ligMeshes.push({ id, mesh: m1 }, { id, mesh: m2 });
      } else {
        const m = tube([a, mid, b], r, ligMats[id]);
        scene.add(m);
        ligMeshes.push({ id, mesh: m });
      }
    }
    // quadriceps tendon
    if (quad) {
      scene.remove(quad);
      quad.geometry.dispose();
    }
    const base = pat.clone().add(v(PATELLA_POINTS.base));
    quad = tube([base, base.clone().add(new THREE.Vector3(-0.05, 0.35, 0)), new THREE.Vector3(0.42, -1.95, 0)], 0.12, quadMat);
    scene.add(quad);

    // highlights and colours
    const hl = new Set(step?.highlight ?? []);
    const pulse = 0.5 + 0.5 * Math.sin(now / 260);
    ridgeGlow.visible = hl.has('medialRidge');
    grooveGlow.visible = hl.has('groove');
    tubGlow.visible = hl.has('tuberosity');
    tubGlow.position.copy(v(tibiaToFemur([0.5, -0.45, -0.12], angle)));
    glowMat.opacity = 0.22 + 0.2 * pulse;
    fibroMat.emissive.set(hl.has('fibrocartilage') ? 0xff9f1a : 0x000000);
    fibroMat.emissiveIntensity = hl.has('fibrocartilage') ? 0.35 + 0.35 * pulse : 0;
    for (const id of ['medial', 'middle', 'lateral'] as LigamentId[]) {
      const m = ligMats[id];
      const picked = pick && pick.id === id;
      m.color.set(picked ? (pick!.correct ? 0x2e9d4f : 0xc62828) : hl.has(id) ? 0xe2683c : LIG_COLOR[id]);
      m.emissive.set(hl.has(id) && !picked ? 0xe2683c : 0x000000);
      m.emissiveIntensity = hl.has(id) && !picked ? 0.25 * pulse : 0;
    }

    // surgery props
    const skinState = step?.skin ?? 'hidden';
    skin.visible = skinState !== 'hidden';
    const site = medialAt(0.74);
    // project the site onto the skin surface along −z (the medial side)
    const sx = (site.x - skin.position.x) / skin.scale.x;
    const sy = (site.y - skin.position.y) / skin.scale.y;
    const rem = Math.max(0.05, 1 - sx * sx - sy * sy);
    const skinZ = skin.position.z - Math.sqrt(rem) * skin.scale.z;
    // the incision sits on the skin directly over the ligament, as seen from the camera, and runs along it
    slit.visible = skinState === 'incised';
    const toCam = camera.position.clone().sub(site).normalize();
    const along = toCam.z < -0.05 ? (skinZ - site.z) / toCam.z : 0.5;
    slit.position.copy(site).addScaledVector(toCam, Math.max(0.15, along) + 0.02);
    const [la, lb] = ligament('medial', [pat.x, pat.y, pat.z], angle);
    slit.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v(la).sub(v(lb)).normalize());
    if (forceps) {
      scene.remove(forceps);
      forceps.geometry.dispose();
      forceps = null;
    }
    if (step?.forceps) {
      const p = site;
      const pts = [
        new THREE.Vector3(p.x - 0.4, p.y + 0.12, skinZ - 0.55),
        new THREE.Vector3(p.x - 0.26, p.y, p.z - 0.12),
        new THREE.Vector3(p.x - 0.08, p.y - 0.02, p.z + 0.1),
        new THREE.Vector3(p.x + 0.12, p.y - 0.02, p.z + 0.1),
        new THREE.Vector3(p.x + 0.26, p.y, p.z - 0.12),
      ];
      forceps = tube(pts, 0.028, steelMat);
      scene.add(forceps);
    }
    blade.visible = !!step?.cut && t < 1.1 && step.id === 'cut';
    if (blade.visible) {
      const k = Math.min(1, t / 0.6);
      blade.position.set(site.x + 0.02, site.y + 0.25 - 0.25 * k, site.z - 0.3 + 0.18 * k);
      blade.rotation.set(Math.PI / 2, 0, 0);
    }

    // camera
    if (fly) {
      const k = Math.min(1, (now - fly.start) / 800);
      const e = k * k * (3 - 2 * k);
      camera.position.copy(fly.from).lerp(fly.to, e);
      controls.target.lerp(TARGET, e);
      if (k >= 1) fly = null;
    }
    controls.update();
    renderer.render(scene, camera);

    // labels
    if (labelsOn) {
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
        l.el.classList.toggle('st-on', !!l.key && hl.has(l.key as never));
        const hw = l.el.offsetWidth / 2 + 3;
        const hh = l.el.offsetHeight / 2 + 2;
        const x = Math.min(w - hw, Math.max(hw, ((tmp.x + 1) / 2) * w));
        const y = Math.min(h - hh, Math.max(hh, ((1 - tmp.y) / 2) * h));
        const important = !!l.key && hl.has(l.key as never);
        if (!important && placed.some(([px, py, pw, ph]) => Math.abs(px - x) < pw + hw && Math.abs(py - y) < ph + hh)) {
          l.el.style.display = 'none';
          continue;
        }
        placed.push([x, y, hw, hh]);
        l.el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      }
    }
  };
  raf = requestAnimationFrame(loop);

  return {
    setStep(s) {
      step = s;
      stepStart = performance.now();
      pick = null;
      fly = { from: camera.position.clone(), to: viewPos(s.view), start: performance.now() };
    },
    setView(name) {
      fly = { from: camera.position.clone(), to: viewPos(name), start: performance.now() };
    },
    setLabels(on) {
      labelsOn = on;
      labelLayer.style.display = on ? '' : 'none';
    },
    markPick(id, correct) {
      pick = id ? { id, correct } : null;
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      for (const l of ligMeshes) l.mesh.geometry.dispose();
      quad?.geometry.dispose();
      forceps?.geometry.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      labelLayer.remove();
    },
  };
}
