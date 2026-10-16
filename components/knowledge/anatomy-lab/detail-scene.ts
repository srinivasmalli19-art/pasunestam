// One bone, big, with numbered landmark pins. Turns slowly until touched.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BONES } from '@/lib/anatomy/cow-bones';
import type { Piece } from '@/lib/anatomy/cow-skeleton';
import { toSurface } from '@/lib/anatomy/sdf';
import { cellFor, shapeGeometry, tubeCurve, tubeGeometry } from './geometry';

export interface DetailScene {
  show(piece: Piece | null): void;
  setActive(index: number | null): void;
  dispose(): void;
}

export function createDetailScene(container: HTMLElement, events: { onPin: (i: number) => void; onReady: () => void }): DetailScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xfbfaf6);
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  const pinLayer = document.createElement('div');
  pinLayer.className = 'an-pins';
  container.appendChild(pinLayer);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;
  controls.enablePan = false;
  const stop = () => {
    controls.autoRotate = false;
  };
  controls.addEventListener('start', stop);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9d9484, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  scene.add(fill);
  scene.add(camera);
  camera.add(key);
  camera.add(fill);
  key.position.set(4, 6, 8);
  fill.position.set(-6, -2, 3);

  const mat = new THREE.MeshStandardMaterial({ color: 0xeee3c9, roughness: 0.7, metalness: 0 });
  let mesh: THREE.Mesh | null = null;
  const holder = new THREE.Group();
  scene.add(holder);
  let pins: Array<{ el: HTMLButtonElement; p: THREE.Vector3; n: THREE.Vector3 }> = [];
  let active: number | null = null;
  let fly: { to: THREE.Vector3; start: number; from: THREE.Vector3 } | null = null;
  let radius = 1;

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

  function clear() {
    if (mesh) {
      holder.remove(mesh);
      mesh.geometry.dispose();
      mesh = null;
    }
    for (const p of pins) p.el.remove();
    pins = [];
  }

  function show(piece: Piece | null) {
    clear();
    if (!piece) return;
    const info = BONES[piece.bone];
    let g: THREE.BufferGeometry;
    const pts: Array<{ p: THREE.Vector3; n: THREE.Vector3 }> = [];
    if (piece.tube) {
      g = tubeGeometry(piece, 120, 18);
      const curve = tubeCurve(piece);
      for (const l of info.landmarks) {
        const t = l.t ?? 0.5;
        const c = curve.getPointAt(t);
        const tan = curve.getTangentAt(t);
        const out = new THREE.Vector3(0, 0, 1).cross(tan).normalize();
        if (out.lengthSq() < 0.1) out.set(0, 0, 1);
        const n = new THREE.Vector3(out.x * 0.3, out.y * 0.3, 1).normalize();
        pts.push({ p: c.clone().addScaledVector(n, piece.tube.radius * 1.2), n });
      }
    } else {
      const s = piece.shape!();
      g = shapeGeometry(s, cellFor(s, 120, 0.012, 0.06));
      for (const l of info.landmarks) {
        const p = toSurface(s.sdf, l.at);
        const e = 1e-3;
        const n = new THREE.Vector3(
          s.sdf(p[0] + e, p[1], p[2]) - s.sdf(p[0] - e, p[1], p[2]),
          s.sdf(p[0], p[1] + e, p[2]) - s.sdf(p[0], p[1] - e, p[2]),
          s.sdf(p[0], p[1], p[2] + e) - s.sdf(p[0], p[1], p[2] - e),
        ).normalize();
        pts.push({ p: new THREE.Vector3(...p), n });
      }
    }
    // centre the bone
    g.computeBoundingSphere();
    const bs = g.boundingSphere!;
    radius = bs.radius;
    mesh = new THREE.Mesh(g, mat);
    mesh.position.copy(bs.center).multiplyScalar(-1);
    holder.add(mesh);
    pins = pts.map((pt, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `an-pin${info.landmarks[i].clinical ? ' an-pin-clinical' : ''}`;
      el.textContent = String(i + 1);
      el.setAttribute('aria-label', info.landmarks[i].name);
      el.addEventListener('click', () => events.onPin(i));
      pinLayer.appendChild(el);
      return { el, p: pt.p.clone().sub(bs.center), n: pt.n };
    });
    // a lateral view to start with, framed to fill the panel
    g.computeBoundingBox();
    const size = g.boundingBox!.getSize(new THREE.Vector3());
    const tanH = Math.tan((camera.fov * Math.PI) / 360);
    const across = Math.max(size.x, size.z);
    const dist = Math.max(size.y / 2 / tanH, across / 2 / (tanH * camera.aspect)) * 1.18 + across / 2;
    controls.target.set(0, 0, 0);
    camera.position.set(0.25 * dist, 0.15 * dist, dist);
    controls.minDistance = radius * 1.2;
    controls.maxDistance = radius * 6;
    controls.autoRotate = true;
    active = null;
    fly = null;
    events.onReady();
  }

  function setActive(i: number | null) {
    active = i;
    pins.forEach((p, k) => p.el.classList.toggle('an-pin-active', k === i));
    if (i === null || !pins[i]) return;
    controls.autoRotate = false;
    const d = camera.position.length();
    // turn towards the side the landmark faces, but keep the view from the side rather than straight down
    const dir = pins[i].n.clone().add(pins[i].p.clone().normalize().multiplyScalar(0.6)).normalize();
    dir.lerp(camera.position.clone().normalize(), 0.25).normalize();
    const flat = Math.hypot(dir.x, dir.z) || 1e-3;
    const maxUp = Math.tan((50 * Math.PI) / 180);
    if (Math.abs(dir.y) / flat > maxUp) dir.y = Math.sign(dir.y) * flat * maxUp;
    dir.normalize();
    fly = { from: camera.position.clone(), to: dir.multiplyScalar(d), start: performance.now() };
  }

  const tmp = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  let raf = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (fly) {
      const k = Math.min(1, (now - fly.start) / 700);
      const e = k * k * (3 - 2 * k);
      camera.position.copy(fly.from).lerp(fly.to, e).setLength(fly.from.length());
      if (k >= 1) fly = null;
    }
    controls.update();
    renderer.render(scene, camera);
    const w = container.clientWidth;
    const h = container.clientHeight;
    for (let k = 0; k < pins.length; k++) {
      const pin = pins[k];
      tmp.copy(pin.p).project(camera);
      camDir.copy(camera.position).sub(pin.p).normalize();
      const facing = pin.n.dot(camDir);
      const visible = tmp.z < 1 && facing > -0.15;
      pin.el.style.display = visible || k === active ? '' : 'none';
      pin.el.style.opacity = facing > 0.15 || k === active ? '1' : '0.55';
      pin.el.style.transform = `translate(-50%, -50%) translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
    }
  };
  raf = requestAnimationFrame(loop);

  return {
    show,
    setActive,
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      clear();
      mat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      pinLayer.remove();
    },
  };
}
