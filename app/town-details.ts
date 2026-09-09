import * as T from 'three';
import type {TownData,Point} from './town-data';
export function createTownDetails(data:TownData,inside:(x:number,z:number,p:Point[])=>boolean,height:(x:number,z:number)=>number=()=>0){
 const hm=(s:number[],x:number,z:number)=>s[0]+height(x,z);
 const group=new T.Group(),textures:T.Texture[]=[];let seed=871;const rand=()=>((seed=seed*16807%2147483647)-1)/2147483646;const mat=(color:string,roughness=.8)=>new T.MeshStandardMaterial({color,roughness});
 const buildingGrid=new Map<string,number[]>(),roadGrid=new Map<string,{a:Point,b:Point,w:number}[]>();const cell=40;
 for(let i=0;i<data.buildings.length;i++){const p=data.buildings[i].p,xs=p.map(p=>p[0]),zs=p.map(p=>p[1]);for(let x=Math.floor((Math.min(...xs)-8)/cell);x<=Math.floor((Math.max(...xs)+8)/cell);x++)for(let z=Math.floor((Math.min(...zs)-8)/cell);z<=Math.floor((Math.max(...zs)+8)/cell);z++){const k=x+','+z,v=buildingGrid.get(k)??[];v.push(i);buildingGrid.set(k,v)}}
 const segments:{a:Point,b:Point,w:number,name:string}[]=[];
 for(const r of data.roads)for(let j=1;j<r.p.length;j++){const a=r.p[j-1],b=r.p[j],w=r.width;segments.push({a,b,w,name:r.name});for(let x=Math.floor((Math.min(a[0],b[0])-12)/cell);x<=Math.floor((Math.max(a[0],b[0])+12)/cell);x++)for(let z=Math.floor((Math.min(a[1],b[1])-12)/cell);z<=Math.floor((Math.max(a[1],b[1])+12)/cell);z++){const k=x+','+z,v=roadGrid.get(k)??[];v.push({a,b,w});roadGrid.set(k,v)}}
 function distance(x:number,z:number,a:Point,b:Point){const dx=b[0]-a[0],dz=b[1]-a[1],t=T.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)}
 const water=data.areas.filter(a=>a.kind==='water');
 function clear(x:number,z:number,margin=1){const key=Math.floor(x/cell)+','+Math.floor(z/cell);if((roadGrid.get(key)??[]).some(r=>distance(x,z,r.a,r.b)<r.w/2+margin))return false;if((buildingGrid.get(key)??[]).some(i=>inside(x,z,data.buildings[i].p)))return false;return !water.some(a=>inside(x,z,a.p))}
