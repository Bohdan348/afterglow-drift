'use client';
import { useEffect, useRef, useState } from 'react';
import type { createGame, MapId, HUD, VehicleId } from './race';
import { TownMinimap, TownFullMap } from './town-minimap';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getSettings, setSetting, resetSettings, type Settings } from './settings-store';
import { generateSaved, saveMap, type GenOptions } from './gen-loader';
import type { TownData } from './town-data';
const MAP_KEY='afterglow.map';
const GEN_KEY='afterglow.genmaps';
const maps={coast:{title:'Coastline circuit',location:'PACIFIC COAST',description:'Sweeping corners along the coast.',number:'01'},costco:{title:'Costco parking lot',location:'COSTCO WHOLESALE',description:'Wide-open bays. Long, icy slides.',number:'02'},svitlodarsk:{title:'Svitlodarsk',location:'SVITLODARSK · UKRAINE',description:'Tree-lined streets, shops & reservoirs.',number:'03'},wurzburg:{title:'Würzburg',location:'WÜRZBURG · GERMANY',description:'Hilly streets, vineyards & the Main river.',number:'04'}};
const isTown=(map:string)=>map==='svitlodarsk'||map==='wurzburg';
const townTag=(id:MapId)=>id==='svitlodarsk'?'NEW':id==='costco'?'LOT':id==='wurzburg'?'HILLS':'COAST';
const vehicles:[VehicleId,string,string,string][] = [
  ['coupe','Sports Coupe','RWD · Rear-wheel drive · Balanced drift','car'],
  ['porsche','Porsche','Twin-turbo flat-six · Sharper entry & exit','car'],
  ['m8','BMW M8 GTE','Racing GT · High grip · Fast & planted','car'],
  ['bike','BMW S1000RR','Inline-4 · Lean physics · Narrow & fast','bike'],
] as const;
type VehicleMeta=typeof vehicles[number];
type GenMap={id:string;name:string;mode:'saved'|'infinite';seed:number;forest:number;field:number;city:number};
export type GenWorld={mode:'saved'|'infinite';seed:number;id:string;title:string;data?:TownData;params:GenOptions};
type GameApi=ReturnType<typeof createGame>&{selectGenWorld?:(w:GenWorld)=>void};
const PRESETS={default:{forest:.25,field:.4,city:.2},forest:{forest:.72,field:.15,city:.08},plains:{forest:.06,field:.8,city:.14},city:{forest:.08,field:.15,city:.75}} as const;
const GEN_PRESETS:{p:keyof typeof PRESETS;label:string;desc:string}[]
 =[{p:'default',label:'BALANCED',desc:'Woods, fields & city in balance'},{p:'forest',label:'FOREST',desc:'Dense forests, calm hollows'},{p:'plains',label:'PLAINS',desc:'Open fields, sweeping curves'},{p:'city',label:'CITY',desc:'Blocks, towers & tight streets'}];
const loadGenRegistry=():GenMap[]=>{try{const raw=localStorage.getItem(GEN_KEY);if(raw){const a=JSON.parse(raw);if(Array.isArray(a))return a.filter((x):x is GenMap=>!!x&&typeof x.id==='string'&&typeof x.seed==='number'&&(x.mode==='saved'||x.mode==='infinite'))}}catch{}return[]};
const saveGenRegistry=(a:GenMap[])=>{try{localStorage.setItem(GEN_KEY,JSON.stringify(a))}catch{}};
const genMetaF=(g:GenMap,i:number)=>({title:g.name,location:g.mode==='infinite'?'GENERATED · INFINITE':'GENERATED · SAVED',description:g.mode==='infinite'?('Seed '+g.seed+' · Roads & plains stream endlessly around you. Never saved.'):('Seed '+g.seed+' · '+Math.round(g.forest*100)+'% forest, '+Math.round(g.field*100)+'% field, '+Math.round(g.city*100)+'% city.'),number:String(5+i).padStart(2,'0')});
const loadMap=():string=>{try{const raw=localStorage.getItem(MAP_KEY);if(raw){if(raw in maps)return raw;if(loadGenRegistry().some(g=>g.id===raw))return raw}}catch{}return'coast'};

