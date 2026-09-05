export type TravelMode='foot'|'car'|'bike';
export type VehiclePose={x:number,z:number,yaw:number};
export function nearestVehicle(player:{x:number,z:number},car:VehiclePose,bike:VehiclePose):'car'|'bike'|null{const a=Math.hypot(player.x-car.x,player.z-car.z),b=Math.hypot(player.x-bike.x,player.z-bike.z);return Math.min(a,b)>4?null:a<=b?'car':'bike'}
export function exitCandidates(v:VehiclePose){const rx=Math.cos(v.yaw),rz=-Math.sin(v.yaw),fx=-Math.sin(v.yaw),fz=-Math.cos(v.yaw);return[[v.x+rx*2.8,v.z+rz*2.8],[v.x-rx*2.8,v.z-rz*2.8],[v.x-fx*3.8,v.z-fz*3.8],[v.x+fx*3.8,v.z+fz*3.8]] as [number,number][]}
