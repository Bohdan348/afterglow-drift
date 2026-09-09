import * as T from 'three';
import {grainTexture} from './visuals';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const LANES=6,LANE_W=3.5,ROAD=LANES*LANE_W,RHLF=ROAD/2,LIMIT=RHLF+0.5,BERM=RHLF+4,GRASS=55;
const RES=2,REL=6;
export interface RingHandle{group:T.Group;height(x:number,z:number):number;collide(x:number,z:number,vx:number,vz:number,previous:[number,number],radius:number):{x:number;z:number;vx:number;vz:number;hit:boolean};spawnPose():{x:number;z:number;yaw:number};reset():void;destroy():void;dbg:any}
export function createRing(opts:{scene:T.Scene;seed:number}):RingHandle{
 const scene=opts.scene,group=new T.Group();scene.add(group);group.visible=false;
 const rng=(seed:number)=>{let s=seed|0;return()=>{s^=s<<13;s^=s>>17;s^=s<<5;return((s>>>0)+1)/4294967296}};
 const rand=rng(opts.seed^0x9e3779b9);
 const TURNS=4+Math.floor(rand()*7);
 const sharpA=Math.floor(rand()*TURNS),sharpB=(sharpA+2+Math.floor(rand()*Math.max(1,TURNS-3)))%TURNS;
 const base=300+rand()*150;
 const angs:number[]=[];let a0=rand()*Math.PI*2;
 for(let i=0;i<TURNS;i++){angs.push(a0);a0+=(Math.PI*2)/TURNS*(0.72+rand()*0.56)}
 const wrap=(a:number)=>{a%=Math.PI*2;return a<0?a+Math.PI*2:a};
 const ctls:T.Vector3[]=[];
 for(let i=0;i<TURNS;i++){
   let r=base*(0.74+rand()*0.52);
   if(i===sharpA||i===sharpB)r*=0.42;
   const ang=wrap(angs[i]),wob=.96+rand()*.08;
   ctls.push(new T.Vector3(Math.cos(ang)*r*wob,0,Math.sin(ang)*r*wob));
 }
 const curve=new T.CatmullRomCurve3(ctls,true,'centripetal');
 const L=curve.getLength();
 const N=Math.max(420,Math.round(L/RES));
 const sp=curve.getSpacedPoints(N);
 const SX:number[]=[],SZ:number[]=[];
 for(let i=0;i<N;i++){SX.push(sp[i].x);SZ.push(sp[i].z)}
const step=L/N;
  let bIdx=-1,bScore=1e18;
  for(let o=0;o<N;o++){let sc=0;for(let k=0;k<40;k++){const a=(o+k)%N,b=(o+k+1)%N,c=(o+k-1+N)%N;const ax=SX[a]-SX[c],az=SZ[a]-SZ[c],bx=SX[b]-SX[a],bz=SZ[b]-SZ[a];let d=Math.atan2(-bx,-bz)-Math.atan2(-ax,-az);while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;sc+=Math.abs(d)}if(sc<bScore){bScore=sc;bIdx=o}}
  if(bIdx>0){const nsx=new Array(N),nsz=new Array(N);for(let i=0;i<N;i++){nsx[i]=SX[(i+bIdx)%N];nsz[i]=SZ[(i+bIdx)%N]}for(let i=0;i<N;i++){SX[i]=nsx[i];SZ[i]=nsz[i]}}
  let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9;
 for(let i=0;i<N;i++){minX=Math.min(minX,SX[i]);maxX=Math.max(maxX,SX[i]);minZ=Math.min(minZ,SZ[i]);maxZ=Math.max(maxZ,SZ[i])}
 const cx0=(minX+maxX)/2,cz0=(minZ+maxZ)/2,ext=Math.max(maxX-minX,maxZ-minZ)/2;
 const HOf=(s:number)=>REL*Math.sin(s/L*Math.PI*2+1.3)+REL*0.7*Math.sin(s/L*Math.PI*4+3.1);
 const BankOf=(s:number)=>.055*Math.sin(s/L*Math.PI*4+.4);
 const Terrain=(x:number,z:number)=>{const dx=(x-cx0)/ext,dz=(z-cz0)/ext,d=Math.hypot(dx,dz);const roll=REL*0.8*Math.sin(d*Math.PI*1.7+x*0.004);return d<1.4?roll*Math.max(0,1-(d)/1.6):0};
 const yawAt=(i:number)=>{const i2=(i+1)%N,dx=SX[i2]-SX[i],dz=SZ[i2]-SZ[i];return Math.atan2(-dx,-dz)};
 const YawOf=(s:number)=>{const f=s/step;let i=Math.floor(f);i=(i%N+N)%N;const t=f-Math.floor(f);const a=yawAt(i),b=yawAt((i+1)%N);let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;let y=a+d*t;while(y>Math.PI)y-=Math.PI*2;while(y<-Math.PI)y+=Math.PI*2;return y};
 const posAt=(s:number):[number,number]=>{const f=s/step;let i=Math.floor(f);i=(i%N+N)%N;const t=f-Math.floor(f),j=(i+1)%N;return[SX[i]+(SX[j]-SX[i])*t,SZ[i]+(SZ[j]-SZ[i])*t]};
 let lastS=0;
 function ground(s:number,o:number,x:number,z:number){const a=o<0?-o:o,rd=HOf(s)+o*BankOf(s),t=Terrain(x,z);if(a<=RHLF)return rd-1;if(a<=BERM)return rd-1-(a-BERM)*0.03;if(a<=GRASS)return rd-1-(a-RHLF)*0.03-(a-BERM)*0.1;return Math.min(rd-4,t-0.6)};
 function project(x:number,z:number,hint:number){const n=N;let i=Math.round(hint/step)%n;i=(i%n+n)%n;const d2=(k:number)=>{const dx=SX[k]-x,dz=SZ[k]-z;return dx*dx+dz*dz};let d=d2(i);if(d>170*170){let bi=i,bd=d;for(let k=0;k<n;k+=7){const q=d2(k);if(q<bd){bd=q;bi=k}}i=bi;d=bd}for(let it=0;it<300;it++){const dp=d2((i+n-1)%n),dn=d2((i+1)%n);if(dp<d&&dp<=dn){i=(i+n-1)%n;d=dp;continue}if(dn<d){i=(i+1)%n;d=dn;continue}break}const s=i*step+(step/2),yaw=YawOf(s),pp=posAt(s),ry=Math.cos(yaw),rn=-Math.sin(yaw),o=(x-pp[0])*ry+(z-pp[1])*rn;return{s,o,y:ground(s,o,x,z),x:pp[0],z:pp[1],yaw}};
const height=(x:number,z:number)=>{const p=project(x,z,lastS);lastS=p.s;dbg.s=p.s;dbg.yaw=p.yaw;dbg.o=p.o;dbg.roadOk=Math.abs(p.o)<=LIMIT?1:0;return p.y};
  const collide=(x:number,z:number,vx:number,vz:number,previous:[number,number],radius:number)=>{const p=project(x,z,lastS);lastS=p.s;dbg.s=p.s;dbg.yaw=p.yaw;dbg.o=p.o;dbg.roadOk=Math.abs(p.o)<=LIMIT?1:0;let hit=false;if(Math.abs(p.o)>LIMIT){const sg=p.o>0?1:-1,cl=sg*LIMIT,ry=Math.cos(p.yaw),rn=-Math.sin(p.yaw);x=p.x+ry*cl;z=p.z+rn*cl;const out=vx*ry+vz*rn;if(out*sg>0){vx-=ry*out*1.6;vz-=rn*out*1.6}hit=true}const cx=Math.floor(x/CELL),cz=Math.floor(z/CELL);for(let ix=cx-1;ix<=cx+1;ix++)for(let iz=cz-1;iz<=cz+1;iz++)for(const c of propGrid.get(ix+','+iz)??[]){let dx=x-c.x,dz=z-c.z,d=Math.hypot(dx,dz);if(d<radius+c.r){if(d<.0001){dx=1;dz=0;d=1}const nx=dx/d,nz=dz/d;x=c.x+nx*(radius+c.r+.02);z=c.z+nz*(radius+c.r+.02);const into=vx*nx+vz*nz;if(into<0){vx-=into*nx*1.2;vz-=into*nz*1.2}hit=true;dbg.colliderHits++}}return{x,z,vx,vz,hit}};
const grain=grainTexture();grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(28,28);
  const asphaltTex=()=>{const c=document.createElement('canvas');c.width=c.height=256;const c2=c.getContext('2d')!;const im=c2.createImageData(256,256);let sd=20929;for(let i=0;i<im.data.length;i+=4){sd=sd*16807%2147483647;const r=sd/2147483647,br=78+Math.round(46*(r<.5?r:1-r));im.data[i]=br;im.data[i+1]=br+Math.round(6*(sd%3));im.data[i+2]=br+6;im.data[i+3]=255}c2.putImageData(im,0,0);for(let k=0;k<140;k++){sd=sd*16807%2147483647;c2.fillStyle='rgba(16,18,20,'+(0.05+0.1*((sd>>4)%10)/10)+')';c2.fillRect(sd%236,((sd*5)%236),4+(sd%7),3+(sd%7))}for(let k=0;k<9;k++){sd=sd*16807%2147483647;c2.strokeStyle='rgba(30,34,36,0.13)';c2.lineWidth=1;c2.beginPath();c2.moveTo(sd%256,(sd*3)%256);c2.lineTo((sd*7)%256,(sd*11)%256);c2.stroke()}return new T.CanvasTexture(c)};
  const grassTex=()=>{const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;const im=ctx.createImageData(256,256);let sd=opts.seed|0;for(let i=0;i<im.data.length;i+=4){sd=sd*16807%2147483647;const r=sd/2147483647,gr=0.15+r*0.4,dr=r<.3?r*0.5:0;im.data[i]=Math.round(52+dr*30+gr*20);im.data[i+1]=Math.round(82+dr*15+gr*30);im.data[i+2]=Math.round(50+dr*10+gr*8);im.data[i+3]=255}ctx.putImageData(im,0,0);for(let k=0;k<200;k++){sd=sd*16807%2147483647;ctx.fillStyle='rgba('+Math.round(40+sd%30)+','+Math.round(65+sd%25)+','+Math.round(38+sd%18)+','+(0.08+0.12*((sd>>3)%10)/10)+')';ctx.fillRect(sd%240,(sd*3)%240,3+(sd%6),2+(sd%5))}for(let k=0;k<10;k++){sd=sd*16807%2147483647;ctx.fillStyle='rgba('+(60+sd%20)+','+(90+sd%20)+','+(48+sd%15)+',0.06)';const cx=sd%256,cy=(sd*7)%256,rr=4+(sd%8);ctx.beginPath();ctx.arc(cx,cy,rr,0,Math.PI*2);ctx.fill()}return new T.CanvasTexture(c)};
  const grassT=grassTex();grassT.wrapS=grassT.wrapT=T.RepeatWrapping;grassT.repeat.set(40,40);
  const asphalt=asphaltTex();asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;
  const matAsphalt=new T.MeshStandardMaterial({map:asphalt,color:'#b9bec1',roughness:.82,bumpMap:grain,bumpScale:.03,side:T.DoubleSide});
 const matGrass=new T.MeshStandardMaterial({color:'#5f7352',roughness:.95,side:T.DoubleSide});
 const matLine=new T.MeshStandardMaterial({color:'#e8dcc3',roughness:.6,side:T.DoubleSide});
 const matCurb=new T.MeshStandardMaterial({color:'#ffffff',roughness:.5,vertexColors:true,side:T.DoubleSide});
 const minY=Math.min(-30,Terrain(0,0)-3,-10);
   const farGround=new T.Mesh(new T.PlaneGeometry(26000,26000),new T.MeshStandardMaterial({map:grassT,color:'#52644a',roughness:1}));farGround.rotation.x=-Math.PI/2;farGround.position.y=minY-1;farGround.receiveShadow=true;group.add(farGround);
  const yG=(s:number,o:number,x:number,z:number)=>ground(s,o,x,z);
 const yA=(s:number,o:number,x:number,z:number)=>HOf(s)+o*BankOf(s)-1;
 const yC=(s:number,o:number,x:number,z:number)=>HOf(s)+o*BankOf(s)-0.97;
 const yL=(s:number,o:number,x:number,z:number)=>HOf(s)+o*BankOf(s)-0.95;
 const gRoot=new T.Group();group.add(gRoot);
 function add(geo:T.BufferGeometry,mat:T.Material,shared=false){const m=new T.Mesh(geo,mat);m.castShadow=false;m.receiveShadow=true;(m.userData as {shared?:boolean}).shared=shared;gRoot.add(m)}
 function stripGeo(offs:number[],yfn:(s:number,o:number,x:number,z:number)=>number,alt?:boolean,uvf?:((q:number,o:number)=>[number,number])|null){const rows=offs.length;const pos:number[]=[],col:number[]=[],idx:number[]=[],uv:number[]=[];for(let q=0;q<N;q++){const s=q*step+(step/2),pp=posAt(s),yaw=YawOf(s),ry=Math.cos(yaw),rn=-Math.sin(yaw);for(let k=0;k<rows;k++){const o=offs[k];pos.push(pp[0]+ry*o,yfn(s,o,pp[0],pp[1]),pp[1]+rn*o);if(alt)col.push(((q>>2)&1)?1:0,0,((q>>2)&1)?0:1);if(uvf){const u=uvf(q,o);uv.push(u[0],u[1])}}}for(let q=0;q<N;q++)for(let k=0;k<rows-1;k++){const a=q*rows+k,b=a+rows,c2=a+1,d=c2+rows;const ma=(q+1)%N*rows+k,mb=ma+1;idx.push(a,b,mb);idx.push(a,mb,c2)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));if(alt)g.setAttribute('color',new T.Float32BufferAttribute(col,3));if(uvf)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g}
  const barrierH=1.3,barrierO=LIMIT-0.15;
  const barrierMat=new T.MeshStandardMaterial({color:'#cc2222',roughness:.55,side:T.DoubleSide,vertexColors:true});
  function wallGeo(o:number){const pos:number[]=[],idx:number[]=[],col:number[]=[];for(let q=0;q<N;q++){const s=q*step+(step/2),pp=posAt(s),yaw=YawOf(s),ry=Math.cos(yaw),rn=-Math.sin(yaw),yB=HOf(s)+o*BankOf(s)-0.97,yT=yB+barrierH,x=pp[0]+ry*o,z=pp[1]+rn*o;pos.push(x,yB,z,x,yT,z);const c=((q>>2)&1)===1;col.push(c?1:0,c?0:0,c?0:1,c?1:0,c?0:0,c?0:1)}for(let q=0;q<N;q++){const a=q*2,b=(q+1)%N*2,c2=a+1,d=b+1;idx.push(a,b,c2,c2,b,d)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g}
  add(wallGeo(barrierO),barrierMat);
  add(wallGeo(-barrierO),barrierMat);
  add(stripGeo([-GRASS,-BERM,-RHLF,RHLF,BERM,GRASS],yG),matGrass);
add(stripGeo([-RHLF,RHLF],yA,false,(q,o)=>[q/N*Math.max(40,Math.round(L/6)),(o+RHLF)/ROAD]),matAsphalt);
  add(stripGeo([RHLF-1,RHLF],yC,true),matCurb);
  add(stripGeo([-RHLF,-RHLF+1],yC,true),matCurb);
  add(stripGeo([-RHLF+.2,-RHLF+.38],yL),matLine);
  add(stripGeo([RHLF-.38,RHLF-.2],yL),matLine);
  function dashGeo(b:number){const pos:number[]=[],idx:number[]=[];for(let q=0;q<N;q+=3){const s=q*step,p=posAt(s),p2=posAt((q+1)%N*step),yaw=YawOf(s),ry=Math.cos(yaw),rn=-Math.sin(yaw);let ux=p2[0]-p[0],uz=p2[1]-p[1];const ul=Math.hypot(ux,uz)||1;ux/=ul;uz/=ul;const npu=uz,npz=-ux,cx=p[0]+ry*b,cz=p[1]+rn*b,y=HOf(s)+b*BankOf(s)-0.93;const hw=.11,hl=2.2;for(let c=0;c<4;c++){const es=c<2?1:-1,es2=c%2?1:-1;pos.push(cx+ux*hl*es+npu*hw*es2,y,cz+uz*hl*es+npz*hw*es2)}const be=pos.length/3-4;idx.push(be,be+1,be+2,be+2,be+3,be)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}
  for(const b of[-7,-3.5,0,3.5,7])add(dashGeo(b),matLine);
 const treeGeo=(()=>{const tr=new T.CylinderGeometry(.18,.3,3.4,6);tr.translate(0,1.6,0);const cn=new T.ConeGeometry(2.2,4,7);cn.translate(0,3.4,0);return mergeGeometries([tr,cn],false)!})();
 const treeMat=new T.MeshStandardMaterial({color:'#3a534c',roughness:.9});
 const tribGeo=(()=>{const seat=new T.BoxGeometry(26,2.6,6);seat.translate(0,1.3,0);const step=new T.BoxGeometry(24,1.4,3);step.translate(0,2.8,1.4);return mergeGeometries([seat,step],false)!})();
 const tribMat=new T.MeshStandardMaterial({color:'#8a8f96',roughness:.7,metalness:.2});
 const dummy=new T.Object3D();
 const trees=new T.InstancedMesh(treeGeo,treeMat,2600);trees.castShadow=false;trees.receiveShadow=true;(trees.userData as {shared?:boolean}).shared=true;gRoot.add(trees);
 const tribs=new T.InstancedMesh(tribGeo,tribMat,10);tribs.castShadow=true;tribs.receiveShadow=true;(tribs.userData as {shared?:boolean}).shared=true;gRoot.add(tribs);
  const trT=rng(opts.seed^0x51ed270b),trTree=rng(opts.seed^0xa1f50c19);
  type DecorC={x:number;z:number;r:number};
  const treeColliders:DecorC[]=[],tribColliders:DecorC[]=[];
  const CELL=22,propGrid=new Map<string,DecorC[]>();
  const gridKey=(x:number,z:number)=>Math.floor(x/CELL)+','+Math.floor(z/CELL);
  const gridAdd=(c:DecorC)=>{const k=gridKey(c.x,c.z),l=propGrid.get(k)??[];l.push(c);propGrid.set(k,l)};
 function deriv(i:number){const a=yawAt((i+N-1)%N),b=yawAt(i),nn=yawAt((i+1)%N);let d1=b-a;while(d1>Math.PI)d1-=Math.PI*2;while(d1<-Math.PI)d1+=Math.PI*2;let d2=nn-b;while(d2>Math.PI)d2-=Math.PI*2;while(d2<-Math.PI)d2+=Math.PI*2;return(d1+d2)/2}
let ti=0;for(let q=0;q<N&&ti<2600;q++){const s=q*step+(step/2),p=posAt(s),yaw=YawOf(s),ry=Math.cos(yaw),rn=-Math.sin(yaw);for(let b=0;b<2&&ti<2600;b++){const side=trTree()<.5?-1:1,o=side*(RHLF+5+trTree()*52),x=p[0]+ry*o,z=p[1]+rn*o,y=ground(s,o,x,z),sc=.6+trTree()*1.1;dummy.position.set(x,y+.2,z);dummy.rotation.set(0,trTree()*6,0);dummy.scale.setScalar(sc);dummy.updateMatrix();trees.setMatrixAt(ti++,dummy.matrix);const cr={x,z,r:1.8*sc};treeColliders.push(cr);gridAdd(cr)}}
  for(let q=ti;q<2600;q++){dummy.position.set(0,-500,0);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();trees.setMatrixAt(q,dummy.matrix)}
 let li=0;for(let q=0;q<N&&li<10;q+=Math.max(3,Math.floor(N/9))){if(Math.abs(deriv(q))>0.0035)continue;const s=q*step+(step/2),yaw=YawOf(s),p=posAt(s),ry=Math.cos(yaw),rn=-Math.sin(yaw),side=trT()<.5?-1:1,o=side*(RHLF+6),x=p[0]+ry*o,z=p[1]+rn*o,y=ground(s,o,x,z);dummy.position.set(x,y-0.1,z);dummy.rotation.set(0,side<0?yaw:yaw+Math.PI,0);dummy.scale.setScalar(1);dummy.updateMatrix();tribs.setMatrixAt(li++,dummy.matrix);const tr={x,z,r:13};tribColliders.push(tr);gridAdd(tr)}
 for(let q=li;q<10;q++){dummy.position.set(0,-500,0);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();tribs.setMatrixAt(q,dummy.matrix)}
  trees.instanceMatrix.needsUpdate=true;tribs.instanceMatrix.needsUpdate=true;
  const dbg={s:0,yaw:0,o:0,roadOk:0,n:N,L:Math.round(L),lanes:LANES,roadW:ROAD,forest:ti,asphalt:!!matAsphalt.map,spawn:{x:0,z:0,yaw:0},barrierSegments:N,treeColliders:treeColliders.length,tribColliders:tribColliders.length,colliderHits:0,yawAt:(s:number)=>YawOf(s),posAt:(s:number)=>{const p=posAt(s);return[p[0],p[1]]},height:(x:number,z:number)=>{const p=project(x,z,lastS);return ground(p.s,p.o,x,z)}}
  function reset(){group.visible=true;const p=posAt(0);dbg.spawn={x:Math.round(p[0]*10)/10,z:Math.round(p[1]*10)/10,yaw:Math.round(YawOf(0)*100)/100};dbg.s=0;dbg.yaw=Math.round(YawOf(0)*100)/100;dbg.colliderHits=0}
 const spawnPose=()=>{const p=posAt(0);return{x:p[0],z:p[1],yaw:YawOf(0)}};
  function destroy(){group.parent?.remove(group);farGround.geometry.dispose();(farGround.material as T.Material).dispose();barrierMat.dispose();grassT.dispose();gRoot.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose()});matAsphalt.dispose();matGrass.dispose();matLine.dispose();matCurb.dispose();grain.dispose();asphalt.dispose();treeGeo.dispose();treeMat.dispose();tribGeo.dispose();tribMat.dispose();(window as unknown as {__ring?:unknown}).__ring=null}
reset();
  (window as unknown as {__ring?:unknown}).__ring=dbg;
  return{group,height,collide,spawnPose,reset,destroy,dbg};
}
