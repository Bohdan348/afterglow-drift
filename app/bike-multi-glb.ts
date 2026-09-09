import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type BikeModel = {
  group: T.Group;
  wheels: T.Group[]; // [front, rear] pivots
  tailMat: T.MeshStandardMaterial | null;
  textures: T.Texture[];
};

function geometryBox(g: T.BufferGeometry) { g.computeBoundingBox(); const b = g.boundingBox!; const s = b.getSize(new T.Vector3()), c = b.getCenter(new T.Vector3()); return { s, c }; }

function wheelClusters(meshes: T.Mesh[], bikeH: number) {
  const maxY = Math.max(.35, bikeH * .85);
  const parts: T.Mesh[] = [];
  const boxes = new Map<T.Mesh, ReturnType<typeof geometryBox>>();
  const oc = (m: T.Mesh) => boxes.get(m) ?? (boxes.set(m, geometryBox(m.geometry)), boxes.get(m))!;
  for (const m of meshes) {
    const { s } = oc(m);
    const mx = Math.max(s.y, s.z), mn = Math.min(s.y, s.z);
    if (s.x < mn * .85 && mn / mx > .72 && mx > .06 && oc(m).c.y < maxY) parts.push(m);
  }
  const clusters: { ms: T.Mesh[], c: T.Vector3 }[] = [];
  for (const m of parts) {
    const c = oc(m).c;
    const hit = clusters.find(cl => Math.hypot(cl.c.x - c.x, cl.c.z - c.z) < .75);
    if (hit) { hit.ms.push(m); const n = hit.ms.length; hit.c.set((hit.c.x * (n - 1) + c.x) / n, (hit.c.y * (n - 1) + c.y) / n, (hit.c.z * (n - 1) + c.z) / n); }
    else clusters.push({ ms: [m], c: c.clone() });
  }
  return { clusters, oc };
}

export async function loadBikeModelMulti(url: string): Promise<BikeModel | null> {
  try {
    const gltf = await new GLTFLoader().loadAsync(url);
    const root = gltf.scene;
    root.updateMatrixWorld(true);
    const flat = new T.Group();
    const meshes: T.Mesh[] = [];
    const textures: T.Texture[] = [];
    root.traverse(o => {
      if (!(o instanceof T.Mesh)) return;
      const g = o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      g.computeVertexNormals();
      const m = new T.Mesh(g, o.material);
      m.name = o.name;
      m.castShadow = true;
      m.receiveShadow = true;
      flat.add(m);
      meshes.push(m);
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach(mat => {
        const map = (mat as T.MeshStandardMaterial).map;
        if (map && textures.indexOf(map) < 0) textures.push(map);
      });
    });
    // Same bake as loadBikeModel: scale z-span to the game's 2.0 wheelbase
    // band, drop tires to y=0 and recenter x/z. Front stays at -z (no RotY).
    const box0 = new T.Box3().setFromObject(flat);
    const scale = 2 / Math.max(.001, box0.max.z - box0.min.z);
    const center = box0.getCenter(new T.Vector3());
    const bake = new T.Matrix4();
    bake.makeScale(scale, scale, scale);
    bake.setPosition(-center.x * scale, -box0.min.y * scale, -center.z * scale);
    // apply scale and translation in one matrix per mesh
    meshes.forEach(m => { m.geometry.applyMatrix4(bake); m.geometry.computeVertexNormals(); });
    flat.updateMatrixWorld(true);
    const finalBox = new T.Box3().setFromObject(flat);
    const bikeH = finalBox.max.y;
    const { clusters, oc } = wheelClusters(meshes, bikeH);
    if (clusters.length !== 2) { console.warn('Bike multi: expected 2 wheels, found', clusters.length); return null; }
    const pivots: T.Group[] = [];
    for (const cl of clusters) {
      const pivot = new T.Group();
      pivot.position.copy(cl.c);
      pivot.rotation.order = 'YXZ';
      pivot.userData.glb = true;
      for (const m of cl.ms) { const { c } = oc(m); m.geometry.translate(-c.x, -c.y, -c.z); pivot.add(m); }
      flat.add(pivot);
      pivots.push(pivot);
    }
    pivots.sort((a, b) => a.position.z - b.position.z);
    // front at -z, rear at +z (matching game forward axis)
    const wheels = [pivots[0], pivots[1]];
    let tailMat: T.MeshStandardMaterial | null = null;
    flat.traverse(o => {
      if (tailMat || !(o instanceof T.Mesh) || !/red_glass|taillight|tail/i.test(o.name)) return;
      const mat = o.material as T.MeshStandardMaterial;
      tailMat = new T.MeshStandardMaterial({ color: mat.color, emissive: new T.Color('#ff2211'), emissiveIntensity: .8, ...(mat.map ? { map: mat.map } : {}) });
      o.material = tailMat;
    });
    if (!tailMat) tailMat = new T.MeshStandardMaterial({ color: '#ff3730', emissive: '#ff1609', emissiveIntensity: .8 });
    return { group: flat, wheels, tailMat, textures };
  } catch (err) { console.warn('multi bike unavailable, keeping procedural motorbike', err); return null; }
}