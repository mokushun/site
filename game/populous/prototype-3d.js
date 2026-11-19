import * as THREE from 'three';

const root = document.querySelector('#view');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bbdc3);
scene.fog = new THREE.FogExp2(0x9bbdc3, 0.009);
const camera = new THREE.PerspectiveCamera(39, innerWidth / innerHeight, 0.1, 260);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
root.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe4f3ff, 0x59634a, 1.65));
const sun = new THREE.DirectionalLight(0xffe3b5, 3.0);
sun.position.set(-32, 48, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 100 });
sun.shadow.bias = -0.00018;
sun.shadow.normalBias = 0.025;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xb8d7e3, 0.55);
fill.position.set(25, 20, -28);
scene.add(fill);

const world = new THREE.Group();
scene.add(world);
const material = (color, roughness = 1, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const seeded = (x, z) => {
  const n = Math.sin(x * 127.1 + z * 311.7 + 19.19) * 43758.5453123;
  return n - Math.floor(n);
};
const smooth = (a, b, x) => { const t = THREE.MathUtils.clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
const lakeDefs = [{x:-13,z:7,rx:5.2,rz:3.8},{x:-8,z:-12,rx:3.8,rz:2.8},{x:15,z:10,rx:4.1,rz:3.2}];
const riverZ = x => -4.8 + Math.sin(x * 0.105) * 3.3 + Math.sin(x * 0.24) * 0.75;
function lakeDistance(x,z) {
  return Math.min(...lakeDefs.map(l => Math.sqrt(((x-l.x)/l.rx)**2 + ((z-l.z)/l.rz)**2)));
}
function riverDistance(x,z) { return Math.abs(z-riverZ(x)); }
function terrainHeight(x,z) {
  const broad = Math.sin(x*.17+1.2)*.52 + Math.cos(z*.2-.7)*.42 + Math.sin((x+z)*.105)*.3;
  const detail = Math.sin(x*.48+z*.23)*.09 + Math.cos(z*.51-x*.16)*.07;
  const hill = Math.max(0, Math.sin(x*.115+z*.07)*Math.cos(z*.13-x*.06)) * .78;
  const edge = smooth(24, 29, Math.max(Math.abs(x),Math.abs(z)));
  let h = broad + detail + hill - edge*1.15;
  const lake = lakeDistance(x,z);
  if (lake < 1.16) h -= (1-smooth(.78,1.18,lake)) * .9;
  const river = riverDistance(x,z);
  if (river < 1.35) h -= (1-smooth(.55,1.35,river)) * .36;
  return h;
}
function isWater(x,z) { return lakeDistance(x,z)<.94 || (riverDistance(x,z)<.57 && Math.abs(x)<22); }
function onLand(x,z) { return !isWater(x,z) && Math.max(Math.abs(x),Math.abs(z))<22.5; }

// Continuous terrain mesh: the tile-like block surface is replaced with a sculpted landscape.
const divisions = 112, extent = 25, verts = (divisions+1)*(divisions+1);
const positions = new Float32Array(verts*3), colors = new Float32Array(verts*3), indices = [];
const cLow = new THREE.Color(0x8c8a62), cGrass = new THREE.Color(0x729653), cMeadow = new THREE.Color(0x9caf70);
const cHigh = new THREE.Color(0x777d6b), cDirt = new THREE.Color(0x987b59);
for(let iz=0;iz<=divisions;iz++) for(let ix=0;ix<=divisions;ix++) {
  const x=-extent+2*extent*ix/divisions, z=-extent+2*extent*iz/divisions;
  const y=terrainHeight(x,z), k=(iz*(divisions+1)+ix)*3;
  positions[k]=x; positions[k+1]=y; positions[k+2]=z;
  const n=seeded(ix*.31,iz*.31);
  let col = y>.85 ? cHigh.clone().lerp(cLow,.35) : cGrass.clone().lerp(cMeadow,smooth(.1,.85,n*.35+y*.2));
  if (y<-.05) col.lerp(cDirt,.45);
  col.multiplyScalar(.94+n*.1);
  colors[k]=col.r; colors[k+1]=col.g; colors[k+2]=col.b;
}
for(let z=0;z<divisions;z++) for(let x=0;x<divisions;x++) {
  const a=z*(divisions+1)+x,b=a+1,c=a+divisions+1,d=c+1;
  indices.push(a,c,b,b,c,d);
}
const terrainGeo=new THREE.BufferGeometry();
terrainGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
terrainGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));
terrainGeo.setIndex(indices); terrainGeo.computeVertexNormals();
const terrain=new THREE.Mesh(terrainGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));
terrain.receiveShadow=true; terrain.castShadow=false; world.add(terrain);

