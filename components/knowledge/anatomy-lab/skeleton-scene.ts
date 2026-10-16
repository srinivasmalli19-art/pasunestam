// The whole cow skeleton in 3D: hover to see a bone's name, click to select it.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BONES, type Region } from '@/lib/anatomy/cow-bones';
import { buildSkeleton, type Piece } from '@/lib/anatomy/cow-skeleton';
import { cellFor, pieceMatrix, shapeGeometry, tubeGeometry } from './geometry';

export interface SkeletonScene {
  setSelected(id: string | null): void;
  setRegion(r: Region | null): void;
  setSides(both: boolean): void;
  resetView(): void;
  dispose(): void;
}

const BONE = 0xefe5cf;
const CARTILAGE = 0xbfd9e3;
const HILITE = 0xff9f1a;

export function createSkeletonScene(
  container: HTMLElement,
  events: { onSelect: (p: Piece | null) => void; onProgress: (done: number, total: number) => void },
): SkeletonScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xf1efe9);
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  const tip = document.createElement('div');
  tip.className = 'an-tip';
  tip.style.display = 'none';
  container.appendChild(tip);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 6;
  controls.maxDistance = 110;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa89f90, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(20, 40, 50);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-30, 10, -40);
  scene.add(fill);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(16, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe4e0d6 }));
  ground.position.set(-1.5, -0.02, 0);
  ground.scale.set(1.35, 1, 0.55);
  scene.add(ground);

  const pieces = buildSkeleton();
  const geoCache = new Map<string, THREE.BufferGeometry>();
  const meshes: THREE.Mesh[] = [];
  const group = new THREE.Group();
  scene.add(group);

  const HOME = { target: new THREE.Vector3(1.5, 7.2, 0), pos: new THREE.Vector3(5, 11, 46) };
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
  const home = () => {
    const widen = Math.max(1, 1.5 / Math.max(camera.aspect, 0.3));
    camera.position.copy(HOME.target).add(HOME.pos.clone().sub(HOME.target).multiplyScalar(widen));
    controls.target.copy(HOME.target);
    controls.update();
  };
  home();

  // build progressively so the page stays responsive
  let cancelled = false;
  let i = 0;
  const step = () => {
    if (cancelled) return;
    const t0 = performance.now();
    while (i < pieces.length && performance.now() - t0 < 30) {
      const p = pieces[i++];
      let g = geoCache.get(p.key);
      if (!g) {
        if (p.tube) g = tubeGeometry(p);
        else {
          const s = p.shape!();
          g = shapeGeometry(s, cellFor(s, 46, 0.035, 0.1));
        }
        geoCache.set(p.key, g);
      }
      const mat = new THREE.MeshStandardMaterial({
        color: p.tube?.cartilage ? CARTILAGE : BONE,
        roughness: p.tube?.cartilage ? 0.45 : 0.72,
        metalness: 0,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(g, mat);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(pieceMatrix(p));
      mesh.userData.piece = p;
      group.add(mesh);
      meshes.push(mesh);
    }
    events.onProgress(i, pieces.length);
    if (i < pieces.length) setTimeout(step, 0);
    else applyLook();
  };
  setTimeout(step, 30);

  // look: selection, region filter, sides
  let selected: string | null = null;
  let hovered: THREE.Mesh | null = null;
  let region: Region | null = null;
  let bothSides = true;
  function applyLook() {
    for (const m of meshes) {
      const p = m.userData.piece as Piece;
      const mat = m.material as THREE.MeshStandardMaterial;
      const inRegion = !region || (p.region ?? BONES[p.bone].region) === region;
      m.visible = bothSides || !p.mirror;
      const sel = selected === p.id;
      const hov = hovered === m;
      mat.emissive.set(sel ? HILITE : hov ? 0x6b5a2a : 0x000000);
      mat.emissiveIntensity = sel ? 0.75 : hov ? 0.35 : 0;
      mat.opacity = inRegion ? 1 : 0.13;
      mat.depthWrite = inRegion;
    }
  }

  // picking
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pick = (ev: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(meshes.filter((m) => m.visible && (m.material as THREE.MeshStandardMaterial).opacity > 0.5), false);
    return hits[0] ? (hits[0].object as THREE.Mesh) : null;
  };
  let down: { x: number; y: number } | null = null;
  const onDown = (ev: PointerEvent) => {
    down = { x: ev.clientX, y: ev.clientY };
  };
  const onUp = (ev: PointerEvent) => {
    if (!down) return;
    const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
    down = null;
    if (moved > 6) return;
    const m = pick(ev);
    const p = m ? (m.userData.piece as Piece) : null;
    selected = p?.id ?? null;
    applyLook();
    events.onSelect(p);
  };
  let lastMove = 0;
  const onMove = (ev: PointerEvent) => {
    if (ev.pointerType === 'touch' || down) return;
    const now = performance.now();
    if (now - lastMove < 50) return;
    lastMove = now;
    const m = pick(ev);
    if (m !== hovered) {
      hovered = m;
      applyLook();
    }
    if (m) {
      const r = container.getBoundingClientRect();
      tip.textContent = (m.userData.piece as Piece).label;
      tip.style.display = '';
      tip.style.transform = `translate(${ev.clientX - r.left + 14}px, ${ev.clientY - r.top + 10}px)`;
      renderer.domElement.style.cursor = 'pointer';
    } else {
      tip.style.display = 'none';
      renderer.domElement.style.cursor = '';
    }
  };
  const onLeave = () => {
    hovered = null;
    tip.style.display = 'none';
    applyLook();
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerleave', onLeave);

  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  return {
    setSelected(id) {
      selected = id;
      applyLook();
    },
    setRegion(r) {
      region = r;
      applyLook();
    },
    setSides(b) {
      bothSides = b;
      applyLook();
    },
    resetView: home,
    dispose() {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      for (const g of geoCache.values()) g.dispose();
      for (const m of meshes) (m.material as THREE.Material).dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      tip.remove();
    },
  };
}
