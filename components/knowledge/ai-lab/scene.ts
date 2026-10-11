// The 3D scene for the AI practice lab, in plain three.js (no React), built
// entirely in code from the measurements in lib/ai-lab/anatomy.ts — a clear
// teaching schematic, not a photo-realistic specimen. AiLab.tsx drives it
// through the small API returned by createLabScene().

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ENTRY, PARTS, RADIUS, X, centreY, hornPath, type PartId } from '@/lib/ai-lab/anatomy';
import type { GunPose, Status } from '@/lib/ai-lab/practice';

export type CameraPreset = 'overview' | 'vulva' | 'cervix' | 'uterus';

export interface LabScene {
  setGunVisible(visible: boolean): void;
  setGunPose(pose: GunPose): void;
  setTipStatus(status: Status | 'neutral'): void;
  setHandVisible(visible: boolean): void;
  setTargetVisible(visible: boolean): void;
  setDepositVisible(visible: boolean): void;
  setHighlight(parts: PartId[]): void;
  setCutaway(on: boolean): void;
  setSeeThrough(on: boolean): void;
  setLabelsVisible(on: boolean): void;
  focus(preset: CameraPreset): void;
  onPick(cb: (part: PartId) => void): void;
  dispose(): void;
}

// ---- geometry helpers ----------------------------------------------------

/** A tube along `curve` whose radius can change along its length. */
function variableTube(curve: THREE.Curve<THREE.Vector3>, radiusAt: (t: number, p: THREE.Vector3) => number, segments = 96, radial = 28) {
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [];
  const indices: number[] = [];
  const p = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, p);
    const r = radiusAt(t, p);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      positions.push(p.x + r * (c * N.x + s * B.x), p.y + r * (c * N.y + s * B.y), p.z + r * (c * N.z + s * B.z));
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = (i + 1) * (radial + 1) + j;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** The tract's centre line from x0 to x1 (straight in z, sloping up through the vestibule). */
function tractCurve(x0: number, x1: number) {
  const pts: THREE.Vector3[] = [];
  const n = Math.max(2, Math.ceil((x1 - x0) / 1.5));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push(new THREE.Vector3(x, centreY(x), 0));
  }
  return new THREE.CatmullRomCurve3(pts);
}

/** A flat ring facing along x (closing off the end of a tube), between radii r0 and r1. */
function ringAtX(x: number, r0: number, r1: number) {
  const g = new THREE.RingGeometry(r0, r1, 40);
  g.rotateY(Math.PI / 2);
  g.translate(x, centreY(x), 0);
  return g;
}

const COLORS = {
  tract: 0xd98c8c,
  vestibule: 0xe0a09a,
  cervix: 0xb35c6b,
  uterus: 0xe39aa4,
  ovary: 0xe7c27c,
  rectum: 0x9b7a57,
  bladder: 0xe6d06a,
  urethra: 0xd2b25a,
  hand: 0xf1c8a6,
  target: 0x2e9d55,
  highlight: 0xffd23f,
};

// ---- the scene -------------------------------------------------------------

