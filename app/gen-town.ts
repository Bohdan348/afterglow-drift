import type {TownData} from './town-data'
type Point=[number,number]
type GenOptions={seed:number;forest:number;field:number;city:number;size?:number;flat?:boolean;roadsScale?:number}

function hash(x:number,y:number,s:number){
  const n=Math.sin(x*127.1+y*311.7+s*113.5)*43758.5453
  return n-Math.floor(n)
}

function vnoise(x:number,y:number,s:number){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy
  const ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy)
  const a=hash(ix,iy,s),b=hash(ix+1,iy,s),c=hash(ix,iy+1,s),d=hash(ix+1,iy+1,s)
  return a+(b-a)*ux+(c-a)*uy+(a-b-c+d)*ux*uy
}

function fbm(x:number,y:number,s:number,oct=4){
  let v=0,a=.5,f=1
  for(let i=0;i<oct;i++){v+=a*vnoise(x*f,y*f,s+i*31.7);a*=.5;f*=2}
  return v
}

function rng(seed:number){
  let s=seed|0
  return()=>{s^=s<<13;s^=s>>17;s^=s<<5;return((s>>>0)+1)/4294967296}
}

export function genElev(x0:number,z0:number,x1:number,z1:number,s:number,res:number,flat?:boolean){
  const nx=Math.floor((x1-x0)/res)+1,nz=Math.floor((z1-z0)/res)+1
  const d=new Float32Array(nx*nz)
  const amp=flat?0:4+Math.abs(s)%5
  for(let iz=0;iz<nz;iz++){
    for(let ix=0;ix<nx;ix++){
      const wx=x0+ix*res,wz=z0+iz*res
      d[nz*iz+ix]=amp*(fbm(wx*.0012+17.3,wz*.0012+31.7,s,5)-.5)
    }
  }
  return{o:[x0,z0]as[number,number],res,nx,nz,data:Array.from(d)}
}
export function worldHeight(x:number,z:number,seed:number,flat?:boolean){
  return(flat?0:(4+Math.abs(seed)%5))*(fbm(x*.0012+17.3,z*.0012+31.7,seed,5)-.5)
}

