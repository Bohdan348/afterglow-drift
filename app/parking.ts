import * as T from 'three';
export type Obstacle={x:number,z:number,hx:number,hz:number};
export function createParking(){
 const group=new T.Group(),obstacles:Obstacle[]=[],textures:T.Texture[]=[];
 const material=(color:string,roughness=.8,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const concrete=material('#b7b6a7'),asphalt=material('#374248',.57),yellow=material('#efcc65'),red=material('#bf3c32'),steel=material('#6e7e85',.35,.75),glass=material('#193c4a',.2,.6),wall=material('#c6c5b9');
 function box(w:number,h:number,d:number,m:T.Material,x:number,y:number,z:number){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;group.add(o);return o}
 function cylinder(r:number,h:number,m:T.Material,x:number,y:number,z:number){const o=new T.Mesh(new T.CylinderGeometry(r,r,h,12),m);o.position.set(x,y,z);o.castShadow=true;group.add(o);return o}
 function solid(w:number,h:number,d:number,m:T.Material,x:number,y:number,z:number){box(w,h,d,m,x,y,z);obstacles.push({x,z,hx:w/2,hz:d/2})}
 function sign(text:string,sub:string,w:number,h:number,x:number,y:number,z:number){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#eeeee4';ctx.fillRect(0,0,1024,256);ctx.textAlign='center';ctx.fillStyle='#db302d';ctx.font='italic 900 150px Arial';ctx.fillText(text,512,157);ctx.fillStyle='#195b85';ctx.font='bold 43px Arial';ctx.fillText(sub,512,219);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:texture,roughness:.5,emissive:'#ffffff',emissiveMap:texture,emissiveIntensity:.18}));p.position.set(x,y,z);group.add(p)}
 box(1100,.2,1100,concrete,0,-.3,0);box(370,.12,380,asphalt,0,-.06,0);
 // A generous empty center links the marked bays into a drift playground.
 for(const z of [-78,-40,25,63,112]){for(let x=-160;x<=160;x+=8){box(.14,.015,14,yellow,x,.018,z);if(x<160)box(8,.015,.14,yellow,x+4,.018,z-7)}}
 for(const x of [-181,181])solid(1.2,.35,376,concrete,x,.12,0);
 solid(362,.35,1.2,concrete,0,.12,186);
 // Warehouse, red canopy, glazed entrances and loading bays.
 solid(210,18,62,wall,0,9,-152);box(214,.7,65,steel,0,18.3,-152);box(212,1.0,.7,red,0,15,-120.6);
 for(let x=-101;x<=101;x+=5)box(.09,13,.12,concrete,x,7.5,-120.85);
 box(74,2,8,red,0,7.4,-117);sign('COSTCO','WHOLESALE',48,12,0,14,-120.3);
 for(const x of [-20,-10,10,20]){box(8,5,.15,glass,x,2.6,-120.3);for(const side of [-1,1])box(.12,5,.2,steel,x+side*4,2.6,-120);box(.12,5,.2,steel,x,2.6,-120)}
 box(214,.2,10,concrete,0,.1,-115);for(let x=-35;x<=35;x+=7){cylinder(.25,1.5,yellow,x,.75,-110);obstacles.push({x,z:-110,hx:.35,hz:.35})}
 for(const x of [-83,-66,66,83])box(12,7,.15,steel,x,3.6,-120.3);
 // Lamp islands stay near the outside lanes, leaving space for long slides.
 for(const x of [-146,146])for(const z of [-65,40,134]){solid(5,.32,12,concrete,x,.1,z);cylinder(.22,13,steel,x,6.5,z);box(5,.25,1,steel,x,13,z);for(const side of [-1,1]){box(1.9,.08,.8,new T.MeshStandardMaterial({color:'#fff0c4',emissive:'#ffd790',emissiveIntensity:4}),x+side*1.4,12.85,z)}obstacles.push({x,z,hx:.4,hz:.4})}
 // Cart returns with metal rails and pitched covers.
 for(const x of [-112,112]){for(const side of [-1,1]){box(.12,1.3,7,steel,x+side*2,.65,83);for(const z of [80,86])cylinder(.08,2.7,steel,x+side*2,1.35,z)}box(4.5,.15,7.8,red,x,2.7,83);obstacles.push({x,z:83,hx:2.4,hz:4})}
 // A handful of parked cars around the perimeter; the central lot remains open.
 for(const x of [-164,-156,-132,124,156,164]){const z=x<0?-75:109;const body=material(x%3?'#426d80':'#b8ae92',.3,.55);solid(3.6,1,6.9,body,x,.9,z);box(2.9,.8,3.4,glass,x,1.7,z+.3);for(const side of [-1,1])for(const dz of [-2.2,2.2]){const wheel=cylinder(.6,.4,material('#171b1d'),x+side*1.8,.6,z+dz);wheel.rotation.z=Math.PI/2}box(2.8,.15,.1,red,x,.9,z+3.5)}
 // Storefront crossing and red curb.
 for(let x=-35;x<35;x+=3)box(1.4,.018,8,concrete,x,.02,-103);
 box(205,.15,.4,red,0,.12,-109.7);
 return{group,obstacles,textures};
}

// Resolve a circle against expanded rectangles, including corner and overlap cases.
export function parkingCollision(x:number,z:number,vx:number,vz:number,obstacles:Obstacle[],radius=2.3){
 let hit=false;
 const reflect=(nx:number,nz:number)=>{const outward=vx*nx+vz*nz;if(outward<0){vx-=nx*outward*1.3;vz-=nz*outward*1.3}hit=true};
 if(x < -178){x=-178;reflect(1,0)}if(x>178){x=178;reflect(-1,0)}if(z < -185){z=-185;reflect(0,1)}if(z>183){z=183;reflect(0,-1)}
 for(const o of obstacles){const left=o.x-o.hx-radius,right=o.x+o.hx+radius,top=o.z-o.hz-radius,bottom=o.z+o.hz+radius;if(x>left&&x<right&&z>top&&z<bottom){const distances=[x-left,right-x,z-top,bottom-z];const side=distances.indexOf(Math.min(...distances));if(side===0){x=left;reflect(-1,0)}else if(side===1){x=right;reflect(1,0)}else if(side===2){z=top;reflect(0,-1)}else{z=bottom;reflect(0,1)}}}
 return{x,z,vx,vz,hit};
}
