import * as T from 'three';
import {grainTexture} from './visuals';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const LANES=5,LANE_W=3.5,ROAD=LANES*LANE_W,RHLF=ROAD/2,LIMIT=RHLF+.3,BERM=RHLF+4,GRASS=46;
const RES=2,CHUNK=1200,BEHIND=1500,AHEAD=4900,PAD=400;
const NPC_MIN=8,NPC_MAX=14,SPD_MIN=17,SPD_MAX=25,OV_PTS=12,OV_CD=.8;
const YAW0=.62,CARCOLORS=['#3f5f83','#7a3f3f','#3f7a5f','#8a7a3f','#5f3f7a','#3f7a7a','#b0462f','#2f6e5c'];
const YawOf=(s:number)=>YAW0+.5*Math.sin(s/520+1.7)+.42*Math.sin(s/237+4.1)+.24*Math.sin(s/141+.7);
const HOf=(s:number)=>9*Math.sin(s/880+1.3)+6*Math.sin(s/310+3.7);
const BankOf=(s:number)=>.06*Math.sin(s/700+.4);
const Terr=(o:number)=>{const a=o<0?-o:o;return a<=RHLF?0:a<=BERM?-.28:a<GRASS?Math.max(-30,-.28-(a-BERM)*.45):-30};
export interface RacewayHandle{group:T.Group;height(x:number,z:number):number;collide(x:number,z:number,vx:number,vz:number,previous:[number,number],radius:number):{x:number;z:number;vx:number;vz:number;hit:boolean};spawnPose():{x:number;z:number;yaw:number};update(dt:number,px:number,pz:number,drifting:boolean,clock:number):{px:number;pz:number;ov:number}|null;reset():void;destroy():void}
interface Npc{s:number;lane:number;off:number;spd:number;col:number;lastOv:number;seed:number}
const AXIS_X=new T.Vector3(1,0,0);
export function createRaceway(opts:{scene:T.Scene}):RacewayHandle{
 const scene=opts.scene,group=new T.Group();scene.add(group);group.visible=false;
 const SX:number[]=[],SZ:number[]=[];let sBase=0,lastS=0,prevP=NaN,lastTop=0,frame=0,lastDrift=-1e9;
 const posAt=(s:number):[number,number]=>{const f=(s-sBase)/RES;let i=Math.floor(f);if(i<0)i=0;if(i>SX.length-2)i=SX.length-2;const t=Math.min(1,Math.max(0,f-i));return[SX[i]+(SX[i+1]-SX[i])*t,SZ[i]+(SZ[i+1]-SZ[i])*t]};
 function extendAhead(minEnd:number){while(sBase+SX.length*RES<minEnd){const s=sBase+SX.length*RES,yaw=YawOf(s);const lx=SX.length?SX[SX.length-1]:0,lz=SZ.length?SZ[SZ.length-1]:0;SX.push(lx-Math.sin(yaw)*RES);SZ.push(lz-Math.cos(yaw)*RES)}}
 function dropFront(minStart:number){if(minStart<=sBase)return;const d=Math.max(0,Math.floor((minStart-sBase)/RES));if(!d)return;SX.splice(0,d);SZ.splice(0,d);sBase+=d*RES}
 function project(x:number,z:number,hint:number){const n=SX.length;if(n<2)return{s:0,o:0,y:0,x,z,yaw:YawOf(0)};let i=Math.max(0,Math.min(n-2,Math.round((hint-sBase)/RES)));const d2=(k:number)=>{const dx=SX[k]-x,dz=SZ[k]-z;return dx*dx+dz*dz};let d=d2(i);if(d>200*200){let bi=i,bd=d;for(let k=0;k<n;k+=8){const q=d2(k);if(q<bd){bd=q;bi=k}}i=Math.max(0,Math.min(n-2,bi));d=d2(i)}for(let it=0;it<200;it++){const dn=d2(i+1),dp=d2(i-1);if(dp<d&&dp<=dn){i--;d=dp;continue}if(dn<d){i++;d=dn;continue}break}const ax=SX[i],az=SZ[i],bx=SX[i+1],bz=SZ[i+1],sx=bx-ax,sz=bz-az;let t=((x-ax)*sx+(z-az)*sz)/(sx*sx+sz*sz||1);t=Math.max(0,Math.min(1,t));const s=sBase+(i+t)*RES,cx=ax+sx*t,cz=az+sz*t,yaw=YawOf(s),ry=Math.cos(yaw),rn=-Math.sin(yaw),o=(x-cx)*ry+(z-cz)*rn;return{s,o,y:HOf(s)+o*BankOf(s)+Terr(o),x:cx,z:cz,yaw}}
 const height=(x:number,z:number)=>{const p=project(x,z,lastS);lastS=p.s;return p.y};
 const collide=(x:number,z:number,vx:number,vz:number,previous:[number,number],radius:number)=>{const p=project(x,z,lastS);lastS=p.s;let hit=false;if(Math.abs(p.o)>LIMIT){const sg=p.o>0?1:-1,cl=sg*LIMIT,ry=Math.cos(p.yaw),rn=-Math.sin(p.yaw);x=p.x+ry*cl;z=p.z+rn*cl;const out=vx*ry+vz*rn;if(out*sg>0){vx-=ry*out*1.6;vz-=rn*out*1.6}hit=true}return{x,z,vx,vz,hit}};
 const grain=grainTexture();grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(24,24);
 const matAsphalt=new T.MeshStandardMaterial({color:'#363e41',roughness:.76,bumpMap:grain,bumpScale:.03,side:T.DoubleSide});
 const matGrass=new T.MeshStandardMaterial({color:'#6b7f58',roughness:.95,side:T.DoubleSide});
const matLine=new T.MeshStandardMaterial({color:'#e8dcc3',roughness:.6,side:T.DoubleSide});
  const matCurb=new T.MeshStandardMaterial({color:'#ffffff',roughness:.5,vertexColors:true,side:T.DoubleSide});
 const farGround=new T.Mesh(new T.PlaneGeometry(12000,12000),new T.MeshStandardMaterial({color:'#5d6f4e',roughness:1}));farGround.rotation.x=-Math.PI/2;farGround.position.y=-31;farGround.receiveShadow=true;group.add(farGround);
 const treeGeo=(()=>{const tr=new T.CylinderGeometry(.16,.27,3,6);tr.translate(0,1.4,0);const cn=new T.ConeGeometry(2.1,3.6,7);cn.translate(0,3.1,0);return mergeGeometries([tr,cn],false)!})();
 const treeMat=new T.MeshStandardMaterial({color:'#3c5750',roughness:.9});
 const lampPoleGeo=(()=>{const c=new T.CylinderGeometry(.08,.12,8,6);c.translate(0,4,0);return c})();
 const lampHeadGeo=(()=>{const b=new T.BoxGeometry(.8,.14,.4);b.translate(0,7.6,.15);return b})();
 const poleM=new T.MeshStandardMaterial({color:'#7c8890',roughness:.6,metalness:.4});
 const headM=new T.MeshStandardMaterial({color:'#ffe2a8',emissive:'#ffd488',emissiveIntensity:2.2,roughness:.5});
 let dbg:{s:number;yaw:number;chunks:number[];npcs:{s:number;lane:number;spd:number;off:number}[];spawn:{x:number;z:number;yaw:number};overtakes:number;cross:number;lastDrift:number}={s:0,yaw:0,chunks:[],npcs:[],spawn:{x:0,z:0,yaw:YawOf(0)},overtakes:0,cross:0,lastDrift:-9e9};
 (window as unknown as {__raceway?:unknown}).__raceway=dbg;
 let npcs:Npc[]=[];
 function stripGeo(i0:number,i1:number,offs:number[],yfn:(s:number,o:number)=>number,alt?:boolean){const pos:number[]=[],col:number[]=[],idx:number[]=[];const rows=offs.length;for(let i=i0;i<=i1;i++){const s=sBase+i*RES,p=posAt(s),yaw=YawOf(s),ry=Math.cos(yaw),rn=-Math.sin(yaw);for(let k=0;k<rows;k++){const o=offs[k];pos.push(p[0]+ry*o,yfn(s,o),p[1]+rn*o);if(alt){const c=((i>>2)&1)===1;col.push(c?1:0,c?0:0,c?0:1)}}}const cw=i1-i0+1;for(let i=0;i<cw-1;i++)for(let k=0;k<rows-1;k++){const a=i*rows+k,b=a+rows,c2=a+1,d=c2+rows;idx.push(a,b,c2,c2,b,d)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));if(alt)g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g}
 function dashGeo(s0:number,s1:number,b:number){const pos:number[]=[],idx:number[]=[];for(let s=s0;s<=s1-3;s+=6){const p=posAt(s),p2=posAt(s+3),yaw=YawOf(s),ry=Math.cos(yaw),rn=-Math.sin(yaw);let ux=p2[0]-p[0],uz=p2[1]-p[1];const ul=Math.hypot(ux,uz)||1;ux/=ul;uz/=ul;const npu=uz,npz=-ux,cx=p[0]+ry*b,cz=p[1]+rn*b,y=HOf(s)+b*BankOf(s)+.07;const hw=.08,hl=1.5;for(let c=0;c<4;c++){const es=c<2?1:-1,es2=c%2?1:-1;pos.push(cx+ux*hl*es+npu*hw*es2,y,cz+uz*hl*es+npz*hw*es2)}const base=pos.length/3-4;idx.push(base,base+1,base+2,base+2,base+3,base)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}
 const chunks=new Map<number,T.Group>();
 function buildChunk(k:number){const s0=k*CHUNK,s1=s0+CHUNK;if(s1<=sBase)return;const i0=Math.max(0,Math.ceil((s0-sBase)/RES)),i1=Math.min(SX.length-2,Math.floor((s1-sBase)/RES)+1);if(i1<=i0)return;const g=new T.Group();
  const yG=(s:number,o:number)=>HOf(s)+o*BankOf(s)+Terr(o),yA=(s:number,o:number)=>HOf(s)+o*BankOf(s)+.05,yC=(s:number,o:number)=>HOf(s)+o*BankOf(s)+.07;
  const add=(geo:T.BufferGeometry,mat:T.Material,shared=false)=>{const m=new T.Mesh(geo,mat);m.castShadow=false;m.receiveShadow=true;(m.userData as {shared?:boolean}).shared=shared;g.add(m)};
  add(stripGeo(i0,i1,[-GRASS,-BERM,-RHLF,RHLF,BERM,GRASS],yG),matGrass);
  add(stripGeo(i0,i1,[-RHLF,RHLF],yA),matAsphalt);
  add(stripGeo(i0,i1,[RHLF-.95,RHLF],yC,true),matCurb);
  add(stripGeo(i0,i1,[-RHLF,-RHLF+.95],yC,true),matCurb);
  add(stripGeo(i0,i1,[-RHLF+.18,-RHLF+.34],yC),matLine);
  add(stripGeo(i0,i1,[RHLF-.34,RHLF-.18],yC),matLine);
  for(const b of[-1.75,-5.25,1.75,5.25])add(dashGeo(s0,s1,b),matLine);
  const dummy=new T.Object3D();let seed=k*7919+17;const rnd=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
  const trees=new T.InstancedMesh(treeGeo,treeMat,90);trees.castShadow=false;trees.receiveShadow=true;(trees.userData as {shared?:boolean}).shared=true;g.add(trees);let ti=0;
  for(let s=s0+16;s<s1-10;s+=38+rnd()*22)for(const side of[-1,1]){if(ti>=90)break;const o=side*(16+rnd()*28),p=posAt(s),yaw=YawOf(s),ry=Math.cos(yaw),rn=-Math.sin(yaw),x=p[0]+ry*o,z=p[1]+rn*o,y=HOf(s)+o*BankOf(s)+Terr(o)-.15,sc=.8+rnd()*.9;dummy.position.set(x,y,z);dummy.rotation.set(0,rnd()*6,0);dummy.scale.setScalar(sc);dummy.updateMatrix();trees.setMatrixAt(ti++,dummy.matrix)}
  for(let q=ti;q<90;q++){dummy.position.set(0,-500,0);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();trees.setMatrixAt(q,dummy.matrix)}trees.instanceMatrix.needsUpdate=true;
  const poles=new T.InstancedMesh(lampPoleGeo,poleM,20);const heads=new T.InstancedMesh(lampHeadGeo,headM,20);poles.castShadow=false;heads.castShadow=false;(poles.userData as {shared?:boolean}).shared=true;(heads.userData as {shared?:boolean}).shared=true;g.add(poles,heads);let li=0;
  for(let s=s0+30;s<s1-30;s+=70){if(li>=20)break;const o=12.5,p=posAt(s),yaw=YawOf(s),ry=Math.cos(yaw),rn=-Math.sin(yaw),x=p[0]+ry*o,z=p[1]+rn*o,y=HOf(s)+o*BankOf(s)+Terr(o);dummy.position.set(x,y,z);dummy.rotation.set(0,yaw+Math.PI/2,0);dummy.scale.setScalar(1);dummy.updateMatrix();poles.setMatrixAt(li,dummy.matrix);dummy.position.set(x,y+7.6,z);dummy.updateMatrix();heads.setMatrixAt(li,dummy.matrix);li++}
  for(let q=li;q<20;q++){dummy.position.set(0,-500,0);dummy.updateMatrix();poles.setMatrixAt(q,dummy.matrix);heads.setMatrixAt(q,dummy.matrix)}poles.instanceMatrix.needsUpdate=true;heads.instanceMatrix.needsUpdate=true;
  group.add(g);chunks.set(k,g)}
 function syncChunks(ns:number){const c0=Math.max(0,Math.floor(ns/CHUNK)-1,Math.ceil(sBase/CHUNK)),c1=Math.floor(ns/CHUNK)+3;for(const k of[...chunks.keys()])if(k<c0||k>c1){const c=chunks.get(k)!;group.remove(c);c.traverse(o=>{if(o instanceof T.Mesh&&!(o.userData as {shared?:boolean}).shared)o.geometry.dispose()});chunks.delete(k)}for(let k=c0;k<=c1;k++)if(!chunks.has(k))buildChunk(k)}
 const dummy=new T.Object3D();
 const carGeo=(()=>{const b=new T.BoxGeometry(1.95,.72,4.15);b.translate(0,.62,0);const c=new T.BoxGeometry(1.6,.5,2.1);c.translate(0,1.14,-.1);return mergeGeometries([b,c],false)!})();
 const wheelGeo=(()=>{const w=new T.CylinderGeometry(.33,.33,.3,10);w.rotateZ(Math.PI/2);return w})();
const carM=new T.InstancedMesh(carGeo,new T.MeshStandardMaterial({color:'#ffffff',roughness:.55,metalness:.3}),NPC_MAX);
  const wheelM=new T.InstancedMesh(wheelGeo,new T.MeshStandardMaterial({color:'#13171a',roughness:.9}),NPC_MAX*4);
 group.add(carM,wheelM);const colTmp=new T.Color();
 const laneC=(l:number)=>(l-2)*LANE_W;
 function spawnNpc(pS:number,fresh:boolean){if(npcs.length>=NPC_MAX)return;const s=fresh?pS+(90+Math.random()*500):pS+(600+Math.random()*1600);const lane=Math.random()<.75?2+((Math.random()*3)|0):((Math.random()*2)|0);npcs.push({s,lane,off:laneC(lane)+(Math.random()-.5)*1.6,spd:SPD_MIN+Math.random()*(SPD_MAX-SPD_MIN),col:(Math.random()*CARCOLORS.length)|0,lastOv:-9,seed:Math.random()*1e9})}
 const qW=new T.Quaternion(),qS=new T.Quaternion(),eY=new T.Euler();
 function update(dt:number,px:number,pz:number,drifting:boolean,clock:number){if(!group.visible)return null;frame++;const p=project(px,pz,lastS);lastS=p.s;const ns=p.s;extendAhead(ns+AHEAD+PAD);dropFront(Math.max(0,ns-BEHIND-PAD));syncChunks(ns);
  lastTop-=dt;if(lastTop<=0){lastTop=.5;while(npcs.length<NPC_MIN)spawnNpc(ns,true);if(npcs.filter(w=>w.s>ns&&w.s<ns+700).length<3)spawnNpc(ns,false)}
  for(const n of npcs)n.s+=n.spd*dt;
  const sorted=[...npcs].sort((a,b)=>a.s-b.s);for(let i=0;i<sorted.length-1;i++){const A=sorted[i],B=sorted[i+1];if(B.s-A.s<14&&A.spd>B.spd)A.spd+=((B.spd*1.04)-A.spd)*Math.min(1,dt*2)}
  npcs=npcs.filter(n=>n.s>ns-900&&n.s<ns+3400);
  if(drifting)lastDrift=clock;
  let ov=0;if(!isNaN(prevP)){for(const n of npcs){if(prevP<n.s&&ns>=n.s){dbg.cross++;if((drifting||clock-lastDrift<1200)&&clock-n.lastOv>OV_CD){n.lastOv=clock;ov=OV_PTS;dbg.overtakes++;dbg.lastDrift=clock}break}}}
  prevP=ns;
  for(let i=0;i<NPC_MAX;i++){const n=npcs[i];if(!n){dummy.position.set(0,-500,0);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();carM.setMatrixAt(i,dummy.matrix);for(let wc=0;wc<4;wc++){dummy.position.set(0,-500,0);dummy.updateMatrix();wheelM.setMatrixAt(i*4+wc,dummy.matrix)}continue}const pp=posAt(n.s),yaw=YawOf(n.s),ry=Math.cos(yaw),rn=-Math.sin(yaw),fy=-Math.sin(yaw),fz=-Math.cos(yaw),x=pp[0]+ry*n.off,z=pp[1]+rn*n.off,y=HOf(n.s)+n.off*BankOf(n.s)+.03;carM.setColorAt(i,colTmp.set(CARCOLORS[n.col]));eY.set(0,yaw+Math.sin(n.s*.06+n.seed)*.012,0);qW.setFromEuler(eY);dummy.position.set(x,y,z);dummy.quaternion.copy(qW);dummy.scale.setScalar(1);dummy.updateMatrix();carM.setMatrixAt(i,dummy.matrix);const spin=n.s/.36,wy=yaw+Math.sin(n.s*.06+n.seed)*.012;for(let wc=0;wc<4;wc++){const wl=wc%2?-.78:.78,wz2=wc<2?-1.45:1.4;eY.set(0,0,spin);qS.setFromEuler(eY);eY.set(0,wy,0);qW.setFromEuler(eY);dummy.position.set(x+ry*wl+fy*wz2,z+rn*wl+fz*wz2,y+.35);dummy.quaternion.copy(qW).multiply(qS);dummy.scale.setScalar(1);dummy.updateMatrix();wheelM.setMatrixAt(i*4+wc,dummy.matrix)}}
  carM.instanceMatrix.needsUpdate=true;carM.instanceColor!.needsUpdate=true;
  let px0=0,pz0=0;for(const n of npcs){const pp=posAt(n.s),yaw=YawOf(n.s),ry=Math.cos(yaw),rn=-Math.sin(yaw),cx=pp[0]+ry*n.off,cz=pp[1]+rn*n.off,dx=px-cx,dz=pz-cz,dd=Math.hypot(dx,dz);if(dd<3.2&&dd>.001){const w=1-dd/3.2;px0+=dx/dd*w;pz0+=dz/dd*w}}
  dbg.s=Math.round(ns*10)/10;dbg.yaw=Math.round(YawOf(ns)*100)/100;dbg.chunks=[...chunks.keys()].sort((a,b)=>a-b);dbg.npcs=npcs.map(n=>({s:Math.round(n.s*10)/10,lane:n.lane,spd:Math.round(n.spd*10)/10,off:Math.round(n.off*10)/10}));
  return{px:px0,pz:pz0,ov}}
 function reset(){for(const k of[...chunks.keys()]){const c=chunks.get(k)!;group.remove(c);c.traverse(o=>{if(o instanceof T.Mesh&&!(o.userData as {shared?:boolean}).shared)o.geometry.dispose()});chunks.delete(k)}SX.length=0;SZ.length=0;sBase=0;extendAhead(AHEAD+PAD);npcs=[];lastTop=0;for(let i=0;i<NPC_MAX;i++){dummy.position.set(0,-500,0);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();carM.setMatrixAt(i,dummy.matrix)}carM.instanceMatrix.needsUpdate=true;prevP=NaN;const p0=posAt(0);dbg.spawn={x:Math.round(p0[0]*10)/10,z:Math.round(p0[1]*10)/10,yaw:Math.round(YawOf(0)*100)/100};for(let i=0;i<NPC_MIN;i++)spawnNpc(0,true)}
 function destroy(){group.remove(carM,wheelM);carM.geometry.dispose();(carM.material as T.Material).dispose();wheelM.geometry.dispose();(wheelM.material as T.Material).dispose();for(const k of[...chunks.keys()]){const c=chunks.get(k)!;group.remove(c);c.traverse(o=>{if(o instanceof T.Mesh&&!(o.userData as {shared?:boolean}).shared)o.geometry.dispose()});chunks.delete(k)}matAsphalt.dispose();matGrass.dispose();matLine.dispose();matCurb.dispose();farGround.geometry.dispose();(farGround.material as T.Material).dispose();grain.dispose();treeGeo.dispose();treeMat.dispose();lampPoleGeo.dispose();lampHeadGeo.dispose();poleM.dispose();headM.dispose();scene.remove(group);(window as unknown as {__raceway?:unknown}).__raceway=null}
 const spawnPose=()=>{const p0=posAt(0);return{x:p0[0],z:p0[1],yaw:YawOf(0)}};
 reset();
 return{group,height,collide,spawnPose,update,reset,destroy};
}