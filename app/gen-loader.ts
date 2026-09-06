import {generateTown,genElev,worldHeight} from './gen-town'
import type {TownData} from './town-data'
type Point=[number,number]
export type GenOptions={seed:number;forest:number;field:number;city:number;size?:number}
export type GenMapOptions=GenOptions&{name?:string}
type Chunk={x:number;z:number;data:TownData}

export const CHUNK=1200
export const SPACING=300
export const ELEV_RES=8
export const GRID=CHUNK/SPACING

function hash32(...ns:number[]){
  let h=0x811c9dc5
  for(const n of ns){h^=n|0;h=Math.imul(h,0x01000193)}
  return h>>>0
}
function rand(seed:number,key:number){
  let s=(hash32(seed,key)||1)
  return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)+1)/4294967296}
}

function cityBlocks(cx:number,cz:number){
  const x0=cx*CHUNK,x1=x0+CHUNK,z0=cz*CHUNK,z1=z0+CHUNK
  const buildings:{id:number;p:Point[];h:number;kind:string;knownHeight:boolean}[]=[]
  const bId=(hash32(cx,cz)|0)>>>0
  const keep=Math.max(.25,Math.min(1,Math.exp(-Math.hypot(x0+CHUNK/2,z0+CHUNK/2)*.0005)))
  for(let jx=0;jx<GRID;jx++){
    for(let jz=0;jz<GRID;jz++){
      const r=rand(cx*1000003+cz*97+jx*7+jz*13,17)
      if(r()>keep)continue
      const n=1+Math.floor(r()*3)
      const left=x0+jx*SPACING,back=z0+jz*SPACING
      for(let i=0;i<n;i++){
        const bx=left+20+r()*(SPACING-40)
        const bz=back+20+r()*(SPACING-40)
        const bw=11+r()*15,bh=11+r()*15
        const verts=4+Math.floor(r()*3)
        const pts:Point[]=[]
        const rad=Math.max(6,Math.min(bw,bh)*.5)
        for(let v=0;v<verts;v++){
          const a=v/verts*Math.PI*2+(r()-.5)*.4
          const rr=rad*(.75+r()*.35)
          pts.push([bx+Math.cos(a)*rr,bz+Math.sin(a)*rr])
        }
        const kf=r()
        let kind='house'
        if(kf>.97)kind='apartments'
        else if(kf>.94)kind='retail'
        else if(kf>.9)kind='garages'
        else if(kf>.86)kind='greenhouse'
        buildings.push({id:(bId+(jx*GRID+jz)*7+i*3+1)|0,p:pts,h:3.2+r()*9+(kind==='apartments'?r()*7:0),kind,knownHeight:false})
      }
    }
  }
  return buildings
}

function chunkAreas(seed:number,cx:number,cz:number,spawnX:number,spawnZ:number){
  const x0=cx*CHUNK,x1=x0+CHUNK,z0=cz*CHUNK,z1=z0+CHUNK
  const areas:{p:Point[];kind:string;name:string}[]=[{
    p:[[x0,z0],[x1,z0],[x1,z1],[x0,z1]] as Point[],
    kind:'grass',
    name:''
  }]
  const r=rand(cx*97+cz*1009,seed)
  if(r()<.09){
    const wr=45+r()*80
    const wcx=x0+CHUNK/2+(r()-.5)*CHUNK*.44
    const wcz=z0+CHUNK/2+(r()-.5)*CHUNK*.44
    const cx1c=Math.max(x0+wr+8,Math.min(x1-wr-8,wcx))
    const cz1c=Math.max(z0+wr+8,Math.min(z1-wr-8,wcz))
    if((cx1c-spawnX)**2+(cz1c-spawnZ)**2>110*110){
      const pts:Point[]=[]
      for(let i=0;i<8;i++){
        const a=i/8*Math.PI*2,rr=wr*(.85+r()*.15)
        pts.push([cx1c+Math.cos(a)*rr,cz1c+Math.sin(a)*rr])
      }
      areas.push({p:pts as Point[],kind:'water',name:''})
    }
  }
  if(r()<.38){
    const fr=95+r()*85
    const fcx=Math.max(x0+fr+6,Math.min(x1-fr-6,x0+CHUNK/2+(r()-.5)*CHUNK*.7))
    const fcz=Math.max(z0+fr+6,Math.min(z1-fr-6,z0+CHUNK/2+(r()-.5)*CHUNK*.7))
    const pts:Point[]=[]
    for(let i=0;i<10;i++){
      const a=i/10*Math.PI*2+(r()-.5)*.5,rr=fr*(.75+r()*.25)
      pts.push([fcx+Math.cos(a)*rr,fcz+Math.sin(a)*rr])
    }
    areas.push({p:pts as Point[],kind:'forest',name:''})
  }
  return areas
}