export function createLabScene(container: HTMLElement): LabScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
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
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 600);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 12;
  controls.maxDistance = 180;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a99a, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(30, 60, 80);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6);
  rim.position.set(-40, 20, -60);
  scene.add(rim);

  // Cut-away: hides the near (+z) half so the inside is visible.
  const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

  const disposables: Array<{ dispose(): void }> = [];
  const pickables: THREE.Mesh[] = [];
  const partMaterials = new Map<PartId, THREE.MeshStandardMaterial[]>();
  const anatomyMaterials: THREE.MeshStandardMaterial[] = [];

  function material(color: number, opts: { part?: PartId; baseOpacity?: number; anatomy?: boolean } = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.02, side: THREE.DoubleSide });
    m.userData.baseOpacity = opts.baseOpacity ?? 1;
    m.userData.baseColor = color;
    if (opts.baseOpacity !== undefined && opts.baseOpacity < 1) {
      m.transparent = true;
      m.opacity = opts.baseOpacity;
      m.depthWrite = false;
    }
    if (opts.anatomy !== false) anatomyMaterials.push(m);
    if (opts.part) {
      const list = partMaterials.get(opts.part) ?? [];
      list.push(m);
      partMaterials.set(opts.part, list);
    }
    disposables.push(m);
    return m;
  }

  function addMesh(geometry: THREE.BufferGeometry, mat: THREE.Material, part?: PartId, parent: THREE.Object3D = scene) {
    const mesh = new THREE.Mesh(geometry, mat);
    if (part) {
      mesh.userData.part = part;
      pickables.push(mesh);
    }
    parent.add(mesh);
    disposables.push(geometry);
    return mesh;
  }

  const anatomy = new THREE.Group();
  scene.add(anatomy);

  // Vulva: two lips around the opening.
  {
    const g = new THREE.TorusGeometry(RADIUS.vestibule + 0.4, 1.1, 18, 40);
    g.rotateY(Math.PI / 2);
    g.scale(1, 1.35, 1);
    g.translate(X.vulva - 0.3, centreY(0), 0);
    addMesh(g, material(0xc97c7c, { part: 'vulva' }), 'vulva', anatomy);
  }

  // Vestibule (slopes upward), then vagina.
  addMesh(
    variableTube(tractCurve(X.vulva, X.vestibuleEnd + 0.3), (t) => RADIUS.vestibule + 0.4 * (1 - t) ** 2, 40),
    material(COLORS.vestibule, { part: 'vestibule' }),
    'vestibule',
    anatomy
  );
  addMesh(
    variableTube(tractCurve(X.vestibuleEnd, X.vaginaEnd), (_t, p) => RADIUS.vagina - (p.x > 30 ? 0 : 0.25 * Math.sin(((p.x - 12) / 18) * Math.PI)), 60),
    material(COLORS.tract, { part: 'vagina' }),
    'vagina',
    anatomy
  );
  // Fornix: the blind end of the vagina around the cervix.
  addMesh(ringAtX(X.vaginaEnd, RADIUS.cervixOuter - 0.05, RADIUS.vagina), material(0xc9767f, { part: 'fornix' }), 'fornix', anatomy);

  // Urethral opening on the vestibule floor, the diverticulum below it, the urethra and bladder.
  const floorY = centreY(X.urethralOpening) - RADIUS.vestibule;
  {
    const g = new THREE.TorusGeometry(0.55, 0.22, 12, 24);
    g.rotateX(Math.PI / 2);
    g.translate(X.urethralOpening, floorY + 0.05, 0);
    addMesh(g, material(0x7a2f3a, { part: 'urethralOpening' }), 'urethralOpening', anatomy);
    const pouch = new THREE.SphereGeometry(1, 24, 16);
    pouch.scale(1.6, 0.9, 1);
    pouch.translate(X.urethralOpening - 1.4, floorY - 0.8, 0);
    addMesh(pouch, material(0xb35a68, { part: 'diverticulum' }), 'diverticulum', anatomy);

    const urethra = new THREE.CatmullRomCurve3([
      new THREE.Vector3(X.urethralOpening + 0.3, floorY - 0.2, 0),
      new THREE.Vector3(14, floorY - 2.6, 0),
      new THREE.Vector3(19, -9.2, 0),
    ]);
    addMesh(new THREE.TubeGeometry(urethra, 30, 0.45, 12, false), material(COLORS.urethra, { part: 'bladder' }), 'bladder', anatomy);
    const bladder = new THREE.SphereGeometry(3.8, 32, 24);
    bladder.scale(1.3, 0.9, 1);
    bladder.translate(24, -11, 0);
    addMesh(bladder, material(COLORS.bladder, { part: 'bladder', baseOpacity: 0.4 }), 'bladder', anatomy);
  }

  // Cervix: firm outer wall with ring bulges, a narrow canal, and end walls.
  const ringBulge = (x: number) => X.cervicalRings.reduce((sum, r) => sum + 0.38 * Math.exp(-((x - r) ** 2) / 0.35), 0);
  addMesh(
    variableTube(tractCurve(X.cervixStart, X.cervixEnd), (_t, p) => RADIUS.cervixOuter + ringBulge(p.x), 90),
    material(COLORS.cervix, { part: 'cervix' }),
    'cervix',
    anatomy
  );
  addMesh(
    variableTube(tractCurve(X.cervixStart, X.cervixEnd), (_t, p) => RADIUS.cervicalCanal - 0.55 * ringBulge(p.x), 90, 20),
    material(0x8f3f50, { part: 'cervix' }),
    'cervix',
    anatomy
  );
  addMesh(ringAtX(X.cervixStart, RADIUS.cervicalCanal, RADIUS.cervixOuter), material(COLORS.cervix, { part: 'cervix' }), 'cervix', anatomy);
  addMesh(ringAtX(X.cervixEnd, RADIUS.cervicalCanal, RADIUS.cervixOuter), material(COLORS.cervix, { part: 'cervix' }), 'cervix', anatomy);

  // Uterine body, two horns curling like ram's horns, oviducts and ovaries.
  addMesh(
    variableTube(tractCurve(X.cervixEnd - 0.2, X.uterineBodyEnd + 0.8), (t) => RADIUS.uterineBody + 0.4 * t, 24),
    material(COLORS.uterus, { part: 'uterineBody' }),
    'uterineBody',
    anatomy
  );
  for (const side of [1, -1] as const) {
    const pts = hornPath(side).map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const curve = new THREE.CatmullRomCurve3(pts);
    addMesh(variableTube(curve, (t) => 2.2 - 1.3 * t, 90, 22), material(COLORS.uterus, { part: 'horns' }), 'horns', anatomy);
    const tip = pts[pts.length - 1];
    const cap = new THREE.SphereGeometry(0.9, 16, 12);
    cap.translate(tip.x, tip.y, tip.z);
    addMesh(cap, material(COLORS.uterus, { part: 'horns' }), 'horns', anatomy);

    const ovaryPos = new THREE.Vector3(51.5, -3.2, 8.4 * side);
    const oviduct = new THREE.CatmullRomCurve3([
      tip,
      new THREE.Vector3(tip.x - 0.6, tip.y + 2.2, tip.z + 1.3 * side),
      new THREE.Vector3(tip.x + 1.6, tip.y + 3.4, tip.z + 2.6 * side),
      ovaryPos.clone().add(new THREE.Vector3(-1.2, -0.2, -0.6 * side)),
    ]);
    addMesh(new THREE.TubeGeometry(oviduct, 40, 0.22, 8, false), material(COLORS.uterus, { part: 'ovaries' }), 'ovaries', anatomy);
    const ovary = new THREE.SphereGeometry(1, 24, 16);
    ovary.scale(1.9, 1.25, 1.25);
    ovary.translate(ovaryPos.x, ovaryPos.y, ovaryPos.z);
    addMesh(ovary, material(COLORS.ovary, { part: 'ovaries' }), 'ovaries', anatomy);
  }

  // Rectum above the tract.
  const rectum = addMesh(
    variableTube(new THREE.LineCurve3(new THREE.Vector3(-4, 7.6, 0), new THREE.Vector3(58, 8.6, 0)), () => 3.3, 40, 24),
    material(COLORS.rectum, { part: 'rectum', baseOpacity: 0.13 }),
    'rectum',
    anatomy
  );

  // Everything in the anatomy group gets the cut-away plane when it's on.
  const clipTargets = anatomyMaterials.slice();

  // ---- the vet's hand in the rectum, cupping the cervix -----------------
  const hand = new THREE.Group();
  {
    const handMat = material(COLORS.hand, { baseOpacity: 0.38, anatomy: false });
    const arm = new THREE.CapsuleGeometry(2.3, 22, 6, 16);
    arm.rotateZ(Math.PI / 2);
    arm.translate(22, 7.9, 0);
    addMesh(arm, handMat, undefined, hand);
    const palm = new THREE.SphereGeometry(2.6, 20, 14);
    palm.scale(1.5, 0.9, 1.2);
    palm.translate(37, 6.2, 0);
    addMesh(palm, handMat, undefined, hand);
    // Fingers wrapping around the cervix through the rectal wall.
    for (const dx of [-2.4, -0.8, 0.8, 2.4]) {
      const f = new THREE.TorusGeometry(RADIUS.cervixOuter + 0.9, 0.42, 10, 30, Math.PI * 1.25);
      f.rotateY(Math.PI / 2);
      f.rotateX(-Math.PI * 0.125);
      f.translate(38 + dx, 0.2, 0);
      addMesh(f, handMat, undefined, hand);
    }
  }
  hand.visible = false;
  scene.add(hand);

  // ---- correct deposition site marker ----------------------------------
  const target = new THREE.Group();
  {
    const g = new THREE.CylinderGeometry(RADIUS.uterineBody - 0.3, RADIUS.uterineBody - 0.3, X.uterineBodyEnd - X.cervixEnd - 0.6, 28, 1, true);
    g.rotateZ(Math.PI / 2);
    g.translate((X.cervixEnd + X.uterineBodyEnd) / 2, 0, 0);
    const m = new THREE.MeshBasicMaterial({ color: COLORS.target, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
    disposables.push(m);
    addMesh(g, m, undefined, target);
  }
  target.visible = false;
  scene.add(target);

  // ---- the AI gun --------------------------------------------------------
  const GUN_LENGTH = 46;
  const gun = new THREE.Group();
  const gunInner = new THREE.Group(); // shifted along local x so the tip sits at `depth`
  gun.add(gunInner);
  {
    const sheathMat = new THREE.MeshStandardMaterial({ color: 0x9cc3ee, roughness: 0.35, metalness: 0.1 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xc8ced6, roughness: 0.3, metalness: 0.75 });
    disposables.push(sheathMat, steelMat);
    const rod = new THREE.CylinderGeometry(0.38, 0.38, GUN_LENGTH - 8, 16);
    rod.rotateZ(Math.PI / 2);
    rod.translate(-(GUN_LENGTH - 8) / 2, 0, 0);
    addMesh(rod, sheathMat, undefined, gunInner);
    const tipGeo = new THREE.SphereGeometry(0.38, 16, 12);
    addMesh(tipGeo, sheathMat, undefined, gunInner);
    const body = new THREE.CylinderGeometry(0.75, 0.75, 6, 18);
    body.rotateZ(Math.PI / 2);
    body.translate(-(GUN_LENGTH - 8) - 3, 0, 0);
    addMesh(body, steelMat, undefined, gunInner);
    const plunger = new THREE.CylinderGeometry(0.3, 0.3, 4, 12);
    plunger.rotateZ(Math.PI / 2);
    plunger.translate(-(GUN_LENGTH - 8) - 8, 0, 0);
    addMesh(plunger, steelMat, undefined, gunInner);
    const ringG = new THREE.TorusGeometry(1.1, 0.25, 10, 24);
    ringG.rotateY(Math.PI / 2);
    ringG.translate(-(GUN_LENGTH - 8) - 10, 0, 0);
    addMesh(ringG, steelMat, undefined, gunInner);
  }
  const tipMarkerMat = new THREE.MeshBasicMaterial({ color: 0x3b6fd8 });
  disposables.push(tipMarkerMat);
  const tipMarker = addMesh(new THREE.SphereGeometry(0.62, 16, 12), tipMarkerMat, undefined, gunInner);
  const deposit = new THREE.Group();
  {
    const m = new THREE.MeshStandardMaterial({ color: 0x6fb7ff, transparent: true, opacity: 0.75, roughness: 0.2 });
    disposables.push(m);
    const offsets = [[0.9, 0, 0], [1.4, 0.5, 0.3], [1.3, -0.4, -0.4], [1.9, 0.1, -0.2], [1.1, 0.2, 0.7], [1.7, -0.3, 0.5]];
    for (const [x, y, z] of offsets) addMesh(new THREE.SphereGeometry(0.38, 12, 10).translate(x, y, z), m, undefined, deposit);
  }
  deposit.visible = false;
  gunInner.add(deposit);
  gun.position.set(ENTRY.x, ENTRY.y, ENTRY.z);
  gun.visible = false;
  scene.add(gun);

  // ---- labels -----------------------------------------------------------
  const LABEL_POS: Array<[PartId, THREE.Vector3]> = [
    ['vulva', new THREE.Vector3(-3.5, -5.5, 1)],
    ['urethralOpening', new THREE.Vector3(15, -8.6, 3)],
    ['diverticulum', new THREE.Vector3(3, -12, 2)],
    ['vestibule', new THREE.Vector3(5, 3.3, 2)],
    ['vagina', new THREE.Vector3(22, 5.6, 2)],
    ['fornix', new THREE.Vector3(34.5, -5.6, 3)],
    ['cervix', new THREE.Vector3(38, 4.2, 2)],
    ['uterineBody', new THREE.Vector3(45, -3.6, 2)],
    ['horns', new THREE.Vector3(55, -10.5, 6)],
    ['ovaries', new THREE.Vector3(52, 0.6, 9)],
    ['rectum', new THREE.Vector3(50, 13.2, 0)],
    ['bladder', new THREE.Vector3(26, -16.5, 2)],
  ];
  const SHORT_NAME: Partial<Record<PartId, string>> = {
    urethralOpening: 'Urethral opening',
    diverticulum: 'Diverticulum',
    uterineBody: 'Uterine body',
    bladder: 'Bladder',
  };
  const labelEls = LABEL_POS.map(([part, pos]) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'lab-label';
    el.textContent = SHORT_NAME[part] ?? PARTS[part].name;
    el.dataset.part = part;
    labelLayer.appendChild(el);
    return { el, pos, part };
  });

  // ---- camera presets ---------------------------------------------------
  // Each view is a point to look at, a viewing direction and a distance tuned
  // for a landscape screen; narrower screens (phones) move the camera back so
  // the same part still fits across.
  const PRESETS: Record<CameraPreset, { target: THREE.Vector3; dir: THREE.Vector3; dist: number }> = {
    overview: { target: new THREE.Vector3(27, -1.5, 0), dir: new THREE.Vector3(-0.12, 0.22, 1).normalize(), dist: 64 },
    vulva: { target: new THREE.Vector3(7, -2, 0), dir: new THREE.Vector3(-0.45, 0.18, 1).normalize(), dist: 30 },
    cervix: { target: new THREE.Vector3(38, 0, 0), dir: new THREE.Vector3(-0.22, 0.12, 1).normalize(), dist: 30 },
    uterus: { target: new THREE.Vector3(47.5, -2.5, 0), dir: new THREE.Vector3(0.05, 0.22, 1).normalize(), dist: 36 },
  };
  function presetView(name: CameraPreset) {
    const p = PRESETS[name];
    const widen = Math.max(1, 1.6 / Math.max(camera.aspect, 0.3));
    return { target: p.target.clone(), pos: p.target.clone().addScaledVector(p.dir, p.dist * widen) };
  }
  let flight: { fromPos: THREE.Vector3; fromTarget: THREE.Vector3; to: { pos: THREE.Vector3; target: THREE.Vector3 }; start: number } | null = null;

  // ---- picking ------------------------------------------------------------
  let pickCb: ((part: PartId) => void) | null = null;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downAt: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pickables.filter((m) => m.visible), false);
    const hit = hits.find((h) => !cutawayOn || h.point.z <= 0.01);
    if (hit && pickCb) pickCb(hit.object.userData.part as PartId);
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);
  const onLabelClick = (e: MouseEvent) => {
    const part = (e.target as HTMLElement).dataset.part as PartId | undefined;
    if (part && pickCb) pickCb(part);
  };
  labelLayer.addEventListener('click', onLabelClick);

  // ---- resize & render loop -------------------------------------------
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
    const start = presetView('overview');
    camera.position.copy(start.pos);
    controls.target.copy(start.target);
    controls.update();
  }

  let cutawayOn = false;
  let labelsOn = true;
  const tmp = new THREE.Vector3();
  let raf = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (flight) {
      const t = Math.min(1, (now - flight.start) / 700);
      const e = t * t * (3 - 2 * t);
      camera.position.lerpVectors(flight.fromPos, flight.to.pos, e);
      controls.target.lerpVectors(flight.fromTarget, flight.to.target, e);
      if (t >= 1) flight = null;
    }
    controls.update();
    renderer.render(scene, camera);

    if (labelsOn) {
      const w = container.clientWidth;
      const h = container.clientHeight;
      for (const l of labelEls) {
        tmp.copy(l.pos).project(camera);
        const visible = tmp.z < 1 && tmp.x > -1.05 && tmp.x < 1.05 && tmp.y > -1.05 && tmp.y < 1.05;
        l.el.style.display = visible ? '' : 'none';
        if (visible) l.el.style.transform = `translate(-50%, -50%) translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
      }
    }
  };
  raf = requestAnimationFrame(loop);

  // ---- API ------------------------------------------------------------------
  let highlighted: PartId[] = [];
  let seeThroughOn = false;

  function applyMaterialState() {
    for (const m of anatomyMaterials) {
      const base = m.userData.baseOpacity as number;
      const opacity = seeThroughOn ? Math.min(base, 0.32) : base;
      m.opacity = opacity;
      m.transparent = opacity < 1;
      m.depthWrite = opacity >= 1;
      m.color.setHex(m.userData.baseColor as number);
      m.emissive.setHex(0x000000);
      m.needsUpdate = true;
    }
    for (const part of highlighted) {
      for (const m of partMaterials.get(part) ?? []) {
        m.emissive.setHex(COLORS.highlight);
        m.emissiveIntensity = 0.55;
        if (seeThroughOn) {
          m.opacity = Math.max(m.opacity, 0.6);
          m.transparent = m.opacity < 1;
        }
      }
    }
    for (const l of labelEls) l.el.classList.toggle('is-highlighted', highlighted.includes(l.part));
  }

  const TIP_COLORS: Record<Status | 'neutral', number> = {
    neutral: 0x3b6fd8,
    ok: 0x3b6fd8,
    hint: 0x3b6fd8,
    success: 0x22a352,
    warn: 0xf0a020,
    error: 0xd83a2e,
  };

  return {
    setGunVisible(v) {
      gun.visible = v;
    },
    setGunPose(pose) {
      gun.rotation.set(0, (-pose.yawDeg * Math.PI) / 180, (pose.pitchDeg * Math.PI) / 180, 'YZX');
      gunInner.position.set(pose.depth, 0, 0);
    },
    setTipStatus(status) {
      tipMarkerMat.color.setHex(TIP_COLORS[status]);
      tipMarker.scale.setScalar(status === 'neutral' || status === 'ok' || status === 'hint' ? 1 : 1.35);
    },
    setHandVisible(v) {
      hand.visible = v;
    },
    setTargetVisible(v) {
      target.visible = v;
    },
    setDepositVisible(v) {
      deposit.visible = v;
    },
    setHighlight(parts) {
      highlighted = parts;
      applyMaterialState();
    },
    setCutaway(on) {
      cutawayOn = on;
      // A halved rectum just blocks the close-ups; the cut-away is for seeing inside the tract.
      rectum.visible = !on;
      for (const m of clipTargets) {
        m.clippingPlanes = on ? [cutPlane] : [];
        m.needsUpdate = true;
      }
    },
    setSeeThrough(on) {
      seeThroughOn = on;
      applyMaterialState();
    },
    setLabelsVisible(on) {
      labelsOn = on;
      labelLayer.style.display = on ? '' : 'none';
    },
    focus(preset) {
      flight = { fromPos: camera.position.clone(), fromTarget: controls.target.clone(), to: presetView(preset), start: performance.now() };
    },
    onPick(cb) {
      pickCb = cb;
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      labelLayer.removeEventListener('click', onLabelClick);
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
