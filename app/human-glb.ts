import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type HumanModel = {
  group: T.Group;
  textures: T.Texture[];
};

export async function loadHumanModel(url: string): Promise<HumanModel | null> {
  try {
    const gltf = await new GLTFLoader().loadAsync(url);
    const root = gltf.scene;
    root.updateMatrixWorld(true);

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

    // Normalize to the game's character height (~1.78), drop it to ground. The
    // model's front already faces -z, matching the game character.
    const box = new T.Box3().setFromObject(flat);
    const height = box.max.y - box.min.y;
    const scale = 1.78 / height;
    const s = new T.Matrix4().makeScale(scale, scale, scale);
    // Sketchfab figures are authored facing +z; the game's forward is -z, so
    // spin the model 180° so the driver walks and rides facing the way they go.
    const rot = new T.Matrix4().makeRotationY(Math.PI);
    const lift = new T.Matrix4().makeTranslation(0, -box.min.y * scale, 0);
    const bake = rot.multiply(lift.multiply(s));
    meshes.forEach((m) => {
      m.geometry.applyMatrix4(bake);
      m.geometry.computeVertexNormals();
    });

    return { group: flat, textures };
  } catch (err) {
    console.warn('human model unavailable, keeping procedural character', err);
    return null;
  }
}