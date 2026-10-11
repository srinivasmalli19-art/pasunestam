// 3D uterine torsion model (plain three.js), built in code from
// lib/torsion/geometry.ts: the vagina and cervix with longitudinal folds that
// spiral where the tract is twisted, the gravid uterus with a calf inside and
// the non-gravid horn, and the two broad ligaments that wrap over / under the
// uterus according to the torsion's direction and degree.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LIGAMENT_TOP, LIGAMENT_X, TRACT, ligamentPath, radiusAt, twistAt, twistZone } from '@/lib/torsion/geometry';
import type { TorsionConfig, TorsionType } from '@/lib/torsion/rules';

export type TorsionView = 'outside' | 'above' | 'behind' | 'vagina';

export interface TorsionScene {
  setConfig(config: TorsionConfig): void;
  setView(view: TorsionView): void;
  setSeeThrough(on: boolean): void;
  setLabelsVisible(on: boolean): void;
  dispose(): void;
}

const DEG = Math.PI / 180;
const RADIAL = 64;
const X_STEP = 0.5;
const CUT_X = 70;

const COLORS = {
  vagina: new THREE.Color(0xd98c8c),
  cervix: new THREE.Color(0xb35c6b),
  uterus: new THREE.Color(0xe3a0a6),
  stripe: new THREE.Color(0x8e2f45),
  calf: 0xc8a07a,
  calfBack: 0x7d5534,
  left: 0x3b6fd8,
  right: 0xe8892b,
};

const CERVIX_RINGS = [33.2, 35.6, 38];

/** Radius bump for folds/rings at reference angle φr (degrees) — what makes the twist visible. */
function surfaceRelief(x: number, phiRefDeg: number): number {
  const a = phiRefDeg * DEG;
  if (x < TRACT.cervixStart) return 0.5 * Math.cos(8 * a); // longitudinal vaginal folds
  if (x < TRACT.cervixEnd) {
    const rings = CERVIX_RINGS.reduce((s, r) => s + 0.55 * Math.exp(-((x - r) ** 2) / 0.4), 0);
    return rings + 0.22 * Math.cos(6 * a);
  }
  return 0.18 * Math.cos(14 * a);
}