export default function Home(){
 const mount=useRef<HTMLDivElement>(null);const game=useRef<ReturnType<typeof createGame>|null>(null);
 const [ready,setReady]=useState(false),[started,setStarted]=useState(false),[paused,setPaused]=useState(false),[error,setError]=useState('');
 const [map,setMap]=useState<string>(loadMap);const [fullMap,setFullMap]=useState(false);const fullMapRef=useRef(fullMap),startedRef=useRef(false);
 useEffect(()=>{startedRef.current=started},[started]);
 const toggleMap=(open?:boolean)=>{if(!startedRef.current)return;const next=open??!fullMapRef.current;fullMapRef.current=next;setFullMap(next);game.current?.setMapOpen(next)};
 useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.code==='KeyM'){e.preventDefault();toggleMap()}else if(e.code==='Escape'&&fullMapRef.current){e.preventDefault();toggleMap(false)}};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[]);
 const [hud,setHud]=useState<HUD>({speed:0,score:0,combo:0,angle:0,drifting:false,x:0,z:0,yaw:0,mode:'car',hint:'',carX:0,carZ:0,bikeX:0,bikeZ:0,style:'standard'});
 useEffect(()=>{let cancelled=false;void import('./race').then(({createGame})=>{if(cancelled)return;game.current=createGame(mount.current!,setHud,(p:boolean)=>setPaused(p));setReady(true)}).catch(()=>{if(!cancelled)setError('The 3D renderer could not start. Please reload in a browser with WebGL enabled.')});return()=>{cancelled=true;game.current?.dispose()}},[]);
