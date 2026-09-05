import * as T from 'three';
import {grainTexture} from './visuals';
import {createTownDetails} from './town-details';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {type Point,type TownData} from './town-data';
export function inside(x:number,z:number,p:Point[]){let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
export function createTownCollider(data:TownData){
 const grid=new Map<string,number[]>();const cell=80;
 data.buildings.forEach((b,i)=>{const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]);for(let x=Math.floor((Math.min(...xs)-3)/cell);x<=Math.floor((Math.max(...xs)+3)/cell);x++)for(let z=Math.floor((Math.min(...zs)-3)/cell);z<=Math.floor((Math.max(...zs)+3)/cell);z++){const key=x+','+z;const ids=grid.get(key)??[];ids.push(i);grid.set(key,ids)}});
 const water=data.areas.filter(a=>a.kind==='water');
 return(x:number,z:number,vx:number,vz:number,previous:Point,radius=2.2)=>{
  let hit=false;const [minX,minZ,maxX,maxZ]=data.bounds;
  if(x<minX||x>maxX){x=T.MathUtils.clamp(x,minX,maxX);vx*=-.2;hit=true}if(z<minZ||z>maxZ){z=T.MathUtils.clamp(z,minZ,maxZ);vz*=-.2;hit=true}
  for(const i of grid.get(Math.floor(x/cell)+','+Math.floor(z/cell))??[]){const p=data.buildings[i].p;let best=Infinity,qx=x,qz=z;for(let j=1;j<p.length;j++){const a=p[j-1],b=p[j],dx=b[0]-a[0],dz=b[1]-a[1];const u=T.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);const px=a[0]+u*dx,pz=a[1]+u*dz,d=(x-px)**2+(z-pz)**2;if(d<best){best=d;qx=px;qz=pz}}
   const within=inside(x,z,p);if(within||best<radius**2){let dx=within?qx-x:x-qx,dz=within?qz-z:z-qz;const length=Math.hypot(dx,dz);if(length<.0001){x=previous[0];z=previous[1];vx*=-.2;vz*=-.2;hit=true;continue}dx/=length;dz/=length;x=qx+dx*(radius+.05);z=qz+dz*(radius+.05);const into=vx*dx+vz*dz;if(into<0){vx-=dx*into*1.25;vz-=dz*into*1.25}hit=true}}
  if(water.some(a=>inside(x,z,a.p))){x=previous[0];z=previous[1];vx*=-.2;vz*=-.2;hit=true}
  return{x,z,vx,vz,hit};
 }
}
export function createTown(data:TownData){
 const group=new T.Group(),textures:T.Texture[]=[];const mat=(color:string,roughness=.85)=>new T.MeshStandardMaterial({color,roughness});
 const land=mat('#788564'),grass=mat('#6a8057'),asphalt=mat('#3b4244'),path=mat('#a6a28b'),roofMat=mat('#606c70'),water= new T.MeshStandardMaterial({color:'#457e87',roughness:.27,metalness:.6});
 const texture=grainTexture();texture.repeat.set(1,1);textures.push(texture);asphalt.map=texture;asphalt.bumpMap=texture;asphalt.bumpScale=.04;
 const batches=new Map<T.Material,T.BufferGeometry[]>();function add(g:T.BufferGeometry,m:T.Material){const list=batches.get(m)??[];list.push(g);batches.set(m,list)}
 function flat(p:Point[],height:number,m:T.Material){if(p.length<4)return;const shape=new T.Shape(p.map(q=>new T.Vector2(q[0],-q[1])));const g=new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);g.translate(0,height,0);add(g,m)}
 const ground=new T.Mesh(new T.PlaneGeometry(15000,15000),land);ground.rotation.x=-Math.PI/2;ground.position.y=-.18;ground.receiveShadow=true;group.add(ground);
 for(const a of data.areas){if(a.kind==='water')flat(a.p,-.08,water);else if(['grass','forest','wood','park','meadow','recreation_ground','village_green','orchard'].includes(a.kind))flat(a.p,-.06,grass);else if(['pitch','parking','pedestrian'].includes(a.kind))flat(a.p,-.025,path)}
 // Original geographic centerlines, widened only by their road-class defaults.
 const roadSegments:{a:Point,b:Point,width:number}[]=[];
 for(const road of data.roads){const drivable=['residential','service','unclassified'].includes(road.kind),w=road.width;for(let i=1;i<road.p.length;i++){const a=road.p[i-1],b=road.p[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.05)continue;const g=new T.PlaneGeometry(w,length+.35);g.rotateX(-Math.PI/2);g.rotateY(Math.atan2(dx,dz));g.translate((a[0]+b[0])/2,.015,(a[1]+b[1])/2);const uv=g.getAttribute('uv'),pos=g.getAttribute('position');for(let k=0;k<uv.count;k++)uv.setXY(k,pos.getX(k)/8,pos.getZ(k)/8);add(g,drivable?asphalt:path);if(drivable){roadSegments.push({a,b,width:w});const disc=new T.CircleGeometry(w/2,10);disc.rotateX(-Math.PI/2);disc.translate(a[0],.016,a[1]);add(disc,asphalt)}}}
 // Repeatable facade cells add windows and floor lines without thousands of draw calls.
 const facades=['#c2beb0','#adbaa9','#c3af9c','#a7b4ba'].map((color,k)=>{const c=document.createElement('canvas');c.width=128;c.height=128;const ctx=c.getContext('2d')!;ctx.fillStyle=color;ctx.fillRect(0,0,128,128);ctx.fillStyle='#7f8987';ctx.fillRect(0,123,128,5);ctx.fillStyle='#e2ded0';ctx.fillRect(32,27,64,77);ctx.fillStyle=k===2?'#697e80':'#34535d';ctx.fillRect(37,32,54,67);ctx.fillStyle='#a6bbbc';ctx.fillRect(63,32,3,67);ctx.fillRect(37,62,54,3);const tx=new T.CanvasTexture(c);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.colorSpace=T.SRGBColorSpace;textures.push(tx);return new T.MeshStandardMaterial({map:tx,roughness:.85,side:T.DoubleSide})});
 const util=mat('#a4a599');util.side=T.DoubleSide;
 for(const b of data.buildings){const position:number[]=[],uv:number[]=[],idx:number[]=[];for(let i=1;i<b.p.length;i++){const a=b.p[i-1],c=b.p[i],length=Math.hypot(c[0]-a[0],c[1]-a[1]);const n=position.length/3;position.push(a[0],0,a[1],c[0],0,c[1],a[0],b.h,a[1],c[0],b.h,c[1]);uv.push(0,0,length/3.8,0,0,b.h/3.1,length/3.8,b.h/3.1);idx.push(n,n+2,n+1,n+1,n+2,n+3)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();add(g,['garage','garages','greenhouse','ruins'].includes(b.kind)?util:facades[b.id%facades.length]);flat(b.p,b.h,roofMat)}
 for(const [material,geometries]of batches){if(!geometries.length)continue;const merged=mergeGeometries(geometries,false);if(!merged)throw new Error('Unable to assemble town geometry');const m=new T.Mesh(merged,material);m.castShadow=facades.includes(material as T.MeshStandardMaterial)||material===util;m.receiveShadow=true;group.add(m);geometries.forEach(g=>g.dispose())}
 const details=createTownDetails(data,inside);group.add(details.group);textures.push(...details.textures);
 const baseCollision=createTownCollider(data);const propGrid=new Map<string,typeof details.solids>();for(const p of details.solids){const key=Math.floor(p.x/20)+','+Math.floor(p.z/20),list=propGrid.get(key)??[];list.push(p);propGrid.set(key,list)}
 function collide(x:number,z:number,vx:number,vz:number,previous:Point,radius=2.2){let c=baseCollision(x,z,vx,vz,previous,radius);const cx=Math.floor(c.x/20),cz=Math.floor(c.z/20);for(let ix=cx-1;ix<=cx+1;ix++)for(let iz=cz-1;iz<=cz+1;iz++)for(const p of propGrid.get(ix+','+iz)??[]){let dx=c.x-p.x,dz=c.z-p.z,d=Math.hypot(dx,dz);if(d<radius+p.r){if(d<.0001){dx=1;dz=0;d=1}const nx=dx/d,nz=dz/d;c.x=p.x+nx*(radius+p.r+.02);c.z=p.z+nz*(radius+p.r+.02);const into=c.vx*nx+c.vz*nz;if(into<0){c.vx-=into*nx*1.2;c.vz-=into*nz*1.2}c.hit=true}}return c}

 return{group,textures,data,collide,update:details.update,stats:details.stats};
}
