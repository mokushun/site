// THE LIVING WORLD — split from prototype-3d.js on 2026-11-22 so each part
// can be improved independently.
// Villagers: fixed professions matched to clothing colour, a day/night
// routine (work by day, sleep inside a house at night), population syncing
// and the walking/working motion.
//
// Professions are fixed per villager (2026-11-22, user design):
//   index % 4 == 0  farmer    (orange clothes, straw hat) — works a farm,
//                             or clears new land beside one when farms are
//                             short, or on open ground when there are none
//   index % 4 == 1  lumberjack (blue clothes) — chops at a tree in the forest
//   index % 4 == 2  builder    (yellow clothes) — works around a building
//                             site; waits at the village centre when there
//                             is no site
//   index % 4 == 3  carrier    (green clothes) — hauls logs from the forest
//                             to the building site (or the village centre),
//                             visibly carrying a log on the loaded leg
// At night (19:30-05:30 WORLD TIME) everyone goes home and sleeps inside
// their house (invisible). With no house yet, they stay at the centre.
import * as THREE from 'three';
import { material, seeded, WORLD_MIN_PER_SEC } from './prototype-3d-utils.js';

export function createVillagers(world, T, treePositions){
const { terrainHeight, onLand } = T;
let syncPopulation = () => {};
let syncActivities = () => {};
// Tiny villagers with simple walking motion.
const people=new THREE.Group();world.add(people);
// Subtle woven fabric for clothes (GRAPHICS_TASK step 5): a near-white weave
// map, so the four clothing colours stay as they were.
const fabricTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=128; const ctx=cv.getContext('2d');
  ctx.fillStyle='#f6f3ee'; ctx.fillRect(0,0,128,128);
  for(let y=0;y<128;y+=3){ ctx.fillStyle='rgba(70,58,45,0.22)'; ctx.fillRect(0,y,128,1); }
  for(let x=0;x<128;x+=3){ ctx.fillStyle='rgba(70,58,45,0.16)'; ctx.fillRect(x,0,1,128); }
  ctx.fillStyle='rgba(60,45,32,0.38)'; ctx.fillRect(0,74,128,7); ctx.fillRect(0,86,128,3);
  for(let i=0;i<700;i++){ ctx.fillStyle=`rgba(70,60,50,${Math.random()*.06})`; ctx.fillRect(Math.random()*128,Math.random()*128,1.6,1.6); }
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.SRGBColorSpace; return t; })();
const clothes=[0xb96b45,0x557a9a,0xd0a94e,0x71865b].map(c=>material(c,1,{map:fabricTex}));
const JOB_BY_INDEX=['farm','logging','build','carry']; // matches clothes order
const skin=material(0xe0b58c);
const villagers=[];
const visibleVillagerLimit=100;
for(let i=0;i<visibleVillagerLimit;i++){
  const job=JOB_BY_INDEX[i%4];
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.10,.30,3,7),clothes[i%clothes.length]);body.position.y=.27;body.castShadow=true;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.098,9,8),skin);head.position.y=.56;g.add(head);
  // Appearance follows the fixed profession: farmers wear the straw hat,
  // everyone else gets the dark hair cap.
  if(job==='farm'){
    const hat=new THREE.Group();
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(.175,.175,.02,10),material(0xd9b96a));hat.add(brim);
    const htop=new THREE.Mesh(new THREE.ConeGeometry(.108,.095,10),material(0xcfa856));htop.position.y=.05;htop.castShadow=true;hat.add(htop);
    hat.position.y=.625;g.add(hat);
  }else{
    const hair=new THREE.Mesh(new THREE.SphereGeometry(.102,9,7),material(0x4a3421));
    hair.scale.set(1,.72,1);hair.position.y=.592;g.add(hair);
  }
  const arms=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.13,.39,0);
    const limb=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.22,6),skin);limb.position.y=-.08;limb.rotation.z=side*.18;arm.add(limb);g.add(arm);arms.push(arm);
  }
  const axe=new THREE.Group();
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.34,5),material(0x68472f));handle.position.y=.13;axe.add(handle);
  const blade=new THREE.Mesh(new THREE.BoxGeometry(.15,.11,.035),material(0x929b9a));blade.position.set(.065,.27,0);axe.add(blade);
  axe.position.set(.17,.25,.02);arms[1].add(axe);
  axe.visible = job==='logging';
  // A log the carrier holds across the front on the loaded leg.
  const log=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.55,7),material(0x7a5a38));
  log.rotation.z=Math.PI/2; log.position.set(0,.36,.17); log.castShadow=true; log.visible=false; g.add(log);
  const x=0,z=0;
  g.position.set(x,terrainHeight(x,z)+.06,z);g.visible=false;people.add(g);
  villagers.push({g,body,arms,axe,log,job,speed:.55+seeded(i,8)*.25,phase:i*.8,wait:0,target:null,active:false,inside:false,loaded:false});
}
let activityTargets={farms:[],houses:[],construction:[],forest:{x:17,z:-8}};
let previousVisibleCount=0;
syncPopulation = (population, birthList=[]) => {
  const visibleCount=Math.min(visibleVillagerLimit,Math.max(0,Math.round(population)));
  villagers.forEach((v,i)=>{ v.active=i<visibleCount; v.g.visible=v.active && !v.inside; });
  for(let i=previousVisibleCount;i<visibleCount;i++){
    const newborn=birthList[i-previousVisibleCount];
    if(newborn){
      villagers[i].g.position.set(newborn.x,terrainHeight(newborn.x,newborn.z)+.06,newborn.z+.78);
      villagers[i].target=null;villagers[i].wait=1.5;villagers[i].inside=false;villagers[i].loaded=false;
      villagers[i].g.visible=true;
    }
  }
  previousVisibleCount=visibleCount;
};
syncActivities = stats => {
  activityTargets.farms=stats.farmLocations||[];
  activityTargets.houses=stats.houseLocations||[];
  activityTargets.construction=stats.constructionLocations||[];
  activityTargets.forest=stats.forestLocation||{x:17,z:-8};
};
syncPopulation(1);