const [settings,setSettingsState]=useState<Settings>(()=>getSettings());
const [genMaps,setGenMaps]=useState<GenMap[]>(()=>loadGenRegistry());
const [genPreset,setGenPreset]=useState<keyof typeof PRESETS>('default');
const [genAdvanced,setGenAdvanced]=useState(false);
const [genForest,setGenForest]=useState<number>(PRESETS.default.forest);
const [genField,setGenField]=useState<number>(PRESETS.default.field);
const [genCity,setGenCity]=useState<number>(PRESETS.default.city);
const [genSeed,setGenSeed]=useState(()=>Math.floor(Math.random()*1e9));
const [genMode,setGenMode]=useState<'saved'|'infinite'>('saved');
const [genName,setGenName]=useState('');
const isGen=(id:string)=>genMaps.some(g=>g.id===id)||id.startsWith('gen-')||id.startsWith('inf-');
const meta=(sel:string)=>{const st=maps[sel as MapId];if(st)return st;const i=genMaps.findIndex(g=>g.id===sel);if(i>=0)return genMetaF(genMaps[i],i);return maps.coast};
const addGenMap=(g:GenMap)=>{const l=[...genMaps.filter(x=>x.id!==g.id),g];setGenMaps(l);saveGenRegistry(l)};
const applyPreset=(p:keyof typeof PRESETS)=>{setGenPreset(p);setGenForest(PRESETS[p].forest);setGenField(PRESETS[p].field);setGenCity(PRESETS[p].city)};
const chooseMap=async(id:string)=>{setReady(false);setError('');setMap(id);try{localStorage.setItem(MAP_KEY,id)}catch{}if(!isGen(id)){try{await game.current?.selectMap(id as MapId)}catch{setError('The town could not load. Please select it again to retry.')}}setReady(true);setScreen(null)};
const createGenMap=async()=>{
  const seed=Math.max(1,Math.floor(genSeed));
  const forest=Math.min(1,Math.max(0,genForest)),field=Math.min(1,Math.max(0,genField)),city=Math.min(1,Math.max(0,genCity));
  const name=(genName||'').trim()||(genMode==='saved'?('Generated Map · '+seed):('Infinite World · '+seed));
  const params:GenOptions={seed,forest,field,city};
  const saved=genMode==='saved'?generateSaved({...params,name}):null;
  const id=saved?saved.id:('inf-'+seed);
  if(saved)void saveMap(saved.id,saved.data);
  addGenMap({id,name,mode:genMode,seed,forest,field,city});
  const world:GenWorld={mode:genMode,seed,id,title:name,params,data:saved?saved.data:undefined};
  (globalThis as {__genplay?:GenWorld}).__genplay=world;
  try{(game.current as GameApi)?.selectGenWorld?.(world)}catch{setError('The generated map could not load.')}
  setMap(id);try{localStorage.setItem(MAP_KEY,id)}catch{}
  setScreen(null);
  game.current?.setStartVehicle(settings.startVehicle);game.current?.mute(settings.muted);game.current?.start();setStarted(true);
};
const menu=()=>{game.current?.menu();setStarted(false);setPaused(false);setScreen(null)};
const startGame=async()=>{if(!ready)return;const g=genMaps.find(x=>x.id===map);if(g){const data=g.mode==='saved'?generateSaved({seed:g.seed,forest:g.forest,field:g.field,city:g.city,name:g.name}).data:undefined;const world:GenWorld={mode:g.mode,seed:g.seed,id:g.id,title:g.name,data,params:{seed:g.seed,forest:g.forest,field:g.field,city:g.city}};try{await (game.current as GameApi)?.selectGenWorld?.(world)}catch{setError('The generated map could not load. Please try again.')}}else{try{await game.current?.selectMap(map as MapId)}catch{setError('The map could not load. Please try again.')}}game.current?.setStartVehicle(settings.startVehicle);game.current?.mute(settings.muted);game.current?.start();setStarted(true);setScreen(null)};
const [splash,setSplash]=useState(true);const [screen,setScreen]=useState<'menu'|'maps'|'cars'|'settings'|'gen'|null>(null);
 useEffect(()=>{const t=setTimeout(()=>setSplash(false),2200);return()=>clearTimeout(t)},[]);
 useEffect(()=>{const h=(e:KeyboardEvent)=>{if(!started&&screen&&e.code==='Escape'){e.preventDefault();setScreen(null)}};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[started,screen]);
 useEffect(()=>{if(ready)game.current?.mute(settings.muted)},[ready]);
 const setVal=<K extends keyof Settings>(k:K,v:Settings[K])=>{setSetting(k,v);setSettingsState(getSettings())};
 const toggleMute=()=>setVal('muted',!settings.muted);
 const menuBtn=(label:string,sub:string,onClick:()=>void)=><button className="menu-btn" onClick={onClick}><span className="menu-btn-label">{label}</span><span className="menu-btn-sub">{sub}</span><span className="menu-btn-arrow">↗</span></button>;
const vehicleById=(id:VehicleId)=>(vehicles as readonly VehicleMeta[]).find(v=>v[0]===id);
const vehicleName=(id:VehicleId)=>vehicleById(id)?.[1]??'Sports Coupe';

 return <main className="game"><div ref={mount} className="viewport"/><div className="vignette"/>

 {splash&&<div className="splash"><div className="splash-inner"><div className="splash-brand">AFTERGLOW</div><div className="splash-sub">DRIFT</div><div className="splash-line"/></div></div>}

 {!splash&&!started&&screen===null&&<div className="menu-bg">{isTown(map)&&<div className="menu-map-bg"><TownFullMap map={map} x={0} z={0} yaw={0} carX={0} carZ={0}/></div>}<div className="menu-content"><div className="menu-left"><div className="eyebrow"><span/>AFTERGLOW DRIFT CLUB</div><h1 className="menu-title">FIND YOUR<br/><em>SLIDE.</em></h1><p className="menu-desc">Choose your playground. Choose your ride. Keep it sideways.</p></div><div className="menu-right">{menuBtn('PLAY','Selected map · '+meta(map).title,startGame)}{menuBtn('CHOOSE MAP',meta(map).title,()=>setScreen('maps'))}{menuBtn('CHOOSE CAR',vehicleName(settings.startVehicle),()=>setScreen('cars'))}{menuBtn('SETTINGS','Sound · Drive style',()=>setScreen('settings'))}</div></div></div>}

 {!splash&&!started&&screen==='maps'&&<div className="overlay"><div className="overlay-head"><span className="eyebrow">CHOOSE MAP</span><button className="overlay-close" onClick={()=>setScreen(null)}>CLOSE <kbd>ESC</kbd></button></div><div className="overlay-body"><RadioGroup className="map-list" value={map} onValueChange={chooseMap} aria-label="Choose a map">{(Object.keys(maps) as MapId[]).map(id=><label className={'map-card '+(map===id?'selected':'')} key={id}><RadioGroupItem value={id} aria-label={maps[id].title}/><span className="map-number">{maps[id].number}</span><span className="map-copy"><b>{maps[id].title}</b><span>{maps[id].description}</span></span><span className="map-tag">{townTag(id)}</span></label>)}{genMaps.map((g,i)=><label className={'map-card '+(map===g.id?'selected':'')} key={g.id}><RadioGroupItem value={g.id} aria-label={g.name}/><span className="map-number">{genMetaF(g,i).number}</span><span className="map-copy"><b>{g.name}</b><span>{genMetaF(g,i).description}</span></span><span className="map-tag">{g.mode==='infinite'?'INF':'GEN'}</span></label>)}</RadioGroup>{isTown(map)&&<p className="town-note">Mapped streets · stylized buildings and shopfronts<br/><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> · <a href={`/maps/${map}.json`} download>Map data (ODbL)</a></p>}<button className="menu-create-map" onClick={()=>setScreen('gen')}>CREATE YOUR OWN MAP <span>OPEN GENERATOR ↗</span></button></div></div>}

{!splash&&!started&&screen==='gen'&&<div className="overlay"><div className="overlay-head"><span className="eyebrow">GENERATE YOUR MAP</span><button className="overlay-close" onClick={()=>setScreen(null)}>CLOSE <kbd>ESC</kbd></button></div><div className="overlay-body gen-body"><div className="gen-presets">{GEN_PRESETS.map(p=><button key={p.p} className={'gen-preset '+(genPreset===p.p?'active':'')} onClick={()=>applyPreset(p.p)}><b>{p.label}</b><span>{p.desc}</span></button>)}</div><div className="gen-collapse"><button className={'gen-toggle '+((genAdvanced)?'open':'')} onClick={()=>setGenAdvanced(!genAdvanced)}>ADVANCED SETTINGS <span>{genAdvanced?'−':'+'}</span></button></div>{genAdvanced&&<div className="gen-advanced">{([['Forest','forest',genForest,setGenForest],['Field','field',genField,setGenField],['City','city',genCity,setGenCity]] as const).map(([label,key,val,setv])=><div className="gen-slider" key={key}><label>{label.toUpperCase()}</label><input type="range" min={0} max={1} step={0.05} value={val} onChange={e=>setv(parseFloat(e.currentTarget.value))} aria-label={label}/><span className="gen-val">{Math.round(val*100)}%</span></div>)}<div className="gen-seed"><label>SEED</label><input type="number" min={1} value={genSeed} onChange={e=>setGenSeed(parseInt(e.currentTarget.value||'1',10))} aria-label="Seed number"/><button className="gen-random" onClick={()=>setGenSeed(Math.floor(Math.random()*1e9))}>RANDOM</button></div></div>}<div className="gen-mode"><button className={'gen-mode-btn '+(genMode==='saved'?'active':'')} onClick={()=>setGenMode('saved')}>SAVE MAP</button><button className={'gen-mode-btn '+(genMode==='infinite'?'active':'')} onClick={()=>setGenMode('infinite')}>INFINITE <small>NO SAVE</small></button></div>{genMode==='saved'&&<div className="gen-name"><label>MAP NAME</label><input value={genName} onChange={e=>setGenName(e.currentTarget.value)} placeholder="e.g. Sunset Coast" aria-label="Map name"/></div>}{genMode==='infinite'&&<p className="gen-warn">This world is not saved. Roads, plains & forests are generated around you endlessly as you drive.</p>}<button className="setting-save gen-create" onClick={()=>void createGenMap()}>GENERATE & PLAY <span>↗</span></button></div></div>}

 {!splash&&!started&&screen==='cars'&&<div className="overlay"><div className="overlay-head"><span className="eyebrow">CHOOSE CAR</span><button className="overlay-close" onClick={()=>setScreen(null)}>CLOSE <kbd>ESC</kbd></button></div><div className="overlay-body"><div className="car-list">{(vehicles as readonly VehicleMeta[]).map(([id,name,desc,type])=><button key={id} className={'car-card '+(settings.startVehicle===id?'selected':'')} onClick={()=>{setVal('startVehicle',id);setScreen(null)}}><span className="car-chip">{type==='bike'?'BIKE':'CAR'}</span><div className="car-info"><b>{name}</b><span>{desc}</span></div>{settings.startVehicle===id&&<div className="car-check">✓</div>}</button>)}<p className="car-note">Selection is saved and used as your starting vehicle.</p></div></div></div>}

 {!splash&&!started&&screen==='settings'&&<div className="overlay"><div className="overlay-head"><span className="eyebrow">SETTINGS</span><button className="overlay-close" onClick={()=>setScreen(null)}>CLOSE <kbd>ESC</kbd></button></div><div className="overlay-body"><div className="settings-grid"><div className="setting-row"><span className="setting-label">Sound</span><span className="setting-val">{settings.muted?'OFF':'ON'}</span><button className="setting-toggle" onClick={toggleMute}>{settings.muted?'TURN ON':'TURN OFF'}</button></div><div className="setting-row"><span className="setting-label">Drive style</span><span className="setting-val">{settings.driveStyle==='drift'?'DRIFT':'STANDARD'}</span><div className="setting-btns"><button className={'setting-btn '+(settings.driveStyle==='standard'?'active':'')} onClick={()=>setVal('driveStyle','standard')}>STANDARD</button><button className={'setting-btn '+(settings.driveStyle==='drift'?'active':'')} onClick={()=>setVal('driveStyle','drift')}>DRIFT</button></div></div><div className="setting-row"><span className="setting-label">Vehicle</span><span className="setting-val">{vehicleName(settings.startVehicle)}</span><button className="setting-link" onClick={()=>setScreen('cars')}>Change →</button></div><div className="setting-row"><span className="setting-label">Map</span><span className="setting-val">{meta(map).title}</span><button className="setting-link" onClick={()=>setScreen('maps')}>Change →</button></div></div><div className="settings-footer"><button className="setting-save" onClick={()=>setScreen(null)}>SAVE & CLOSE</button><button className="setting-reset" onClick={()=>{const s=resetSettings();setSettingsState(s);if(game.current)game.current.mute(s.muted)}}>RESTORE DEFAULTS</button></div><p className="settings-note">Changes are saved automatically to this device and applied on Play.</p></div></div>}

 <header><a className="brand" href="#" onClick={e=>e.preventDefault()}><span className="brand-mark">/ / /</span> AFTERGLOW<span className="brand-sub">DRIFT CLUB</span></a><div className="location"><span className="live-dot"/> {meta(map).location} <span className="divider">/</span> FREE RUN</div><div className="actions">{started&&<button onClick={menu}>MAPS</button>}<button onClick={toggleMute} aria-label={settings.muted?'Enable audio':'Mute audio'}>{settings.muted?'SOUND OFF':'SOUND ON'}</button>{started&&<button onClick={()=>game.current?.pause()}>{paused?'RESUME':'PAUSE'} <kbd>ESC</kbd></button>}</div></header>

 {started&&<>{isTown(map)&&<div className="town-map"><div>{map==='wurzburg'?'WÜRZBURG':'SVITLODARSK'} <span>FOLLOW {hud.mode==='foot'?'YOU':'DRIVE'}</span></div><TownMinimap map={map} x={hud.x} z={hud.z} yaw={hud.yaw} carX={hud.carX} carZ={hud.carZ}/><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors · ODbL</a></div>}<div className="interaction"><span className="travel-mode">{hud.mode==='foot'?'ON FOOT':hud.mode==='bike'?'BMW S1000RR':vehicleName(settings.startVehicle).toUpperCase()}</span><span className="hint-text">{hud.hint}</span>{hud.mode==='foot'&&<small>WASD to walk · Shift to run · Drag to look</small>}</div><div className="score"><span className="eyebrow">SESSION SCORE</span><strong>{Math.floor(hud.score).toLocaleString().padStart(6,'0')}</strong><span className="score-caption">Keep it sideways. Keep it clean.</span></div><div className={'drift '+(hud.drifting?'visible':'')}><span>DRIFTING</span><strong>+{Math.floor(hud.combo)} <small>PTS</small></strong><div>{Math.round(hud.angle)}° SLIP ANGLE</div></div>{paused&&!fullMap&&<div className="pause-overlay"><h2>TAKE A BREATHER.</h2><button className="drive" onClick={()=>game.current?.pause()}>BACK TO DRIVING <span>↗</span></button><button className="change-map" onClick={menu}>CHOOSE ANOTHER MAP ↗</button><p>Esc to resume · R to reset car</p></div>}{fullMap&&isTown(map)&&<div className="full-map-open" role="dialog" aria-modal="true" aria-label={`${meta(map).title} full map`}><div className="full-map-head"><span className="eyebrow">FULL MAP <i>·</i> {meta(map).location}</span><button onClick={()=>toggleMap(false)}>CLOSE <kbd>M</kbd></button></div><TownFullMap map={map} x={hud.x} z={hud.z} yaw={hud.yaw} carX={hud.carX} carZ={hud.carZ}/><p>You (lime) · CAR · © OpenStreetMap contributors, ODbL</p></div>}</>}

 {started&&<footer><div className="course"><div className="course-top"><span className="mini-num">{meta(map).number}</span><div><b>{meta(map).title.toUpperCase()}</b><span>{meta(map).description}</span></div></div><div className="control-row"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> {hud.mode==='foot'?'WALK':'DRIVE'}</span><span><kbd>{hud.mode==='foot'?'SHIFT':'SPACE'}</kbd> {hud.mode==='foot'?'RUN':hud.mode==='bike'?'BRAKE':'HANDBRAKE'}</span><span><kbd>M</kbd> MAP</span><span className="mode-state">MODE {hud.style==='drift'?'DRIFT':'STANDARD'}</span><span><kbd>E</kbd> {hud.mode==='foot'?'ENTER':'EXIT'}</span><span><kbd>G</kbd> {hud.style==='drift'?'STANDARD':'DRIFT'}</span><span><kbd>R</kbd> RESET</span></div></div><div className="speed"><div className="speed-top"><span>{hud.speed<3?'N':Math.min(6,1+Math.floor(hud.speed/35))}</span><b>{hud.mode==='foot'?'ON FOOT':hud.mode==='bike'?'BMW':'RWD'}</b></div><strong>{String(Math.round(hud.speed)).padStart(3,'0')}</strong><span className="units">KM/H</span><div className="rpm"><i style={{width:`${Math.min(100,12+hud.speed%35/35*88)}%`}}/></div></div></footer>}
 <div className="touch-controls">{started&&<button onClick={()=>game.current?.interact()}>E</button>}{[['left','A'],['right','D'],['brake','SPACE'],['go','W']].map(([n,k])=><button key={n} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);if(paused)return;if(!started)startGame();game.current?.key(k,true)}} onPointerUp={()=>game.current?.key(k,false)} onPointerCancel={()=>game.current?.key(k,false)}>{n==='left'?'←':n==='right'?'→':n==='go'?'↑':'BRAKE'}</button>)}</div>
 </main>
}