const treePoints:Point[]=[];const taken=new Set<string>();
for(const r of data.roads.filter(r=>['residential','tertiary','secondary','unclassified','primary','living_street','service'].includes(r.kind)))for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);for(let d=10;d<len;d+=22){for(const side of [-1,1]){const x=a[0]+dx*d/len-dz/len*(r.width/2+5+rand()*4)*side,z=a[1]+dz*d/len+dx/len*(r.width/2+5+rand()*4)*side,k=Math.round(x/10)+','+Math.round(z/10);if(!taken.has(k)&&clear(x,z,3)){taken.add(k);treePoints.push([x,z])}}}}
const greens=data.areas.filter(a=>['grass','forest','wood','park','meadow','orchard','recreation_ground','village_green','vineyard','farmland'].includes(a.kind));
for(const a of greens){const xs=a.p.map(p=>p[0]),zs=a.p.map(p=>p[1]),xmin=Math.max(data.bounds[0],Math.min(...xs)),xmax=Math.min(data.bounds[2],Math.max(...xs)),zmin=Math.max(data.bounds[1],Math.min(...zs)),zmax=Math.min(data.bounds[3],Math.max(...zs));for(let i=0;i<Math.min(900,(xmax-xmin)*(zmax-zmin)/70);i++){const x=xmin+rand()*(xmax-xmin),z=zmin+rand()*(zmax-zmin);if(inside(x,z,a.p)&&clear(x,z,2))treePoints.push([x,z])}}
const points=treePoints.slice(0,6500),dummy=new T.Object3D();const trunks=new T.InstancedMesh(new T.CylinderGeometry(.13,.28,1,7),mat('#6a5d4b'),points.length),crowns=new T.InstancedMesh(new T.SphereGeometry(1,8,6),mat('#53754c'),points.length*5);const branches=new T.InstancedMesh(new T.CylinderGeometry(.06,.12,1,6),mat('#72654e'),points.length*3);
points.forEach((p,i)=>{const h=5+rand()*6,hy=height(p[0],p[1]);dummy.position.set(p[0],h*.4+hy,p[1]);dummy.rotation.set(0,0,0);dummy.scale.set(1,h*.8,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);for(let j=0;j<5;j++){const a=j*2.4,s=h*(.23+rand()*.1);dummy.position.set(p[0]+Math.sin(a)*h*.19,h*(.6+rand()*.22)+hy,p[1]+Math.cos(a)*h*.19);dummy.rotation.set(rand(),rand(),rand());dummy.scale.set(s,s*.8,s);dummy.updateMatrix();crowns.setMatrixAt(i*5+j,dummy.matrix);crowns.setColorAt(i*5+j,new T.Color().setHSL(.25+rand()*.07,.22+rand()*.2,.19+rand()*.14))}for(let j=0;j<3;j++){dummy.position.set(p[0],h*.58+hy,p[1]);dummy.rotation.set(.55,2*j,.4);dummy.scale.set(1,h*.32,1);dummy.updateMatrix();branches.setMatrixAt(i*3+j,dummy.matrix)}});trunks.castShadow=true;crowns.castShadow=false;branches.castShadow=false;group.add(trunks,branches,crowns);
 const grassPoints:Point[]=[];for(const p of points)for(let j=0;j<20;j++){const x=p[0]+(rand()-.5)*14,z=p[1]+(rand()-.5)*14;if(clear(x,z,.4))grassPoints.push([x,z])}
 const grassGeo=new T.BufferGeometry();grassGeo.setAttribute('position',new T.Float32BufferAttribute([-.08,0,0,.08,0,0,.025,.65,0],3));grassGeo.computeVertexNormals();const grassMat=new T.MeshStandardMaterial({color:'#6c8150',roughness:1,side:T.DoubleSide});
 let wind:{value:number}|null=null;grassMat.onBeforeCompile=shader=>{wind={value:0};shader.uniforms.grassTime=wind;shader.vertexShader='uniform float grassTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x += sin(grassTime*1.6+instanceMatrix[3].x*.08+instanceMatrix[3].z*.1)*position.y*.12;')};
 const grass=new T.InstancedMesh(grassGeo,grassMat,grassPoints.length);grassPoints.forEach((p,i)=>{dummy.position.set(p[0],-.03+height(p[0],p[1]),p[1]);dummy.rotation.set(0,rand()*6.28,(rand()-.5)*.25);dummy.scale.setScalar(.4+rand());dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);grass.setColorAt(i,new T.Color().setHSL(.19+rand()*.08,.28,.2+rand()*.14))});grass.receiveShadow=true;group.add(grass);
 const propBoxes=new Map<T.Material,T.Matrix4[]>();const concrete=mat('#a6a89d'),steel=mat('#394a50',.45),wood=mat('#846246'),glass= new T.MeshStandardMaterial({color:'#264853',metalness:.6,roughness:.22}),paint=mat('#d5d3bd');
 function box(m:T.Material,w:number,h:number,d:number,x:number,y:number,z:number,yaw=0){dummy.position.set(x,y+height(x,z),z);dummy.rotation.set(0,yaw,0);dummy.scale.set(w,h,d);dummy.updateMatrix();const b=propBoxes.get(m)??[];b.push(dummy.matrix.clone());propBoxes.set(m,b)}
 // Footpaths, curb edges and streetlights follow the existing mapped streets.
 const lampGlow=new T.MeshStandardMaterial({color:'#ffe5ab',emissive:'#ffcb76',emissiveIntensity:2});const lamps:number[][]=[];for(const r of data.roads.filter(r=>['residential','service','tertiary','secondary','primary','living_street','unclassified'].includes(r.kind)))for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);if(len<2)continue;for(const side of [-1,1]){const nx=-dz/len*side,nz=dx/len*side;box(concrete,1.5,.07,len,(a[0]+b[0])/2+nx*(r.width/2+.75),-.02,(a[1]+b[1])/2+nz*(r.width/2+.75),yaw)}for(let d=15;d<len;d+=55){const x=a[0]+dx*d/len-dz/len*(r.width/2+2.7),z=a[1]+dz*d/len+dx/len*(r.width/2+2.7);if(clear(x,z,1)){lamps.push([x,z]);box(steel,.15,7,.15,x,3.5,z);box(steel,1.9,.14,.5,x+.7,7,z);box(lampGlow,1.6,.04,.4,x+.7,6.9,z)}}}
 // Generic Ukrainian storefront dressing; names are decorative, not claimed real businesses.
 const shopNames=['ПРОДУКТИ','КАВА','АПТЕКА','ПЕКАРНЯ','МАРКЕТ','КВІТИ'];let shops=0;
 for(const b of data.buildings.filter(b=>['retail','apartments','residential'].includes(b.kind))){if(shops>=35)break;let chosen:{a:Point,b:Point,len:number,nx:number,nz:number,dist:number}|null=null;for(let j=1;j<b.p.length;j++){const a=b.p[j-1],c=b.p[j],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<7)continue;const x=(a[0]+c[0])/2,z=(a[1]+c[1])/2;const nearest=segments.reduce((best,r)=>{const d=distance(x,z,r.a,r.b);return d<best.d?{d,r}:best},{d:Infinity,r:segments[0]});if(nearest.d>35)continue;let nx=-(c[1]-a[1])/len,nz=(c[0]-a[0])/len;if(inside(x+nx,z+nz,b.p)){nx=-nx;nz=-nz}if(!chosen||nearest.d<chosen.dist)chosen={a,b:c,len,nx,nz,dist:nearest.d}}if(!chosen)continue;const {a,b:c,nx,nz}=chosen,x=(a[0]+c[0])/2,z=(a[1]+c[1])/2,yaw=Math.atan2(nx,nz);const shop=new T.Group();shop.position.set(x+nx*.12,height(x+nx*.12,z+nz*.12),z+nz*.12);shop.rotation.y=yaw;group.add(shop);
 function local(w:number,h:number,d:number,m:T.Material,px:number,py:number,pz:number){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(px,py,pz);mesh.castShadow=true;shop.add(mesh)}
 local(6,2.5,.1,paint,0,1.25,0);local(4.4,1.9,.12,glass,-.65,1.3,.06);local(1,2.2,.13,glass,2.15,1.1,.07);local(.055,1.9,.14,paint,-.65,1.3,.14);local(6.3,.14,1.5,shops%2?wood:steel,0,2.65,.6);
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#284d42';ctx.fillRect(0,0,512,96);ctx.fillStyle='#eee8d5';ctx.font='bold 54px Arial';ctx.textAlign='center';ctx.fillText(shopNames[shops%shopNames.length],256,66);const tx=new T.CanvasTexture(canvas);tx.colorSpace=T.SRGBColorSpace;textures.push(tx);const sign=new T.Mesh(new T.PlaneGeometry(6,.95),new T.MeshStandardMaterial({map:tx,emissiveMap:tx,emissive:'#ffffff',emissiveIntensity:.15}));sign.position.set(0,3.15,.1);shop.add(sign);
 const bx=x+nx*3,bz=z+nz*3;if(clear(bx,bz,.5)){box(wood,2,.12,.55,bx,.55,bz,yaw);box(wood,2,.55,.08,bx-nx*.22,.85,bz-nz*.22,yaw);for(const side of [-1,1])box(steel,.1,.55,.5,bx+nz*.7*side,.25,bz-nx*.7*side,yaw)}shops++;
 }
