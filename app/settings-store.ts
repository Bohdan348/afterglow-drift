export type Settings={muted:boolean;startVehicle:'coupe'|'porsche'|'m8'|'bike';driveStyle:'standard'|'drift'};
const DEFAULTS:Settings={muted:false,startVehicle:'coupe',driveStyle:'standard'};
const KEY='afterglow.settings';
let cache:Settings|null=null;
const VEHICLE_IDS=new Set(['coupe','porsche','m8','bike']);
function load():Settings{try{const raw=window.localStorage.getItem(KEY);if(!raw)return{...DEFAULTS};const p=JSON.parse(raw)??{};const v={...DEFAULTS,...(p&&typeof p==='object'?p:{})};if(!VEHICLE_IDS.has(v.startVehicle))v.startVehicle='coupe';return v}catch{return{...DEFAULTS}}}
function init():Settings{if(cache===null)cache=typeof window==='undefined'?{...DEFAULTS}:load();return cache}
function save(){try{window.localStorage.setItem(KEY,JSON.stringify(cache))}catch{}}
export function getSettings():Settings{return{...init()}}
export function getSetting<K extends keyof Settings>(k:K):Settings[K]{return init()[k]}
export function setSetting<K extends keyof Settings>(k:K,v:Settings[K]):Settings{const c=init();cache={...c,[k]:v};save();return{...cache}}
export function setSettings(p:Partial<Settings>):Settings{const c=init();cache={...c,...p};save();return{...cache}}
export function resetSettings():Settings{cache={...DEFAULTS};save();return{...cache}}
if(typeof window!=='undefined')(globalThis as any).__settings={get:()=>init(),getSettings,getSetting,setSetting,setSettings,resetSettings};
