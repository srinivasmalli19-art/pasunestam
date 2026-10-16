// 3D ovary with its structures. Units: cm. "Press" squashes the main structure
// by how soft it is; "Cut" removes the front half so the walls and contents show.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { OvaryCase, StructureKind } from '@/lib/ovary/cases';

export interface OvaryScene {
  show(c: OvaryCase, hideNames: boolean): void;
  setCut(on: boolean): void;
  setLabels(on: boolean): void;
  press(): void;
  dispose(): void;
}

const NAME: Record<StructureKind, string> = {
  follicle: 'Follicle',
  clDeveloping: 'Developing CL',
  cl: 'Corpus luteum',
  clCystic: 'CL with cavity',
  clRegressing: 'Regressing CL',
  follicularCyst: 'Follicular cyst',
  lutealCyst: 'Luteal cyst',
};

export function createOvaryScene(container: HTMLElement): OvaryScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xf6f2ea);
  renderer.localClippingEnabled = true;
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
  controls.enablePan = false;
  controls.minDistance = 4;
  controls.maxDistance = 20;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa0948a, 1.25));
  scene.add(camera);
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(3, 5, 6);
  camera.add(key);

  const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  const group = new THREE.Group();
  scene.add(group);
  let mats: THREE.Material[] = [];
  let geos: THREE.BufferGeometry[] = [];
  const mat = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.55, side: THREE.DoubleSide, ...o });
    mats.push(m);
    return m;
  };
  const sphere = (r: number, m: THREE.Material, seg = 40) => {
    const g = new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7));
    geos.push(g);
    return new THREE.Mesh(g, m);
  };

  // ruler (mm) under the ovary
  const ruler = new THREE.Group();
  scene.add(ruler);
  const rulerMat = new THREE.MeshBasicMaterial({ color: 0x3a3a3a });
  const rulerBase = new THREE.Mesh(new THREE.BoxGeometry(4, 0.03, 0.03), rulerMat);
  rulerBase.position.set(0, 0, 0);
  ruler.add(rulerBase);
  for (let mm = 0; mm <= 40; mm += 5) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.02, mm % 10 === 0 ? 0.22 : 0.12, 0.02), rulerMat);
    t.position.set(-2 + mm / 10, (mm % 10 === 0 ? 0.11 : 0.06), 0);
    ruler.add(t);
  }

  // labels
  type Label = { el: HTMLElement; pos: THREE.Vector3; cutOnly?: boolean };
  let labels: Label[] = [];
  const addLabel = (text: string, pos: THREE.Vector3, cls = '', cutOnly = false) => {
    const el = document.createElement('span');
    el.className = `lab-label ${cls}`;
    el.textContent = text;
    labelLayer.appendChild(el);
    labels.push({ el, pos, cutOnly });
  };
  const rulerLabel = document.createElement('span');
  rulerLabel.className = 'lab-label ov-ruler';
  rulerLabel.textContent = '0 ——— 40 mm';
  labelLayer.appendChild(rulerLabel);

  let cut = false;
  let labelsOn = true;
  let main: THREE.Group | null = null;
  let mainGive = 0.1;
  let pressStart = -1;
  const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.6, 8, 16), new THREE.MeshStandardMaterial({ color: 0x6d8fb3, transparent: true, opacity: 0.55 }));
  finger.visible = false;
  scene.add(finger);
  let fingerDir = new THREE.Vector3(0, 1, 0);
  let fingerTip = new THREE.Vector3();

  function applyCut() {
    for (const m of mats) {
      m.clippingPlanes = cut ? [cutPlane] : [];
      const sm = m as THREE.MeshStandardMaterial;
      if (sm.userData.glassOpacity !== undefined) {
        sm.opacity = cut ? 1 : sm.userData.glassOpacity;
        sm.transparent = !cut && sm.userData.glassOpacity < 1;
        sm.depthWrite = cut || sm.userData.glassOpacity >= 1;
      }
      m.needsUpdate = true;
    }
  }

  function show(c: OvaryCase, hideNames: boolean) {
    // clear
    for (const ch of [...group.children]) group.remove(ch);
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
    geos = [];
    mats = [];
    for (const l of labels) l.el.remove();
    labels = [];
    main = null;
    cutPlane.constant = 0;
    pressStart = -1;
    finger.visible = false;

    const [L, W, H] = c.ovaryMm.map((v) => v / 10);
    // stroma
    const stroma = sphere(1, mat(0xe9cfbd, { roughness: 0.7 }), 56);
    stroma.scale.set(L / 2, H / 2, W / 2);
    group.add(stroma);
    const surface = (dir: THREE.Vector3) => {
      const d = dir.clone().normalize();
      const k = 1 / Math.sqrt((d.x / (L / 2)) ** 2 + (d.y / (H / 2)) ** 2 + (d.z / (W / 2)) ** 2);
      return d.multiplyScalar(k);
    };
    // small antral follicles
    for (let i = 0; i < c.smallFollicles; i++) {
      const a = i * 2.39996 + 0.7;
      const d = new THREE.Vector3(Math.cos(a) * 0.9, Math.sin(i * 1.7) * 0.6, Math.sin(a) * 0.9);
      const r = 0.12 + ((i * 37) % 5) * 0.035;
      const f = sphere(r, mat(0xfff4d6, { transparent: true, opacity: 0.75, roughness: 0.25 }), 16);
      (f.material as THREE.MeshStandardMaterial).userData.glassOpacity = 0.75;
      f.position.copy(surface(d).multiplyScalar(1 - r * 0.25));
      group.add(f);
    }
    addLabel(hideNames ? 'Ovary' : c.id === 'inactive' ? 'Small, smooth ovary' : 'Ovary', new THREE.Vector3(-L / 2 - 0.2, -H / 2 - 0.35, 0));

    c.structures.forEach((s, idx) => {
      const r = s.sizeMm / 20;
      const dir = new THREE.Vector3(...s.dir).normalize();
      const centre = surface(dir).add(dir.clone().multiplyScalar(r * (2 * s.protrusion - 1)));
      const g = new THREE.Group();
      g.position.copy(centre);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      group.add(g);
      const wall = (s.wallMm ?? 0) / 10;
      const top = new THREE.Vector3(0, r, 0);
      switch (s.kind) {
        case 'follicle':
        case 'follicularCyst': {
          const shellM = mat(s.kind === 'follicle' ? 0xfff0c4 : 0xe6f0f5, { transparent: true, opacity: 0.6, roughness: 0.15 });
          shellM.userData.glassOpacity = 0.6;
          g.add(sphere(r, shellM));
          const fluid = sphere(Math.max(r - Math.max(wall, 0.03), 0.02), mat(s.kind === 'follicle' ? 0xffe9a8 : 0xcfe6f2, { roughness: 0.2 }));
          fluid.visible = true;
          fluid.userData.inner = true;
          g.add(fluid);
          break;
        }
        case 'lutealCyst': {
          g.add(sphere(r, mat(0xe2b864, { roughness: 0.6 })));
          g.add(sphere(r - wall, mat(0xd8ecf3, { roughness: 0.2 })));
          break;
        }
        case 'cl':
        case 'clCystic':
        case 'clDeveloping':
        case 'clRegressing': {
          const col = s.kind === 'clDeveloping' ? 0xb2453c : s.kind === 'clRegressing' ? 0xe6d39a : 0xd9892d;
          g.add(sphere(r, mat(col, { roughness: 0.75 })));
          if (s.kind === 'clCystic') g.add(sphere(r * 0.45, mat(0xf3e3b0, { roughness: 0.3 })));
          if (s.kind === 'clDeveloping') {
            const crater = sphere(r * 0.38, mat(0x6e1515));
            crater.position.set(0, r * 0.85, 0);
            g.add(crater);
          }
          if (s.crown) {
            const cg = new THREE.ConeGeometry(r * 0.42, r * 0.55, 24);
            geos.push(cg);
            const crown = new THREE.Mesh(cg, mat(col, { roughness: 0.75 }));
            crown.position.set(0, r * 0.98, 0);
            g.add(crown);
            const cap = sphere(r * 0.2, mat(col, { roughness: 0.75 }), 16);
            cap.position.set(0, r * 1.22, 0);
            g.add(cap);
            top.set(0, r * 1.35, 0);
          }
          break;
        }
      }
      const world = (p: THREE.Vector3) => p.clone().applyQuaternion(g.quaternion).add(g.position);
      if (idx === 0) {
        // cut through the middle of the main structure so its inside shows
        cutPlane.constant = centre.z;
        main = g;
        mainGive = c.give;
        fingerDir = dir.clone();
        fingerTip = world(top);
      }
      const name = hideNames ? `Structure ${idx + 1}` : NAME[s.kind];
      addLabel(`${name} · ${Math.round(s.sizeMm)} mm`, world(top).add(dir.clone().multiplyScalar(0.45)), 'ov-key');
      if (!hideNames && s.crown) addLabel('Crown (papilla)', world(top).add(new THREE.Vector3(0.9, 0.1, 0)), 'ov-crown');
      if (!hideNames && (s.kind === 'follicularCyst' || s.kind === 'follicle')) addLabel(s.kind === 'follicle' ? 'Thin wall, fluid' : 'Thin wall, tense fluid', centre.clone().add(new THREE.Vector3(0, 0, 0.05)), 'ov-cut', true);
      if (!hideNames && s.kind === 'lutealCyst') addLabel('THICK wall', centre.clone().add(dir.clone().multiplyScalar(r - wall / 2)).add(new THREE.Vector3(r * 0.6, 0, 0)), 'ov-cut', true);
      if (!hideNames && (s.kind === 'cl' || s.kind === 'clRegressing')) addLabel('Solid luteal tissue', centre.clone(), 'ov-cut', true);
      if (!hideNames && s.kind === 'clCystic') addLabel('Cavity inside a CL', centre.clone(), 'ov-cut', true);
    });
    if (!main) {
      main = new THREE.Group();
      mainGive = c.give;
      fingerDir = new THREE.Vector3(0.2, 1, 0.3).normalize();
      fingerTip = surface(fingerDir);
    }
    ruler.position.set(0, -H / 2 - 0.9, 0);
    // frame
    const R = Math.max(L, H + (c.structures[0] ? c.structures[0].sizeMm / 10 : 0), 3) * 0.95;
    const widen = Math.max(1, 1.3 / Math.max(camera.aspect, 0.3));
    controls.target.set(0, 0.25, 0);
    camera.position.set(0.9 * R, 0.9 * R, 2.6 * R * widen);
    controls.update();
    applyCut();
  }

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

  const tmp = new THREE.Vector3();
  let raf = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    // press animation: finger comes in, pushes, releases (2.4 s)
    if (pressStart >= 0 && main) {
      const t = (now - pressStart) / 1000;
      const push = t < 0.8 ? 0 : t < 1.6 ? (t - 0.8) / 0.8 : t < 2.6 ? 1 : Math.max(0, 1 - (t - 2.6) / 0.6);
      const approach = Math.min(1, t / 0.8);
      const dent = mainGive * push;
      main.scale.set(1 + dent * 0.45, 1 - dent, 1 + dent * 0.45);
      const tip = fingerTip.clone().addScaledVector(fingerDir, -dent * 0.9 * (main.children.length ? 1 : 0.4));
      finger.visible = true;
      finger.position.copy(tip).addScaledVector(fingerDir, 1.25 + (1 - approach) * 1.5);
      finger.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fingerDir);
      if (t > 3.3) {
        pressStart = -1;
        finger.visible = false;
        main.scale.set(1, 1, 1);
      }
    }
    controls.update();
    renderer.render(scene, camera);
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (labelsOn) {
      const placed: Array<[number, number, number, number]> = [];
      for (const l of labels) {
        if (l.cutOnly && !cut) {
          l.el.style.display = 'none';
          continue;
        }
        tmp.copy(l.pos).project(camera);
        l.el.style.display = '';
        const hw = l.el.offsetWidth / 2 + 3;
        const hh = l.el.offsetHeight / 2 + 2;
        const x = Math.min(w - hw, Math.max(hw, ((tmp.x + 1) / 2) * w));
        let y = Math.min(h - hh, Math.max(hh, ((1 - tmp.y) / 2) * h));
        for (let k = 0; k < 4 && placed.some(([px, py, pw, ph]) => Math.abs(px - x) < pw + hw && Math.abs(py - y) < ph + hh); k++) y += hh * 2 + 2;
        placed.push([x, y, hw, hh]);
        l.el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      }
      tmp.copy(ruler.position).add(new THREE.Vector3(0, -0.3, 0)).project(camera);
      rulerLabel.style.transform = `translate(-50%, -50%) translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
    }
  };
  raf = requestAnimationFrame(loop);

  return {
    show,
    setCut(on) {
      cut = on;
      applyCut();
    },
    setLabels(on) {
      labelsOn = on;
      labelLayer.style.display = on ? '' : 'none';
    },
    press() {
      pressStart = performance.now();
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
      ruler.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      rulerMat.dispose();
      finger.geometry.dispose();
      (finger.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      labelLayer.remove();
    },
  };
}
