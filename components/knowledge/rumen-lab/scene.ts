// 3D ruminant digestive system. Organs are meshed from signed distance fields
// and given an organic look: subtle surface unevenness, fat along the grooves,
// blood vessels, wet glossy serosa. "Inside" opens the four compartments with
// their typical linings (papillae, honeycomb, leaves, folds) and the rumen
// contents. The food journey and the problems are animated on the same model.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildSkeleton } from '@/lib/anatomy/cow-skeleton';
import { meshSdf } from '@/lib/anatomy/mesher';
import { capsule, intersect, plane, torus, union, type SDF, type V3 } from '@/lib/anatomy/sdf';
import { cells, fbm, noise3 } from '@/lib/rumen/noise';
import {
  ABOMASUM_PATH,
  CAECUM,
  CARDIA,
  DUODENUM,
  ESOPHAGUS,
  GROOVE_FAT,
  MOUTH,
  ORGANS,
  SITES,
  abomasumShape,
  colonPath,
  heartShape,
  jejunumPath,
  liverShape,
  omasumShape,
  reticulumShape,
  rumenShape,
  spleenShape,
  type JourneyPath,
  type OrganId,
  type OrganShape,
  type ProblemId,
} from '@/lib/rumen/organs';
import { cellFor, pieceMatrix, shapeGeometry, tubeGeometry } from '../anatomy-lab/geometry';

export type RumenMode = 'anatomy' | 'inside' | 'journey' | 'problems';
export type RumenView = 'left' | 'right' | 'below' | 'whole' | 'close';

export interface RumenScene {
  setMode(m: RumenMode): void;
  setView(v: RumenView): void;
  setSkeleton(on: boolean): void;
  setLabels(on: boolean): void;
  setSelected(id: OrganId | null): void;
  setJourney(step: JourneyPath, focus: OrganId[]): void;
  setProblem(p: ProblemId): void;
  dispose(): void;
}

const v = (a: V3 | number[]) => new THREE.Vector3(a[0], a[1], a[2]);
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const col = (hex: number) => new THREE.Color(hex);

// ---- turning a shape into an organic-looking mesh ------------------------------------------------

interface Decor {
  /** Displacement along the normal (units) at a point. */
  disp?: (x: number, y: number, z: number) => number;
  /** Colour at a point. */
  color: (x: number, y: number, z: number, out: THREE.Color) => void;
}

function organGeometry(shape: OrganShape, cell: number, decor: Decor, flip = false): THREE.BufferGeometry {
  const m = meshSdf(shape.sdf, shape.min, shape.max, cell);
  const pos = m.positions;
  const nor = m.normals;
  const colors = new Float32Array(pos.length);
  const c = new THREE.Color();
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2];
    if (decor.disp) {
      const d = decor.disp(x, y, z);
      pos[i] += nor[i] * d;
      pos[i + 1] += nor[i + 1] * d;
      pos[i + 2] += nor[i + 2] * d;
    }
    decor.color(x, y, z, c);
    colors[i] = c.r;
    colors[i + 1] = c.g;
    colors[i + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (flip) {
    const idx = m.indices;
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1];
      idx[i + 1] = idx[i + 2];
      idx[i + 2] = t;
    }
  }
  g.setIndex(new THREE.BufferAttribute(m.indices, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** Serosa colour: base with mottling, cream fat near the grooves, a faint vessel network. */
function serosa(base: number, fatNear?: SDF, fatWidth = 0.5) {
  const b = col(base);
  const fat = col(0xf0dfb0);
  const dark = b.clone().multiplyScalar(0.82);
  return (x: number, y: number, z: number, out: THREE.Color) => {
    const n = fbm(x * 1.6, y * 1.6, z * 1.6);
    out.copy(b).lerp(dark, n * 0.6);
    // fine vessel network: thin ridges of cellular noise
    const [f1, f2] = cells(x * 2.2, y * 2.2, z * 2.2);
    if (f2 - f1 < 0.05) out.lerp(col(0xa0505a), 0.25);
    if (fatNear) {
      const d = fatNear(x, y, z);
      const k = smooth(fatWidth, 0.05, d) * (0.75 + 0.25 * noise3(x * 6, y * 6, z * 6));
      out.lerp(fat, k);
    }
  };
}

function tubeMesh(points: V3[], radius: number, material: THREE.Material, segments = 120, radial = 14) {
  const curve = new THREE.CatmullRomCurve3(points.map(v), false, 'centripetal');
  return new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, radial, false), material);
}

// =====================================================================================================

