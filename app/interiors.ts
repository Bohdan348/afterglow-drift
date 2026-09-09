import * as T from 'three';
import type {TownData,Point} from './town-data';
import {inside} from './town';

export type InteriorDoor={
  id:number;
  outX:number;outZ:number;outYaw:number;
  inX:number;inZ:number;inYaw:number;
  floor:number;
  ux:number;uz:number;nx:number;nz:number;
  duMin:number;duMax:number;dnMin:number;dnMax:number;
};

function segDist(x:number,z:number,a:Point,b:Point){const dx=b[0]-a[0],dz=b[1]-a[1],t=T.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)}

export function planInteriors(data:TownData,height:(x:number,z:number)=>number):InteriorDoor[]{
  const roads:{a:Point,b:Point,w:number}[]=[];
  for(const r of data.roads)for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i];if(Math.hypot(b[0]-a[0],b[1]-a[1])<.5)continue;roads.push({a,b,w:r.width})}
  const water=data.areas.filter(a=>a.kind==='water');
  const candidates=data.buildings
    .map((b,i)=>({b,i}))
    .filter(({b})=>['retail','apartments','residential'].includes(b.kind)&&b.h>=2.2)
    .map(({b,i})=>{
      const area=Math.abs(b.p.reduce((s,p,j)=>s+p[0]*b.p[(j+1)%b.p.length][1]-p[1]*b.p[(j+1)%b.p.length][0],0)/2);
      return{i,b,area};
    })
    .filter(x=>x.area>=36)
    .sort((a,b)=>b.area-a.area);
  const doors:InteriorDoor[]=[];
  for(const {i,b} of candidates){
    if(doors.length>=8)break;
    let best:null|{a:Point;c:Point;mx:number;mz:number;dist:number;roadW:number;t:number;ba:Point;bb:Point}=null;
    for(let j=1;j<b.p.length;j++){
      const a=b.p[j-1],c=b.p[j],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<6)continue;
      const mx=(a[0]+c[0])/2,mz=(a[1]+c[1])/2;
      let d=Infinity,rw=8,t=0,ba=a,bb=c;
      for(const r of roads){const q=segDist(mx,mz,r.a,r.b);if(q<d){d=q;rw=r.w;ba=r.a;bb=r.b;const dx=bb[0]-ba[0],dz=bb[1]-ba[1];t=T.MathUtils.clamp(((mx-ba[0])*dx+(mz-ba[1])*dz)/(dx*dx+dz*dz||1),0,1)}}
      if(d<=rw/2+16&&(!best||d<best.dist))best={a,c,mx,mz,dist:d,roadW:rw,t,ba,bb};
    }
    if(!best)continue;
    const a=best.a,c=best.c,len=Math.hypot(c[0]-a[0],c[1]-a[1]);
    const ux=(c[0]-a[0])/len,uz=(c[1]-a[1])/len;
    let nx=-uz,nz=ux;
    const rx=best.ba[0]+(best.bb[0]-best.ba[0])*best.t-best.mx,rz=best.ba[1]+(best.bb[1]-best.ba[1])*best.t-best.mz;
    if(nx*rx+nz*rz<0){nx=-nx;nz=-nz}
    const outX=best.mx+nx*(best.roadW/2+1.2),outZ=best.mz+nz*(best.roadW/2+1.2);
    if(water.some(q=>inside(outX,outZ,q.p)))continue;
    const floorY=height(outX,outZ);
    if(!isFinite(floorY))continue;
    const halfU=T.MathUtils.clamp(best.roadW/2+3,2.5,3.6),D=4.6;
    doors.push({
      id:i,
      outX,outZ,outYaw:Math.atan2(-nx,-nz),
      inX:outX-nx*.9,inZ:outZ-nz*.9,inYaw:Math.atan2(nx,nz),
      floor:floorY,
      ux,uz,nx,nz,
      duMin:-halfU,duMax:halfU,dnMin:-D+.55,dnMax:.18
    });
  }
  return doors;
}

