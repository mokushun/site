// THE LIVING WORLD — split from prototype-3d.js on 2026-11-22 so each part
// can be improved independently. Behaviour is unchanged by the split.
// Atmosphere: lights, the procedural sky, the day/night sun cycle, clouds,
// distant birds and drifting dust. update(elapsed, t) is called every frame;
// elapsed freezes when time is stopped, and so does the light.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export function createAtmosphere(scene, renderer, T, HIGH){
const { onLand, terrainHeight } = T;
const hemi=new THREE.HemisphereLight(0xe4f3ff, 0x59634a, 0.85); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe3b5, 3.0);
sun.position.set(-32, 48, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(HIGH ? 4096 : 2048, HIGH ? 4096 : 2048);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 100 });
sun.shadow.bias = -0.00018;
sun.shadow.normalBias = 0.025;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xb8d7e3, 0.55);
fill.position.set(25, 20, -28);
scene.add(fill);

// Procedural sky + image-based lighting (GRAPHICS_TASK step 1).
// The sky is rendered once into a PMREM environment map so that shade sides
// pick up sky colour; the same sky mesh stays in the scene as the backdrop.
const sky = new Sky();
sky.scale.setScalar(200);
sky.material.uniforms.turbidity.value = 6;
sky.material.uniforms.rayleigh.value = 1.8;
sky.material.uniforms.mieCoefficient.value = 0.004;
sky.material.uniforms.mieDirectionalG.value = 0.85;
sky.material.uniforms.sunPosition.value.copy(sun.position).normalize();
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky);
  scene.environment = pmrem.fromScene(envScene, 0, 0.1, 500).texture;
  pmrem.dispose();
}
scene.add(sky);
scene.environmentIntensity = 0.5;

