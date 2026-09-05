import * as T from 'three';
const material=(color:string,metalness=0,roughness=.55)=>new T.MeshStandardMaterial({color,metalness,roughness});
function part(parent:T.Object3D,g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0){const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
function tube(parent:T.Object3D,a:number[],b:number[],radius:number,m:T.Material){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);const mesh=part(parent,new T.CylinderGeometry(radius,radius,delta.length(),10),m);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return mesh}
export function createCharacter(){
 const group=new T.Group(),body=new T.Group();group.add(body);const jacket=material('#263b42'),pants=material('#252b35'),skin=material('#b7886a'),boots=material('#131b23'),accent=material('#d5edb6'),helmet=material('#eceadd',.35,.22),visor=material('#17303f',.65,.13);
 const torso=part(body,new T.CapsuleGeometry(.23,.38,6,14),jacket,0,1.23,0);torso.scale.set(1,.95,.67);
 part(body,new T.CapsuleGeometry(.18,.12,4,12),pants,0,.94,0).rotation.z=Math.PI/2;
 part(body,new T.CylinderGeometry(.085,.09,.13,10),skin,0,1.56,0);
 const head=part(body,new T.SphereGeometry(.205,20,14),helmet,0,1.78,0);head.scale.set(1,1.12,1.08);
 const face=part(body,new T.SphereGeometry(.19,18,10),visor,0,1.81,-.105);face.scale.set(1,.65,.7);
 const stripe=part(body,new T.BoxGeometry(.42,.045,.02),accent,0,1.34,-.166);
 const limbs:{upper:T.Group,lower:T.Group,foot?:T.Mesh}[]=[];
 for(const side of [-1,1]){const upper=new T.Group();upper.position.set(side*.28,1.4,0);body.add(upper);part(upper,new T.CapsuleGeometry(.085,.23,5,10),jacket,0,-.16,0);const lower=new T.Group();lower.position.y=-.32;upper.add(lower);part(lower,new T.CapsuleGeometry(.072,.21,5,10),jacket,0,-.14,0);part(lower,new T.SphereGeometry(.078,10,8),boots,0,-.31,0);limbs.push({upper,lower})}
 for(const side of [-1,1]){const upper=new T.Group();upper.position.set(side*.12,.9,0);body.add(upper);part(upper,new T.CapsuleGeometry(.104,.27,5,10),pants,0,-.19,0);const lower=new T.Group();lower.position.y=-.4;upper.add(lower);part(lower,new T.CapsuleGeometry(.085,.26,5,10),pants,0,-.18,0);const foot=part(lower,new T.CapsuleGeometry(.09,.13,4,10),boots,0,-.37,-.065);foot.rotation.x=Math.PI/2;limbs.push({upper,lower,foot})}
 function pose(mode:'foot'|'car'|'bike',phase:number,moving:number){body.position.y=mode==='foot'?Math.abs(Math.sin(phase*2))*.035*moving:0;body.rotation.x=mode==='bike'?-.22:0;limbs.forEach(l=>{l.upper.rotation.set(0,0,0);l.lower.rotation.x=0});if(mode==='foot'){limbs[0].upper.rotation.x=Math.sin(phase)*.5*moving;limbs[1].upper.rotation.x=-Math.sin(phase)*.5*moving;limbs[2].upper.rotation.x=-Math.sin(phase)*.65*moving;limbs[3].upper.rotation.x=Math.sin(phase)*.65*moving;limbs[2].lower.rotation.x=Math.max(0,Math.sin(phase))*.8*moving;limbs[3].lower.rotation.x=Math.max(0,-Math.sin(phase))*.8*moving;}else{for(let i=0;i<2;i++){limbs[i].upper.rotation.x=.8;limbs[i].lower.rotation.x=.5;limbs[i].upper.rotation.z=(i===0?-1:1)*.14;limbs[i+2].upper.rotation.x=1.15;limbs[i+2].upper.rotation.z=(i===0?-1:1)*(mode==='bike'?.25:.08);limbs[i+2].lower.rotation.x=-1.45;}}}
 return{group,pose};
}
export function createMotorbike(){
 const group=new T.Group(),textures:T.Texture[]=[];const red=new T.MeshPhysicalMaterial({color:'#8d1230',metalness:.6,roughness:.24,clearcoat:1}),cream=material('#e4e5dc',.25,.4),black=material('#171c22'),rubber=material('#11151a',0,.9),silver=material('#abb6bb',.9,.25),rim=material('#e0e5df',.65,.3),pink=material('#f2409c',.3),glass=new T.MeshPhysicalMaterial({color:'#193642',metalness:.2,roughness:.12,transparent:true,opacity:.7,side:T.DoubleSide});
 const wheels:T.Group[]=[];for(const z of [-.99,1.02]){const wheel=new T.Group();wheel.position.set(0,.43,z);group.add(wheel);wheels.push(wheel);const tire=part(wheel,new T.TorusGeometry(.325,.105,14,36),rubber);tire.rotation.y=Math.PI/2;const ring=part(wheel,new T.TorusGeometry(.275,.034,8,32),rim);ring.rotation.y=Math.PI/2;for(let i=0;i<6;i++){const a=i*Math.PI/3;tube(wheel,[0,Math.sin(a)*.08,Math.cos(a)*.08],[0,Math.sin(a)*.27,Math.cos(a)*.27],.021,rim)}const brake=part(wheel,new T.CylinderGeometry(.21,.21,.022,32),silver,z<0?.08:-.08);brake.rotation.z=Math.PI/2;const axle=part(wheel,new T.CylinderGeometry(.06,.06,.32,12),silver);axle.rotation.z=Math.PI/2;for(let j=0;j<12;j++){const a=j*Math.PI/6;const vent=part(wheel,new T.CylinderGeometry(.016,.016,.024,6),black,z<0?.094:-.094,Math.sin(a)*.16,Math.cos(a)*.16);vent.rotation.z=Math.PI/2;}}
 // Twin frame spars, forks, suspension, finned engine and exhaust.
 for(const side of [-1,1]){tube(group,[side*.22,.45,.95],[side*.19,.66,.0],.045,silver);tube(group,[side*.19,.66,0],[side*.17,1.18,-.58],.055,silver);tube(group,[side*.18,.75,.85],[side*.17,1.18,-.58],.043,silver);tube(group,[side*.17,.43,-.99],[side*.17,1.28,-.66],.041,silver);tube(group,[side*.19,.58,.65],[side*.19,.94,.9],.046,silver);const pipe=part(group,new T.CylinderGeometry(.092,.1,.87,20),silver,side*.29,.44,.75);pipe.rotation.x=Math.PI/2;const tip=part(group,new T.CylinderGeometry(.062,.062,.03,16),black,side*.29,.44,1.2);tip.rotation.x=Math.PI/2;}
 const engine=part(group,new T.CapsuleGeometry(.22,.25,6,16),black,0,.59,-.05);engine.rotation.z=Math.PI/2;
 for(let i=0;i<7;i++)part(group,new T.BoxGeometry(.48,.025,.38),silver,0,.66+i*.037,-.2);
 for(const side of [-1,1]){const cover=part(group,new T.CylinderGeometry(.16,.16,.06,20),black,side*.25,.55,.08);cover.rotation.z=Math.PI/2;const frame=part(group,new T.BoxGeometry(.07,.38,.09),silver,side*.25,.54,.3);frame.rotation.x=-.3;}
 // Curved fuel tank, stepped saddle and vintage half-fairing silhouette.
 const tank=part(group,new T.SphereGeometry(1,28,18),red,0,1.07,-.22);tank.scale.set(.32,.25,.51);
 const saddle=part(group,new T.CapsuleGeometry(.18,.62,7,20),black,0,1.05,.53);saddle.rotation.x=Math.PI/2;saddle.scale.set(1.35,1,.55);
 const tail=part(group,new T.SphereGeometry(1,20,12),red,0,1.0,.93);tail.scale.set(.29,.14,.39);
 for(const side of [-1,1]){const panel=part(group,new T.SphereGeometry(1,20,12),cream,side*.22,.86,.54);panel.scale.set(.06,.19,.65);const stripe=part(group,new T.BoxGeometry(.015,.06,1.05),pink,side*.29,.99,.53);stripe.rotation.x=.07;}
 const nose=part(group,new T.SphereGeometry(1,24,16),red,0,1.16,-.8);nose.scale.set(.37,.26,.32);
 const shield=part(group,new T.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI*.5),glass,0,1.28,-.73);shield.scale.set(.3,.37,.23);shield.rotation.x=.35;
 const headlight=part(group,new T.BoxGeometry(.42,.17,.04),new T.MeshStandardMaterial({color:'#ffedb9',emissive:'#ffda91',emissiveIntensity:2.7}),0,1.12,-1.105);
 const belly=part(group,new T.SphereGeometry(1,20,12),cream,0,.35,-.3);belly.scale.set(.27,.12,.5);
 for(const side of [-1,1]){tube(group,[0,1.24,-.61],[side*.35,1.26,-.48],.025,silver);tube(group,[side*.24,1.3,-.63],[side*.43,1.64,-.71],.014,black);const mirror=part(group,new T.SphereGeometry(1,14,8),black,side*.44,1.65,-.72);mirror.scale.set(.12,.07,.035);const signal=part(group,new T.SphereGeometry(.055,12,8),material('#ef9d2c'),side*.4,1.08,-.9);}
 const tailLight=part(group,new T.BoxGeometry(.22,.08,.04),new T.MeshStandardMaterial({color:'#ff3333',emissive:'#ff1515',emissiveIntensity:2}),0,1.04,1.28);
 tube(group,[.14,.52,.2],[.37,.06,.35],.025,black);
 // Text decals echo the supplied GPZ reference without using its photograph as a texture.
 for(const side of [-1,1]){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d')!;ctx.fillStyle='#f4f1e8';ctx.font='italic bold 62px Arial';ctx.fillText('GPZ 500S',14,78);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;textures.push(tx);const decal=part(group,new T.PlaneGeometry(.53,.135),new T.MeshStandardMaterial({map:tx,transparent:true,depthWrite:false}),side*.318,1.11,-.24);decal.rotation.y=side*Math.PI/2;}
 return{group,wheels,textures,tailLight};
}
