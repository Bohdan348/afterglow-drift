import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CarModel } from './car-glb';

function geometryBox(g:T.BufferGeometry){g.computeBoundingBox();const b=g.boundingBox!;const s=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());return{s,c}}

function wheelClusters(meshes:T.Mesh[],carH:number){
  const maxY=Math.max(.35,carH*.4);
  const parts:T.Mesh[]=[];
  const boxes=new Map<T.Mesh,ReturnType<typeof geometryBox>>();
  const oc=(m:T.Mesh)=>boxes.get(m)??(boxes.set(m,geometryBox(m.geometry)),boxes.get(m)!);
  for(const m of meshes){const{s}=oc(m);const mx=Math.max(s.y,s.z),mn=Math.min(s.y,s.z);if(s.x<mn*.85&&mn/mx>.72&&mx>.06&&oc(m).c.y<maxY)parts.push(m)}
  const clusters:{ms:T.Mesh[],c:T.Vector3}[]=[];
  for(const m of parts){const c=oc(m).c;const hit=clusters.find(cl=>Math.hypot(cl.c.x-c.x,cl.c.z-c.z)<.75);if(hit){hit.ms.push(m);const n=hit.ms.length;hit.c.set((hit.c.x*(n-1)+c.x)/n,(hit.c.y*(n-1)+c.y)/n,(hit.c.z*(n-1)+c.z)/n)}else clusters.push({ms:[m],c:c.clone()})}
  return {clusters,oc}
}

export async function loadCarModelMulti(url:string):Promise<CarModel|null>{
  try{
    const gltf=await new GLTFLoader().loadAsync(url);
    const root=gltf.scene;root.updateMatrixWorld(true);
    const flat=new T.Group();const meshes:T.Mesh[]=[];const textures:T.Texture[]=[];
    root.traverse(o=>{if(!(o instanceof T.Mesh))return;const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);g.computeVertexNormals();const m=new T.Mesh(g,o.material);m.name=o.name;m.castShadow=true;m.receiveShadow=true;flat.add(m);meshes.push(m);const mats=Array.isArray(m.material)?m.material:[m.material];mats.forEach(mat=>{const map=(mat as T.MeshStandardMaterial).map;if(map&&textures.indexOf(map)<0)textures.push(map)})});
    const box=new T.Box3().setFromObject(flat);const center=box.getCenter(new T.Vector3());
    const bake=new T.Matrix4().multiplyMatrices(new T.Matrix4().makeRotationY(Math.PI),new T.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z));
    meshes.forEach(m=>{m.geometry.applyMatrix4(bake);m.geometry.computeVertexNormals()});
    flat.updateMatrixWorld(true);
    const carH=new T.Box3().setFromObject(flat).max.y;
    const {clusters:all,oc}=wheelClusters(meshes,carH);
    let clusters=all;
    if(all.length!==4){const paired=all.filter(cl=>all.some(o=>o!==cl&&Math.abs(o.c.x+cl.c.x)<.35&&Math.abs(o.c.z-cl.c.z)<.35));if(paired.length===4)clusters=paired}
    if(clusters.length!==4){console.warn('Glb multi: expected 4 wheels, found',clusters.length);return null}
    const pivots:T.Group[]=[];
    for(const cl of clusters){const pivot=new T.Group();pivot.position.copy(cl.c);pivot.rotation.order='YXZ';pivot.userData.glb=true;for(const m of cl.ms){const {c}=oc(m);m.geometry.translate(-c.x,-c.y,-c.z);pivot.add(m)}flat.add(pivot);pivots.push(pivot)}
    pivots.sort((a,b)=>a.position.z-b.position.z);
    const front=pivots.filter(p=>p.position.z<0).sort((a,b)=>a.position.x-b.position.x);
    const rear=pivots.filter(p=>p.position.z>=0).sort((a,b)=>a.position.x-b.position.x);
    if(front.length!==2||rear.length!==2){console.warn('Glb multi: asymmetric wheel layout',front.length,rear.length);return null}
    const wheels=[front[0],rear[0],front[1],rear[1]];
    let tailMat:T.MeshStandardMaterial|null=null;
    flat.traverse(o=>{if(tailMat||!(o instanceof T.Mesh)||!/red_glass|taillight|tail/i.test(o.name))return;const mat=o.material as T.MeshStandardMaterial;tailMat=new T.MeshStandardMaterial({color:mat.color,emissive:new T.Color('#ff2211'),emissiveIntensity:.8,...(mat.map?{map:mat.map}:{})});o.material=tailMat});
    if(!tailMat)tailMat=new T.MeshStandardMaterial({color:'#ff3730',emissive:'#ff1609',emissiveIntensity:.8});
    return{group:flat,wheels,tailMat,textures};
  }catch(err){console.warn('multi car unavailable, keeping procedural car',err);return null}
}