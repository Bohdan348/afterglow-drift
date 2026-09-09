export type WalletVehicle='coupe'|'sedan'|'hatchback'|'wagon'|'liftback'|'suv'|'cuv'|'porsche'|'m8'|'m4'|'mustang'|'bike'|'street'|'cruiser'|'chopper'|'scrambler'|'cafe'|'sportbike'|'sporttourer'|'tourer'|'adventure'|'mx'|'enduro'|'supermoto'|'pitbike'|'scooter'|'maxiscooter';
export type Wallet={cash:number;cars:Record<WalletVehicle,boolean>};
const VEHICLE_IDS:WalletVehicle[]=['coupe','sedan','hatchback','wagon','liftback','suv','cuv','porsche','m8','m4','mustang','bike','street','cruiser','chopper','scrambler','cafe','sportbike','sporttourer','tourer','adventure','mx','enduro','supermoto','pitbike','scooter','maxiscooter'];
export const PRICES:Record<WalletVehicle,number>={coupe:1500,sedan:1000,hatchback:900,wagon:1200,liftback:1100,suv:1700,cuv:1500,porsche:6000,m8:9000,m4:12500,mustang:8500,bike:3500,street:1800,cruiser:2200,chopper:2600,scrambler:2000,cafe:2400,sportbike:3200,sporttourer:3600,tourer:4200,adventure:3800,mx:2900,enduro:2700,supermoto:2500,pitbike:1200,scooter:1400,maxiscooter:2000};
const KEY='afterglow.wallet';
let cache:Wallet|null=null;
function defaults():Wallet{const cars={coupe:true,sedan:true,hatchback:true,wagon:true,liftback:true,suv:true,cuv:true,porsche:true,m8:true,m4:true,mustang:true,bike:true,street:true,cruiser:true,chopper:true,scrambler:true,cafe:true,sportbike:true,sporttourer:true,tourer:true,adventure:true,mx:true,enduro:true,supermoto:true,pitbike:true,scooter:true,maxiscooter:true} as Record<WalletVehicle,boolean>;return{cash:0,cars}}
function load():Wallet{try{const raw=window.localStorage.getItem(KEY);if(!raw)return defaults();const p=JSON.parse(raw)??{};const w=defaults();if(p&&typeof p==='object'){if(typeof p.cash==='number'&&isFinite(p.cash))w.cash=Math.max(0,Math.floor(p.cash));for(const id of VEHICLE_IDS)if(p.cars&&typeof p.cars==='object'&&typeof p.cars[id]==='boolean')w.cars[id]=p.cars[id]}return w}catch{return defaults()}}
function init():Wallet{if(cache===null)cache=typeof window==='undefined'?defaults():load();return cache}
function save(){try{window.localStorage.setItem(KEY,JSON.stringify(cache))}catch{}}
export function getWallet():Wallet{return{...init(),cars:{...init().cars}}}
export function addCash(n:number):number{const c=init();c.cash=Math.max(0,Math.floor((c.cash+Number(n)||0)));save();return c.cash}
export function spendCash(n:number):boolean{const c=init();const cost=Math.max(0,Math.floor(Number(n)||0));if(c.cash<cost)return false;c.cash-=cost;save();return true}
export function ownCar(id:WalletVehicle):boolean{const c=init();if(!VEHICLE_IDS.includes(id))return false;c.cars[id]=true;save();return true}
export function buyCar(id:WalletVehicle,price:number):boolean{const c=init();if(!VEHICLE_IDS.includes(id)||c.cars[id])return false;if(!spendCash(price))return false;c.cars[id]=true;save();return true}
export function isOwned(id:WalletVehicle):boolean{return init().cars[id]===true}
export function resetWallet():Wallet{cache=defaults();save();return{...init(),cars:{...init().cars}}}
if(typeof window!=='undefined')(globalThis as any).__wallet={get:getWallet,getWallet,addCash,spendCash,ownCar,buyCar,isOwned,resetWallet,PRICES};