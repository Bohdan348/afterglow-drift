import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const WHEEL_PARTS = /^Cylinder0(0[7-9]|1[0-4])_/;

function geometryCenter(g: T.BufferGeometry) {
  g.computeBoundingBox();
  return g.boundingBox!.getCenter(new T.Vector3()).clone();
}

export type CarModel = {
  group: T.Group;
  wheels: T.Group[];
  tailMat: T.MeshStandardMaterial;
  textures: T.Texture[];
};

export async function loadCarModel(url: string): Promise<CarModel | null> {
  try {
    const gltf = await new GLTFLoader().loadAsync(url);
    const root = gltf.scene;
    root.updateMatrixWorld(true);

    // Flatten: bake every mesh's world transform into its geometry, drop the
    // nested Sketchfab hierarchy, keep original names for wheel detection.
    const flat = new T.Group();
    const meshes: T.Mesh[] = [];
    const textures: T.Texture[] = [];
    root.traverse((o) => {
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
      mats.forEach((mat) => {
        const map = (mat as T.MeshStandardMaterial).map;
        if (map && textures.indexOf(map) < 0) textures.push(map);
      });
    });

    // Orient front toward -z (matches the game's vehicles), center it and drop
    // it so the tires rest on y=0.
    const box = new T.Box3().setFromObject(flat);
    const center = box.getCenter(new T.Vector3());
    const bake = new T.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z);
    meshes.forEach((m) => {
      m.geometry.applyMatrix4(bake);
      m.geometry.computeVertexNormals();
    });

    // The wheel parts share a model, not a geometry centre (parts like the
    // spare tire node live far from the axle). Group by node base name, then
    // merge part-bases that sit at the same axle into one spin pivot.
    const bases = new Map<string, { cx: number; cy: number; cz: number; meshes: T.Mesh[] }>();
    for (const m of meshes) {
      if (!WHEEL_PARTS.test(m.name)) continue;
      const c = geometryCenter(m.geometry);
      const base = m.name.split('_')[0];
      const b = bases.get(base) ?? { cx: 0, cy: 0, cz: 0, meshes: [] };
      b.cx += c.x;
      b.cy += c.y;
      b.cz += c.z;
      b.meshes.push(m);
      bases.set(base, b);
    }
    const anchor = ([cx, cy, cz]: [number, number, number], n: number) => [cx / n, cy / n, cz / n] as [number, number, number];
    const axleOf = (b: { cx: number; cy: number; cz: number; meshes: T.Mesh[] }) =>
      anchor([b.cx, b.cy, b.cz], b.meshes.length);

    const axles: { pos: [number, number, number]; meshes: T.Mesh[] }[] = [];
    for (const b of bases.values()) axles.push({ pos: axleOf(b), meshes: b.meshes });

    const merged: typeof axles = [];
    for (const a of axles) {
      const match = merged.find((m) => Math.hypot(m.pos[0] - a.pos[0], m.pos[2] - a.pos[2]) < 0.5);
      if (match) {
        const n = match.meshes.length + a.meshes.length;
        match.pos = anchor(
          [match.pos[0] * match.meshes.length + a.pos[0] * a.meshes.length,
           match.pos[1] * match.meshes.length + a.pos[1] * a.meshes.length,
           match.pos[2] * match.meshes.length + a.pos[2] * a.meshes.length],
          n,
        );
        match.meshes.push(...a.meshes);
      } else {
        merged.push({ pos: a.pos, meshes: [...a.meshes] });
      }
    }

    const pivots: T.Group[] = [];
    for (const w of merged) {
      const pivot = new T.Group();
      pivot.position.set(w.pos[0], w.pos[1], w.pos[2]);
      pivot.rotation.order = 'YXZ';
      pivot.userData.glb = true;
      for (const m of w.meshes) {
        const c = geometryCenter(m.geometry);
        m.geometry.translate(-c.x, -c.y, -c.z);
        pivot.add(m);
      }
      flat.add(pivot);
      pivots.push(pivot);
    }
    pivots.sort((a, b) => a.position.z - b.position.z); // front (-z) first

    const wheels: T.Group[] = [];
    const front = pivots.filter((p) => p.position.z < 0).sort((a, b) => a.position.x - b.position.x);
    const rear = pivots.filter((p) => p.position.z >= 0).sort((a, b) => a.position.x - b.position.x);
    // Order for physics: [frontLeft, rearLeft, frontRight, rearRight] so that
    // indices 0 and 2 are the steered front wheels.
    const left = [front[0], rear[0]].filter(Boolean);
    const right = [front[1], rear[1]].filter(Boolean);
    wheels.push(...left, ...right);
    if (wheels.length !== 4) {
      console.warn('Glb car: expected 4 wheels, found', wheels.length);
      return null;
    }

    // Tail-light material for the brake glow (physics drives emissiveIntensity).
    let tailMat: T.MeshStandardMaterial | null = null;
    flat.traverse((o) => {
      if (tailMat || !(o instanceof T.Mesh) || !/red_glass/i.test(o.name)) return;
      const mat = o.material as T.MeshStandardMaterial;
      tailMat = new T.MeshStandardMaterial({
        color: mat.color,
        emissive: new T.Color('#ff2211'),
        emissiveIntensity: 0.8,
        ...(mat.map ? { map: mat.map } : {}),
      });
      o.material = tailMat;
    });
    if (!tailMat) {
      tailMat = new T.MeshStandardMaterial({ color: '#ff3730', emissive: '#ff1609', emissiveIntensity: 0.8 });
    }

    return { group: flat, wheels, tailMat, textures };
  } catch (err) {
    console.warn('car model unavailable, keeping procedural car', err);
    return null;
  }
}