// THE LIVING WORLD — split from prototype-3d.js on 2026-11-22 so each part
// can be improved independently. Behaviour is unchanged by the split.
// Villagers: appearance (clothes, hats, hair — individuality work belongs
// here), population syncing, job assignment and the walking/working motion.
import * as THREE from 'three';
import { material, seeded } from './prototype-3d-utils.js';

export function createVillagers(world, terrainHeight){
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
const skin=material(0xe0b58c);
const villagers=[];
const visibleVillagerLimit=100;
for(let i=0;i<visibleVillagerLimit;i++){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.10,.30,3,7),clothes[i%clothes.length]);body.position.y=.27;body.castShadow=true;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.098,9,8),skin);head.position.y=.56;g.add(head);
  // Visible individuality (step 5, strengthened): even-numbered villagers
  // wear a straw hat, odd ones get a dark hair cap.
  if(i%2===0){
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
  const x=0,z=0;
  g.position.set(x,terrainHeight(x,z)+.06,z);g.visible=false;people.add(g);
  villagers.push({g,body,arms,axe,speed:.55+seeded(i,8)*.25,phase:i*.8,routeStep:0,wait:0,target:null,task:'idle'});
}
let activityTargets={farms:[],houses:[],construction:[]};
let previousVisibleCount=0;
syncPopulation = (population, birthList=[]) => {
  const visibleCount=Math.min(visibleVillagerLimit,Math.max(0,Math.round(population)));
  villagers.forEach((v,i)=>{v.g.visible=i<visibleCount;});
  for(let i=previousVisibleCount;i<visibleCount;i++){
    const newborn=birthList[i-previousVisibleCount];
    if(newborn){
      villagers[i].g.position.set(newborn.x,terrainHeight(newborn.x,newborn.z)+.06,newborn.z+.78);
      villagers[i].target=null;villagers[i].routeStep=0;villagers[i].wait=1.5;
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
function update(dt, elapsed){
    villagers.forEach((v,i)=>{
      if(!v.g.visible)return;
      // Assign visible jobs: farming, logging, building, and carrying.
      const home=activityTargets.houses.length?activityTargets.houses[i%activityTargets.houses.length]:{x:0,z:0};
      let workTarget,job;
      if(i%4===0){workTarget=activityTargets.farms[i%Math.max(1,activityTargets.farms.length)]||{x:4,z:2};job='farm';}
      else if(i%4===1){workTarget=activityTargets.forest;job='logging';}
      else if(i%4===2){workTarget=activityTargets.construction[0]||activityTargets.farms[0]||{x:3,z:-2};job='build';}
      else{workTarget=activityTargets.construction[0]||activityTargets.farms[0]||activityTargets.forest;job='carry';}
      const route=[home,workTarget];
      if(!v.target){v.target=route[v.routeStep%2];}
      const dx=v.target.x-v.g.position.x,dz=v.target.z-v.g.position.z,dist=Math.hypot(dx,dz);
      if(v.wait>0){
        v.wait=Math.max(0,v.wait-dt);
        v.body.rotation.z=job==='farm'?.18:job==='logging'?-.12:0;
        const swing=Math.sin(elapsed*(job==='logging'?9:job==='farm'?5:6)+v.phase);
        v.arms[0].rotation.x=job==='farm'?swing*.75:0;
        v.arms[1].rotation.x=job==='logging'?Math.max(0,swing)*1.8:job==='farm'?-swing*.55:job==='build'?swing*.6:0;
        v.axe.visible=job==='logging';
      }else if(dist<.28){
        v.wait=v.routeStep%2===0?1.0:3.5;
        v.routeStep=(v.routeStep+1)%2;
        v.target=route[v.routeStep];
        v.body.rotation.z=0;v.arms.forEach(a=>a.rotation.x=0);
      }else{
        const step=Math.min(dist,v.speed*dt);
        v.g.position.x+=dx/dist*step;v.g.position.z+=dz/dist*step;
        v.g.rotation.y=Math.atan2(dx,dz);
        v.body.position.y=.27+Math.abs(Math.sin(elapsed*8+v.phase))*.055;
        v.body.rotation.z=0;v.arms[0].rotation.x=Math.sin(elapsed*8+v.phase)*.45;v.arms[1].rotation.x=-v.arms[0].rotation.x;v.axe.visible=job==='logging';
      }
      v.g.position.y=terrainHeight(v.g.position.x,v.g.position.z)+.06;
    });
}
return { syncPopulation, syncActivities, update };
}
