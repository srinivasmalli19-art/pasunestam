// 3D parasite life cycles. The host animal stands in the middle of a field;
// each life-cycle stage floats around it in a magnifying "bubble", joined by a
// ring of arrows. A dashed line points from each bubble to where that stage is
// found (inside the see-through animal, in the dung, in the canal…). The guided
// movie flies the camera from stage to stage and moves the parasite along.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HABITAT, PARASITES, type AnchorId, type HostKind, type ParasiteId, type Stage } from '@/lib/parasites/cycles';
import { GROUPS, ORGANS as MAP_ORGANS, ORGAN_ORDER, entriesFor, type GroupId, type OrganId as MapOrgan, type Species } from '@/lib/parasites/organs';
import { shotKey, type CycleFrame, type CycleShot } from '@/lib/parasites/movie';
import { buildHost, type HostModel } from './host';
import { Kit, V, radialTexture, type Model } from './kit';
import { MODELS } from './models';
import { buildWorld, type World } from './world';

export type ParasiteMode = 'movie' | 'explore' | 'break' | 'quiz' | 'organs';

export interface OrganMapState {
  species: Species;
  organ: MapOrgan | null;
  group: GroupId | null;
}

export interface ParasiteLabScene {
  setParasite(id: ParasiteId): void;
  setMode(m: ParasiteMode): void;
  setFrame(f: CycleFrame | null): void;
  select(stage: string | null): void;
  setBlocked(stages: string[], label: string): void;
  setLabels(on: boolean): void;
  setXray(on: boolean): void;
  overview(): void;
  setOrganMap(s: OrganMapState): void;
  dispose(): void;
}

const RX = 13;
const RZ = 9.5;
const BUBBLE_R = 2;
const ringAt = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  return V(RX * Math.cos(a), 4.3 - 1.5 * Math.sin(a), RZ * Math.sin(a));
};
const HOST_OF: Record<ParasiteId, HostKind> = { fluke: 'buffalo', theileria: 'cow', haemonchus: 'sheep' };
const HOST_SCALE: Record<HostKind, number> = { buffalo: 1, cow: 1, sheep: 1.4 };
const IN_HOST: AnchorId[] = ['liver', 'duodenum', 'mouth', 'rumen', 'abomasum', 'prescapular', 'prefemoral', 'jugular'];
const PLACE: Partial<Record<AnchorId, string>> = { canal: 'Canal / paddy water', dung: 'Dung', wall: 'Cracks in the shed wall', pasture: 'Wet grass' };
/** Signed shortest turn from a to b in degrees. */
const turn = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;

interface Label {
  el: HTMLElement;
  pos: () => THREE.Vector3 | null;
  pid: ParasiteId;
  kind: 'stage' | 'part' | 'place' | 'block' | 'token' | 'organ';
  species?: Species;
  stage?: string;
}

interface Bubble {
  stage: Stage;
  group: THREE.Group;
  backdrop: THREE.Mesh;
  rim: THREE.Mesh;
  rimMat: THREE.MeshBasicMaterial;
  sway: THREE.Group;
  hit: THREE.Mesh;
  model?: Model;
  anchor: THREE.Vector3;
  leader: THREE.Line;
}

interface Built {
  kit: Kit;
  root: THREE.Group;
  world: World;
  bubbles: Map<string, Bubble>;
  segments: Map<string, { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; cone: THREE.Mesh; curve: THREE.CatmullRomCurve3; color: string; full: THREE.CatmullRomCurve3 }>;
  ready: boolean;
}

