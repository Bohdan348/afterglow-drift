export type Settings={muted:boolean;startVehicle:'car'|'bike';driveStyle:'standard'|'drift'};
const DEFAULTS:Settings={muted:false,startVehicle:'car',driveStyle:'standard'};
const KEY='afterglow.settings';
let cache:Settings=typeof window==='undefined'?{...DEFAULTS}:load();
function load():Settings{try{const raw=window.localStorage.getItem(KEY);if(!raw)return{...DEFAULTS};const p=JSON.parse(raw);return{...DEFAULTS,...(p&&typeof p==='object'?p:{})}}catch{return{...DEFAULTS}}}
function save(){try{window.localStorage.setItem(KEY,JSON.stringify(cache))}catch{}}
export function getSettings():Settings{return{...cache}}
export function getSetting<K extends keyof Settings>(k:K):Settings[K]{return cache[k]}
export function setSetting<K extends keyof Settings>(k:K,v:Settings[K]):Settings{cache={...cache,[k]:v};save();return{...cache}}
export function setSettings(p:Partial<Settings>):Settings{cache={...cache,...p};save();return{...cache}}
export function resetSettings():Settings{cache={...DEFAULTS};save();return{...cache}}