function generateTown(o:GenOptions):TownData{
  const{seed}=o
  let nf=o.forest,nfl=o.field,nc=o.city
  if(nf+nfl+nc<=0){nf=.35;nfl=.45;nc=.2}else{const t=nf+nfl+nc;nf/=t;nfl/=t;nc/=t}

  const sz=o.size??2000
  const bounds=[-sz,-sz,sz,sz] as[number,number,number,number]
  const rand=rng(seed+999)
  const roads:{id:number;p:Point[];width:number;kind:string;name:string}[]=[]
  const r2id=()=>(200000000+((rand()*999999)|0))>>>0

  const pad=sz*.12
  const cityW=sz*2*Math.sqrt(nc),cityH=sz*2*Math.sqrt(nc)
  const cx0=-cityW/2,cx1=cityW/2,cz0=-cityH/2,cz1=cityH/2
  const targetSp=450*Math.sqrt(cityW/2000)/(o.roadsScale??1)
  const mN=Math.max(1,Math.round((cx1-cx0)/targetSp)||1)
  const mM=Math.max(1,Math.round((cz1-cz0)/targetSp)||1)
  const mainSp=(cx1-cx0)/mN,mainSp2=(cz1-cz0)/mM

  for(let i=0;i<=mN;i++){
    const x=cx0+i*mainSp
    roads.push({id:r2id(),p:[[x,bounds[1]-pad],[x,bounds[3]+pad]] as Point[],width:10,kind:'primary',name:''})
  }
  for(let j=0;j<=mM;j++){
    const z=cz0+j*mainSp2
    roads.push({id:r2id(),p:[[bounds[0]-pad,z],[bounds[2]+pad,z]] as Point[],width:10,kind:'primary',name:''})
  }
  for(let j=0;j<mM;j++){
    const rzz=cz0+(j+.5)*mainSp2
    roads.push({id:r2id(),p:[[cx0,rzz],[cx1,rzz]] as Point[],width:6,kind:'residential',name:''})
  }
  for(let i=0;i<mN;i++){
    const rxx=cx0+(i+.5)*mainSp
    roads.push({id:r2id(),p:[[rxx,cz0],[rxx,cz1]] as Point[],width:6,kind:'residential',name:''})
  }
  for(let j=0;j<mM;j++){
    const rz1=cz0+(j+.25)*mainSp2
    const rz2=cz0+(j+.75)*mainSp2
    roads.push({id:r2id(),p:[[cx0,rz1],[cx1,rz1]] as Point[],width:6,kind:'residential',name:''})
    roads.push({id:r2id(),p:[[cx0,rz2],[cx1,rz2]] as Point[],width:6,kind:'residential',name:''})
  }
  for(let i=0;i<mN;i++){
    const rx1=cx0+(i+.25)*mainSp
    const rx2=cx0+(i+.75)*mainSp
    roads.push({id:r2id(),p:[[rx1,cz0],[rx1,cz1]] as Point[],width:6,kind:'residential',name:''})
    roads.push({id:r2id(),p:[[rx2,cz0],[rx2,cz1]] as Point[],width:6,kind:'residential',name:''})
  }

  const buildings:{id:number;p:Point[];h:number;kind:string;knownHeight:boolean}[]=[]
  const bldId=r2id()
  const cm=12

  function isBuildingAt(px:number,pz:number):boolean{
    for(const ob of buildings){
      let inside=false
      for(let i=0,j=ob.p.length-1;i<ob.p.length;j=i++){
        const a=ob.p[i],b=ob.p[j]
        if((a[1]>pz)!==(b[1]>pz)&&px<(b[0]-a[0])*(pz-a[1])/(b[1]-a[1])+a[0])inside=!inside
      }
      if(inside)return true
    }
    return false
  }

  const streetRects:{x1:number;z1:number;x2:number;z2:number}[]=[]
  for(const rd of roads){
    const hw=rd.width/2
    if(Math.abs(rd.p[0][0]-rd.p[1][0])<.5){
      const x=rd.p[0][0]
      const z1=Math.min(rd.p[0][1],rd.p[1][1]),z2=Math.max(rd.p[0][1],rd.p[1][1])
      streetRects.push({x1:x-hw,z1,x2:x+hw,z2})
    }else if(Math.abs(rd.p[0][1]-rd.p[1][1])<.5){
      const z=rd.p[0][1]
      const x1=Math.min(rd.p[0][0],rd.p[1][0]),x2=Math.max(rd.p[0][0],rd.p[1][0])
      streetRects.push({x1,z1:z-hw,x2,z2:z+hw})
    }
  }

  function roadHit(px:number,pz:number):boolean{
    for(const s of streetRects){
      if(px>s.x1-cm&&px<s.x2+cm&&pz>s.z1-cm&&pz<s.z2+cm)return true
    }
    return false
  }

  for(let i=0;i<mN;i++){
    for(let j=0;j<mM;j++){
      const lx=cx0+i*mainSp,rx=cx0+(i+1)*mainSp
      const tz=cz0+j*mainSp2,bz=cz0+(j+1)*mainSp2
      if(rx-lx<cm*2||bz-tz<cm*2)continue
      const innerW=rx-lx-cm*2,innerH=bz-tz-cm*2
      if(innerW<10||innerH<10)continue
      const bScale=Math.max(1,Math.sqrt(o.roadsScale??1))
      const cellW=Math.max(12,Math.floor(innerW/(6*bScale)))
      const cellH=Math.max(12,Math.floor(innerH/(6*bScale)))
      const cols=Math.floor(innerW/cellW),rows=Math.floor(innerH/cellH)
      for(let cy=0;cy<rows;cy++){
        for(let cx=0;cx<cols;cx++){
          if(rand()>.5+.05*(bScale-1))continue
          const bx=lx+cm+cx*cellW+cellW/2
          const bz2=tz+cm+cy*cellH+cellH/2
          let bw=cellW*.55+rand()*cellW*.35,bh=cellH*.55+rand()*cellH*.35
          if(bw>28)bw=20+rand()*10
          if(bh>28)bh=20+rand()*10
          if(bx-bw/2<lx+cm||bx+bw/2>rx-cm)continue
          if(bz2-bh/2<tz+cm||bz2+bh/2>bz-cm)continue
          if(roadHit(bx,bz2))continue
          const n=Math.floor(rand()*4)+4
          const pts:Point[]=[]
          const rad=Math.min(bw,bh)/2
          for(let k=0;k<n;k++){
            const a=(k/n)*Math.PI*2
            const r=rad*(0.7+rand()*.3)
            pts.push([bx+Math.cos(a)*r,bz2+Math.sin(a)*r])
          }
          const kindF=rand()
          let kind='house'
          if(kindF>.96)kind='apartments'
          else if(kindF>.93)kind='retail'
          else if(kindF>.89)kind='garages'
          else if(kindF>.86)kind='ruins'
          else if(kindF>.84)kind='greenhouse'
          buildings.push({
            id:(bldId+buildings.length*7+1)|0,
            p:pts as[number,number][],
            h:3+rand()*10+(kind==='apartments'?rand()*8:0),
            kind,
            knownHeight:false
          })
        }
      }
    }
  }

  for(let bi=0;bi<buildings.length;bi++){
    if(rand()>.45)continue
    const b=buildings[bi]
    const bcx=b.p.reduce((s,p)=>s+p[0],0)/b.p.length
    const bcz=b.p.reduce((s,p)=>s+p[1],0)/b.p.length
    const nr=nearRoad(bcx,bcz)
    if(!nr)continue
    const ddx=nr.x-bcx,ddz=nr.z-bcz,ddist=Math.hypot(ddx,ddz)
    if(ddist<8||ddist>120)continue
    let bestEd=1e9,edPt:Point=[bcx,bcz]
    for(const pt of b.p){
      const pdx=pt[0]-bcx,pdz=pt[1]-bcz,dot=pdx*ddx+pdz*ddz
      if(dot>0){const pd=Math.hypot(pdx,pdz);if(pd<bestEd){bestEd=pd;edPt=pt}}
    }
    const dmX=(edPt[0]+nr.x)/2,dmZ=(edPt[1]+nr.z)/2
    if(dmX<bounds[0]||dmX>bounds[2]||dmZ<bounds[1]||dmZ>bounds[3])continue
    if(isBuildingAt(dmX,dmZ))continue
    roads.push({id:r2id(),p:[edPt,[nr.x,nr.z]] as Point[],width:4,kind:'service',name:''})
  }

  for(const rd of roads){
    const hw=rd.width/2
    if(rd.kind==='service'){
      if(Math.abs(rd.p[0][0]-rd.p[1][0])<.5){
        const x=rd.p[0][0]
        const z1=Math.min(rd.p[0][1],rd.p[1][1]),z2=Math.max(rd.p[0][1],rd.p[1][1])
        streetRects.push({x1:x-hw,z1,x2:x+hw,z2})
      }else if(Math.abs(rd.p[0][1]-rd.p[1][1])<.5){
        const z=rd.p[0][1]
        const x1=Math.min(rd.p[0][0],rd.p[1][0]),x2=Math.max(rd.p[0][0],rd.p[1][0])
        streetRects.push({x1,z1:z-hw,x2,z2:z+hw})
      }
    }
  }

  const plcX=cx0+mainSp/2,plcZ=cz0+mainSp/2,plcR=mainSp*.35
  const plcPts:Point[]=[]
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2,r=plcR*(0.9+rand()*.2)
    plcPts.push([plcX+Math.cos(a)*r,plcZ+Math.sin(a)*r])
  }
  buildings.push({id:(bldId+buildings.length*7+1)|0,p:plcPts as[number,number][],h:1.5,kind:'plaza',knownHeight:false})

  const areas:{p:Point[];kind:string;name:string}[]=[]
  const forestN=Math.max(4,Math.round(nf*14))
  for(let k=0;k<forestN;k++){
    const a=k/forestN*Math.PI*2+rand()*.5
    const d=sz*.5+rand()*sz*.2
    const fcx=Math.cos(a)*d,fcz=Math.sin(a)*d
    const r=sz*.32+rand()*sz*.22
    const pts:Point[]=[]
    for(let i=0;i<10;i++){
      const ba=i/10*Math.PI*2,rr=r*(0.7+rand()*.3)
      pts.push([fcx+Math.cos(ba)*rr,fcz+Math.sin(ba)*rr])
    }
    areas.push({p:pts as[number,number][],kind:'forest',name:''})
  }

  const fldPts:Point[]=[[-sz+10,-sz+10],[sz-10,-sz+10],[sz-10,sz-10],[-sz+10,sz-10]]
  areas.push({p:fldPts as[number,number][],kind:'grass',name:''})

  const wCx=-sz*.5+rand()*sz*.3,wCz=sz*.75+rand()*sz*.1,wR=sz*.08+rand()*sz*.06
  const wp:Point[]=[]
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2,rr=wR*(0.8+rand()*.2)
    wp.push([wCx+Math.cos(a)*rr,wCz+Math.sin(a)*rr])
  }
  areas.push({p:wp as[number,number][],kind:'water',name:''})

  const elev=genElev(bounds[0],bounds[1],bounds[2],bounds[3],seed,8,o.flat)

  function nearRoad(px:number,pz:number):{x:number,z:number,yaw:number}|null{
    let best=1e9,br:{x:number,z:number,yaw:number}|null=null
    for(const rd of roads){
      for(let i=0;i<rd.p.length-1;i++){
        const ax=rd.p[i][0],az=rd.p[i][1],bx=rd.p[i+1][0],bz=rd.p[i+1][1]
        const dx=bx-ax,dz=bz-az,l2=dx*dx+dz*dz
        if(l2<.01)continue
        let t=((px-ax)*dx+(pz-az)*dz)/l2
        t=Math.max(0,Math.min(1,t))
        const cx=ax+t*dx,cz2=az+t*dz
        const dist=(px-cx)**2+(pz-cz2)**2
        if(dist<best){best=dist;br={x:cx,z:cz2,yaw:Math.atan2(dz,dx)}}
      }
    }
    return br
  }

  let bestSp:{x:number;z:number;yaw:number}|null=null
  let bestHv=-1
  for(let si=0;si<5;si++){
    const ispX=cx0+mainSp*.15+rand()*mainSp*.7
    const ispZ=cz0+mainSp2*.15+rand()*mainSp2*.7
    const sp1=nearRoad(ispX,ispZ)
    if(sp1){const hv=hash(sp1.x,sp1.z,seed);if(hv>bestHv){bestHv=hv;bestSp=sp1}}
  }

  const result:TownData={
    bounds,
    spawn:bestSp??{x:0,z:0,yaw:0},
    elev,
    buildings,
    roads,
    areas
  }
  return JSON.parse(JSON.stringify(result))
}

export type{GenOptions}
export{generateTown}
if(typeof window!=='undefined')(window as any).__gen={genElev:genElev as unknown,generateTown,worldHeight}