// WORLD TIME minutes, same formula as the atmosphere module (08:00 start,
// WORLD_MIN_PER_SEC world minutes). Work 05:30-19:30, sleep otherwise.
const worldMinutes = elapsed => (480 + elapsed*WORLD_MIN_PER_SEC) % 1440;
const DAWN = 5*60+30, DUSK = 19*60+30;

function workSpotFor(v, i){
  const farms=activityTargets.farms, sites=activityTargets.construction;
  if(v.job==='farm'){
    const k=Math.floor(i/4); // this villager's rank among farmers
    if(farms.length && k<farms.length) return { spot: farms[k], anim:'farm' };
    if(farms.length){
      // More farmers than farms: clear new land beside an existing farm.
      const f=farms[k%farms.length];
      const spot={x:f.x+2.4, z:f.z+((k%2)*1.8-.9)};
      return { spot: onLand(spot.x,spot.z)?spot:f, anim:'farm' };
    }
    // No farm at all yet: clear open ground on a ring around the centre.
    const a=k*2.4+.7, spot={x:Math.cos(a)*9.5, z:Math.sin(a)*9.5};
    return { spot: onLand(spot.x,spot.z)?spot:{x:4,z:2}, anim:'farm' };
  }
  if(v.job==='logging'){
    const tree=treePositions && treePositions.length ? treePositions[(i*7)%treePositions.length] : activityTargets.forest;
    return { spot: tree, anim:'logging' };
  }
  if(v.job==='build'){
    if(sites.length) return { spot: sites.find(s=>s.type==='house') || sites[0], anim:'build' };
    return { spot: {x:0,z:0}, anim:null }; // no site: wait at the centre
  }
  return { spot: activityTargets.forest, anim:null }; // carry handled separately
}

function update(dt, elapsed){
  const minutes=worldMinutes(elapsed);
  const night = minutes>=DUSK || minutes<DAWN;
  villagers.forEach((v,i)=>{
    if(!v.active) return;
    const houses=activityTargets.houses;
    const home=houses.length?houses[i%houses.length]:{x:0,z:0};
    let dest, anim=null, atDest=null;
    if(!night && v.inside) v.inside=false; // dawn: come back out of the house
    if(night){
      if(v.inside) return; // asleep indoors
      dest=home; atDest = houses.length ? 'sleep' : 'idle';
      v.loaded=false;
    } else if(v.job==='carry'){
      // Haul loop: forest (load) -> site/centre (unload) -> forest ...
      const drop=activityTargets.construction[0]||{x:0,z:0};
      const forest=(treePositions&&treePositions.length)?treePositions[(i*7)%treePositions.length]:activityTargets.forest;
      dest = v.loaded ? drop : forest;
      atDest = v.loaded ? 'unload' : 'load';
    } else {
      const w=workSpotFor(v,i);
      dest=w.spot; anim=w.anim; atDest='work';
    }
    v.g.visible=!v.inside;
    v.log.visible = v.job==='carry' && v.loaded;
    v.axe.visible = v.job==='logging' && !night;
    const dx=dest.x-v.g.position.x, dz=dest.z-v.g.position.z, dist=Math.hypot(dx,dz);
    if(v.wait>0){
      v.wait=Math.max(0,v.wait-dt);
      if(atDest==='work' && anim){
        v.body.rotation.z=anim==='farm'?.18:anim==='logging'?-.12:0;
        const swing=Math.sin(elapsed*(anim==='logging'?9:anim==='farm'?5:6)+v.phase);
        v.arms[0].rotation.x=anim==='farm'?swing*.75:0;
        v.arms[1].rotation.x=anim==='logging'?Math.max(0,swing)*1.8:anim==='farm'?-swing*.55:swing*.6;
      }
    }else if(dist<.28){
      // Arrived.
      if(atDest==='sleep'){ v.inside=true; v.g.visible=false; return; }
      if(atDest==='load'){ v.wait=2; v.loaded=true; }
      else if(atDest==='unload'){ v.wait=2; v.loaded=false; }
      else if(atDest==='work'){ v.wait=.45; } // brief pauses inside the work loop
      else { v.wait=1; } // idle
      v.body.rotation.z=0;
      if(atDest!=='work') v.arms.forEach(a=>a.rotation.x=0);
    }else{
      const step=Math.min(dist,v.speed*dt);
      v.g.position.x+=dx/dist*step; v.g.position.z+=dz/dist*step;
      v.g.rotation.y=Math.atan2(dx,dz);
      v.body.position.y=.27+Math.abs(Math.sin(elapsed*8+v.phase))*.055;
      v.body.rotation.z=0;
      v.arms[0].rotation.x=Math.sin(elapsed*8+v.phase)*.45; v.arms[1].rotation.x=-v.arms[0].rotation.x;
    }
    v.g.position.y=terrainHeight(v.g.position.x,v.g.position.z)+.06;
  });
}
return { syncPopulation, syncActivities, update };
}
