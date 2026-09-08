export type Settings={muted:boolean;startVehicle:'coupe'|'sedan'|'hatchback'|'wagon'|'liftback'|'suv'|'cuv'|'porsche'|'m8'|'m4'|'mustang'|'bike'|'street'|'cruiser'|'chopper'|'scrambler'|'cafe'|'sportbike'|'sporttourer'|'tourer'|'adventure'|'mx'|'enduro'|'supermoto'|'pitbike'|'scooter'|'maxiscooter';driveStyle:'standard'|'drift';touchControls:'auto'|'on'|'off'};
const DEFAULTS:Settings={muted:false,startVehicle:'coupe',driveStyle:'standard',touchControls:'auto'};
const KEY='afterglow.settings';
let cache:Settings|null=null;
const VEHICLE_IDS=new Set(['coupe','sedan','hatchback','wagon','liftback','suv','cuv','porsche','m8','m4','mustang','bike','street','cruiser','chopper','scrambler','cafe','sportbike','sporttourer','tourer','adventure','mx','enduro','supermoto','pitbike','scooter','maxiscooter']);
function load():Settings{try{const raw=window.localStorage.getItem(KEY);if(!raw)return{...DEFAULTS};const p=JSON.parse(raw)??{};const v={...DEFAULTS,...(p&&typeof p==='object'?p:{})};if(!VEHICLE_IDS.has(v.startVehicle))v.startVehicle='coupe';return v}catch{return{...DEFAULTS}}}
function init():Settings{if(cache===null)cache=typeof window==='undefined'?{...DEFAULTS}:load();return cache}
function save(){try{window.localStorage.setItem(KEY,JSON.stringify(cache))}catch{}}
export function getSettings():Settings{return{...init()}}
export function getSetting<K extends keyof Settings>(k:K):Settings[K]{return init()[k]}
export function setSetting<K extends keyof Settings>(k:K,v:Settings[K]):Settings{const c=init();cache={...c,[k]:v};save();return{...cache}}
export function setSettings(p:Partial<Settings>):Settings{const c=init();cache={...c,...p};save();return{...cache}}
export function resetSettings():Settings{cache={...DEFAULTS};save();return{...cache}}
if(typeof window!=='undefined')(globalThis as any).__settings={get:()=>init(),getSettings,getSetting,setSetting,setSettings,resetSettings};
