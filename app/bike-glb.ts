import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type BikeModel = {
  group: T.Group;
  textures: T.Texture[];
};

export async function loadBikeModel(url: string): Promise<BikeModel | null> {
  try {
    const gltf = await new GLTFLoader().loadAsync(url);
    const root = gltf.scene;
    root.updateMatrixWorld(true);

    // The S1000RR is a skinned rig with the body split across jointed parts
    // (wings, nulls, exhaust, chassis), so the whole hierarchy is kept intact
    // instead of flattening it - the bind skeletons stay bound that way.
    const textures: T.Texture[] = [];
    root.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      (mats as T.Material[]).forEach((mat) => {
        const map = (mat as T.MeshStandardMaterial).map;
        if (map && textures.indexOf(map) < 0) textures.push(map);
      });
    });

    // The model is authored with the front at -z (headlights at z=-0.78,
    // forks at z=-0.62, taillight at z=+0.95, tire bottoms at y=-0.55),
    // which is exactly the game's forward axis, so no rotation is needed.
    // Scale the 2.18m wheelbase down to the game's 2.0m, drop the tires to
    // y=0 and recenter x/z.
    const box0 = new T.Box3().setFromObject(root);
    const scale = 2 / (box0.max.z - box0.min.z);
    root.scale.setScalar(scale);
    root.updateMatrixWorld(true);
    const final = new T.Box3().setFromObject(root);
    const center = final.getCenter(new T.Vector3());
    root.position.set(-center.x, -final.min.y, -center.z);

    return { group: root, textures };
  } catch (err) {
    console.warn('bike model unavailable, keeping procedural motorbike', err);
    return null;
  }
}