/** Builds (or rebuilds in place) a twisted tube from x0 to x1. */
function tractGeometry(x0: number, x1: number) {
  const rings = Math.round((x1 - x0) / X_STEP) + 1;
  const positions = new Float32Array(rings * (RADIAL + 1) * 3);
  const colors = new Float32Array(rings * (RADIAL + 1) * 3);
  const indices: number[] = [];
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < RADIAL; j++) {
      const a = i * (RADIAL + 1) + j;
      const b = (i + 1) * (RADIAL + 1) + j;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.setIndex(indices);

  const tmp = new THREE.Color();
  const update = (type: TorsionType, theta: number) => {
    for (let i = 0; i < rings; i++) {
      const x = x0 + i * X_STEP;
      const tw = twistAt(x, type, theta);
      const r0 = radiusAt(x, type, theta);
      const base = x < TRACT.cervixStart ? COLORS.vagina : x < TRACT.cervixEnd ? COLORS.cervix : COLORS.uterus;
      for (let j = 0; j <= RADIAL; j++) {
        const phiS = (j / RADIAL) * 360;
        const phiR = phiS + tw; // the feature at reference angle φr shows at φr − twist
        const r = Math.max(0.2, r0 + surfaceRelief(x, phiR));
        const k = (i * (RADIAL + 1) + j) * 3;
        positions[k] = x;
        positions[k + 1] = r * Math.sin(phiS * DEG);
        positions[k + 2] = r * Math.cos(phiS * DEG);
        // A dark stripe along the top of the uterus shows which way is "up" for it.
        const stripe = x > 44 && Math.cos((phiR - 90) * DEG) > 0.975;
        tmp.copy(stripe ? COLORS.stripe : base);
        colors[k] = tmp.r;
        colors[k + 1] = tmp.g;
        colors[k + 2] = tmp.b;
      }
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
  };
  return { geometry: g, update };
}

/** One broad ligament as a sheet between its roof attachment and the (twisted) uterus. */
function ligamentGeometry(side: 'left' | 'right') {
  const xs: number[] = [];
  for (let x = LIGAMENT_X.from; x <= LIGAMENT_X.to + 1e-6; x += 2) xs.push(x);
  const N = 40;
  const positions = new Float32Array(xs.length * N * 3);
  const indices: number[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < N - 1; j++) {
      const a = i * N + j;
      const b = (i + 1) * N + j;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setIndex(indices);
  const update = (type: TorsionType, theta: number) => {
    xs.forEach((x, i) => {
      const path = ligamentPath(side, x, twistAt(x, type, theta), radiusAt(x, type, theta), N);
      path.forEach(([z, y], j) => {
        const k = (i * N + j) * 3;
        positions[k] = x;
        positions[k + 1] = y;
        positions[k + 2] = z;
      });
    });
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
  };
  return { geometry: g, update };
}

export function createTorsionScene(container: HTMLElement): TorsionScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0xf2f4ee);
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';

  const labelLayer = document.createElement('div');
  labelLayer.className = 'lab-labels';
  container.appendChild(labelLayer);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a99a, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(20, 80, 60);
  scene.add(key);
  const back = new THREE.DirectionalLight(0xffffff, 0.7);
  back.position.set(-80, 20, -30);
  scene.add(back);
  const headlamp = new THREE.PointLight(0xffffff, 0, 0, 0); // lights the inside of the vagina in that view
  camera.add(headlamp);
  scene.add(camera);

  const disposables: Array<{ dispose(): void }> = [];
  const cutPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -CUT_X);
  const clipMaterials: THREE.Material[] = [];
  const std = (opts: THREE.MeshStandardMaterialParameters, clip = true) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.02, side: THREE.DoubleSide, ...opts });
    disposables.push(m);
    if (clip) clipMaterials.push(m);
    return m;
  };

  // Vagina + cervix (always opaque so the folds read clearly) and the uterus (see-through to show the calf).
  const lower = tractGeometry(0, TRACT.cervixEnd + 0.5);
  const upper = tractGeometry(TRACT.cervixEnd, TRACT.uterusEnd);
  disposables.push(lower.geometry, upper.geometry);
  const lowerMat = std({ vertexColors: true });
  const upperMat = std({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false });
  const lowerMesh = new THREE.Mesh(lower.geometry, lowerMat);
  const upperMesh = new THREE.Mesh(upper.geometry, upperMat);
  scene.add(lowerMesh, upperMesh);

  // Broad ligaments: blue = cow's LEFT, orange = cow's RIGHT.
  const ligL = ligamentGeometry('left');
  const ligR = ligamentGeometry('right');
  disposables.push(ligL.geometry, ligR.geometry);
  const ligLMat = std({ color: COLORS.left, transparent: true, opacity: 0.62, depthWrite: false });
  const ligRMat = std({ color: COLORS.right, transparent: true, opacity: 0.62, depthWrite: false });
  const ligLMesh = new THREE.Mesh(ligL.geometry, ligLMat);
  const ligRMesh = new THREE.Mesh(ligR.geometry, ligRMat);
  ligLMesh.renderOrder = ligRMesh.renderOrder = 2;
  scene.add(ligLMesh, ligRMesh);
  // The roof line each ligament hangs from.
  for (const [side, color] of [[-1, COLORS.left], [1, COLORS.right]] as const) {
    const g = new THREE.CylinderGeometry(0.5, 0.5, LIGAMENT_X.to - LIGAMENT_X.from, 10);
    g.rotateZ(Math.PI / 2);
    g.translate((LIGAMENT_X.from + LIGAMENT_X.to) / 2, LIGAMENT_TOP.y, side * LIGAMENT_TOP.z);
    disposables.push(g);
    scene.add(new THREE.Mesh(g, std({ color })));
  }

  // Everything that turns with the uterus: the calf and the non-gravid horn.
  const turning = new THREE.Group();
  scene.add(turning);
  {
    const calfMat = std({ color: COLORS.calf });
    const backMat = std({ color: COLORS.calfBack });
    const add = (g: THREE.BufferGeometry, m: THREE.Material) => {
      disposables.push(g);
      turning.add(new THREE.Mesh(g, m));
    };
    add(new THREE.SphereGeometry(1, 28, 18).scale(16, 7, 6).translate(75, 1, 0), calfMat); // body
    add(new THREE.SphereGeometry(1, 20, 14).scale(5.6, 4.2, 3.8).translate(56, 2.6, 0), calfMat); // head
    add(new THREE.SphereGeometry(1, 16, 12).scale(3, 2.2, 2.2).translate(51, 1.6, 0), calfMat); // muzzle
    // Back line: shows whether the calf lies back-up (normal) or turned over.
    add(new THREE.CylinderGeometry(0.9, 0.9, 30, 10).rotateZ(Math.PI / 2).translate(75, 7.4, 0), backMat);
    for (const z of [-2.2, 2.2]) {
      // forelegs stretched towards the cervix (anterior presentation), hind legs folded
      const fore = new THREE.CylinderGeometry(1.05, 0.9, 17, 10).rotateZ(Math.PI / 2 + 0.05).translate(55, -3.4, z);
      add(fore, calfMat);
      const hind = new THREE.CylinderGeometry(1.2, 1, 9, 10).rotateZ(Math.PI / 2 - 0.6).translate(87, -4.5, z * 1.2);
      add(hind, calfMat);
    }
    const hornCurve = new THREE.CatmullRomCurve3(
      [
        [52, 5.5, -9.5],
        [55, 9.5, -12],
        [59, 13, -12.5],
        [63, 14.5, -9.5],
        [65.5, 13.8, -6.8],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z))
    );
    const hornGeo = new THREE.TubeGeometry(hornCurve, 40, 1.5, 14, false);
    disposables.push(hornGeo);
    turning.add(new THREE.Mesh(hornGeo, std({ color: 0xd98f99 })));
  }

  // ---- labels ----------------------------------------------------------
  type Label = { el: HTMLElement; pos: () => THREE.Vector3 | null; views?: TorsionView[] };
  const labels: Label[] = [];
  const addLabel = (text: string, pos: () => THREE.Vector3 | null, cls = '', views?: TorsionView[]) => {
    const el = document.createElement('span');
    el.className = `lab-label ${cls}`;
    el.textContent = text;
    labelLayer.appendChild(el);
    labels.push({ el, pos, views });
  };
  let current: TorsionConfig = { type: 'none', direction: 'clockwise', degree: 180 };
  let theta = 0; // signed degrees currently drawn
  let targetTheta = 0;
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  // Labels for parts in front of the cut are hidden in the "from behind" view.
  const notBehind: TorsionView[] = ['outside', 'above'];
  addLabel('Vulva', () => v(-1, -7, 0), '', notBehind);
  addLabel('Vagina', () => v(12, -7.5, 0), '', notBehind);
  addLabel('Cervix', () => v(36, -6.5, 0), '', notBehind);
  addLabel('Left broad ligament', () => v(84, LIGAMENT_TOP.y + 3, -LIGAMENT_TOP.z), 'lab-label-left');
  addLabel('Right broad ligament', () => v(84, LIGAMENT_TOP.y + 3, LIGAMENT_TOP.z), 'lab-label-right');
  addLabel('Calf', () => v(80, -1, 0));
  addLabel('Non-gravid horn', () => {
    const p = v(60, 16, -12);
    p.applyAxisAngle(new THREE.Vector3(1, 0, 0), theta * DEG);
    return p;
  }, '', notBehind);
  addLabel('TWIST', () => {
    const zone = twistZone(current.type);
    if (!zone || theta === 0) return null;
    const x = (zone[0] + zone[1]) / 2;
    return v(x, radiusAt(x, current.type, theta) + (current.type === 'post' ? 4 : 9), 0);
  }, 'lab-label-twist', notBehind);
  addLabel("Cow's LEFT", () => v(100, -2, -30), 'lab-label-side', ['behind', 'above']);
  addLabel("Cow's RIGHT", () => v(100, -2, 30), 'lab-label-side', ['behind', 'above']);

  // ---- views ------------------------------------------------------------
  const VIEWS: Record<TorsionView, { target: THREE.Vector3; dir: THREE.Vector3; dist: number; fov: number }> = {
    outside: { target: v(50, 6, 0), dir: v(-0.35, 0.42, 1).normalize(), dist: 128, fov: 38 },
    above: { target: v(55, 0, 0), dir: v(-0.12, 1, 0.1).normalize(), dist: 165, fov: 38 },
    behind: { target: v(84, 2, 0), dir: v(-1, 0.18, 0).normalize(), dist: 80, fov: 42 },
    vagina: { target: v(32, 0, 0), dir: v(-1, 0.02, 0).normalize(), dist: 29, fov: 72 },
  };
  let view: TorsionView = 'outside';
  let flight: { fromPos: THREE.Vector3; fromTarget: THREE.Vector3; toPos: THREE.Vector3; toTarget: THREE.Vector3; start: number } | null = null;

  function viewPose(name: TorsionView) {
    const p = VIEWS[name];
    const widen = name === 'vagina' ? 1 : Math.max(1, 1.75 / Math.max(camera.aspect, 0.3));
    return { pos: p.target.clone().addScaledVector(p.dir, p.dist * widen), target: p.target.clone() };
  }

  function applyView(name: TorsionView, animate: boolean) {
    view = name;
    const inside = name === 'vagina';
    camera.fov = VIEWS[name].fov;
    camera.updateProjectionMatrix();
    headlamp.intensity = inside ? 2.2 : 0;
    controls.enabled = !inside;
    for (const m of clipMaterials) {
      m.clippingPlanes = name === 'behind' ? [cutPlane] : [];
      m.needsUpdate = true;
    }
    lowerMesh.visible = name !== 'behind';
    labelLayer.dataset.view = name;
    const to = viewPose(name);
    if (animate && !inside && camera.position.x > 0) {
      flight = { fromPos: camera.position.clone(), fromTarget: controls.target.clone(), toPos: to.pos, toTarget: to.target, start: performance.now() };
    } else {
      flight = null;
      camera.position.copy(to.pos);
      controls.target.copy(to.target);
      controls.update();
    }
  }

  // ---- render loop -----------------------------------------------------
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

  function rebuild() {
    lower.update(current.type, theta);
    upper.update(current.type, theta);
    ligL.update(current.type, theta);
    ligR.update(current.type, theta);
    turning.rotation.x = theta * DEG;
  }
  rebuild();
  applyView('outside', false);

  let labelsOn = true;
  const tmp = new THREE.Vector3();
  let raf = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (Math.abs(targetTheta - theta) > 0.3) {
      theta += (targetTheta - theta) * 0.1;
      if (Math.abs(targetTheta - theta) <= 0.3) theta = targetTheta;
      rebuild();
    }
    if (flight) {
      const t = Math.min(1, (now - flight.start) / 700);
      const e = t * t * (3 - 2 * t);
      camera.position.lerpVectors(flight.fromPos, flight.toPos, e);
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, e);
      if (t >= 1) flight = null;
    }
    if (view === 'vagina') camera.lookAt(VIEWS.vagina.target);
    else controls.update();
    renderer.render(scene, camera);

    if (labelsOn) {
      const w = container.clientWidth;
      const h = container.clientHeight;
      for (const l of labels) {
        const p = view === 'vagina' || (l.views && !l.views.includes(view)) ? null : l.pos();
        const visible = !!p && (tmp.copy(p).project(camera), tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05);
        l.el.style.display = visible ? '' : 'none';
        if (visible) l.el.style.transform = `translate(-50%, -50%) translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
      }
    }
  };
  raf = requestAnimationFrame(loop);

  return {
    setConfig(config) {
      const typeChanged = config.type !== current.type;
      current = config;
      targetTheta = config.type === 'none' ? 0 : (config.direction === 'clockwise' ? 1 : -1) * config.degree;
      // A different type twists a different place: start again from untwisted so the change is visible.
      if (typeChanged) {
        theta = 0;
        rebuild();
      }
    },
    setView(name) {
      applyView(name, true);
    },
    setSeeThrough(on) {
      upperMat.opacity = on ? 0.42 : 1;
      upperMat.transparent = on;
      upperMat.depthWrite = !on;
      upperMat.needsUpdate = true;
    },
    setLabelsVisible(on) {
      labelsOn = on;
      labelLayer.style.display = on ? '' : 'none';
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      // Free the WebGL context right away: browsers (phones especially) allow
      // only a handful at once, and switching tabs/modes creates new ones.
      renderer.forceContextLoss();
      renderer.domElement.remove();
      labelLayer.remove();
    },
  };
}