const H=5.4,D=4.6,HT=2.6;
export function createInteriorRoom(scene:T.Scene){
  const group=new T.Group();group.visible=false;scene.add(group);
  const mat=(color:string,roughness=.8)=>new T.MeshStandardMaterial({color,roughness});
  const floorM=mat('#8f7f5e'),wallM=mat('#d3cab6',1),accent=mat('#9c5f3d',.9),trimM=mat('#efe6d2',.9),rugM=mat('#5d6e6b',.9),lampM= new T.MeshStandardMaterial({color:'#fff3d6',emissive:'#ffdf9e',emissiveIntensity:1.5});
  const floor=new T.Mesh(new T.BoxGeometry(1,1,1),floorM);
  const back=new T.Mesh(new T.BoxGeometry(1,1,1),wallM);
  const sideL=new T.Mesh(new T.BoxGeometry(1,1,1),wallM);
  const sideR=new T.Mesh(new T.BoxGeometry(1,1,1),wallM);
  const frontL=new T.Mesh(new T.BoxGeometry(1,1,1),wallM);
  const frontR=new T.Mesh(new T.BoxGeometry(1,1,1),wallM);
  const frontH=new T.Mesh(new T.BoxGeometry(1,1,1),wallM);
  const trimTop=new T.Mesh(new T.BoxGeometry(1,1,1),trimM);
  const trimL=new T.Mesh(new T.BoxGeometry(1,1,1),trimM);
  const trimR=new T.Mesh(new T.BoxGeometry(1,1,1),trimM);
  const table=new T.Mesh(new T.BoxGeometry(.9,.06,.5),accent);
  const tableLeg=new T.InstancedMesh(new T.BoxGeometry(.06,.65,.06),accent,4);
  const chairs=new T.InstancedMesh(new T.BoxGeometry(.8,.09,.5),accent,3);
  const rug=new T.Mesh(new T.BoxGeometry(1,1,.02),rugM);
  const lamp=new T.Mesh(new T.BoxGeometry(1.3,.07,.26),lampM);
  const light=new T.PointLight('#ffce8a',6,12,1.8);light.position.set(0,2.2,.5);
  for(const m of[floor,back,sideL,sideR,frontL,frontR,frontH,trimTop,trimL,trimR,table,rug,lamp]){m.castShadow=true;group.add(m)}
  group.add(tableLeg,chairs);
  group.add(light);
  const dummy=new T.Object3D();
  const put=(obj:T.Object3D,x:number,y:number,z:number)=>{obj.position.set(x,y,z);obj.rotation.set(0,0,0);obj.scale.set(1,1,1);obj.updateMatrix()};
  return{
    group,
    enter(d:InteriorDoor){
      group.rotation.y=Math.atan2(d.nx,d.nz);
      group.position.set(d.outX,d.floor,d.outZ);
      floor.position.set(0,0,-2.1);floor.scale.set(H,4.8,1);
      back.position.set(0,HT/2,-4.4);back.scale.set(H,HT,1);
      sideL.position.set(-H/2,HT/2,-2.1);sideL.scale.set(1,HT,4.8);
      sideR.position.set(H/2,HT/2,-2.1);sideR.scale.set(1,HT,4.8);
      const doorW=1.5,oh=2.1;
      frontL.position.set(-doorW/2-.55,HT/2,.18);frontL.scale.set(1.1,HT,1);
      frontR.position.set(doorW/2+.55,HT/2,.18);frontR.scale.set(1.1,HT,1);
      frontH.position.set(0,HT-oh/2,.18);frontH.scale.set(doorW+1.1,HT-oh,1);
      trimTop.position.set(0,HT-oh/2,.2);trimTop.scale.set(doorW+.4,.18,1);
      trimL.position.set(-doorW/2-.1,HT/2,.2);trimL.scale.set(.14,HT,1);
      trimR.position.set(doorW/2+.1,HT/2,.2);trimR.scale.set(.14,HT,1);
      table.position.set(0,0,-1.7);table.scale.set(2.2,1,1);
      tableLeg.count=4;
      put(dummy,-.7,HT*.5,-1.9);tableLeg.setMatrixAt(0,dummy.matrix);put(dummy,.7,HT*.5,-1.9);tableLeg.setMatrixAt(1,dummy.matrix);put(dummy,-.7,HT*.5,-1.5);tableLeg.setMatrixAt(2,dummy.matrix);put(dummy,.7,HT*.5,-1.5);tableLeg.setMatrixAt(3,dummy.matrix);tableLeg.instanceMatrix.needsUpdate=true;
      chairs.count=3;
      put(dummy,-.4,0,-2.6);chairs.setMatrixAt(0,dummy.matrix);put(dummy,0,0,-3.4);chairs.setMatrixAt(1,dummy.matrix);put(dummy,.4,0,-2.6);chairs.setMatrixAt(2,dummy.matrix);chairs.instanceMatrix.needsUpdate=true;
      rug.position.set(0,.01,-2.4);rug.scale.set(4.,3.2,1);
      lamp.position.set(-H/2+.15,HT,.5);lamp.scale.setScalar(1);
      light.position.set(0,2.2,-2);
      light.intensity=6;
      group.visible=true;
    },
    leave(){group.visible=false;light.intensity=0}
  };
}