import * as THREE from 'three';
import { createVillageArchitecture } from './prototype-3d-buildings.js';
import { createWorldSimulation } from './prototype-3d-simulation.js';
import { createTerrain } from './prototype-3d-terrain.js';
import { createWater } from './prototype-3d-water.js';
import { createNature } from './prototype-3d-nature.js';
import { createVillagers } from './prototype-3d-villagers.js';
import { createAtmosphere } from './prototype-3d-atmosphere.js';
import { createMiracle } from './prototype-3d-miracle.js';
import { advanceWorldClock } from './prototype-3d-utils.js';
// Quality preset (GRAPHICS_TASK step 0): ?quality=low|high, default high.
// HIGH enables the extra graphics work; LOW keeps the load at or below the original.
const quality = new URLSearchParams(location.search).get('quality') === 'low' ? 'low' : 'high';
const HIGH = quality === 'high';

const root = document.querySelector('#view');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bbdc3);
scene.fog = new THREE.FogExp2(0xbcd3da, 0.009);
const camera = new THREE.PerspectiveCamera(39, innerWidth / innerHeight, 0.1, 260);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, HIGH ? 1.8 : 1.25));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
root.appendChild(renderer.domElement);

const world = new THREE.Group();
scene.add(world);
// Module map (split on 2026-11-22, behaviour unchanged):
//   prototype-3d-terrain.js     height field, lakes, river, terrain mesh
//   prototype-3d-water.js       ocean, lake surfaces, river ribbon
//   prototype-3d-nature.js      forests, rocks, grass/shrub/flower scatter
//   prototype-3d-villagers.js   villager appearance, jobs and motion
//   prototype-3d-atmosphere.js  sky, sun cycle, clouds, birds, dust
//   prototype-3d-buildings.js   building catalogue (design work goes here)
//   prototype-3d-simulation.js  economy, population, farms and crops
const terrainApi = createTerrain(world, HIGH);
const water = createWater(scene, world, terrainApi, HIGH);
const nature = createNature(world, terrainApi, HIGH);
const atmosphere = createAtmosphere(scene, renderer, terrainApi, HIGH);
const { terrain, terrainHeight, lakeDefs, riverDistance, onLand } = terrainApi;
const villageArchitecture = createVillageArchitecture(THREE, world, terrainHeight);
let syncPopulation = () => {};
let syncActivities = () => {};
let miracleApi = null;
let farmDetailsCache = [];
let selectedFarm = null;
function showFarmInfo(detail) {
  const panel = document.querySelector('#farmInfo');
  if (!detail) { panel.classList.remove('open'); selectedFarm = null; return; }
  selectedFarm = { x: detail.x, z: detail.z };
  document.querySelector('#farmCrop').textContent = '畑 — ' + detail.crop;
  document.querySelector('#farmFert').textContent = detail.fertility + '%';
  document.querySelector('#farmNext').textContent = detail.ticksLeft === null ? '開墾中' : '約' + detail.ticksLeft * 5 + '秒';
  document.querySelector('#farmYield').textContent = '約' + detail.yieldEst;
  panel.classList.add('open');
}
const uiStatus = (message, stats) => {
  if (message) document.querySelector('#mode').textContent = message;
  if (stats) {
    document.querySelector('#food').textContent = stats.food;
    document.querySelector('#wood').textContent = stats.wood;
    document.querySelector('#population').textContent = stats.population;
    document.querySelector('#farms').textContent = stats.farmCount;
    document.querySelector('#fertility').textContent = stats.fertility === '—' ? '—' : stats.fertility + '%';
    const miracleBtn = document.querySelector('#miracle');
    if (miracleBtn) {
      const mActive = miracleApi && miracleApi.isActive();
      miracleBtn.disabled = !mActive && stats.faith < 10;
      miracleBtn.title = miracleBtn.disabled ? '信仰心が10以上必要です' : '';
      miracleBtn.classList.toggle('active', !!mActive);
    }
    document.querySelector('#faith').textContent = stats.faith;
    document.querySelector('#faithBar').style.width = (stats.faithCap ? Math.min(100, stats.faith / stats.faithCap * 100) : 0) + '%';
    farmDetailsCache = stats.farmDetails || [];
    if (selectedFarm) {
      const d = farmDetailsCache.find(f => f.x === selectedFarm.x && f.z === selectedFarm.z);
      if (d) showFarmInfo(d); else showFarmInfo(null);
    }
    syncPopulation(stats.population, stats.births || []);
    syncActivities(stats);
  }
};
const farmEnvironment = (x,z) => {
  const slope = Math.max(
    Math.abs(terrainHeight(x+1,z)-terrainHeight(x-1,z)),
    Math.abs(terrainHeight(x,z+1)-terrainHeight(x,z-1))
  ) / 2;
  const treeClearance = nature.treePositions.reduce((d,p)=>Math.min(d,Math.hypot(p.x-x,p.z-z)),Infinity);
  const rockClearance = nature.rockPositions.reduce((d,p)=>Math.min(d,Math.hypot(p.x-x,p.z-z)),Infinity);
  const lakeClearance = Math.min(...lakeDefs.map(l => Math.max(0,(Math.sqrt(((x-l.x)/l.rx)**2+((z-l.z)/l.rz)**2)-1)*Math.min(l.rx,l.rz))));
  const riverClearance = Math.max(0,riverDistance(x,z)-.57);
  const waterDistance = Math.min(lakeClearance,riverClearance);
  return {land:onLand(x,z),slope,treeClearance,rockClearance,waterDistance};
};
const simulation = createWorldSimulation(THREE, world, terrain, terrainHeight, uiStatus, farmEnvironment, HIGH);
const villagersApi = createVillagers(world, terrainApi, nature.treePositions);
miracleApi = createMiracle(world, terrainHeight, HIGH, {
  canStart: () => simulation.canBless(),
  onRain: (x, z, dt) => simulation.applyBlessedRain(x, z, dt),
  onToggle: (activeNow, reason) => {
    document.querySelector('#mode').textContent = activeNow
      ? '恵みの雨 — 雲を動かして畑を潤そう'
      : reason === 'faith' ? '信仰心が尽きて、雨雲が消えた' : '観察モード — 村の一日が流れています';
  },
});
syncPopulation = villagersApi.syncPopulation;
syncActivities = villagersApi.syncActivities;
// Orbit / pan / zoom camera.
let target=new THREE.Vector3(0,.1,0),yaw=.72,pitch=.72,distance=43,autoRotate=false,timeRunning=false,drag=null,elapsed=0;
function updateCamera(){
  pitch=THREE.MathUtils.clamp(pitch,.2,1.32);distance=THREE.MathUtils.clamp(distance,13,82);
  camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);
  camera.lookAt(target);
}
function home(){target.set(0,.1,0);yaw=.72;pitch=.72;distance=43;updateCamera();}
updateCamera();
renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,button:e.button};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{
  if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
  if(drag.button===2){const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);const forward=new THREE.Vector3().setFromMatrixColumn(camera.matrix,2);target.addScaledVector(right,-dx*.032);target.addScaledVector(forward,dy*.032);}
  else{yaw-=dx*.006;pitch+=dy*.004;}updateCamera();
});
renderer.domElement.addEventListener('pointerup',()=>drag=null);
// Farm picking (GAMEPLAY_TASK step 5): a click (not a drag) on a farm opens
// its info panel; a click elsewhere closes it. While the miracle cloud is
// out, clicks belong to the rain and never touch the panel.
let pickStart = null;
renderer.domElement.addEventListener('pointerdown',e=>{pickStart={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{
  if (!pickStart) return;
  const moved = Math.hypot(e.clientX - pickStart.x, e.clientY - pickStart.y);
  pickStart = null;
  if (moved > 6 || (miracleApi && miracleApi.isActive())) return;
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  const hit = ray.intersectObject(terrain, false)[0];
  if (!hit) { showFarmInfo(null); return; }
  const d = farmDetailsCache.find(f => Math.hypot(f.x - hit.point.x, f.z - hit.point.z) < 1.9);
  showFarmInfo(d || null);
});
renderer.domElement.addEventListener('pointercancel',()=>drag=null);
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('wheel',e=>{distance*=Math.exp(e.deltaY*.001);updateCamera();},{passive:true});
renderer.domElement.addEventListener('dblclick',home);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ if(miracleApi) miracleApi.stop(); showFarmInfo(null); }
  if(e.key.toLowerCase()==='q'){yaw-=Math.PI/2;updateCamera();}
  if(e.key.toLowerCase()==='e'){yaw+=Math.PI/2;updateCamera();}
});
document.querySelector('#home').addEventListener('click',home);
document.querySelector('#miracle').addEventListener('click',()=>{
  if (miracleApi && !miracleApi.toggle()) document.querySelector('#mode').textContent='信仰心が足りません（恵みの雨には10以上必要）';
});
// Pointer ground tracking for the miracle cloud (raycast once per frame in
// animate, only while the cloud is out — camera controls keep the pointer).
const pointerNdc = new THREE.Vector2();
let pointerOnScreen = false;
renderer.domElement.addEventListener('pointermove',e=>{
  pointerNdc.set((e.clientX/innerWidth)*2-1, -(e.clientY/innerHeight)*2+1);
  pointerOnScreen = true;
});
const groundRay = new THREE.Raycaster();
document.querySelector('#rotate').addEventListener('click',e=>{autoRotate=!autoRotate;e.currentTarget.textContent='自動回転：'+(autoRotate?'ON':'OFF');});
const qualityBtn=document.querySelector('#quality');
qualityBtn.textContent='画質：'+quality.toUpperCase();
qualityBtn.addEventListener('click',()=>{
  const url=new URL(location.href);
  url.searchParams.set('quality',HIGH?'low':'high');
  location.href=url.toString();
});
document.querySelector('#pause').addEventListener('click',e=>{timeRunning=!timeRunning;e.currentTarget.textContent='時間：'+(timeRunning?'進行':'停止');document.querySelector('#mode').textContent=timeRunning?'観察モード — 村の一日が流れています':'観察モード — 時間を止めています';});
const clockEl=document.querySelector('#clock');
clockEl.textContent=atmosphere.fmtClock();

const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(.05,clock.getDelta());
  if(timeRunning){
    villageArchitecture.update(dt);
    simulation.update(dt);
    elapsed+=dt;
    advanceWorldClock(dt);
    villagersApi.update(dt, elapsed);
    if (miracleApi && miracleApi.isActive() && pointerOnScreen) {
      groundRay.setFromCamera(pointerNdc, camera);
      const hit = groundRay.intersectObject(terrain, false)[0];
      if (hit) miracleApi.setTarget(hit.point);
    }
    if (miracleApi) miracleApi.update(dt);
    clockEl.textContent=atmosphere.fmtClock();
  }
  if(autoRotate){yaw+=dt*.055;updateCamera();}
  const t=performance.now()*0.001;
  atmosphere.update(t);
  water.update(t);
  renderer.render(scene,camera);
}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
