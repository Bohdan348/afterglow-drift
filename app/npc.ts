import * as T from 'three';
import type {Point} from './town-data';
import {loadCarModelMulti} from './car-multi-glb';
import {loadBikeModelMulti} from './bike-multi-glb';
import type {CarModel} from './car-glb';
import type {BikeModel} from './bike-multi-glb';
export const NPC_CARS=['/models/coupe.glb','/models/cuv.glb','/models/hatchback.glb','/models/liftback.glb','/models/sedan.glb','/models/suv.glb','/models/wagon.glb'];
export const NPC_MOTOS=['/models/bike_adventure.glb','/models/bike_cafe.glb','/models/bike_chopper.glb','/models/bike_cruiser.glb','/models/bike_enduro.glb','/models/bike_maxiscooter.glb','/models/bike_mx.glb','/models/bike_pitbike.glb','/models/bike_scooter.glb','/models/bike_scrambler.glb','/models/bike_sportbike.glb','/models/bike_sporttourer.glb','/models/bike_street.glb','/models/bike_supermoto.glb','/models/bike_tourer.glb'];
const carCache=new Map<string,CarModel>();const motoCache=new Map<string,BikeModel>();
const carLoaded:string[]=[];const motoLoaded:string[]=[];
let npcModelsLoaded=false;
const npcDbg={carLoaded:0,motoLoaded:0,carTotal:NPC_CARS.length,motoTotal:NPC_MOTOS.length};
(window as unknown as {__npcglb?:unknown}).__npcglb=npcDbg;
export function preloadNpcModels(){if(npcModelsLoaded)return;npcModelsLoaded=true;const mob=innerWidth<640;const cl=mob?NPC_CARS.slice(0,3):NPC_CARS,ml=mob?NPC_MOTOS.slice(0,4):NPC_MOTOS;npcDbg.carTotal=cl.length;npcDbg.motoTotal=ml.length;for(const u of cl)loadCarModelMulti(u).then(m=>{if(m){carCache.set(u,m);carLoaded.push(u)}npcDbg.carLoaded=carLoaded.length});for(const u of ml)loadBikeModelMulti(u).then(m=>{if(m){motoCache.set(u,m);motoLoaded.push(u)}npcDbg.motoLoaded=motoLoaded.length})}
export const npcCarModel=(url:string)=>carCache.get(url);
export const npcCarColors=['#3f5f83','#7a3f3f','#3f7a5f','#8a7a3f','#5f3f7a','#3f7a7a','#b0462f','#2f6e5c'];
const DRIVABLE=new Set(['residential','service','unclassified','primary','secondary','tertiary','living_street']);
const WALK=new Set(['park','pitch','pedestrian','playground','recreation_ground','village_green','residential','grass']);
type NpcType='ped'|'moto'|'car';
interface GNode{x:number;z:number}
interface GEdge{a:number;b:number;len:number;type:number;kind:string;width:number}
interface G{nodes:GNode[];adj:{n:number;ei:number}[][];edges:GEdge[]}
const empty=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const rng=(seed:number)=>{let s=seed>>>0;return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
function nodeSnap(npos:Map<number,GNode>,grid:Map<string,number[]>,x:number,z:number):number{const cx=Math.floor(x*2),cz=Math.floor(z*2);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const a=grid.get((cx+dx)+','+(cz+dz));if(!a)continue;for(const id of a){const p=npos.get(id)!;if(Math.hypot(p.x-x,p.z-z)<1.0)return id}}const id=npos.size;npos.set(id,{x,z});const a=grid.get(cx+','+cz)??[];a.push(id);grid.set(cx+','+cz,a);return id}
function addEdge(g:G,npos:Map<number,GNode>,a:number,b:number,kind:string,width:number,type:number){if(a===b)return;const pa=npos.get(a)!,pb=npos.get(b)!;const len=Math.hypot(pb.x-pa.x,pb.z-pa.z);if(len<.2)return;const ei=g.edges.length;g.edges.push({a,b,len,type,kind,width});const la=(g.adj[a]??=[]);la.push({n:b,ei});const lb=(g.adj[b]??=[]);lb.push({n:a,ei})}
function pinpoly(px:number,pz:number,p:Point[]):boolean{let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>pz)!==(b[1]>pz)&&px<(b[0]-a[0])*(pz-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
function buildV(roads:Point[][],kinds:string[],widths:number[]):G{const g:G={nodes:[],adj:[],edges:[]};const npos=new Map<number,GNode>();const grid=new Map<string,number[]>();const seen=new Set<string>();for(let r=0;r<roads.length;r++){if(!DRIVABLE.has(kinds[r]))continue;const p=roads[r];for(let i=1;i<p.length;i++){const a=nodeSnap(npos,grid,p[i-1][0],p[i-1][1]),b=nodeSnap(npos,grid,p[i][0],p[i][1]);const k=a<b?a+'_'+b:b+'_'+a;if(seen.has(k))continue;seen.add(k);addEdge(g,npos,a,b,kinds[r],widths[r],0)}}g.nodes=new Array(npos.size);for(const[id,pt]of npos)g.nodes[id]=pt;g.adj=g.adj.map(a=>a??[]);return g}
function buildP(roads:Point[][],kinds:string[],widths:number[],areas:{p:Point[];kind:string}[]):G{const g:G={nodes:[],adj:[],edges:[]};const npos=new Map<number,GNode>();const grid=new Map<string,number[]>();const seen=new Set<string>();const link=new Set<string>();
 const linker=(a:number,b:number)=>{if(a===b)return;const k=a<b?a+'_'+b:b+'_'+a;if(link.has(k))return;link.add(k);addEdge(g,npos,a,b,'link',2,0)};
 for(let r=0;r<roads.length;r++){const p=roads[r],kind=kinds[r],w=widths[r];const n=p.length;if(n<2)continue;const o=Math.max(1.6,w/2+1.2);let L=-1,R=-1;for(let i=0;i<n;i++){let tx,tz;if(i===0){tx=p[1][0]-p[0][0];tz=p[1][1]-p[0][1]}else if(i===n-1){tx=p[n-1][0]-p[n-2][0];tz=p[n-1][1]-p[n-2][1]}else{tx=p[i+1][0]-p[i-1][0];tz=p[i+1][1]-p[i-1][1]}const tl=Math.hypot(tx,tz);if(tl<.001)continue;const nx=-tz/tl,nz=tx/tl;const la=nodeSnap(npos,grid,p[i][0]+nx*o,p[i][1]+nz*o),ra=nodeSnap(npos,grid,p[i][0]-nx*o,p[i][1]-nz*o);if(L>=0){const k1=L<la?L+'_'+la:la+'_'+L;if(!seen.has(k1)){seen.add(k1);addEdge(g,npos,L,la,kind,w,0)}const k2=R<ra?R+'_'+ra:ra+'_'+R;if(!seen.has(k2)){seen.add(k2);addEdge(g,npos,R,ra,kind,w,0)}}addEdge(g,npos,la,ra,kind,w+2.4,1);L=la;R=ra}}
 g.nodes=new Array(npos.size);for(const[id,pt]of npos)g.nodes[id]=pt;g.adj=g.adj.map(a=>a??[]);
 const baseN=g.nodes.length;const cell=new Map<string,number[]>();for(let i=0;i<baseN;i++){const p=g.nodes[i];const k=Math.floor(p.x/9)+','+Math.floor(p.z/9);const a=cell.get(k)??[];a.push(i);cell.set(k,a)}
 for(let i=0;i<baseN;i++){const p=g.nodes[i];const kx=Math.floor(p.x/9),kz=Math.floor(p.z/9);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){for(const j of cell.get((kx+dx)+','+(kz+dz))??[]){if(j<=i)continue;const q=g.nodes[j];if(Math.hypot(p.x-q.x,p.z-q.z)<4.6)linker(i,j)}}}
 const coarse=new Map<string,{id:number;x:number;z:number;area:boolean}[]>();const addCoarse=(x:number,z:number,id:number,area:boolean)=>{const k=Math.floor(x/45)+','+Math.floor(z/45);const a=coarse.get(k)??[];a.push({id,x,z,area});coarse.set(k,a)};
 for(let i=0;i<baseN;i++){const p=g.nodes[i];addCoarse(p.x,p.z,i,false)}
 const nearest=(x:number,z:number,radius:number,areaOnly:boolean):number=>{const kx=Math.floor(x/45),kz=Math.floor(z/45);let best=-1,bd=radius*radius;for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){for(const e of coarse.get((kx+dx)+','+(kz+dz))??[]){if(areaOnly&&!e.area)continue;const d=(x-e.x)*(x-e.x)+(z-e.z)*(z-e.z);if(d<bd){bd=d;best=e.id}}}return best};
 let budget=150;const order:number[]=[];for(let i=0;i<areas.length;i++)order.push(i);for(let i=order.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[order[i],order[j]]=[order[j],order[i]]}
 for(const ai of order){if(budget<=0)break;const a=areas[ai];if(!WALK.has(a.kind)||a.p.length<4)continue;let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;for(const p of a.p){if(p[0]<minX)minX=p[0];if(p[0]>maxX)maxX=p[0];if(p[1]<minZ)minZ=p[1];if(p[1]>maxZ)maxZ=p[1]}const dx=maxX-minX,dz=maxZ-minZ;if(dx*dz<320)continue;let pt:[number,number]|null=null;for(let t=0;t<24;t++){const px=minX+Math.random()*dx,pz=minZ+Math.random()*dz;if(pinpoly(px,pz,a.p)){pt=[px,pz];break}}if(!pt&&pinpoly(minX+dx/2,minZ+dz/2,a.p))pt=[minX+dx/2,minZ+dz/2];if(!pt)continue;const id=g.nodes.length;g.nodes.push({x:pt[0],z:pt[1]});g.adj.push([]);addCoarse(pt[0],pt[1],id,true);const s=nearest(pt[0],pt[1],45,false);if(s>=0){addEdge(g,npos,s,id,a.kind,2,2);const aN=nearest(pt[0],pt[1],25,true);if(aN>=0){addEdge(g,npos,aN,id,a.kind,2,2)}}budget--}
 return g}