export function createParasiteScene(container: HTMLElement, events: { onPick: (id: string | null) => void; onProgress: (k: number) => void; onOrgan?: (id: MapOrgan | null) => void }): ParasiteLabScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xe8eef0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  const labelLayer = document.createElement('div');
  labelLayer.className = 'lab-labels';
  container.appendChild(labelLayer);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe8eef0, 45, 95);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 220);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = 1.48;
  controls.minDistance = 2.5;
  controls.maxDistance = 95;
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xf4f8ff, 0x7d7458, 1.15));
  const sun = new THREE.DirectionalLight(0xfff4e2, 2.0);
  sun.position.set(12, 22, 14);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.8);
  fill.position.set(-3, 2, 6);
  camera.add(fill);

  const shared = new Kit();
  const hosts = new Map<HostKind, { kit: Kit; host: HostModel }>();
  const built = new Map<ParasiteId, Built>();
  const labels: Label[] = [];
  let current: ParasiteId = 'fluke';
  let mode: ParasiteMode = 'movie';
  let frame: CycleFrame | null = null;
  let selected: string | null = null;
  let blocked = new Set<string>();
  let blockLabel = '';
  let labelsOn = true;
  let xrayManual = false;

  // ---- moving token --------------------------------------------------------------------------------
  const tokenMat = shared.phys({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.25, clearcoat: 1 });
  const token = new THREE.Mesh(shared.geo(new THREE.SphereGeometry(0.34, 28, 20)), tokenMat);
  const tokenHalo = new THREE.Mesh(shared.geo(new THREE.RingGeometry(0.45, 0.58, 40)), shared.basic({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false }));
  tokenHalo.renderOrder = 8;
  token.add(tokenHalo);
  token.visible = false;
  scene.add(token);
  const tokenLabel = document.createElement('span');
  tokenLabel.className = 'lab-label pl-token';
  labelLayer.appendChild(tokenLabel);
  tokenLabel.style.display = 'none';

  const addLabel = (l: Omit<Label, 'el'>, html: string, cls: string, onClick?: () => void) => {
    const el = document.createElement(onClick ? 'button' : 'span');
    el.className = `lab-label ${cls}`;
    el.innerHTML = html;
    if (onClick && el instanceof HTMLButtonElement) {
      el.type = 'button';
      el.addEventListener('click', onClick);
    }
    el.style.display = 'none';
    labelLayer.appendChild(el);
    const full = { ...l, el };
    labels.push(full);
    return full;
  };

  // ---- host ----------------------------------------------------------------------------------------
  const hostFor = (kind: HostKind) => {
    let h = hosts.get(kind);
    if (!h) {
      const kit = new Kit();
      const host = buildHost(kit, kind);
      host.group.scale.setScalar(HOST_SCALE[kind]);
      host.group.position.x = kind === 'sheep' ? -0.6 : -0.6;
      host.group.visible = false;
      scene.add(host.group);
      host.group.updateMatrixWorld(true);
      h = { kit, host };
      hosts.set(kind, h);
    }
    return h.host;
  };
  const anchorWorld = (pid: ParasiteId, id: AnchorId): THREE.Vector3 => {
    const b = built.get(pid);
    const w = b?.world.anchor(id);
    if (w) return w;
    const host = hosts.get(HOST_OF[pid])?.host;
    const a = host?.anchor(id);
    if (host && a) return a.applyMatrix4(host.group.matrixWorld);
    return V(0, 3, 0);
  };

  // ---- building a parasite's scene (queued, so the page stays responsive) ---------------------------------
  const jobs: Array<{ pid: ParasiteId; run: () => void }> = [];
  let jobTotal = 0;
  let jobDone = 0;
  let cancelled = false;
  let scheduled = false;
  const runJobs = () => {
    scheduled = false;
    if (cancelled) return;
    const t0 = performance.now();
    while (jobs.length && performance.now() - t0 < 35) {
      jobs.shift()!.run();
      jobDone++;
    }
    events.onProgress(jobTotal ? jobDone / jobTotal : 1);
    if (jobs.length) {
      scheduled = true;
      setTimeout(runJobs, 0);
    } else {
      jobTotal = jobDone = 0;
      applyState();
    }
  };
  const queue = (pid: ParasiteId, run: () => void) => {
    jobs.push({ pid, run });
    jobTotal++;
    if (!scheduled) {
      scheduled = true;
      setTimeout(runJobs, 20);
    }
  };

  function build(pid: ParasiteId) {
    if (built.has(pid)) return;
    const p = PARASITES[pid];
    const kit = new Kit();
    const root = new THREE.Group();
    root.visible = false;
    scene.add(root);
    const b: Built = { kit, root, world: null as unknown as World, bubbles: new Map(), segments: new Map(), ready: false };
    built.set(pid, b);
    queue(pid, () => hostFor(HOST_OF[pid]));
    queue(pid, () => {
      b.world = buildWorld(kit, pid);
      root.add(b.world.group);
    });
    // bubbles, leaders and the ring
    queue(pid, () => {
      const backdropG = kit.geo(new THREE.CircleGeometry(BUBBLE_R, 64));
      const rimG = kit.geo(new THREE.TorusGeometry(BUBBLE_R, 0.06, 10, 80));
      const hitG = kit.geo(new THREE.SphereGeometry(BUBBLE_R, 16, 12));
      const hitM = kit.basic({ visible: false });
      for (const s of p.stages) {
        const h = HABITAT[s.habitat];
        const group = new THREE.Group();
        group.position.copy(ringAt(s.angle));
        const backdrop = new THREE.Mesh(backdropG, kit.basic({ map: radialTexture(kit, '#ffffff', h.bg), fog: false }));
        const rimMat = kit.basic({ color: h.color, fog: false });
        const rim = new THREE.Mesh(rimG, rimMat);
        const sway = new THREE.Group();
        const hit = new THREE.Mesh(hitG, hitM);
        hit.userData.stage = s.id;
        group.add(backdrop, rim, sway, hit);
        root.add(group);
        const anchor = anchorWorld(pid, s.anchor);
        const start = group.position.clone().add(V(0, -BUBBLE_R, 0));
        if (anchor.y > group.position.y) start.y = group.position.y + BUBBLE_R;
        const lg = kit.geo(new THREE.BufferGeometry().setFromPoints([start, anchor]));
        const leader = new THREE.Line(lg, kit.track(new THREE.LineDashedMaterial({ color: h.color, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.85 })));
        leader.computeLineDistances();
        root.add(leader);
        const dot = new THREE.Mesh(kit.geo(new THREE.SphereGeometry(0.16, 12, 10)), kit.basic({ color: h.color, depthTest: false, transparent: true }));
        dot.renderOrder = 4;
        dot.position.copy(anchor);
        root.add(dot);
        b.bubbles.set(s.id, { stage: s, group, backdrop, rim, rimMat, sway, hit, anchor, leader });
        addLabel(
          { pos: () => (group.visible ? group.position.clone().add(V(0, BUBBLE_R + 0.45, 0)) : null), pid, kind: 'stage', stage: s.id },
          `<b>${s.n}</b> ${s.short}<em>${s.mag}</em>`,
          `pl-stage${s.infective ? ' pl-infective' : ''}`,
          () => {
            if (mode === 'explore' || mode === 'break') events.onPick(s.id);
          },
        );
      }
      // the ring: one segment from each stage to the next
      p.stages.forEach((s, i) => {
        const nx = p.stages[(i + 1) % p.stages.length];
        const d = turn(s.angle, nx.angle);
        const pad = 11 * Math.sign(d);
        const pts: THREE.Vector3[] = [];
        const full: THREE.Vector3[] = [];
        for (let k = 0; k <= 16; k++) {
          pts.push(ringAt(s.angle + pad + ((d - 2 * pad) * k) / 16));
          full.push(ringAt(s.angle + (d * k) / 16));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        const color = HABITAT[s.habitat].color;
        const mat = kit.std({ color, roughness: 0.5, transparent: true, opacity: 0.9 });
        const mesh = new THREE.Mesh(kit.geo(new THREE.TubeGeometry(curve, 40, 0.075, 8, false)), mat);
        const cone = new THREE.Mesh(kit.geo(new THREE.ConeGeometry(0.26, 0.6, 16)), mat);
        cone.position.copy(curve.getPointAt(0.55));
        cone.quaternion.setFromUnitVectors(V(0, 1, 0), curve.getTangentAt(0.55));
        root.add(mesh, cone);
        b.segments.set(s.id, { mesh, mat, cone, curve, color, full: new THREE.CatmullRomCurve3(full) });
        addLabel({ pos: () => curve.getPointAt(0.55).add(V(0, 0.75, 0)), pid, kind: 'block', stage: s.id }, '✕', 'pl-block');
      });
      // place names
      for (const [id, name] of Object.entries(PLACE) as Array<[AnchorId, string]>) {
        const a = b.world.anchor(id);
        if (a) addLabel({ pos: () => a.clone().add(V(0, 0.6, 0)), pid, kind: 'place' }, name, 'pl-place');
      }
      const hostTop = V(0, HOST_OF[pid] === 'sheep' ? 6.9 : 6.7, 0);
      addLabel({ pos: () => hostTop, pid, kind: 'place' }, p.hostLabel, 'pl-place pl-host');
    });
    // the stage models (one job each)
    for (const s of p.stages) {
      queue(pid, () => {
        const bub = b.bubbles.get(s.id)!;
        const model = MODELS[s.model](kit);
        const box = new THREE.Box3().setFromObject(model.group);
        const sph = box.getBoundingSphere(new THREE.Sphere());
        const inner = new THREE.Group();
        inner.add(model.group);
        model.group.position.copy(sph.center).multiplyScalar(-1);
        inner.scale.setScalar((1.72 * (model.zoom ?? 1)) / Math.max(0.2, sph.radius));
        bub.sway.add(inner);
        bub.model = model;
        for (const part of model.parts) {
          addLabel(
            {
              pos: () => model.group.localToWorld(part.at.clone()),
              pid,
              kind: 'part',
              stage: s.id,
            },
            part.name,
            'pl-part',
          );
        }
      });
    }
    queue(pid, () => {
      b.ready = true;
    });
  }

  // ---- organ map ("where they live") ------------------------------------------------------------
  const SPECIES_HOST: Record<Species, HostKind> = { cattle: 'cow', sheep: 'sheep' };
  const ORGAN_ANCHOR: Partial<Record<MapOrgan, AnchorId>> = { liver: 'liver', rumen: 'rumen', abomasum: 'abomasum', smallInt: 'duodenum', blood: 'jugular', oesophagus: 'mouth' };
  let organMap: OrganMapState = { species: 'cattle', organ: null, group: null };
  const spotSets = new Map<Species, { group: THREE.Group; spots: Map<MapOrgan, { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; label: Label }> }>();
  const organGround = new THREE.Mesh(shared.geo(new THREE.CircleGeometry(40, 64)), shared.std({ color: 0x7f9c4c, roughness: 0.95 }));
  organGround.rotation.x = -Math.PI / 2;
  organGround.visible = false;
  scene.add(organGround);
  const spotG = shared.geo(new THREE.SphereGeometry(1, 20, 14));
  function buildSpots(sp: Species) {
    if (spotSets.has(sp)) return;
    const host = hostFor(SPECIES_HOST[sp]);
    host.group.updateMatrixWorld(true);
    const group = new THREE.Group();
    group.visible = false;
    scene.add(group);
    const spots = new Map<MapOrgan, { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; label: Label }>();
    const r = sp === 'sheep' ? 0.13 : 0.16;
    for (const id of ORGAN_ORDER) {
      const mat = shared.basic({ color: 0xffffff, depthTest: false, transparent: true });
      const mesh = new THREE.Mesh(spotG, mat);
      mesh.scale.setScalar(r);
      mesh.renderOrder = 7;
      mesh.position.copy(host.spot(id).applyMatrix4(host.group.matrixWorld));
      mesh.userData.organ = id;
      group.add(mesh);
      const label = addLabel(
        { pos: () => mesh.position.clone().add(V(0, 0.34, 0)), pid: current, kind: 'organ', species: sp },
        MAP_ORGANS[id].short,
        'pl-organ',
        () => events.onOrgan?.(id),
      );
      spots.set(id, { mesh, mat, label });
    }
    spotSets.set(sp, { group, spots });
  }
  function applyOrganMap() {
    const set = spotSets.get(organMap.species);
    for (const [sp, ss] of spotSets) ss.group.visible = mode === 'organs' && sp === organMap.species;
    if (!set) return;
    for (const [id, sp] of set.spots) {
      const all = entriesFor(id, organMap.species).length;
      const n = organMap.group ? entriesFor(id, organMap.species, organMap.group).length : all;
      const sel = organMap.organ === id;
      sp.mat.color.set(sel ? '#ffd23f' : organMap.group && n ? GROUPS[organMap.group].color : n ? '#ffffff' : '#9aa3ab');
      sp.mat.opacity = n || sel ? 1 : 0.45;
      sp.label.el.innerHTML = `${MAP_ORGANS[id].short}${n ? ` <b>${n}</b>` : ''}`;
      sp.label.el.classList.toggle('is-highlighted', sel);
      sp.label.el.classList.toggle('pl-dim', !n && !sel);
      if (organMap.group && n) sp.label.el.style.setProperty('--g', GROUPS[organMap.group].color);
      else sp.label.el.style.removeProperty('--g');
    }
  }
  const organPose = () => {
    const host = hostFor(SPECIES_HOST[organMap.species]);
    const sheep = organMap.species === 'sheep';
    if (organMap.organ) {
      const t = host.spot(organMap.organ).applyMatrix4(host.group.matrixWorld);
      const dir = V(0.25, 0.3, 1).normalize();
      return { target: t, pos: t.clone().addScaledVector(dir, (sheep ? 7.5 : 8.5) * widen(1.1)) };
    }
    const target = V(-0.2, 3.1, 0);
    return { target, pos: target.clone().add(V(1, 4.5, 17.5).multiplyScalar(widen(1.1))) };
  };

  // ---- camera ----------------------------------------------------------------------------------------------
  let fly: { fp: THREE.Vector3; tp: THREE.Vector3; ft: THREE.Vector3; tt: THREE.Vector3; start: number; dur: number } | null = null;
  let lastShot = '';
  const goTo = (target: THREE.Vector3, pos: THREE.Vector3, dur = 1300) => {
    fly = { fp: camera.position.clone(), tp: pos, ft: controls.target.clone(), tt: target, start: performance.now(), dur };
  };
  const widen = (k: number) => Math.max(1, k / Math.max(camera.aspect, 0.3));
  const bubblePos = (id: string) => built.get(current)?.bubbles.get(id)?.group.position.clone() ?? V(0, 4, 0);
  function shotPose(s: CycleShot): { target: THREE.Vector3; pos: THREE.Vector3 } {
    const sheep = HOST_OF[current] === 'sheep';
    switch (s.kind) {
      case 'overview': {
        const target = V(0, 3.0, 0.8);
        // on tall phone screens look down more, so the ring's depth fills the height
        const tall = camera.aspect < 0.85;
        return { target, pos: target.clone().add((tall ? V(0, 30, 21) : V(0, 14.5, 32)).multiplyScalar(widen(tall ? 1.15 : 1.5))) };
      }
      case 'stage': {
        const c = bubblePos(s.stage);
        // look from outside the ring, so neighbouring bubbles are not in the way
        const dir = V((c.x / RX) * 0.9, 0.5, (c.z / RZ) * 0.9 + 0.45).normalize();
        return { target: c, pos: c.clone().addScaledVector(dir, 8.6 * widen(1.05)) };
      }
      case 'host': {
        const a = anchorWorld(current, s.anchor);
        const dir = V(0.3, 0.32, 1).normalize();
        return { target: a, pos: a.clone().addScaledVector(dir, (sheep ? 11 : 13) * widen(1.2)) };
      }
      case 'hostWide': {
        const target = V(-0.4, 3.3, 0);
        return { target, pos: target.clone().add(V(1.5, 6.5, 16).multiplyScalar(widen(1.6))) };
      }
      case 'pair': {
        const a = bubblePos(s.from);
        const b = bubblePos(s.to);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const dist = Math.max(11, a.distanceTo(b) * 1.15 + 6.5) * widen(1.3);
        const dir = V(0.3 * Math.sign(mid.x || 1), 0.55, 1).normalize();
        return { target: mid, pos: mid.clone().addScaledVector(dir, dist) };
      }
    }
  }
  const applyShot = (s: CycleShot, force = false) => {
    const key = `${current}:${shotKey(s)}`;
    if (!force && key === lastShot) return;
    lastShot = key;
    const { target, pos } = shotPose(s);
    goTo(target, pos);
  };

  // ---- state → scene ------------------------------------------------------------------------------------
  const focusStage = () => (mode === 'movie' ? frame?.focus ?? null : mode === 'explore' ? selected : null);
  const stageAnchoredInHost = (id: string | null) => {
    if (!id) return false;
    const s = PARASITES[current].stages.find((x) => x.id === id);
    return !!s && IN_HOST.includes(s.anchor);
  };

  function applyState() {
    const b = built.get(current);
    organGround.visible = mode === 'organs';
    if (mode === 'organs') {
      for (const bb of built.values()) bb.root.visible = false;
      const kind = SPECIES_HOST[organMap.species];
      for (const [k, h] of hosts) {
        h.host.group.visible = k === kind;
        if (k === kind) {
          h.host.setXray(true);
          h.host.setFocus(organMap.organ ? ORGAN_ANCHOR[organMap.organ] ?? null : null);
          h.host.setSigns({});
        }
      }
      token.visible = false;
      applyOrganMap();
      return;
    }
    for (const ss of spotSets.values()) ss.group.visible = false;
    for (const [pid, bb] of built) bb.root.visible = pid === current && bb.ready;
    for (const [kind, h] of hosts) h.host.group.visible = kind === HOST_OF[current] && !!b?.ready;
    if (!b?.ready) return;
    const host = hosts.get(HOST_OF[current])!.host;
    const f = focusStage();
    const xray = xrayManual || (mode === 'movie' ? !!frame?.xray || stageAnchoredInHost(f) : stageAnchoredInHost(f));
    host.setXray(xray);
    const p = PARASITES[current];
    const hostShot = mode === 'movie' && frame?.shot.kind === 'host' ? frame.shot.anchor : null;
    host.setFocus(hostShot ?? (f ? p.stages.find((s) => s.id === f)?.anchor ?? null : null));
    host.setSigns({ nodes: current === 'theileria', bottleJaw: current === 'haemonchus' });
    for (const [id, bub] of b.bubbles) {
      const isBlocked = mode === 'break' && blocked.has(id);
      bub.rimMat.color.set(isBlocked ? '#d32f2f' : id === f ? '#1c2127' : HABITAT[bub.stage.habitat].color);
      bub.rim.scale.setScalar(id === f ? 1.04 : 1);
    }
    for (const [id, seg] of b.segments) {
      const cut = mode === 'break' && blocked.has(id);
      seg.mat.color.set(cut ? '#b0b0b0' : seg.color);
      seg.mat.opacity = cut ? 0.4 : 0.9;
    }
  }

  // ---- picking ---------------------------------------------------------------------------------------------
  const ray = new THREE.Raycaster();
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    down = null;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    if (mode === 'organs') {
      const set = spotSets.get(organMap.species);
      if (!set) return;
      const hits = ray.intersectObjects([...set.spots.values()].map((x) => x.mesh), false);
      if (hits[0]) events.onOrgan?.(hits[0].object.userData.organ as MapOrgan);
      return;
    }
    if (mode !== 'explore' && mode !== 'break') return;
    const b = built.get(current);
    if (!b?.ready) return;
    const hits = ray.intersectObjects([...b.bubbles.values()].map((x) => x.hit), false);
    events.onPick(hits[0] ? (hits[0].object.userData.stage as string) : null);
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);

  // ---- resize ---------------------------------------------------------------------------------------------
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
    const { target, pos } = shotPose({ kind: 'overview' });
    controls.target.copy(target);
    camera.position.copy(pos);
    controls.update();
  }

  // ---- frame loop -------------------------------------------------------------------------------------------
  const tmp = V(0, 0, 0);
  const camDir = V(0, 0, 0);
  const t0 = performance.now();
  let raf = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const t = (now - t0) / 1000;
    if (fly) {
      const k = Math.min(1, (now - fly.start) / fly.dur);
      const e = k * k * (3 - 2 * k);
      camera.position.lerpVectors(fly.fp, fly.tp, e);
      controls.target.lerpVectors(fly.ft, fly.tt, e);
      if (k >= 1) fly = null;
    }
    controls.update();
    const b = built.get(current);
    const host = hosts.get(HOST_OF[current])?.host;
    host?.update(t);
    const f = focusStage();
    if (b?.ready) {
      b.world.update(t);
      camera.getWorldDirection(camDir);
      // inside-the-animal shots: only the bubbles that matter, so nothing hides the animal
      const inside = mode === 'movie' && (frame?.shot.kind === 'host' || frame?.shot.kind === 'hostWide');
      for (const [id, bub] of b.bubbles) {
        bub.group.visible = !inside || id === frame?.token?.from || id === frame?.token?.to;
        bub.backdrop.quaternion.copy(camera.quaternion);
        bub.rim.quaternion.copy(camera.quaternion);
        const d = Math.max(0.5, camera.position.distanceTo(bub.group.position));
        bub.backdrop.position.copy(camDir).multiplyScalar(1.75);
        bub.backdrop.scale.setScalar((d + 1.75) / d);
        // the model turns to face you, with a gentle sway
        const yaw = Math.atan2(camera.position.x - bub.group.position.x, camera.position.z - bub.group.position.z);
        bub.sway.rotation.y = yaw + 0.3 * Math.sin(t * 0.35 + bub.stage.n);
        // animate only what can be seen well
        if (bub.model?.update && (id === f || d < 30 || mode !== 'movie')) bub.model.update(t);
      }
      // token
      const tk = mode === 'movie' ? frame?.token : undefined;
      if (tk) {
        const p = PARASITES[current];
        const to = p.stages.find((s) => s.id === tk.to)!;
        let pos: THREE.Vector3;
        if (tk.via && host) {
          const pts = host.path(tk.via)!.map((q) => q.applyMatrix4(host.group.matrixWorld));
          pos = new THREE.CatmullRomCurve3(pts).getPointAt(tk.u);
        } else {
          pos = b.segments.get(tk.from)!.full.getPointAt(tk.u);
        }
        token.position.copy(pos);
        token.visible = true;
        const col = HABITAT[to.habitat].color;
        tokenMat.color.set(col);
        tokenMat.emissive.set(col);
        tokenHalo.quaternion.copy(camera.quaternion);
        tokenHalo.scale.setScalar(1 + 0.12 * Math.sin(t * 5));
        token.scale.setScalar(tk.via ? 0.7 : 1);
        tokenLabel.textContent = to.short;
      } else token.visible = false;
    }
    renderer.render(scene, camera);

    // labels
    const w = container.clientWidth;
    const h = container.clientHeight;
    const placed: Array<[number, number, number, number]> = [];
    const place = (el: HTMLElement, p: THREE.Vector3 | null) => {
      if (!p) {
        el.style.display = 'none';
        return;
      }
      tmp.copy(p).project(camera);
      if (tmp.z > 1 || Math.abs(tmp.x) > 1.02 || Math.abs(tmp.y) > 1.02) {
        el.style.display = 'none';
        return;
      }
      el.style.display = '';
      const hw = el.offsetWidth / 2 + 2;
      const hh = el.offsetHeight / 2 + 1;
      const x = Math.min(w - hw, Math.max(hw, ((tmp.x + 1) / 2) * w));
      const y = Math.min(h - hh, Math.max(hh, ((1 - tmp.y) / 2) * h));
      if (placed.some(([px, py, pw, ph]) => Math.abs(px - x) < pw + hw && Math.abs(py - y) < ph + hh)) {
        el.style.display = 'none';
        return;
      }
      placed.push([x, y, hw, hh]);
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    };
    // the token first, then focused parts, then the rest
    place(tokenLabel, token.visible ? token.position.clone().add(V(0, 0.75, 0)) : null);
    const ordered = [...labels].sort((a, c) => rank(a) - rank(c));
    for (const l of ordered) {
      if (l.kind === 'organ' || mode === 'organs') {
        const on = mode === 'organs' && l.kind === 'organ' && l.species === organMap.species && labelsOn;
        place(l.el, on ? l.pos() : null);
        continue;
      }
      if (l.pid !== current || !b?.ready) {
        l.el.style.display = 'none';
        continue;
      }
      let show = labelsOn || l.kind === 'block';
      if (l.kind === 'part') show = labelsOn && l.stage === f;
      if (l.kind === 'block') show = mode === 'break' && blocked.has(l.stage!);
      if (l.kind === 'place') show = labelsOn && !f;
      if (l.kind === 'stage') {
        l.el.classList.toggle('is-highlighted', l.stage === f || (mode === 'break' && blocked.has(l.stage!)));
        l.el.classList.toggle('pl-blocked', mode === 'break' && blocked.has(l.stage!));
      }
      place(l.el, show ? l.pos() : null);
    }
  };
  const rank = (l: Label) => (l.kind === 'organ' && l.el.classList.contains('is-highlighted') ? -1 : l.kind === 'block' ? 0 : l.kind === 'part' ? 1 : l.kind === 'stage' ? 2 : 3);
  raf = requestAnimationFrame(loop);

  build(current);

  return {
    setParasite(id) {
      if (id === current) return;
      current = id;
      selected = null;
      blocked = new Set();
      lastShot = '';
      build(id);
      applyState();
      applyShot({ kind: 'overview' }, true);
    },
    setMode(m) {
      const was = mode;
      mode = m;
      if (m !== 'explore') selected = null;
      if (m === 'organs') {
        queue(current, () => buildSpots(organMap.species));
        queue(current, () => {
          applyState();
          const { target, pos } = organPose();
          goTo(target, pos);
        });
        lastShot = '';
        applyState();
        return;
      }
      if (was === 'organs') {
        lastShot = '';
        applyShot({ kind: 'overview' }, true);
      }
      if (m === 'break' || m === 'quiz' || m === 'explore') applyShot({ kind: 'overview' });
      applyState();
    },
    setFrame(f) {
      frame = f;
      if (f && mode === 'movie') applyShot(f.shot);
      applyState();
    },
    select(id) {
      selected = id;
      applyShot(id ? { kind: 'stage', stage: id } : { kind: 'overview' }, true);
      applyState();
    },
    setBlocked(ids, label) {
      blocked = new Set(ids);
      blockLabel = label;
      for (const l of labels) if (l.kind === 'block') l.el.title = blockLabel;
      applyState();
    },
    setLabels(on) {
      labelsOn = on;
    },
    setXray(on) {
      xrayManual = on;
      applyState();
    },
    overview() {
      if (mode === 'organs') {
        organMap = { ...organMap, organ: null };
        applyState();
        const { target, pos } = organPose();
        goTo(target, pos);
        return;
      }
      applyShot({ kind: 'overview' }, true);
    },
    setOrganMap(st) {
      const moved = st.species !== organMap.species || st.organ !== organMap.organ;
      organMap = st;
      if (mode !== 'organs') return;
      if (!spotSets.has(st.species)) {
        queue(current, () => buildSpots(st.species));
        queue(current, () => {
          applyState();
          const { target, pos } = organPose();
          goTo(target, pos);
        });
        return;
      }
      applyState();
      if (moved) {
        const { target, pos } = organPose();
        goTo(target, pos);
      }
    },
    dispose() {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      for (const b of built.values()) b.kit.dispose();
      for (const h of hosts.values()) h.kit.dispose();
      shared.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      labelLayer.remove();
    },
  };
}
