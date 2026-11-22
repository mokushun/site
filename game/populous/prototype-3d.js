import * as THREE from 'three';
import { createVillageArchitecture } from './prototype-3d-buildings.js';
import { createWorldSimulation } from './prototype-3d-simulation.js';
import { createTerrain } from './prototype-3d-terrain.js';
import { createWater } from './prototype-3d-water.js';
import { createNature } from './prototype-3d-nature.js';
import { createVillagers } from './prototype-3d-villagers.js';
import { createAtmosphere } from './prototype-3d-atmosphere.js';
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
const uiStatus = (message, stats) => {
  if (message) document.querySelector('#mode').textContent = message;
  if (stats) {
    document.querySelector('#food').textContent = stats.food;
    document.querySelector('#wood').textContent = stats.wood;
    document.querySelector('#population').textContent = stats.population;
    document.querySelector('#farms').textContent = stats.farmCount;
    document.querySelector('#fertility').textContent = stats.fertility + '%';
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
const simulation = createWorldSimulation(THREE, world, terrain, terrainHeight, uiStatus, farmEnvironment);
const villagersApi = createVillagers(world, terrainApi, nature.treePositions);
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
renderer.domElement.addEventListener('pointercancel',()=>drag=null);
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('wheel',e=>{distance*=Math.exp(e.deltaY*.001);updateCamera();},{passive:true});
renderer.domElement.addEventListener('dblclick',home);
document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='q'){yaw-=Math.PI/2;updateCamera();}if(e.key.toLowerCase()==='e'){yaw+=Math.PI/2;updateCamera();}});
document.querySelector('#home').addEventListener('click',home);
document.querySelector('#fertilityTool').addEventListener('click',()=>simulation.setMode('fertility'));
document.querySelector('#rain').addEventListener('click',()=>simulation.startRain());
renderer.domElement.addEventListener('click',e=>simulation.handleClick(e,camera,renderer.domElement));
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
clockEl.textContent=atmosphere.fmtClock(0);

const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(.05,clock.getDelta());
  if(timeRunning){
    villageArchitecture.update(dt);
    simulation.update(dt);
    elapsed+=dt;
    villagersApi.update(dt, elapsed);
    clockEl.textContent=atmosphere.fmtClock(elapsed);
  }
  if(autoRotate){yaw+=dt*.055;updateCamera();}
  const t=performance.now()*0.001;
  atmosphere.update(elapsed, t);
  water.update(t);
  renderer.render(scene,camera);
}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