// Light atmospheric clouds, kept above the playable island.
// Step 6: one shared material with a mottled canvas map, so the puffs read as
// soft cloud rather than plain white balls.
const cloudTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=128; const ctx=cv.getContext('2d');
  ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,128,128);
  for(let i=0;i<46;i++){ const x=Math.random()*128,y=Math.random()*128,r=8+Math.random()*22; const g=ctx.createRadialGradient(x,y,1,x,y,r); const dark=Math.random()<.6; g.addColorStop(0,dark?'rgba(168,182,196,0.20)':'rgba(255,255,255,0.25)'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); }
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.SRGBColorSpace; return t; })();
const cloudMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,transparent:true,opacity:.58,depthWrite:false,map:cloudTex});
const clouds=new THREE.Group();scene.add(clouds);
for(let i=0;i<8;i++){
  const cloud=new THREE.Group();
  for(let j=0;j<5;j++){
    const puff=new THREE.Mesh(new THREE.SphereGeometry(1,12,9),cloudMat);
    puff.scale.set(1.8,.38,1.05);puff.position.set((j-2)*1.05,Math.sin(j*1.7)*.12,Math.cos(j)*.25);cloud.add(puff);
  }
  cloud.position.set(-42+i*12,17+(i%3)*2.4,-27+(i%4)*14);cloud.scale.setScalar(.8+(i%3)*.16);clouds.add(cloud);
}
// --- Atmosphere and time (GRAPHICS_TASK step 6) --------------------------
// WORLD TIME starts at 08:00 and advances with elapsed (1 real second = 2
// world minutes; sped up from the original 3 s = 1 min at the user's request
// on 2026-11-22, so a full day takes about 12 real minutes). The sun, sky, fog and
// light levels follow it; when time is stopped, elapsed is frozen and so is
// the light. Night keeps a moonlight floor so the world never goes black.
// Bloom was not added: swapping the render path for an EffectComposer risks
// the frame loop and the look for a marginal gain (task sheet: skip if heavy).
const WORLD_START=8*60;
const worldMinutes=(elapsed)=> (WORLD_START + elapsed*2) % 1440;
const _cA=new THREE.Color(), _cB=new THREE.Color();
const SUN_DAY=new THREE.Color(0xffe3b5), SUN_DUSK=new THREE.Color(0xff8f4d), SUN_NIGHT=new THREE.Color(0x93b8e8);
const FOG_DAY=new THREE.Color(0xbcd3da), FOG_DUSK=new THREE.Color(0xe9b287), FOG_NIGHT=new THREE.Color(0x27354a);
function updateSun(elapsed){
  const a=(worldMinutes(elapsed)-360)/720*Math.PI;      // 06:00 sunrise -> 18:00 sunset
  const elev=Math.sin(a);
  const dayF=THREE.MathUtils.clamp((elev+0.02)/0.30,0,1);
  const duskF=THREE.MathUtils.clamp(1-Math.abs(elev)*2.6,0,1)*(elev>-0.2?1:0);
  const sx=-Math.cos(a)*46, sz=24;
  // The sky follows the true sun (below the horizon at night, so it darkens),
  // while the light itself swings to a moon position so shadows survive.
  sky.material.uniforms.sunPosition.value.set(sx, elev*52, sz).normalize();
  sun.position.set(sx, Math.abs(elev)*34+9, sz);
  sun.color.lerpColors(SUN_NIGHT,SUN_DAY,dayF).lerp(SUN_DUSK,duskF*0.7);
  sun.intensity=0.55+(3.0-0.55)*dayF;
  hemi.intensity=0.34+(0.85-0.34)*dayF;
  fill.intensity=0.16+(0.55-0.16)*dayF;
  scene.fog.color.lerpColors(FOG_NIGHT,FOG_DAY,dayF).lerp(FOG_DUSK,duskF*0.55);
  scene.background.copy(scene.fog.color);
  sky.material.uniforms.rayleigh.value=0.5+1.3*dayF+duskF*1.7;
  sky.material.uniforms.turbidity.value=2+4*dayF+duskF*3;
  renderer.toneMappingExposure=0.84+0.16*dayF;
  scene.environmentIntensity=0.14+0.36*dayF;
}
// Distant birds: dark silhouettes circling far above the island.
const birds=[];
{
  const birdMat=new THREE.MeshBasicMaterial({color:0x33404a,side:THREE.DoubleSide});
  for(let i=0;i<5;i++){
    const b=new THREE.Group();
    const mkWing=side=>{ const pivot=new THREE.Group(); const w=new THREE.Mesh(new THREE.PlaneGeometry(.95,.3),birdMat); w.rotation.x=-Math.PI/2; w.position.x=side*.5; pivot.add(w); b.add(pivot); return pivot; };
    const wl=mkWing(-1), wr=mkWing(1);
    scene.add(b);
    birds.push({g:b,wl,wr,R:52+i*5,h:21+(i%3)*2.6,sp:.014+((i*7)%5)*.0022,ph:i*1.7});
  }
}
// Dust motes drifting over the land in the light.
let dustGeo=null, dustBase=null;
{
  const N=HIGH?240:80, pos=new Float32Array(N*3); dustBase=new Float32Array(N*3); // step 7: dust count follows the preset
  for(let i=0;i<N;i++){
    let x=0,z=0,tries=0;
    do { x=(Math.random()*2-1)*21; z=(Math.random()*2-1)*21; } while(!onLand(x,z) && ++tries<9);
    const y=terrainHeight(x,z)+.4+Math.random()*1.7;
    pos.set([x,y,z],i*3); dustBase.set([x,y,z],i*3);
  }
  dustGeo=new THREE.BufferGeometry();
  dustGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const cv=document.createElement('canvas'); cv.width=cv.height=64; const ctx=cv.getContext('2d');
  const gr=ctx.createRadialGradient(32,32,2,32,32,30); gr.addColorStop(0,'rgba(255,244,200,1)'); gr.addColorStop(1,'rgba(255,244,200,0)');
  ctx.fillStyle=gr; ctx.fillRect(0,0,64,64);
  const dot=new THREE.CanvasTexture(cv);
  const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({size:.16,map:dot,transparent:true,opacity:.30,depthWrite:false,color:0xfff3c4,blending:THREE.AdditiveBlending}));
  scene.add(dust);
}
const clockEl=document.querySelector('#clock');
const fmtClock=(elapsed)=> 'WORLD TIME · '+String(Math.floor(worldMinutes(elapsed)/60)).padStart(2,'0')+':'+String(Math.floor(worldMinutes(elapsed)%60)).padStart(2,'0');
updateSun(0);

function update(elapsed, t){
  updateSun(elapsed);
  for(const b of birds){
    const ang=t*b.sp+b.ph;
    b.g.position.set(Math.cos(ang)*b.R, b.h+Math.sin(t*.3+b.ph)*1.4, Math.sin(ang)*b.R);
    b.g.rotation.y=-ang;
    const flap=Math.sin(t*6+b.ph*3)*.65;
    b.wl.rotation.z=flap; b.wr.rotation.z=-flap;
  }
  if(dustGeo){
    const pa=dustGeo.getAttribute('position');
    for(let i=0;i<pa.count;i++){
      pa.array[i*3]  =dustBase[i*3]  +Math.sin(t*.11+i*1.3)*1.3;
      pa.array[i*3+1]=dustBase[i*3+1]+Math.sin(t*.45+i*2.1)*.3;
      pa.array[i*3+2]=dustBase[i*3+2]+Math.cos(t*.09+i*.7)*1.3;
    }
    pa.needsUpdate=true;
  }
  clouds.position.x=Math.sin(t*.018)*2.2;
}
return { fmtClock, update };
}