interface Ped{slot:number;a:number;b:number;ei:number;t:number;x:number;z:number;yaw:number;spyaw:number;lat:number;speed:number;cap:number;phase:number;color:number;noCross:number;seed:number;st:string}
interface Veh{type:NpcType;a:number;b:number;ei:number;t:number;x:number;z:number;yaw:number;spyaw:number;lat:number;yawOff:number;speed:number;cap:number;drift:boolean;drT:number;drDur:number;nextDrift:number;life:number;seed:number;yield:boolean;st:string;u:string;grp:T.Group;wheels:T.Object3D[];bodyMat:T.MeshStandardMaterial|null;glbMats:T.Material[]}
const KIND_MAX:Record<string,number>={motorway:20,primary:20,secondary:18,trunk:18,tertiary:16,unclassified:15,residential:13,living_street:10,service:9};
export interface NpcHandle{respawn(cx:number,cz:number):void;despawn():void;destroy():void;update(dt:number,px:number,pz:number):void;debug():{counts:{ped:number;moto:number;car:number};glb:{car:number;moto:number};actors:{t:NpcType;x:number;z:number;yaw:number;s:number;dr:number;yl:number;st:string}[];graph:{ve:number;pe:number}}}
const GRAPHS=new Map<string,{vg:G;pg:G}>();
export function createNpc(opts:{id:string;roads:{p:Point[];kind:string;width:number}[];areas:{p:Point[];kind:string}[];bounds:number[];height:(x:number,z:number)=>number;scene:T.Scene}):NpcHandle{
 preloadNpcModels();
 const scene=opts.scene;let vg:G,pg:G;const cache=GRAPHS.get(opts.id);
 if(cache){vg=cache.vg;pg=cache.pg}else{vg=buildV(opts.roads.map(r=>r.p),opts.roads.map(r=>r.kind),opts.roads.map(r=>r.width));pg=buildP(opts.roads.map(r=>r.p),opts.roads.map(r=>r.kind),opts.roads.map(r=>r.width),opts.areas.map(a=>({p:a.p,kind:a.kind})));GRAPHS.set(opts.id,{vg,pg})}
 const bounds=opts.bounds;const height=opts.height;const mobile=innerWidth<640;
 const PED_MAX=mobile?10:22,MOTO_MAX=mobile?1:3,CAR_MAX=mobile?3:6;
 const dummy=new T.Object3D();
 const bodyGeom=new T.CapsuleGeometry(.19,.45,4,8);const headGeom=new T.SphereGeometry(.15,10,8);
 const pBody=new T.InstancedMesh(bodyGeom,new T.MeshStandardMaterial({color:'#ffffff',roughness:.8}),PED_MAX);pBody.frustumCulled=false;
 const pHead=new T.InstancedMesh(headGeom,new T.MeshStandardMaterial({color:'#ffffff',roughness:.6}),PED_MAX);pHead.frustumCulled=false;
 scene.add(pBody,pHead);
 const PAL=['#b96f5b','#5d8a6e','#7a6fa8','#c98f4e','#8aa8c2','#a85f72','#6e7f4f','#9a8fb0'];
 const cBodyG=new T.BoxGeometry(1.9,.72,4.1);const cCabG=new T.BoxGeometry(1.62,.5,2.05);const wheelG=new T.CylinderGeometry(.36,.36,.3,12);
 const mBodyG=new T.BoxGeometry(.5,.5,2.3);const mWheelG=new T.CylinderGeometry(.35,.35,.22,12);
 const wheelMat=new T.MeshStandardMaterial({color:'#13171a',roughness:.9});
 const makeMesh=(geom:T.BufferGeometry,mat:T.Material,x:number,y:number,z:number,parent:T.Object3D)=>{const m=new T.Mesh(geom,mat);m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=false;parent.add(m);return m};
const spawnMesh=(type:NpcType,color:string)=>{const g=new T.Group();const mat=new T.MeshStandardMaterial({color,roughness:.55,metalness:.25});const wheels:T.Object3D[]=[];
   if(type==='car'){makeMesh(cBodyG,mat,0,.66,0,g);makeMesh(cCabG,new T.MeshStandardMaterial({color,roughness:.5,metalness:.4}),0,1.12,.18,g);for(const sx of[-1,1])for(const sz of[-1,1]){const w=makeMesh(wheelG,wheelMat,sx*.82,.4,sz*1.45,g);w.rotation.z=Math.PI/2;wheels.push(w)}}
   else{makeMesh(mBodyG,mat,0,.5,0,g);for(const sz of[-1,1]){const w=makeMesh(mWheelG,wheelMat,0,.4,sz*.8,g);w.rotation.z=Math.PI/2;wheels.push(w)}makeMesh(new T.BoxGeometry(.42,.28,.3),mat,0,.9,.35,g)}
   scene.add(g);return{grp:g,wheels,glbMats:[] as T.Material[],bodyMat:mat}};
  const makeVeh=(type:'moto'|'car',url:string,color:string)=>{const model=type==='car'?carCache.get(url):motoCache.get(url);if(!model)return null;
   const g=model.group.clone(true);const glbMats:T.Material[]=[];
   g.traverse(o=>{if(!(o instanceof T.Mesh))return;o.castShadow=false;o.receiveShadow=false;const mats=Array.isArray(o.material)?o.material:[o.material];const nm:T.Material[]=[];for(const mm of mats){const m0=mm as T.MeshStandardMaterial;if(m0.isMeshStandardMaterial&&m0.name==='MatBody'){const c=new T.MeshStandardMaterial({color,roughness:.55,metalness:.25,...(m0.map?{map:m0.map}:{})});glbMats.push(c);nm.push(c)}else nm.push(mm)}o.material=nm.length===1?nm[0]:nm});
   const wheels:T.Object3D[]=[];g.children.forEach(c=>{if(c instanceof T.Group){c.userData.glb=true;wheels.push(c)}});
   scene.add(g);return{grp:g,wheels,glbMats,bodyMat:null as T.MeshStandardMaterial|null}};
 let peds:Ped[]=[],vehs:Veh[]=[];let freeSlots:number[]=[];for(let i=0;i<PED_MAX;i++)freeSlots.push(i);
 const hideP=(i:number)=>{dummy.position.set(0,-500,0);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);pBody.setMatrixAt(i,dummy.matrix);pHead.setMatrixAt(i,dummy.matrix)};
 for(let i=0;i<PED_MAX;i++)hideP(i);pBody.instanceMatrix.needsUpdate=true;pHead.instanceMatrix.needsUpdate=true;
 const clampx=(v:number)=>Math.max(bounds[0]+2,Math.min(bounds[2]-2,v));const clampz=(v:number)=>Math.max(bounds[1]+2,Math.min(bounds[3]-2,v));
 const debugObj:ReturnType<NpcHandle['debug']>={counts:{ped:0,moto:0,car:0},glb:{car:0,moto:0},actors:[],graph:{ve:vg.nodes.length,pe:pg.nodes.length}};
 (window as unknown as {__npc?:unknown}).__npc=debugObj;
 const nearNodes=(g:G,px:number,pz:number,R:number):number[]=>{const res:number[]=[];const cells=new Set<string>();for(let ix=Math.floor((px-R)/120);ix<=Math.floor((px+R)/120);ix++)for(let iz=Math.floor((pz-R)/120);iz<=Math.floor((pz+R)/120);iz++)cells.add(ix+','+iz);for(let i=0;i<g.nodes.length;i++){const p=g.nodes[i];const k=Math.floor(p.x/120)+','+Math.floor(p.z/120);if(cells.has(k)&&Math.hypot(p.x-px,p.z-pz)<R)res.push(i)}return res};
 const pickNode=(ids:number[],g:G,px:number,pz:number,lo:number,hi:number):number=>{if(!ids.length)return-1;for(let k=0;k<9;k++){const n=ids[(Math.random()*ids.length)|0];const d=Math.hypot(g.nodes[n].x-px,g.nodes[n].z-pz);if(d>=lo&&d<=hi)return n}return ids[(Math.random()*ids.length)|0]};
 const vehNext=(g:G,node:number,prev:number):{n:number;ei:number}|null=>{const ca=g.adj[node].filter(e=>e.n!==prev);if(ca.length)return ca[(Math.random()*ca.length)|0];const back=g.adj[node].find(e=>e.n===prev);return back??null};
 const pedNext=(node:number,prev:number,p:Ped):{n:number;ei:number}|null=>{const out=pg.adj[node];if(!out.length)return null;const rest=out.filter(e=>e.n!==prev);if(!rest.length)return null;const sides:typeof rest=[];const cross:typeof rest=[];const area:typeof rest=[];for(const e of rest){const ty=pg.edges[e.ei].type;if(ty===0)sides.push(e);else if(ty===1)cross.push(e);else area.push(e)}const r=Math.random();if(!p.noCross&&cross.length&&r<.14){p.noCross=4+Math.random()*5;return cross[(Math.random()*cross.length)|0]}if(area.length&&r<.08)return area[(Math.random()*area.length)|0];if(sides.length)return sides[(Math.random()*sides.length)|0];if(cross.length)return cross[(Math.random()*cross.length)|0];return rest[0]};
 const step=(g:G,p:{a:number;b:number;ei:number;t:number;speed:number;x:number;z:number},dt:number,next:(_a:number,_b:number)=>{n:number;ei:number}|null)=>{if(p.ei<0||p.ei>=g.edges.length)return;const e=g.edges[p.ei];const remain=Math.max(0,(1-p.t)*e.len);const mv=p.speed*dt;if(mv<remain||p.speed<.01){p.t+=e.len>0?(p.speed*dt)/e.len:0}else{const nb=p.b,na=p.a;const nx=next(nb,na);if(nx){p.ei=nx.ei;p.a=nb;p.b=nx.n;p.t=0}else{const back=g.adj[nb].find(en=>en.n===na);if(back){p.ei=back.ei;p.a=nb;p.b=na;p.t=0}}}const e2=g.edges[p.ei];if(e2===undefined)return;const pa=g.nodes[p.a],pb=g.nodes[p.b];if(!pa||!pb)return;p.x=pa.x+(pb.x-pa.x)*p.t;p.z=pa.z+(pb.z-pa.z)*p.t};
 const spawnPed=(px:number,pz:number)=>{const ids=nearNodes(pg,px,pz,380);if(!ids.length)return;const n=pickNode(ids,pg,px,pz,20,190);if(n<0)return;const slot=freeSlots.pop();if(slot===undefined)return;const out=pg.adj[n];if(!out.length){freeSlots.push(slot);return}const pr=rng(empty(opts.id)+slot*7919+5);const b=out[(pr()*out.length)|0];if(b.n===n)return;const ei=pg.adj[b.n].find(en=>en.n===n);if(!ei){freeSlots.push(slot);return}const e=pg.edges[ei.ei];const pa=pg.nodes[n],pb=pg.nodes[b.n];const col=PAL[(pr()*PAL.length)|0];pBody.setColorAt(slot,new T.Color(col));pHead.setColorAt(slot,new T.Color(col));const yaw0=Math.atan2(-(pb.x-pa.x),-(pb.z-pa.z));const p:Ped={slot,a:n,b:b.n,ei:ei.ei,t:pr()*.9,x:pa.x+(pb.x-pa.x)*.45,z:pa.z+(pb.z-pa.z)*.45,yaw:yaw0,spyaw:yaw0,lat:0,speed:.4,cap:1.2+pr()*.6,phase:pr()*6,color:0,noCross:0,seed:pr()*1e9>>>0,st:'walk'};dummy.position.set(p.x,height(p.x,p.z)+.45,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.setScalar(1);pBody.setMatrixAt(slot,dummy.matrix);dummy.position.y+=.25;pHead.setMatrixAt(slot,dummy.matrix);pBody.instanceMatrix.needsUpdate=true;pHead.instanceMatrix.needsUpdate=true;pBody.instanceColor!.needsUpdate=true;pHead.instanceColor!.needsUpdate=true;peds.push(p)};
 const spawnVeh=(type:'moto'|'car',px:number,pz:number)=>{const ids=nearNodes(vg,px,pz,380);if(!ids.length)return;const lo=40,hi=type==='car'?300:260;const n=pickNode(ids,vg,px,pz,lo,hi);if(n<0)return;const out=vg.adj[n];if(!out.length)return;const b=out[(Math.random()*out.length)|0];if(b.n===n)return;const bck=vg.adj[b.n].find(en=>en.n===n);if(!bck)return;const ei=bck.ei;const kind=vg.edges[ei].kind;const km=KIND_MAX[kind]??12;const seed=empty(opts.id)+(type==='moto'?31:57)+vehs.length*131+7;const pr=rng(seed);const urls=type==='car'?NPC_CARS:NPC_MOTOS;const u=urls[(seed>>>0)%urls.length];const carC=['#3f5f83','#7a3f3f','#3f7a5f','#8a7a3f','#5f3f7a','#3f7a7a'];const motoC=['#c9402f','#2f5fc9','#c9a02f','#2fc96a'];const pickC=()=>type==='car'?carC[(Math.random()*carC.length)|0]:motoC[(Math.random()*motoC.length)|0];const col=pickC();const m=makeVeh(type,u,col)??spawnMesh(type,col);const e=vg.edges[ei],pa=vg.nodes[n],pb=vg.nodes[b.n];const px0=pa.x+(pb.x-pa.x)*pr(),pz0=pa.z+(pb.z-pa.z)*pr(),hy=height(px0,pz0);const v:Veh={type,a:n,b:b.n,ei,t:pr()*.9,x:px0,z:pz0,yaw:0,spyaw:Math.atan2(-(pb.x-pa.x),-(pb.z-pa.z)),lat:0,yawOff:0,speed:km*.5,cap:Math.max(6,(km*(.75+pr()*.35))+(type==='moto'?3:0)),drift:false,drT:0,drDur:0,nextDrift:3+(pr()*7),life:0,seed,yield:false,st:'ride',u,grp:m.grp,wheels:m.wheels,bodyMat:m.bodyMat,glbMats:m.glbMats};v.grp.position.set(px0,hy,pz0);v.grp.rotation.y=v.spyaw;vehs.push(v)};
 const dropVeh=(v:Veh)=>{v.grp.parent?.remove(v.grp);v.bodyMat?.dispose();for(const m of v.glbMats)m.dispose()};
 const killAll=()=>{for(const p of peds){freeSlots.push(p.slot);hideP(p.slot)}peds=[];for(const v of vehs)dropVeh(v);vehs=[]};
 const respawn=(cx:number,cz:number)=>{killAll();let pedsN=PED_MAX,motoN=MOTO_MAX,carN=CAR_MAX;if(mobile){pedsN=Math.max(5,Math.round(PED_MAX*.5));carN=Math.max(2,CAR_MAX)}for(let i=0;i<pedsN;i++)spawnPed(cx,cz);for(let i=0;i<motoN;i++)spawnVeh('moto',cx,cz);for(let i=0;i<carN;i++)spawnVeh('car',cx,cz);for(let i=0;i<PED_MAX;i++){const p=peds.find(q=>q.slot===i);if(!p)hideP(i)}pBody.instanceMatrix.needsUpdate=true;pHead.instanceMatrix.needsUpdate=true};
 const topup=(cx:number,cz:number)=>{const pT=mobile?10:PED_MAX,mT=mobile?1:MOTO_MAX,cT=mobile?3:CAR_MAX;if(peds.length<pT)spawnPed(cx,cz);if(vehs.filter(v=>v.type==='moto').length<mT)spawnVeh('moto',cx,cz);if(vehs.filter(v=>v.type==='car').length<cT)spawnVeh('car',cx,cz);for(const t of['car','moto'] as NpcType[])if((t==='car'?carLoaded:motoLoaded).length){const off=vehs.find(v=>v.type===t&&!v.glbMats.length&&(v.type==='car'?carCache:motoCache).has(v.u));if(off){dropVeh(off);vehs.splice(vehs.indexOf(off),1);spawnVeh(t as 'car'|'moto',cx,cz)}}};
 let lastTop=0;
 const handle:NpcHandle={
  respawn,
  despawn(){killAll();for(let i=0;i<PED_MAX;i++)hideP(i);pBody.instanceMatrix.needsUpdate=true;pHead.instanceMatrix.needsUpdate=true;debugObj.counts.ped=0;debugObj.counts.moto=0;debugObj.counts.car=0;debugObj.actors.length=0},
  destroy(){killAll();pBody.geometry.dispose();(pBody.material as T.Material).dispose();pHead.geometry.dispose();(pHead.material as T.Material).dispose();scene.remove(pBody,pHead);cBodyG.dispose();cCabG.dispose();wheelG.dispose();mBodyG.dispose();mWheelG.dispose();wheelMat.dispose();bodyGeom.dispose();headGeom.dispose();(window as unknown as {__npc?:unknown}).__npc=null},
  debug(){return debugObj},
  update(dt,px,pz){lastTop-=dt;if(lastTop<=0){lastTop=.5;topup(px,pz)}
   const alive:Veh[]=[];
   for(const v of vehs){v.life+=dt;const dx=px-v.x,dz=pz-v.z;const dist=Math.hypot(dx,dz);let eff=v.cap;v.yield=false;
    const e=vg.edges[v.ei];const pa=vg.nodes[v.a],pb=vg.nodes[v.b];let dix=pb.x-pa.x,diz=pb.z-pa.z;const dl=Math.hypot(dix,diz)||1;dix/=dl;diz/=dl;
    if(dx*dix+dz*diz>0&&dist<8&&v.speed>1){eff=Math.min(eff,Math.max(1,(dist/8)*v.cap));v.yield=true;v.st='yield'}
    for(const o of vehs){if(o===v||!o.grp.parent)continue;const od=Math.hypot(o.x-v.x,o.z-v.z);if((o.x-v.x)*dix+(o.z-v.z)*diz>0&&od<7){eff=Math.min(eff,(od/7)*v.cap)}}
    if(dist<120&&v.speed>4&&v.life>=v.nextDrift){v.drift=true;v.drT=0;v.drDur=.6+((v.seed*2654435761>>>0)%600)/1000;v.nextDrift=v.life+v.drDur+4+(v.seed%70)/10;v.st='drift'}
    if(v.drift){v.drT+=dt;if(v.drT>=v.drDur){v.drift=false;v.st='ride'}else{const u=v.drT/v.drDur,s=Math.sin(Math.PI*u);v.lat=s*(2.0+(v.seed%6)/10);v.yawOff=s*(.18+(v.seed%13)/100)}v.yield=false}
    else{v.lat*=Math.exp(-dt*3.5);v.yawOff*=Math.exp(-dt*3.5);if(v.st==='drift')v.st='ride'}
    if(dist<2.8){const lx=-diz,lz=dix;const off=dx*lx+dz*lz;const need=2.6-Math.abs(off);if(need>0)v.lat+=Math.sign(off||1)*need*Math.min(1,dt*3)}
    v.speed+=(eff-v.speed)*Math.min(1,dt*1.5);if(v.speed<0)v.speed=0;
    step(vg,v,dt,(a,b)=>vehNext(vg,a,b));
    if(dist>430){dropVeh(v);continue}
    const px2=clampx(v.x),pz2=clampz(v.z);const pa2=vg.nodes[v.a],pb2=vg.nodes[v.b];let dix2=pb2.x-pa2.x,diz2=pb2.z-pa2.z;const dl2=Math.hypot(dix2,diz2)||1;dix2/=dl2;diz2/=dl2;
    const yaw=Math.atan2(-dix2,-diz2);let dd=yaw+v.yawOff-v.spyaw;if(dd>Math.PI)dd-=Math.PI*2;if(dd<-Math.PI)dd+=Math.PI*2;v.spyaw+=dd*Math.min(1,dt*6);v.yaw=v.spyaw;
    const lx=-diz2,lz=dix2;v.grp.position.set(px2+lx*v.lat,height(px2,pz2),pz2+lz*v.lat);v.grp.rotation.y=v.yaw;
    for(const w of v.wheels)if(w.userData.glb)w.rotation.x+=(v.speed*dt)/.4;else w.rotation.z+=(v.speed*dt)/.36;
    alive.push(v);
   }
   vehs=alive;
   const aliveP:Ped[]=[];
   for(const p of peds){p.noCross=Math.max(0,p.noCross-dt);p.speed+=(p.cap-p.speed)*Math.min(1,dt*2);
    step(pg,p,dt,(a,b)=>pedNext(a,b,p));
    p.x=clampx(p.x);p.z=clampz(p.z);
    if(Math.hypot(px-p.x,pz-p.z)>430){freeSlots.push(p.slot);hideP(p.slot);continue}
    const e2=pg.edges[p.ei];if(e2===undefined){aliveP.push(p);continue}const pa=pg.nodes[p.a],pb=pg.nodes[p.b];
    const yaw=Math.atan2(-(pb.x-pa.x),-(pb.z-pa.z));let dd=yaw-p.spyaw;if(dd>Math.PI)dd-=Math.PI*2;if(dd<-Math.PI)dd+=Math.PI*2;p.spyaw+=dd*Math.min(1,dt*8);p.yaw=p.spyaw;
    const moving=p.speed>.05;if(moving)p.phase+=p.speed*dt*3.4;const bob=moving?Math.sin(p.phase):0;const hy=height(p.x,p.z);
    dummy.position.set(p.x,hy+.45+bob*.05,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.setScalar(1);pBody.setMatrixAt(p.slot,dummy.matrix);
    dummy.position.y=hy+.7+bob*.07;pHead.setMatrixAt(p.slot,dummy.matrix);
    aliveP.push(p);
   }
   peds=aliveP;
   pBody.instanceMatrix.needsUpdate=true;pHead.instanceMatrix.needsUpdate=true;
   debugObj.counts.ped=peds.length;debugObj.counts.moto=vehs.filter(v=>v.type==='moto').length;debugObj.counts.car=vehs.filter(v=>v.type==='car').length;
   debugObj.glb.car=vehs.filter(v=>v.type==='car'&&v.glbMats.length).length;debugObj.glb.moto=vehs.filter(v=>v.type==='moto'&&v.glbMats.length).length;
   debugObj.actors.length=0;for(const v of vehs)debugObj.actors.push({t:v.type,x:Math.round(v.x*10)/10,z:Math.round(v.z*10)/10,yaw:Math.round(v.yaw*100)/100,s:Math.round(v.speed*10)/10,dr:v.drift?1:0,yl:v.yield?1:0,st:v.st});for(const p of peds)debugObj.actors.push({t:'ped',x:Math.round(p.x*10)/10,z:Math.round(p.z*10)/10,yaw:Math.round(p.yaw*100)/100,s:Math.round(p.speed*10)/10,dr:0,yl:0,st:p.st});
  }
 };
 return handle;
}