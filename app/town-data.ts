export type Point=[number,number];
export type TownData={bounds:number[],spawn:{x:number,z:number,yaw:number},buildings:{id:number,p:Point[],h:number,kind:string,knownHeight:boolean}[],roads:{id:number,p:Point[],width:number,kind:string,name:string}[],areas:{p:Point[],kind:string,name:string}[]};
let cached:Promise<TownData>|null=null;
export function loadTownData(){return cached??=(fetch('/maps/svitlodarsk.json').then(r=>{if(!r.ok)throw new Error('Town data could not load');return r.json() as Promise<TownData>}).catch(e=>{cached=null;throw e}));}