function generateChunkRaw(seed:number,cx:number,cz:number):TownData{
  const x0=cx*CHUNK,x1=x0+CHUNK,z0=cz*CHUNK,z1=z0+CHUNK
  const rId=(hash32(seed,cx*31+cz*73)||1)>>>0
  const roads:{id:number;p:Point[];width:number;kind:string;name:string}[]=[]
  for(let k=0;k<=GRID;k++){
    const wx=x0+k*SPACING
    const main=k%2===0
    roads.push({id:(rId+k*3+1)|0,p:[[wx,z0],[wx,z1]] as Point[],width:main?10:6,kind:main?'unclassified':'residential',name:''})
  }
  for(let k=0;k<=GRID;k++){
    const wz=z0+k*SPACING
    const main=k%2===0
    roads.push({id:(rId+k*7+41)|0,p:[[x0,wz],[x1,wz]] as Point[],width:main?10:6,kind:main?'unclassified':'residential',name:''})
  }
  const spawn={x:x0+CHUNK/2,z:z0+SPACING/2,yaw:Math.PI}
  const elev=genElev(x0,z0,x1,z1,seed,ELEV_RES)
  const {nx,nz,res:elevRes,data:d}=elev
  for(let ix=0;ix<nx;ix++)d[(nz-2)*nx+ix]=worldHeight(x0+ix*elevRes,z1,seed)
  for(let iz=0;iz<nz;iz++)d[iz*nx+(nx-2)]=worldHeight(x1,z0+iz*elevRes,seed)
  d[(nz-2)*nx+(nx-2)]=worldHeight(x1,z1,seed)
  const result:TownData={
    bounds:[x0,z0,x1,z1],
    spawn,
    elev,
    buildings:cityBlocks(cx,cz),
    roads,
    areas:chunkAreas(seed,cx,cz,spawn.x,spawn.z)
  }
  return JSON.parse(JSON.stringify(result))
}

const cache=new Map<string,TownData>()
const CACHE_MAX=96
export function generateChunk(seed:number,cx:number,cz:number):TownData{
  const key=seed+':'+cx+':'+cz
  const hit=cache.get(key)
  if(hit){cache.delete(key);cache.set(key,hit);return hit}
  const d=generateChunkRaw(seed,cx,cz)
  if(cache.size>=CACHE_MAX){
    const first=cache.keys().next().value
    if(first!==undefined)cache.delete(first)
  }
  cache.set(key,d)
  return d
}
export function clearChunkCache(){cache.clear()}

export function chunkKey(cx:number,cz:number){return cx+','+cz}
export function parseChunkKey(key:string){const s=key.split(',');return{x:parseInt(s[0],10),z:parseInt(s[1],10)}}

export function getChunksAround(seed:number,cx:number,cz:number,radius=2):Map<string,Chunk>{
  const out=new Map<string,Chunk>()
  for(let dx=-radius;dx<=radius;dx++){
    for(let dz=-radius;dz<=radius;dz++){
      if(Math.abs(dx)+Math.abs(dz)>radius)continue
      const x=cx+dx,z=cz+dz
      out.set(chunkKey(x,z),{x,z,data:generateChunk(seed,x,z)})
    }
  }
  return out
}

export function makeWorldHeight(seed:number){
  return(x:number,z:number)=>worldHeight(x,z,seed)
}
export{worldHeight}
export{genElev}

function slug(name:string){
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'map'
}

export function generateSaved(o:GenMapOptions):{id:string;data:TownData}{
  const id=o.name?slug(o.name):'gen-'+o.seed
  return{id,data:generateTown(o)}
}

export async function saveMap(id:string,data:TownData):Promise<boolean>{
  if(typeof process==='undefined')return false
  try{
    const fs=await import('node:'+'fs') as unknown as typeof import('node:fs')
    const path=await import('node:'+'path') as unknown as typeof import('node:path')
    const json=JSON.stringify(data)
    const targets=[path.join(process.cwd(),'public','maps',id+'.json')]
    const dist=path.join(process.cwd(),'dist','maps')
    if(fs.existsSync(dist))targets.push(path.join(dist,id+'.json'))
    for(const t of targets)fs.writeFileSync(t,json)
    return true
  }catch{return false}
}

export function loadGenMapData(id:string):Promise<TownData>{
  return fetch('/maps/'+id+'.json').then(r=>{
    if(!r.ok)throw new Error('map could not load')
    return r.json() as Promise<TownData>
  })
}

export async function saveGenerated(o:GenMapOptions):Promise<string|null>{
  const {id,data}=generateSaved(o)
  return(await saveMap(id,data))?id:null
}

export function unloadChunksBeyond(seed:number,cx:number,cz:number,radius:number):number{
  let n=0
  for(const k of[...cache.keys()]){
    if(!k.startsWith(seed+':'))continue
    const s=k.split(':')
    const xc=parseInt(s[1],10),zc=parseInt(s[2],10)
    if(Math.abs(xc-cx)>radius||Math.abs(zc-cz)>radius){cache.delete(k);n++}
  }
  return n
}