// Distant ocean and soft shoreline.
const oceanMat=new THREE.MeshPhysicalMaterial({color:0x4f9baa,roughness:.28,metalness:.04,clearcoat:.35,clearcoatRoughness:.4});
const ocean=new THREE.Mesh(new THREE.PlaneGeometry(220,220),oceanMat);
ocean.rotation.x=-Math.PI/2; ocean.position.y=-.68; ocean.receiveShadow=true; scene.add(ocean);
const waterMat=new THREE.MeshPhysicalMaterial({color:0x438fa0,roughness:.22,metalness:.06,transparent:true,opacity:.94,clearcoat:.65});
const waterGroup=new THREE.Group(); world.add(waterGroup);
for(const l of lakeDefs) {
  const shape=new THREE.Shape(); shape.absellipse(0,0,l.rx,l.rz,0,Math.PI*2,false,0);
  const geo=new THREE.ShapeGeometry(shape,48);
  const mesh=new THREE.Mesh(geo,waterMat); mesh.rotation.x=-Math.PI/2; mesh.position.set(l.x,-.03,l.z); waterGroup.add(mesh);
}
const riverPoints=[];
for(let x=-23;x<=23;x+=.5) riverPoints.push(new THREE.Vector3(x,terrainHeight(x,riverZ(x))+.025,riverZ(x)));
const riverCurve=new THREE.CatmullRomCurve3(riverPoints);
const river=new THREE.Mesh(new THREE.TubeGeometry(riverCurve,180,.34,8,false),waterMat);
waterGroup.add(river);

// Forests: varied broadleaf crowns and slender conifers, all instanced for performance.
const trunkGeo=new THREE.CylinderGeometry(.075,.13,.72,7);
const trunkMat=material(0x68472f);
const broadGeo=new THREE.SphereGeometry(.55,9,7);
const pineGeo=new THREE.ConeGeometry(.48,1.55,8);
const broadMats=[0x416b43,0x527c49,0x66884d,0x3d6544].map(c=>material(c));
const pineMats=[0x315b42,0x3d704d,0x496f4b].map(c=>material(c));
const maxTrees=620;
const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,maxTrees);
const broad= broadMats.map(m=>new THREE.InstancedMesh(broadGeo,m,maxTrees));
const pines= pineMats.map(m=>new THREE.InstancedMesh(pineGeo,m,maxTrees));
const broadCounts=broad.map(()=>0), pineCounts=pines.map(()=>0);
const dummy=new THREE.Object3D(); let treeCount=0;
for(let z=-22;z<=22;z+=.72) for(let x=-22;x<=22;x+=.72) {
  if(treeCount>=maxTrees || !onLand(x,z) || Math.hypot(x,z)<6.5) continue;
  const chance=seeded(x*2.1,z*2.1);
  const woodland=(Math.sin(x*.31+z*.13)+Math.cos(z*.29-x*.2)+2)/4;
  if(chance>.64-woodland*.27) {
    const px=x+(seeded(x+2,z)-.5)*.4,pz=z+(seeded(x,z+3)-.5)*.4;
    if(!onLand(px,pz)||Math.hypot(px,pz)<7) continue;
    const y=terrainHeight(px,pz),s=.72+seeded(x+7,z+9)*.78;
    dummy.position.set(px,y+.32*s,pz);dummy.scale.set(s,s,s);dummy.rotation.set(0,seeded(z,x)*6,0);dummy.updateMatrix();trunks.setMatrixAt(treeCount,dummy.matrix);
    const pine=seeded(x+13,z+5)>.56;
    const foliage=pine?pines:broad,counts=pine?pineCounts:broadCounts,mi=Math.floor(seeded(x+5,z+15)*foliage.length),slot=counts[mi]++;
    dummy.position.y += pine ? 0.85*s : 0.9*s;dummy.scale.set(s*(pine ? 0.9 : 1.2),s*(pine ? 1.15 : 1),s*(pine ? 0.9 : 1.1));dummy.updateMatrix();foliage[mi].setMatrixAt(slot,dummy.matrix);
    treeCount++;
  }
}
trunks.count=treeCount; trunks.castShadow=true; trunks.receiveShadow=true;world.add(trunks);
for(let i=0;i<broad.length;i++){broad[i].count=broadCounts[i];broad[i].castShadow=true;broad[i].receiveShadow=true;world.add(broad[i]);}
for(let i=0;i<pines.length;i++){pines[i].count=pineCounts[i];pines[i].castShadow=true;pines[i].receiveShadow=true;world.add(pines[i]);}