export function createRumenScene(
  container: HTMLElement,
  events: { onPick: (id: OrganId | null) => void; onProgress: (k: number, what: string) => void },
): RumenScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xf2efe8);
  renderer.localClippingEnabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  const labelLayer = document.createElement('div');
  labelLayer.className = 'lab-labels';
  container.appendChild(labelLayer);
  const tip = document.createElement('div');
  tip.className = 'an-tip';
  tip.style.display = 'none';
  container.appendChild(tip);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.2, 300);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  scene.add(new THREE.HemisphereLight(0xfff6ee, 0x8a7d70, 1.1));
  scene.add(camera);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 8, 10);
  camera.add(key);
  const rim = new THREE.DirectionalLight(0xffe6dc, 0.9);
  rim.position.set(-8, 3, -6);
  camera.add(rim);

  const disposables: Array<{ dispose(): void }> = [];
  const wet = (o: THREE.MeshPhysicalMaterialParameters = {}) => {
    const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.28, sheen: 0.35, sheenColor: new THREE.Color(0xffd6cc), ...o });
    disposables.push(m);
    return m;
  };

  // ---- skeleton + body (context) ---------------------------------------------------------------------
  const skel = new THREE.Group();
  scene.add(skel);
  const boneFaint = new THREE.MeshStandardMaterial({ color: 0xd9cfb8, transparent: true, opacity: 0.3, depthWrite: false });
  disposables.push(boneFaint);
  const pieces = buildSkeleton().filter((p) => !p.id.startsWith('cart'));
  const skelCache = new Map<string, THREE.BufferGeometry>();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ color: 0xb08a6e, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }));
  body.scale.set(12.6, 4.25, 3.4);
  body.position.set(-1.6, 8.95, 0);
  scene.add(body);
  disposables.push(body.geometry, body.material as THREE.Material);

  // ---- organs ---------------------------------------------------------------------------------------------
  interface Organ {
    id: OrganId;
    group: THREE.Group;
    outer: THREE.Mesh[];
    home: THREE.Vector3;
    explode: THREE.Vector3;
    cutZ: number;
    plane: THREE.Plane;
    centre: THREE.Vector3;
  }
  const organs = new Map<OrganId, Organ>();
  const pickables: THREE.Mesh[] = [];
  const makeOrgan = (id: OrganId, centre: V3, explode: V3 = [0, 0, 0], cutZ = 0) => {
    const group = new THREE.Group();
    scene.add(group);
    const o: Organ = { id, group, outer: [], home: new THREE.Vector3(), explode: v(explode), cutZ, plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -cutZ), centre: v(centre) };
    organs.set(id, o);
    return o;
  };
  const addOuter = (o: Organ, mesh: THREE.Mesh) => {
    mesh.userData.organ = o.id;
    o.group.add(mesh);
    o.outer.push(mesh);
    pickables.push(mesh);
    const m = mesh.material as THREE.MeshPhysicalMaterial;
    m.clippingPlanes = [];
    m.userData.baseOpacity = 1;
    return mesh;
  };

  // fat fields along the rumen grooves
  const rumenFat = union(
    capsule([0.6, 7.95, -2.75], [-7.6, 7.95, -2.7], 0.25),
    capsule([-0.6, 7.85, 0.95], [-7.6, 7.8, 0.95], 0.25),
    capsule([-10.6, 7.95, -2.6], [-10.6, 7.95, 1.6], 0.25),
    torus([-7.65, 9.1, -1.25], 1.5, 0.2, 'x'),
    torus([-7.9, 6.75, -0.5], 1.75, 0.2, 'x'),
    capsule([0.15, 7.35, -2.7], [0.15, 7.35, 1.0], 0.25),
  );

  // build list (each step builds one thing so the page stays responsive)
  type Job = { what: string; run: () => void };
  const jobs: Job[] = [];
  const bump = (amp: number, f: number) => (x: number, y: number, z: number) => amp * (fbm(x * f, y * f, z * f, 2) - 0.5);

  const rumen = makeOrgan('rumen', [-3.8, 8.0, -0.9], [0, 0, 0], -0.75);
  const reticulum = makeOrgan('reticulum', [2.8, 6.55, -0.4], [0, 0, 0], -0.75);
  const omasum = makeOrgan('omasum', [1.0, 7.65, 2.0], [4.2, -5.3, -2.6], 2.0);
  const abomasum = makeOrgan('abomasum', [-0.6, 6.0, 1.6], [-3.4, -3.3, -2.2], 1.4);
  const heart = makeOrgan('heart', [5.7, 7.35, -0.35]);
  const liver = makeOrgan('liver', [2.0, 9.2, 2.25]);
  const spleen = makeOrgan('spleen', [0.9, 10.05, -2.85]);
  const esophagus = makeOrgan('esophagus', [7, 9.35, -0.35]);
  const duodenum = makeOrgan('duodenum', [-4, 9.2, 2.6]);
  const jejunum = makeOrgan('jejunum', [-6, 7.0, 2.1]);
  const caecum = makeOrgan('caecum', [-8.5, 8.4, 2.1]);
  const colon = makeOrgan('colon', [-5.3, 8.4, 1.1]);
  const diaphragm = makeOrgan('diaphragm', [3, 8, 0]);

  jobs.push({
    what: 'rumen',
    run: () => {
      const g = organGeometry(rumenShape(), 0.085, { disp: bump(0.07, 1.4), color: serosa(0xcfa99c, rumenFat, 0.5) });
      addOuter(rumen, new THREE.Mesh(g, wet({ side: THREE.DoubleSide })));
      disposables.push(g);
      // fat and vessels in the grooves
      const fatMat = wet({ vertexColors: false, color: 0xefdcab, roughness: 0.55, clearcoat: 0.25 });
      const artMat = wet({ vertexColors: false, color: 0xa3282f, roughness: 0.35 });
      const veinMat = wet({ vertexColors: false, color: 0x5b3a66, roughness: 0.35 });
      for (const path of GROOVE_FAT) {
        const fat = tubeMesh(path, 0.16, fatMat);
        const art = tubeMesh(path.map((p) => [p[0], p[1] + 0.08, p[2] + (p[2] < 0 ? -0.12 : 0.12)] as V3), 0.055, artMat);
        const vein = tubeMesh(path.map((p) => [p[0], p[1] - 0.1, p[2] + (p[2] < 0 ? -0.1 : 0.1)] as V3), 0.065, veinMat);
        for (const m of [fat, art, vein]) {
          addOuter(rumen, m);
          disposables.push(m.geometry);
        }
      }
    },
  });
  jobs.push({
    what: 'reticulum',
    run: () => {
      const g = organGeometry(reticulumShape(), 0.05, { disp: bump(0.05, 1.8), color: serosa(0xd5a399) });
      addOuter(reticulum, new THREE.Mesh(g, wet({ side: THREE.DoubleSide })));
      disposables.push(g);
    },
  });
  jobs.push({
    what: 'omasum',
    run: () => {
      const g = organGeometry(omasumShape(), 0.045, { disp: bump(0.04, 2), color: serosa(0xc59a88) });
      addOuter(omasum, new THREE.Mesh(g, wet({ side: THREE.DoubleSide })));
      disposables.push(g);
    },
  });
  const aboMeshes: Partial<Record<'normal' | 'lda' | 'rda', THREE.Mesh>> = {};
  const buildAbomasum = (which: 'normal' | 'lda' | 'rda') => {
    if (aboMeshes[which]) return aboMeshes[which]!;
    const g = organGeometry(abomasumShape(which), 0.06, { disp: bump(0.04, 1.8), color: serosa(which === 'normal' ? 0xdea79b : 0xd8968c) });
    disposables.push(g);
    const m = new THREE.Mesh(g, wet({ side: THREE.DoubleSide }));
    addOuter(abomasum, m);
    m.visible = which === 'normal';
    aboMeshes[which] = m;
    return m;
  };
  jobs.push({ what: 'abomasum', run: () => void buildAbomasum('normal') });
  jobs.push({
    what: 'heart, liver, spleen',
    run: () => {
      const hg = organGeometry(heartShape(), 0.05, {
        disp: bump(0.04, 2),
        color: serosa(0x8f2f2c, torus([5.75, 8.05, -0.35], 1.12, 0.08, 'y'), 0.22),
      });
      addOuter(heart, new THREE.Mesh(hg, wet({ clearcoat: 0.6 })));
      const lg = organGeometry(liverShape(), 0.06, { disp: bump(0.03, 1.5), color: serosa(0x7d3a2c) });
      addOuter(liver, new THREE.Mesh(lg, wet({ clearcoat: 0.7, roughness: 0.3 })));
      liver.outer[0].userData.tint = true;
      const sg = organGeometry(spleenShape(), 0.04, { disp: bump(0.02, 2), color: serosa(0x6a3d63) });
      addOuter(spleen, new THREE.Mesh(sg, wet({ clearcoat: 0.6 })));
      disposables.push(hg, lg, sg);
    },
  });
  jobs.push({
    what: 'oesophagus and intestines',
    run: () => {
      const tubeMat = (hex: number) => wet({ vertexColors: false, color: hex, roughness: 0.4, clearcoat: 0.5 });
      const eso = tubeMesh(ESOPHAGUS, 0.24, tubeMat(0xd29b8e), 80);
      addOuter(esophagus, eso);
      const duo = tubeMesh(DUODENUM, 0.2, tubeMat(0xe0a996), 120);
      addOuter(duodenum, duo);
      const jej = tubeMesh(jejunumPath(), 0.15, tubeMat(0xe6b4a2), 1400, 10);
      addOuter(jejunum, jej);
      const cae = tubeMesh(CAECUM, 0.33, tubeMat(0xd7a48f), 40);
      addOuter(caecum, cae);
      const colo = tubeMesh(colonPath(), 0.15, tubeMat(0xd3a08d), 500, 10);
      addOuter(colon, colo);
      for (const m of [eso, duo, jej, cae, colo]) disposables.push(m.geometry);
      // diaphragm: a dome from the last rib dorsally to the xiphoid ventrally
      const N = 40;
      const pos: number[] = [];
      const idx: number[] = [];
      for (let i = 0; i <= N; i++)
        for (let j = 0; j <= N; j++) {
          const a = (i / N) * Math.PI * 2;
          const r = j / N;
          const y = 8.15 + 3.35 * r * Math.sin(a);
          const z = 3.25 * r * Math.cos(a);
          const xBase = 3.1 - ((y - 4.8) / 6.5) * 5.6;
          pos.push(xBase + 1.7 * (1 - r * r), y, z);
        }
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++) {
          const a = i * (N + 1) + j;
          const b = a + N + 1;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      dg.setIndex(idx);
      dg.computeVertexNormals();
      const dm = new THREE.MeshPhysicalMaterial({ color: 0xe6c2b8, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, roughness: 0.4 });
      const d = new THREE.Mesh(dg, dm);
      addOuter(diaphragm, d);
      d.material = dm;
      disposables.push(dg, dm);
    },
  });
  // skeleton pieces (low resolution)
  for (let k = 0; k < pieces.length; k += 12) {
    const batch = pieces.slice(k, k + 12);
    jobs.push({
      what: 'skeleton',
      run: () => {
        for (const p of batch) {
          let g = skelCache.get(p.key);
          if (!g) {
            if (p.tube) g = tubeGeometry(p, 20, 6);
            else {
              const s = p.shape!();
              g = shapeGeometry(s, cellFor(s, 24, 0.07, 0.18));
            }
            skelCache.set(p.key, g);
          }
          const m = new THREE.Mesh(g, boneFaint);
          m.matrixAutoUpdate = false;
          m.matrix.copy(pieceMatrix(p));
          skel.add(m);
        }
      },
    });
  }

  // ---- inside: linings, leaves, folds, contents (built when first needed) --------------------------------------
  const inside = new THREE.Group();
  scene.add(inside);
  let insideBuilt = false;
  const insideMats: THREE.Material[] = [];
  const contentsPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.75 - 1.1);
  const insideOf: Record<string, THREE.Group> = {};
  const buildInside = () => {
    if (insideBuilt) return;
    insideBuilt = true;
    const inMat = (o: THREE.MeshPhysicalMaterialParameters = {}) => {
      const m = wet({ side: THREE.BackSide, ...o });
      insideMats.push(m);
      return m;
    };
    const holder = (id: OrganId) => {
      const g = new THREE.Group();
      organs.get(id)!.group.add(g);
      insideOf[id] = g;
      return g;
    };
    const inset = (s: OrganShape, t: number): OrganShape => ({ sdf: (x, y, z) => s.sdf(x, y, z) + t, min: s.min, max: s.max });
    // rumen: papillae (dense, dark ventrally; sparse, pale dorsally)
    {
      const g = organGeometry(
        inset(rumenShape(), 0.13),
        0.07,
        {
          disp: (x, y, z) => {
            const dens = 1 - smooth(9.6, 10.6, y);
            const n = noise3(x * 9, y * 9, z * 9);
            return -0.07 * dens * Math.max(0, n - 0.35);
          },
          color: (x, y, z, out) => {
            const dens = 1 - smooth(9.6, 10.6, y);
            const n = noise3(x * 9, y * 9, z * 9);
            out.copy(col(0xb59d82)).lerp(col(0x4f3f27), dens * 0.85);
            out.lerp(col(0x8c7550), dens * smooth(0.55, 0.85, n) * 0.7);
          },
        },
        false,
      );
      holder('rumen').add(new THREE.Mesh(g, inMat()));
      disposables.push(g);
    }
    // reticulum: honeycomb ridges
    {
      const g = organGeometry(
        inset(reticulumShape(), 0.1),
        0.035,
        {
          disp: (x, y, z) => {
            const [f1, f2] = cells(x * 3, y * 3, z * 3);
            return -0.09 * smooth(0.12, 0.0, f2 - f1);
          },
          color: (x, y, z, out) => {
            const [f1, f2] = cells(x * 3, y * 3, z * 3);
            out.copy(col(0x4c3c26)).lerp(col(0xa58a5f), smooth(0.12, 0.0, f2 - f1));
            out.lerp(col(0x6f5a3a), noise3(x * 14, y * 14, z * 14) * 0.25);
          },
        },
        false,
      );
      holder('reticulum').add(new THREE.Mesh(g, inMat()));
      disposables.push(g);
    }
    // omasum: wall lining + leaves (laminae) of three sizes
    {
      const og = holder('omasum');
      const wall = organGeometry(inset(omasumShape(), 0.07), 0.045, { color: (x, y, z, out) => out.copy(col(0x6a5638)).lerp(col(0x8c7550), noise3(x * 12, y * 12, z * 12) * 0.5) }, false);
      og.add(new THREE.Mesh(wall, inMat()));
      disposables.push(wall);
      const c = v([1.0, 7.65, 2.0]);
      const axis = new THREE.Vector3(Math.cos((20 * Math.PI) / 180), Math.sin((20 * Math.PI) / 180), 0); // long axis of the omasum
      const ref = new THREE.Vector3(0, 0, 1).cross(axis).normalize(); // "greater curvature" side
      const leafMat = new THREE.MeshPhysicalMaterial({ color: 0xa08a62, roughness: 0.6, side: THREE.DoubleSide, clearcoat: 0.3 });
      disposables.push(leafMat);
      insideMats.push(leafMat);
      const ra = 1.05; // half length along the axis (inside the wall)
      const rr = 0.86; // radius across
      let n = 0;
      for (let k = 0; k < 64; k++) {
        const theta = -2.65 + (k / 63) * 5.3; // leave a gap for the omasal canal
        const size = k % 4 === 0 ? 0.15 : k % 2 === 0 ? 0.42 : 0.65; // large, medium, small leaves
        const shape = new THREE.Shape();
        const steps = 18;
        for (let i = 0; i <= steps; i++) {
          const u = -ra + (2 * ra * i) / steps;
          const rmax = rr * Math.sqrt(Math.max(0, 1 - (u / ra) ** 2));
          if (i === 0) shape.moveTo(u, rmax);
          else shape.lineTo(u, rmax);
        }
        for (let i = steps; i >= 0; i--) {
          const u = -ra + (2 * ra * i) / steps;
          const rmax = rr * Math.sqrt(Math.max(0, 1 - (u / ra) ** 2));
          shape.lineTo(u, Math.min(rmax, size + (1 - Math.sqrt(Math.max(0, 1 - (u / ra) ** 2))) * 0.3));
        }
        const geo = new THREE.ShapeGeometry(shape);
        disposables.push(geo);
        const leaf = new THREE.Mesh(geo, leafMat);
        // leaf plane contains the axis; radial direction rotated by theta around the axis
        const radial = ref.clone().applyAxisAngle(axis, theta);
        const normal = axis.clone().cross(radial).normalize();
        const m = new THREE.Matrix4().makeBasis(axis, radial, normal);
        leaf.quaternion.setFromRotationMatrix(m);
        leaf.position.copy(c);
        og.add(leaf);
        n++;
      }
      void n;
    }
    // abomasum: glandular lining and spiral folds
    {
      const ag = holder('abomasum');
      const lining = organGeometry(inset(abomasumShape('normal'), 0.07), 0.055, { color: (x, y, z, out) => out.copy(col(0xb9524d)).lerp(col(0xd77a6f), noise3(x * 8, y * 8, z * 8) * 0.6) }, false);
      ag.add(new THREE.Mesh(lining, inMat({ clearcoat: 0.8, roughness: 0.25 })));
      disposables.push(lining);
      const path = ABOMASUM_PATH.normal;
      const curve = new THREE.CatmullRomCurve3(path.map((p) => v(p[0])));
      const rAt = (t: number) => {
        const f = t * (path.length - 1);
        const i = Math.min(path.length - 2, Math.floor(f));
        return path[i][1] + (path[i + 1][1] - path[i][1]) * (f - i);
      };
      const foldMat = new THREE.MeshPhysicalMaterial({ color: 0xc4615a, roughness: 0.3, clearcoat: 0.7, side: THREE.DoubleSide });
      disposables.push(foldMat);
      insideMats.push(foldMat);
      const frames = curve.computeFrenetFrames(40, false);
      for (let f = 0; f < 12; f++) {
        const pos: number[] = [];
        const idx: number[] = [];
        const S = 40;
        for (let i = 0; i <= S; i++) {
          const t = 0.04 + (i / S) * 0.62;
          const p = curve.getPointAt(t);
          const fi = Math.round(t * 40);
          const ang = (f / 12) * Math.PI * 2 + t * 2.2; // spiral
          const dir = frames.normals[fi].clone().multiplyScalar(Math.cos(ang)).add(frames.binormals[fi].clone().multiplyScalar(Math.sin(ang)));
          const r = rAt(t) - 0.09;
          const inner = p.clone().addScaledVector(dir, r * 0.5);
          const outer = p.clone().addScaledVector(dir, r);
          pos.push(inner.x, inner.y, inner.z, outer.x, outer.y, outer.z);
          if (i < S) {
            const a = i * 2;
            idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        disposables.push(geo);
        ag.add(new THREE.Mesh(geo, foldMat));
      }
    }
    // rumen contents: gas cap, fibre mat, liquid
    {
      const rg = insideOf.rumen;
      const inner = rumenShape();
      const room = (x: number, y: number, z: number) => inner.sdf(x, y, z) + 0.2;
      const layer = (lo: number, hi: number): OrganShape => ({ sdf: intersect(room, plane([0, hi, 0], [0, 1, 0]), plane([0, lo, 0], [0, -1, 0])), min: inner.min, max: inner.max });
      const gas = organGeometry(layer(10.15, 20), 0.12, { color: (_x, _y, _z, out) => out.set(0xcfe4f0) }, false);
      const mat = organGeometry(layer(8.2, 10.15), 0.1, {
        disp: (x, y, z) => 0.05 * (noise3(x * 5, y * 12, z * 5) - 0.5),
        color: (x, y, z, out) => out.copy(col(0x8f8a3a)).lerp(col(0xc9b866), noise3(x * 6, y * 20, z * 6)),
      }, false);
      const liq = organGeometry(layer(0, 8.2), 0.12, { color: (x, y, z, out) => out.copy(col(0x3d4a1e)).lerp(col(0x55602a), noise3(x * 3, y * 3, z * 3) * 0.6) }, false);
      const gm = new THREE.MeshPhysicalMaterial({ vertexColors: true, transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.1, side: THREE.DoubleSide });
      const mm = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
      const lm = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.15, clearcoat: 0.8, side: THREE.DoubleSide });
      disposables.push(gas, mat, liq, gm, mm, lm);
      insideMats.push(gm, mm, lm);
      const gasMesh = new THREE.Mesh(gas, gm);
      gasMesh.name = 'gas';
      const matMesh = new THREE.Mesh(mat, mm);
      matMesh.name = 'mat';
      const liqMesh = new THREE.Mesh(liq, lm);
      liqMesh.name = 'liquid';
      for (const m of [gasMesh, matMesh, liqMesh]) m.userData.contents = true;
      rg.add(gasMesh, matMesh, liqMesh);
    }
    applyClipping();
  };

  // ---- labels -------------------------------------------------------------------------------------------
  type Label = { el: HTMLElement; pos: () => THREE.Vector3 | null; modes: RumenMode[]; hidden?: boolean };
  const labels: Label[] = [];
  const addLabel = (text: string, pos: () => THREE.Vector3 | null, modes: RumenMode[], cls = '') => {
    const el = document.createElement('span');
    el.className = `lab-label ${cls}`;
    el.textContent = text;
    labelLayer.appendChild(el);
    const l = { el, pos, modes };
    labels.push(l);
    return l;
  };
  const wp = (id: OrganId, local: V3) => () => organs.get(id)!.group.position.clone().add(v(local));
  const ANAT: RumenMode[] = ['anatomy'];
  addLabel('Rumen', wp('rumen', [-4.0, 10.9, -2.6]), ANAT, 'rl-organ');
  addLabel('Reticulum', wp('reticulum', [2.9, 4.6, -1.2]), ANAT, 'rl-organ');
  addLabel('Omasum', wp('omasum', [1.0, 8.9, 2.9]), ANAT, 'rl-organ');
  addLabel('Abomasum', wp('abomasum', [-0.9, 4.5, 2.4]), ANAT, 'rl-organ');
  addLabel('Oesophagus', () => v([10.5, 10.3, -0.3]), ANAT);
  addLabel('Heart', () => v([6.2, 9.9, -0.3]), ANAT);
  addLabel('Diaphragm', () => v([4.7, 11.0, 0]), ANAT);
  addLabel('Liver (right)', () => v([2.4, 11.5, 2.6]), ANAT);
  addLabel('Spleen (left)', () => v([0.9, 11.3, -3.0]), ANAT);
  addLabel('Duodenum', () => v([-6.5, 10.2, 2.9]), ANAT);
  addLabel('Small intestine', () => v([-6.0, 5.3, 2.8]), ANAT);
  addLabel('Spiral colon', () => v([-5.3, 9.9, 1.2]), ANAT);
  addLabel('Caecum', () => v([-10.2, 7.6, 2.3]), ANAT);
  addLabel('Left longitudinal groove (fat + vessels)', () => v([-5.5, 7.4, -3.0]), ANAT, 'rl-small');
  addLabel('Blind sacs', () => v([-10.9, 10.2, -1.4]), ANAT, 'rl-small');
  const INS: RumenMode[] = ['inside'];
  addLabel('Rumen', wp('rumen', [-4.5, 11.6, -0.75]), INS, 'rl-organ');
  addLabel('Gas cap', wp('rumen', [-4.0, 10.6, -0.75]), INS);
  addLabel('Fibre mat', wp('rumen', [-5.5, 9.2, -0.75]), INS);
  addLabel('Liquid & fine particles', wp('rumen', [-5.0, 6.7, -0.75]), INS);
  addLabel('Papillae (absorb VFAs)', wp('rumen', [-9.4, 6.4, -0.75]), INS, 'rl-small');
  addLabel('Pillar', wp('rumen', [-7.8, 7.9, -0.75]), INS, 'rl-small');
  addLabel('Reticulum — honeycomb', wp('reticulum', [3.3, 4.9, -0.75]), INS, 'rl-organ');
  addLabel('Omasum — leaves (laminae)', wp('omasum', [1.0, 6.1, 2.0]), INS, 'rl-organ');
  addLabel('Abomasum — spiral folds', wp('abomasum', [-0.5, 4.4, 1.4]), INS, 'rl-organ');
  addLabel('Cardia', () => v([1.55, 9.6, -0.75]), INS, 'rl-small');
  const PRB: RumenMode[] = ['problems'];
  const probLabel = addLabel('', () => null, PRB, 'rl-alert');
  const probLabel2 = addLabel('', () => null, PRB, 'rl-small');
  let probLabelPos: THREE.Vector3 | null = null;
  let probLabelPos2: THREE.Vector3 | null = null;
  probLabel.pos = () => probLabelPos;
  probLabel2.pos = () => probLabelPos2;
  const JRN: RumenMode[] = ['journey'];
  const tokenLabel = addLabel('', () => (token.visible ? token.position.clone().add(new THREE.Vector3(0, 0.75, 0)) : null), JRN, 'rl-token');

  // ---- journey token, problem props --------------------------------------------------------------------------
  const token = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0x6f8f2e, roughness: 0.6, clearcoat: 0.3 }));
  token.visible = false;
  scene.add(token);
  disposables.push(token.geometry, token.material as THREE.Material);
  const grooveTube = tubeMesh([CARDIA, [2.0, 8.2, -0.1], [2.3, 7.1, 0.6], [1.6, 7.45, 1.35]], 0.14, new THREE.MeshPhysicalMaterial({ color: 0xf4f0e6, emissive: 0xffd23f, emissiveIntensity: 0.4 }), 40);
  grooveTube.visible = false;
  scene.add(grooveTube);
  disposables.push(grooveTube.geometry, grooveTube.material as THREE.Material);
  const propMat = (hex: number, o: THREE.MeshStandardMaterialParameters = {}) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, ...o });
    disposables.push(m);
    return m;
  };
  const wire = tubeMesh([[2.6, 5.6, -0.9], [3.2, 5.6, -0.9], [4.05, 6.05, -0.9], [4.75, 6.55, -0.9]], 0.08, propMat(0xdfe6ec, { metalness: 0.6, roughness: 0.25, emissive: 0x556070, depthTest: false }), 20, 8);
  wire.renderOrder = 10;
  wire.visible = false;
  scene.add(wire);
  disposables.push(wire.geometry);
  const inflame = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), propMat(0xff3b2f, { transparent: true, opacity: 0.3, depthWrite: false }));
  inflame.visible = false;
  scene.add(inflame);
  disposables.push(inflame.geometry);
  const pericardium = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 20), propMat(0xf2d8cf, { transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
  pericardium.scale.set(1.55, 1.9, 1.45);
  pericardium.position.set(5.6, 7.35, -0.35);
  pericardium.visible = false;
  scene.add(pericardium);
  disposables.push(pericardium.geometry);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 10, 48), propMat(0xff9f1a, { emissive: 0xff9f1a, emissiveIntensity: 0.5 }));
  ring.visible = false;
  scene.add(ring);
  disposables.push(ring.geometry);
  const trocar = tubeMesh([SITES.trocar, [SITES.trocar[0] + 0.2, SITES.trocar[1] - 0.1, SITES.trocar[2] + 1.6]], 0.08, propMat(0x9aa4ad, { metalness: 0.85, roughness: 0.3 }), 4, 10);
  trocar.visible = false;
  scene.add(trocar);
  disposables.push(trocar.geometry);
  const flank = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 20), propMat(0xb08a6e, { transparent: true, opacity: 0.18, depthWrite: false }));
  flank.scale.set(3.4, 2.0, 1.2);
  flank.position.set(-4.6, 9.4, -3.1);
  flank.visible = false;
  scene.add(flank);
  disposables.push(flank.geometry);
  // froth bubbles inside the rumen
  const bubbleGeo = new THREE.SphereGeometry(1, 8, 6);
  const bubbles = new THREE.InstancedMesh(bubbleGeo, propMat(0xf4f1e6, { transparent: true, opacity: 0.75, roughness: 0.2 }), 600);
  {
    const s = rumenShape();
    const m4 = new THREE.Matrix4();
    let n = 0;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    while (n < 600) {
      const x = -10.5 + rnd() * 13, y = 5.5 + rnd() * 5.5, z = -3 + rnd() * 4.5;
      if (s.sdf(x, y, z) < -0.3) {
        const r = 0.06 + rnd() * 0.14;
        m4.makeScale(r, r, r).setPosition(x, y, z);
        bubbles.setMatrixAt(n++, m4);
      }
    }
  }
  bubbles.visible = false;
  scene.add(bubbles);
  disposables.push(bubbleGeo);

  // ---- state ----------------------------------------------------------------------------------------------------
  let mode: RumenMode = 'anatomy';
  let selected: OrganId | null = null;
  let journey: { step: JourneyPath; focus: OrganId[]; start: number; path: THREE.CatmullRomCurve3 | null; dur: number } | null = null;
  let problem: { id: ProblemId; start: number } | null = null;
  let labelsOn = true;
  let explodeK = 0;

  function applyClipping() {
    const cut = mode === 'inside';
    for (const o of organs.values()) {
      const planes = cut && ['rumen', 'reticulum', 'omasum', 'abomasum'].includes(o.id) ? [o.plane] : [];
      o.group.traverse((c) => {
        const m = (c as THREE.Mesh).material as THREE.Material | undefined;
        if (!m || !(c as THREE.Mesh).isMesh) return;
        // the contents are cut a little deeper so the lining with its papillae shows around them
        m.clippingPlanes = planes.length && c.userData.contents ? [contentsPlane] : planes;
        m.needsUpdate = true;
      });
    }
    for (const id of Object.keys(insideOf)) insideOf[id].visible = cut;
  }

  function applyLook() {
    const transparentAll = mode === 'journey' || (mode === 'problems' && problem && problem.id !== 'lda' && problem.id !== 'rda');
    for (const o of organs.values()) {
      const inMode =
        mode === 'inside'
          ? ['rumen', 'reticulum', 'omasum', 'abomasum'].includes(o.id)
          : true;
      o.group.visible = inMode;
      for (const m of o.outer) {
        const mat = m.material as THREE.MeshPhysicalMaterial;
        if (o.id === 'diaphragm') continue;
        const focus: boolean =
          (mode === 'anatomy' && selected === o.id) || (mode === 'journey' && !!journey?.focus.includes(o.id)) || (mode === 'problems' && problemFocus().includes(o.id));
        const ghost = !!transparentAll && (o.id === 'rumen' || o.id === 'reticulum' || o.id === 'abomasum' || o.id === 'omasum');
        mat.transparent = ghost;
        mat.opacity = ghost ? (focus ? 0.55 : 0.32) : 1;
        mat.depthWrite = !ghost;
        mat.emissive.set(focus ? 0xff9f1a : 0x000000);
        mat.emissiveIntensity = focus ? (mode === 'anatomy' ? 0.28 : 0.18) : 0;
        mat.needsUpdate = true;
      }
    }
    body.visible = mode !== 'inside';
    skel.visible = skelOn && mode !== 'inside';
  }
  const problemFocus = (): OrganId[] => {
    if (!problem) return [];
    return problem.id === 'hardware' ? ['reticulum', 'heart'] : problem.id === 'lda' || problem.id === 'rda' ? ['abomasum'] : ['rumen'];
  };

  // ---- camera ----------------------------------------------------------------------------------------------------
  const VIEWS: Record<RumenView, { target: V3; pos: V3 }> = {
    left: { target: [-2.4, 8.0, 0], pos: [-2.4, 10.2, -27] },
    right: { target: [-2.0, 8.0, 0], pos: [-2.0, 10.2, 27] },
    below: { target: [-2.0, 7.0, 0], pos: [-2.0, -16, 2] },
    whole: { target: [1.5, 8.0, 0], pos: [1.5, 12, -40] },
    close: { target: [3.8, 6.6, 0], pos: [3.8, 8.2, -15] },
  };
  const INSIDE_VIEW = { target: [-2.6, 6.2, 0] as V3, pos: [-2.6, 8.5, -24] as V3 };
  let fly: { fp: THREE.Vector3; ft: THREE.Vector3; tp: THREE.Vector3; tt: THREE.Vector3; start: number } | null = null;
  const goTo = (target: V3, pos: V3) => {
    const t = v(target);
    const widen = Math.max(1, 1.5 / Math.max(camera.aspect, 0.3));
    const p = t.clone().add(v(pos).sub(t).multiplyScalar(widen));
    fly = { fp: camera.position.clone(), ft: controls.target.clone(), tp: p, tt: t, start: performance.now() };
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
    const p = VIEWS.left;
    const widen = Math.max(1, 1.5 / Math.max(camera.aspect, 0.3));
    controls.target.copy(v(p.target));
    camera.position.copy(v(p.target).add(v(p.pos).sub(v(p.target)).multiplyScalar(widen)));
    controls.update();
  }

  // ---- journey paths ------------------------------------------------------------------------------------------
  const JPATH: Record<JourneyPath, { pts: V3[]; dur: number }> = {
    swallow: { pts: [MOUTH, ...ESOPHAGUS.slice(1), [0.2, 9.4, -1.0], [-2.5, 9.2, -1.2]], dur: 6 },
    mix: { pts: [[-1, 9.3, -1], [-6, 9.6, -1.3], [-9.2, 9.0, -1.2], [-9.4, 6.9, -0.7], [-4, 6.4, -0.8], [0.4, 6.8, -0.8], [1.0, 8.5, -1.0], [-1, 9.3, -1]], dur: 9 },
    belch: { pts: [[-4.5, 10.5, -1.2], [-1, 10.1, -1.1], [0.8, 9.4, -0.8], CARDIA, ...[...ESOPHAGUS].reverse().slice(1)], dur: 6 },
    rumination: { pts: [[0.6, 8.6, -0.9], CARDIA, ...[...ESOPHAGUS].reverse().slice(1), MOUTH, MOUTH, ...ESOPHAGUS.slice(1), [0.4, 9.1, -1.0]], dur: 11 },
    toReticulum: { pts: [[-4, 6.4, -0.8], [-1, 6.4, -0.8], [0.6, 6.6, -0.7], [2.0, 6.5, -0.5], [2.8, 6.3, -0.4]], dur: 6 },
    toOmasum: { pts: [[2.8, 6.6, -0.4], [2.5, 7.0, 0.3], [2.1, 7.25, 0.95], [1.4, 7.6, 1.6], [0.8, 7.5, 2.1], [0.5, 6.7, 1.95], [0.5, 6.15, 1.7]], dur: 7 },
    toAbomasum: { pts: [[0.5, 6.15, 1.7], [1.6, 5.9, 0.9], [0.6, 5.8, 1.2], [-1.4, 5.85, 2.0], [-2.9, 6.2, 2.5], [-3.6, 6.6, 2.6]], dur: 7 },
    intestine: { pts: [...DUODENUM, ...jejunumPath().filter((_, i) => i % 15 === 0), ...CAECUM], dur: 12 },
    groove: { pts: [MOUTH, ...ESOPHAGUS.slice(1), [2.0, 8.2, -0.1], [2.3, 7.1, 0.6], [1.6, 7.45, 1.35], [0.8, 7.4, 2.0], [0.5, 6.4, 1.8], [0.6, 5.8, 1.2], [-1.4, 5.85, 2.0]], dur: 10 },
  };
  const TOKEN: Record<JourneyPath, { color: number; label: string; r: number; opacity: number }> = {
    swallow: { color: 0x6f8f2e, label: 'Feed bolus', r: 0.32, opacity: 1 },
    mix: { color: 0x6f8f2e, label: 'Feed', r: 0.32, opacity: 1 },
    belch: { color: 0xbfe1f2, label: 'Gas', r: 0.42, opacity: 0.7 },
    rumination: { color: 0x7d7a35, label: 'Cud', r: 0.34, opacity: 1 },
    toReticulum: { color: 0x5b4a2a, label: 'Fine particles', r: 0.26, opacity: 1 },
    toOmasum: { color: 0x5b4a2a, label: 'Digesta', r: 0.26, opacity: 1 },
    toAbomasum: { color: 0x5b4a2a, label: 'Digesta', r: 0.26, opacity: 1 },
    intestine: { color: 0x5b4a2a, label: 'Digesta', r: 0.2, opacity: 1 },
    groove: { color: 0xfffdf4, label: 'Milk', r: 0.28, opacity: 1 },
  };

  // ---- picking / hover --------------------------------------------------------------------------------------------
  const ray = new THREE.Raycaster();
  const pickAt = (ev: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
    const hits = ray.intersectObjects(pickables.filter((m) => m.visible && m.parent?.visible && (m.material as THREE.Material).opacity > 0.2 && m.userData.organ !== 'diaphragm'), false);
    return hits[0] ? (hits[0].object.userData.organ as OrganId) : null;
  };
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    down = null;
    if (mode !== 'anatomy' && mode !== 'inside') return;
    const id = pickAt(e);
    selected = id;
    applyLook();
    events.onPick(id);
  };
  let lastMove = 0;
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || down || (mode !== 'anatomy' && mode !== 'inside')) return;
    const now = performance.now();
    if (now - lastMove < 60) return;
    lastMove = now;
    const id = pickAt(e);
    if (id) {
      const r = container.getBoundingClientRect();
      tip.textContent = ORGANS[id].name;
      tip.style.display = '';
      tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 10}px)`;
      renderer.domElement.style.cursor = 'pointer';
    } else {
      tip.style.display = 'none';
      renderer.domElement.style.cursor = '';
    }
  };
  const onLeave = () => {
    tip.style.display = 'none';
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerleave', onLeave);

  // ---- build queue ------------------------------------------------------------------------------------------------
  let cancelled = false;
  let done = 0;
  const total = jobs.length;
  const runJobs = () => {
    if (cancelled) return;
    const t0 = performance.now();
    while (jobs.length && performance.now() - t0 < 40) {
      const j = jobs.shift()!;
      events.onProgress(done / total, j.what);
      j.run();
      done++;
    }
    events.onProgress(done / total, jobs[0]?.what ?? '');
    applyLook();
    applyClipping();
    if (jobs.length) setTimeout(runJobs, 0);
    else if (pendingInside) {
      pendingInside = false;
      buildInside();
      applyLook();
    }
  };
  let pendingInside = false;
  setTimeout(runJobs, 30);
  let skelOn = true;

  // ---- frame loop ------------------------------------------------------------------------------------------------
  const tmp = new THREE.Vector3();
  const occRay = new THREE.Raycaster();
  let lastOcclusion = 0;
  let raf = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    // explode/assemble the compartments for the inside view
    const want = mode === 'inside' ? 1 : 0;
    explodeK += (want - explodeK) * 0.08;
    for (const o of organs.values()) o.group.position.copy(o.explode).multiplyScalar(explodeK);
    // the cut planes move with the compartments
    // keep z ≥ the organ's cut line (the half facing a left-side camera is removed)
    for (const o of organs.values()) o.plane.constant = -(o.cutZ + o.explode.z * explodeK);
    // journey token
    if (mode === 'journey' && journey?.path) {
      const t = ((now - journey.start) / 1000 / journey.dur) % 1.15;
      const k = Math.min(1, t);
      journey.path.getPointAt(k, token.position);
      token.visible = true;
      // rumen contractions while mixing
      const pulse = journey.step === 'mix' || journey.step === 'belch' ? 1 + 0.018 * Math.sin(now / 420) : 1;
      organs.get('rumen')!.group.scale.setScalar(pulse);
    } else {
      token.visible = false;
      if (mode !== 'problems') organs.get('rumen')!.group.scale.setScalar(1);
    }
    // problems
    if (mode === 'problems' && problem) {
      const t = (now - problem.start) / 1000;
      const rg = organs.get('rumen')!.group;
      if (problem.id === 'frothy' || problem.id === 'freegas') {
        const k = Math.min(1, t / 2.5);
        const s = 1 + 0.1 * k + 0.01 * Math.sin(now / 300);
        rg.scale.set(1, s, 1 + 0.08 * k);
        rg.position.set(0, -(s - 1) * 6.0, (0.08 * k) * 1.3);
        flank.scale.set(3.4, 2.0, 1.2 + 0.5 * k);
      } else {
        rg.scale.setScalar(1);
        rg.position.set(0, 0, 0);
      }
      if (problem.id === 'hardware') {
        const k = (t % 7) / 5;
        const drawn = Math.min(1, k);
        // the wire is pushed forward, out of the reticulum, through the diaphragm towards the heart
        wire.position.set(-1.9 * (1 - drawn), -1.0 * (1 - drawn), 0);
        inflame.visible = drawn > 0.35;
        inflame.position.set(drawn > 0.85 ? 4.7 : 3.6, drawn > 0.85 ? 6.6 : 5.75, -0.9);
        inflame.scale.setScalar(drawn > 0.85 ? 0.9 + 0.1 * Math.sin(now / 200) : 0.6);
      }
      if (problem.id === 'lda' || problem.id === 'rda') {
        const k = Math.min(1, t / 1.6);
        const target = aboMeshes[problem.id];
        const normal = aboMeshes.normal;
        if (target && normal) {
          const tm = target.material as THREE.MeshPhysicalMaterial;
          const nm = normal.material as THREE.MeshPhysicalMaterial;
          tm.transparent = nm.transparent = k < 1;
          tm.opacity = k;
          nm.opacity = 1 - k;
          tm.depthWrite = k >= 1;
          nm.depthWrite = false;
          normal.visible = k < 1;
          target.visible = true;
        }
        ring.scale.setScalar(1 + 0.08 * Math.sin(now / 250));
      }
    }
    if (fly) {
      const k = Math.min(1, (now - fly.start) / 900);
      const e = k * k * (3 - 2 * k);
      camera.position.lerpVectors(fly.fp, fly.tp, e);
      controls.target.lerpVectors(fly.ft, fly.tt, e);
      if (k >= 1) fly = null;
    }
    controls.update();
    renderer.render(scene, camera);

    if (labelsOn) {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const placed: Array<[number, number, number, number]> = [];
      // every 250 ms: hide labels whose point is hidden behind an opaque organ
      if (now - lastOcclusion > 250 && mode !== 'journey' && mode !== 'inside') {
        lastOcclusion = now;
        const solid = pickables.filter((m) => m.visible && m.parent?.visible && !(m.material as THREE.Material).transparent && m.userData.organ !== 'diaphragm');
        for (const l of labels) {
          const p = l.modes.includes(mode) ? l.pos() : null;
          if (!p) continue;
          const dir = p.clone().sub(camera.position);
          const dist = dir.length();
          occRay.set(camera.position, dir.normalize());
          occRay.far = dist - 0.9;
          l.hidden = occRay.intersectObjects(solid, false).length > 0;
        }
      }
      for (const l of labels) {
        const p = l.modes.includes(mode) && !(l.hidden && mode !== 'inside' && mode !== 'journey') ? l.pos() : null;
        if (!p || !l.el.textContent) {
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

  // ---- problem setup -------------------------------------------------------------------------------------------------
  function setupProblem(id: ProblemId) {
    problem = { id, start: performance.now() };
    const show = (o: THREE.Object3D, on: boolean) => (o.visible = on);
    show(bubbles, id === 'frothy');
    show(flank, id === 'frothy' || id === 'freegas');
    show(trocar, id === 'freegas');
    show(wire, id === 'hardware');
    show(pericardium, id === 'hardware');
    show(inflame, false);
    ring.visible = id === 'lda' || id === 'rda';
    if (id === 'lda' || id === 'rda') {
      buildAbomasum(id);
      for (const k of ['normal', 'lda', 'rda'] as const) if (aboMeshes[k]) aboMeshes[k]!.visible = k === 'normal';
      const p = id === 'lda' ? SITES.pingLeft : SITES.pingRight;
      ring.position.copy(v(p));
      ring.rotation.set(0, 0, 0);
    } else {
      for (const k of ['normal', 'lda', 'rda'] as const) {
        const m = aboMeshes[k];
        if (!m) continue;
        m.visible = k === 'normal';
        const mm = m.material as THREE.MeshPhysicalMaterial;
        mm.opacity = 1;
      }
    }
    // gas cap visible in free gas bloat: show the contents through the ghosted rumen
    if (id === 'freegas' || id === 'frothy') {
      buildInside();
      insideOf.rumen.visible = true;
      const gas = insideOf.rumen.getObjectByName('gas');
      if (gas) gas.visible = true;
      const mat = insideOf.rumen.getObjectByName('mat');
      if (mat) mat.visible = id === 'freegas';
      const liq = insideOf.rumen.getObjectByName('liquid');
      if (liq) liq.visible = true;
      insideOf.rumen.children[0].visible = false; // no mucosa
      for (const o of [insideOf.rumen]) o.traverse((c) => ((c as THREE.Mesh).material as THREE.Material | undefined)?.setValues?.({ clippingPlanes: [] }));
      const gm = (gas as THREE.Mesh | undefined)?.material as THREE.MeshPhysicalMaterial | undefined;
      if (gm) gm.opacity = id === 'freegas' ? 0.55 : 0.2;
    } else if (insideOf.rumen) insideOf.rumen.visible = false;
    probLabelPos = id === 'hardware' ? v([4.0, 4.7, -1.2]) : id === 'lda' ? v([SITES.pingLeft[0], SITES.pingLeft[1] + 1.6, SITES.pingLeft[2]]) : id === 'rda' ? v([SITES.pingRight[0], SITES.pingRight[1] + 1.6, SITES.pingRight[2]]) : v([SITES.trocar[0], SITES.trocar[1] + 1.9, SITES.trocar[2]]);
    probLabel.el.textContent =
      id === 'hardware' ? 'Wire: reticulum → diaphragm → pericardium' : id === 'lda' ? 'PING area — left, ribs 9–13' : id === 'rda' ? 'PING area — right, last ribs & flank' : id === 'freegas' ? 'Trocar site: left paralumbar fossa' : 'Left flank swollen — froth throughout';
    probLabelPos2 = id === 'hardware' ? v([5.7, 9.7, -1.6]) : id === 'lda' ? v([-0.5, 6.6, -3.4]) : id === 'rda' ? v([-1.5, 6.6, 3.4]) : v([-4.0, 11.6, -1.2]);
    probLabel2.el.textContent = id === 'hardware' ? 'Pericardium' : id === 'lda' ? 'Abomasum displaced to the LEFT' : id === 'rda' ? 'Abomasum distended on the RIGHT' : id === 'freegas' ? 'Large gas cap' : 'Stable foam traps the gas';
  }
  const clearProblem = () => {
    for (const o of [bubbles, flank, trocar, wire, pericardium, inflame, ring]) o.visible = false;
    const rg = organs.get('rumen')!.group;
    rg.scale.setScalar(1);
    rg.position.set(0, 0, 0);
    for (const k of ['normal', 'lda', 'rda'] as const) {
      const m = aboMeshes[k];
      if (!m) continue;
      m.visible = k === 'normal';
      const mm = m.material as THREE.MeshPhysicalMaterial;
      mm.opacity = 1;
      mm.transparent = false;
      mm.depthWrite = true;
    }
    if (insideOf.rumen) {
      insideOf.rumen.children[0].visible = true;
      for (const n of ['gas', 'mat', 'liquid']) {
        const o = insideOf.rumen.getObjectByName(n);
        if (o) o.visible = true;
      }
      const gm = (insideOf.rumen.getObjectByName('gas') as THREE.Mesh | undefined)?.material as THREE.MeshPhysicalMaterial | undefined;
      if (gm) gm.opacity = 0.35;
    }
    problem = null;
  };

  return {
    setMode(m) {
      if (mode === 'problems' && m !== 'problems') clearProblem();
      mode = m;
      if (m === 'inside') {
        if (jobs.length) pendingInside = true;
        else buildInside();
        goTo(INSIDE_VIEW.target, INSIDE_VIEW.pos);
      }
      grooveTube.visible = false;
      if (m !== 'journey') journey = null;
      applyClipping();
      applyLook();
    },
    setView(name) {
      const p = VIEWS[name];
      goTo(p.target, p.pos);
    },
    setSkeleton(on) {
      skelOn = on;
      skel.visible = on && mode !== 'inside';
    },
    setLabels(on) {
      labelsOn = on;
      labelLayer.style.display = on ? '' : 'none';
    },
    setSelected(id) {
      selected = id;
      applyLook();
    },
    setJourney(step, focus) {
      const p = JPATH[step];
      const t = TOKEN[step];
      journey = { step, focus, start: performance.now(), path: new THREE.CatmullRomCurve3(p.pts.map(v), false, 'centripetal'), dur: p.dur };
      const tm = token.material as THREE.MeshPhysicalMaterial;
      tm.color.set(t.color);
      tm.transparent = t.opacity < 1;
      tm.opacity = t.opacity;
      token.scale.setScalar(t.r / 0.32);
      tokenLabel.el.textContent = t.label;
      grooveTube.visible = step === 'groove';
      applyLook();
    },
    setProblem(id) {
      clearProblem();
      setupProblem(id);
      applyLook();
    },
    dispose() {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      for (const g of skelCache.values()) g.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      labelLayer.remove();
      tip.remove();
    },
  };
}