const ph=(x:number,z:number,k:number)=>{const n=Math.sin(x*127.1+z*311.7+k*113.5)*43758.5453;return n-Math.floor(n)}
  const inW=(x:number,z:number)=>{for(const a of water)if(inside(x,z,a.p))return true;return false}
  const roadNear=(x:number,z:number,margin:number)=>{const key=Math.floor(x/cell)+','+Math.floor(z/cell);for(const r of roadGrid.get(key)??[])if(distance(x,z,r.a,r.b)<r.w/2+margin)return true;return false}
  function sideDist(x:number,z:number,p:Point[]){let best=Infinity;for(let j=1;j<p.length;j++){const d=distance(x,z,p[j-1],p[j]);if(d<best)best=d}const d=distance(x,z,p[p.length-1],p[0]);if(d<best)best=d;return best}
  const nearBuildEdge=(x:number,z:number,rad:number,self=-1)=>{const key=Math.floor(x/cell)+','+Math.floor(z/cell);for(const i of buildingGrid.get(key)??[]){if(i===self)continue;const b=data.buildings[i];if(inside(x,z,b.p))return true;if(sideDist(x,z,b.p)<rad)return true}return false}
  const openGround=(x:number,z:number,mr=3,mb=1.6)=>!roadNear(x,z,mr)&&!inW(x,z)&&!nearBuildEdge(x,z,mb)
  const openGroundLoose=(x:number,z:number,mr=3)=>{if(roadNear(x,z,mr)||inW(x,z))return false;const key=Math.floor(x/cell)+','+Math.floor(z/cell);for(const i of buildingGrid.get(key)??[])if(inside(x,z,data.buildings[i].p))return false;return true}
  const roadUnder=(x:number,z:number)=>{const key=Math.floor(x/cell)+','+Math.floor(z/cell);for(const r of roadGrid.get(key)??[])if(distance(x,z,r.a,r.b)<r.w/2)return true;return false}
  const fenceMat=mat('#5f5848',.95),gateMat=mat('#394a50',.55),boardMat=mat('#d5d2c3',.75)
  const fenceSet=new Set<string>()
  const fences:{x:number;z:number;yaw:number}[]=[]
  const fenceRails:{x:number;z:number;yaw:number;len:number}[]=[]
  for(let bi=0;bi<data.buildings.length;bi++){
    const b=data.buildings[bi],p=b.p
    if(p.length<4)continue
    for(let j=1;j<p.length;j++){
      const a=p[j-1],c=p[j]
      const dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz)
      if(len<10||len>160)continue
      const mx=(a[0]+c[0])/2,mz=(a[1]+c[1])/2
      if(roadNear(mx,mz,5)||inW(mx,mz))continue
      const inx=-dz/len,inz=dx/len
      let mn=0,ok=false
      for(const s of[-1,1]){
        let hit=true,clear=true
        for(const d of[1.4,4.2]){const ox=mx+inx*s*d,oz=mz+inz*s*d;if(inW(ox,oz)){clear=false;break}if(!inside(ox,oz,p)&&nearBuildEdge(ox,oz,.9,bi))hit=false}
        if(clear&&!hit){mn=s;ok=true;break}
      }
      if(!ok)continue
      const yaw=Math.atan2(dx,dz)
      const nP=Math.max(2,Math.round(len/2.4))
      let px0=0,pz0=0
      for(let k=0;k<=nP;k++){
        const px=a[0]+dx*k/nP+inx*mn*.35,pz=a[1]+dz*k/nP+inz*mn*.35
        if(inW(px,pz)||nearBuildEdge(px,pz,.2)||roadNear(px,pz,.25)){px0=0;continue}
        const key=Math.round(px*2)+','+Math.round(pz*2)
        if(fenceSet.has(key)){px0=0;continue}
        fenceSet.add(key)
        fences.push({x:px,z:pz,yaw})
        if(px0)fenceRails.push({x:(px0+px)/2,z:(pz0+pz)/2,yaw,len:Math.hypot(px-px0,pz-pz0)})
        px0=px;pz0=pz
      }
      if(fences.length>=15000)break
    }
    if(fences.length>=15000)break
  }
  for(const f of fences)box(fenceMat,.09,1.16,.09,f.x,.52,f.z,f.yaw)
  for(const r of fenceRails)box(fenceMat,.07,.09,Math.max(.5,r.len),r.x,1.02,r.z,r.yaw)
  const gates:{x:number;z:number;yaw:number;w:number;p1x:number;p1z:number;p2x:number;p2z:number}[]=[]
  for(const r of data.roads.filter(r=>r.kind==='service')){
    for(let i=r.p.length-1;i>=1;i--){
      const b=r.p[i],a=r.p[i-1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)
      if(len<4||len>90)continue
      const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2
      let target=false
      for(const ar of data.areas)if(['residential','allotments','industrial','park','playground'].includes(ar.kind)&&inside(mx,mz,ar.p)){target=true;break}
      if(!target)for(const pr of data.roads.filter(q=>q.kind==='pedestrian')){if(target)break;for(let j=1;j<pr.p.length;j++)if(distance(mx,mz,pr.p[j-1],pr.p[j])<5){target=true;break}}
      if(!target)continue
      if(inW(mx,mz)||nearBuildEdge(mx,mz,.6))continue
      const nnx=-dz/len,nnz=dx/len,half=r.width/2+.75
      const p1x=mx+nnx*half,p1z=mz+nnz*half,p2x=mx-nnx*half,p2z=mz-nnz*half
      if(nearBuildEdge(p1x,p1z,.3)||nearBuildEdge(p2x,p2z,.3)||roadUnder(p1x,p1z)||roadUnder(p2x,p2z)||inW(p1x,p1z)||inW(p2x,p2z))continue
      gates.push({x:mx,z:mz,yaw:Math.atan2(dx,dz),w:r.width,p1x,p1z,p2x,p2z});break
    }
    if(gates.length>=80)break
  }
  for(const g of gates){
    box(gateMat,.16,2.6,.16,g.p1x,1.3,g.p1z)
    box(gateMat,.16,2.6,.16,g.p2x,1.3,g.p2z)
    box(gateMat,g.w+.8,.16,.34,g.x,2.9,g.z,g.yaw)
  }
  const billboards:{x:number;z:number;yaw:number}[]=[]
  const insideB=(x:number,z:number)=>{const key=Math.floor(x/cell)+','+Math.floor(z/cell);for(const i of buildingGrid.get(key)??[])if(inside(x,z,data.buildings[i].p))return true;return false}
  for(const r of data.roads){
    if(r.kind!=='primary'&&r.kind!=='secondary'&&r.kind!=='tertiary')continue
    const P=r.p
    if(P.length<2)continue
    const sl:number[]=[];let tot=0
    for(let i=1;i<P.length;i++){const l=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);sl.push(l);tot+=l}
    if(tot<60)continue
    const per=Math.floor(tot/430)
    for(let k=0;k<per&&billboards.length<120;k++){
      const s=(k+(ph(r.width,P.length,k)+.35))/per
      let t=s*tot,si=0,acc=0
      while(si<sl.length&&acc+sl[si]<t){acc+=sl[si];si++}
      const seg=si<sl.length?sl[si]:sl[sl.length-1]
      const f=seg>0.01?(t-acc)/seg:0
      const x0=P[si][0],z0=P[si][1],x1=P[si+1]?P[si+1][0]:x0,z1=P[si+1]?P[si+1][1]:z0
      const cx=x0+(x1-x0)*f,cz=z0+(z1-z0)*f,dx=x1-x0,dz=z1-z0
      const nnx=seg>0.01?-dz/seg:0,nnz=seg>0.01?dx/seg:0
      const yaw=Math.atan2(dx,dz),off=r.width/2+6.5
      for(const sn of[-1,1]){
        const px=cx+nnx*off*sn,pz=cz+nnz*off*sn
        if(!openGroundLoose(px,pz,3))continue
        const cc=Math.cos(yaw),ss=Math.sin(yaw)
        if(insideB(px+cc*2,pz-ss*2)||insideB(px-cc*2,pz+ss*2))continue
        billboards.push({x:px,z:pz,yaw});break
      }
    }
  }
  for(const b of billboards){
    const cc=Math.cos(b.yaw),ss=Math.sin(b.yaw)
    box(boardMat,5.8,3,.32,b.x,5.7,b.z,b.yaw)
    box(steel,.2,4.7,.2,b.x+cc*2,b.z-ss*2,2.35)
    box(steel,.2,4.7,.2,b.x-cc*2,b.z+ss*2,2.35)
  }
  const benches:number[][]=[]
  for(const a of data.areas){
    if(!['park','recreation_ground','playground','pitch','square'].includes(a.kind))continue
    let cx0=0,cz0=0;for(const q of a.p){cx0+=q[0];cz0+=q[1]}cx0/=a.p.length;cz0/=a.p.length
    for(let j=1;j<a.p.length&&benches.length<220;j++){
      const e1=a.p[j-1],e2=a.p[j],dx=e2[0]-e1[0],dz=e2[1]-e1[1],len=Math.hypot(dx,dz)
      if(len<18)continue
      const mx=(e1[0]+e2[0])/2,mz=(e1[1]+e2[1])/2
      const tw=Math.hypot(cx0-mx,cz0-mz)||1,ix=(cx0-mx)/tw,iz=(cz0-mz)/tw
      const bxx=mx+ix*1.7,bzz=mz+iz*1.7
      if(!inside(bxx,bzz,a.p)||!openGround(bxx,bzz,1.4,1))continue
      const yaw=Math.atan2(ix,iz)
      benches.push([bxx,bzz,yaw])
    }
  }
  for(const b of benches){
    const yaw=b[2],cc=Math.cos(yaw),ss=Math.sin(yaw)
    box(wood,2,.1,.55,b[0],.45,b[1],yaw)
    box(wood,2,.5,.06,b[0],.95,b[1],yaw)
    box(steel,.07,.45,.07,b[0]+cc*.8,b[1]-ss*.8,.22)
    box(steel,.07,.45,.07,b[0]-cc*.8,b[1]+ss*.8,.22)
  }
  for(const [m,matrices]of propBoxes){const mesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),m,matrices.length);matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh)}
  if(typeof window!=='undefined')(window as any).__props={fences,gates,billboards,benches}
  return{group,textures,update(time:number){if(wind)wind.value=time},solids:[...points.map(p=>({x:p[0],z:p[1],r:.28})),...lamps.map(p=>({x:p[0],z:p[1],r:.18})),...fences.map(f=>({x:f.x,z:f.z,r:.15})),...gates.flatMap(g=>[{x:g.p1x,z:g.p1z,r:.22},{x:g.p2x,z:g.p2z,r:.22}]),...billboards.flatMap(b=>{const cc=Math.cos(b.yaw),ss=Math.sin(b.yaw);return[{x:b.x+cc*2,z:b.z-ss*2,r:.25},{x:b.x-cc*2,z:b.z+ss*2,r:.25}]})],stats:{trees:points.length,grass:grassPoints.length,shops,lamps:lamps.length,fences:fences.length,gates:gates.length,billboards:billboards.length,benches:benches.length}};
}