// Rocky ridges and scattered boulders.
const rockGeo=new THREE.DodecahedronGeometry(.7,0),rockMat=material(0x858779);
const rocks=new THREE.InstancedMesh(rockGeo,rockMat,95);let rockCount=0;
for(let z=-20;z<=20;z+=2)for(let x=-20;x<=20;x+=2){
  if(rockCount>=95||!onLand(x,z)||Math.hypot(x,z)<8)continue;
  const h=terrainHeight(x,z);
  if(h>.72&&seeded(x+33,z-8)>.48){dummy.position.set(x,h+.18,z);dummy.scale.set(.6+seeded(x,z)*.9,.45+seeded(z,x)*.55,.55+seeded(x+4,z)*.7);dummy.rotation.set(seeded(x,z+4),seeded(z+4,x)*6,seeded(x+3,z)*.3);dummy.updateMatrix();rocks.setMatrixAt(rockCount++,dummy.matrix);}
}
rocks.count=rockCount;rocks.castShadow=true;rocks.receiveShadow=true;world.add(rocks);

import { createVillageArchitecture } from './prototype-3d-buildings.js';
import { createWorldSimulation } from './prototype-3d-simulation.js';
const villageArchitecture = createVillageArchitecture(THREE, world, terrainHeight);
let syncPopulation = () => {};
const uiStatus = (message, stats) => {
  if (message) document.querySelector('#mode').textContent = message;
  if (stats) {
    document.querySelector('#food').textContent = stats.food;
    document.querySelector('#population').textContent = stats.population;
    document.querySelector('#farms').textContent = stats.farmCount;
    document.querySelector('#fertility').textContent = stats.fertility + '%';
    syncPopulation(stats.population);
  }
};
const simulation = createWorldSimulation(THREE, world, terrain, terrainHeight, uiStatus);

// Tiny villagers with simple walking motion.
const people=new THREE.Group();world.add(people);
const clothes=[0xb96b45,0x557a9a,0xd0a94e,0x71865b].map(c=>material(c));
const skin=material(0xe0b58c);
const villagers=[];
const visibleVillagerLimit=100;
for(let i=0;i<visibleVillagerLimit;i++){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.28,3,7),clothes[i%clothes.length]);body.position.y=.27;body.castShadow=true;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.095,9,8),skin);head.position.y=.54;g.add(head);
  // Residents circulate around the settlement in several loose rings.
  const a=i*2.399963, r=2.5+(i%9)*.62, x=i===0?0:Math.cos(a)*r,z=i===0?0:Math.sin(a)*r;
  g.position.set(x,terrainHeight(x,z)+.06,z);g.visible=false;people.add(g);
  villagers.push({g,a,r,speed:.12+seeded(i,8)*.18,phase:i*.8});
}
syncPopulation = population => {
  const visibleCount=Math.min(visibleVillagerLimit,Math.max(0,Math.round(population)));
  villagers.forEach((v,i)=>{v.g.visible=i<visibleCount;});
};
syncPopulation(1);

// Light atmospheric clouds, kept above the playable island.
const clouds=new THREE.Group();scene.add(clouds);
for(let i=0;i<8;i++){
  const cloud=new THREE.Group();
  for(let j=0;j<5;j++){
    const puff=new THREE.Mesh(new THREE.SphereGeometry(1,12,9),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,transparent:true,opacity:.58,depthWrite:false}));
    puff.scale.set(1.8,.38,1.05);puff.position.set((j-2)*1.05,Math.sin(j*1.7)*.12,Math.cos(j)*.25);cloud.add(puff);
  }
  cloud.position.set(-42+i*12,17+(i%3)*2.4,-27+(i%4)*14);cloud.scale.setScalar(.8+(i%3)*.16);clouds.add(cloud);
}

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
document.querySelector('#pause').addEventListener('click',e=>{timeRunning=!timeRunning;e.currentTarget.textContent='時間：'+(timeRunning?'進行':'停止');document.querySelector('#mode').textContent=timeRunning?'観察モード — 村の一日が流れています':'観察モード — 時間を止めています';});

const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(.05,clock.getDelta());
  if(timeRunning){
    villageArchitecture.update(dt);
    simulation.update(dt);
    elapsed+=dt;
    villagers.forEach(v=>{
      if(!v.g.visible)return;
      v.a+=dt*v.speed;
      const x=Math.cos(v.a)*v.r,z=Math.sin(v.a)*v.r;
      v.g.position.set(x,terrainHeight(x,z)+.06+Math.abs(Math.sin(elapsed*5+v.phase))*.035,z);
      v.g.rotation.y=-v.a;
    });
    // Population and settlement counts are now owned by the simulation module.
    const mins=Math.floor(elapsed/3);
    document.querySelector('#clock').textContent='WORLD TIME · '+String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');
  }
  if(autoRotate){yaw+=dt*.055;updateCamera();}
  clouds.position.x=Math.sin(performance.now()*.000018)*2.2;
  waterGroup.position.y=Math.sin(performance.now()*.0008)*.012;
  renderer.render(scene,camera);
}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
