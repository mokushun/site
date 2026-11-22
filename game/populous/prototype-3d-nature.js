// THE LIVING WORLD — split from prototype-3d.js on 2026-11-22 so each part
// can be improved independently. Behaviour is unchanged by the split.
// Nature: forests (broadleaf + pine, instanced), rocks, and the ground
// detail scatter (grass tufts, shrubs, flowers). treePositions and
// rockPositions are read by the simulation's farm placement, so their
// placement rules must stay in step with prototype-3d-simulation.js.
import * as THREE from 'three';
import { material, seeded, timeU } from './prototype-3d-utils.js';

export function createNature(world, T, HIGH){
const { terrainHeight, onLand } = T;
// Forests: varied broadleaf crowns and slender conifers, all instanced for performance.
const trunkGeo=new THREE.CylinderGeometry(.075,.13,.72,7);
const trunkMat=material(0x68472f);
// Geometry helpers (GRAPHICS_TASK step 4): merge indexed parts with a matrix
// each, and displace vertices with the position hash so shared corners move
// together and no cracks open.
const m4=(x,y,z,sx=1,sy=1,sz=1,ry=0)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry,0)),new THREE.Vector3(sx,sy,sz));
function mergeParts(parts){
  let vTotal=0,iTotal=0;
  for(const p of parts){ vTotal+=p.geo.getAttribute('position').count; iTotal+=p.geo.getIndex().count; }
  const pos=new Float32Array(vTotal*3), nor=new Float32Array(vTotal*3), uv=new Float32Array(vTotal*2);
  const idx=new Uint32Array(iTotal);
  let vo=0, io=0;
  const nm=new THREE.Matrix3(), v=new THREE.Vector3(), n=new THREE.Vector3();
  for(const p of parts){
    const g=p.geo, pa=g.getAttribute('position'), na=g.getAttribute('normal'), ua=g.getAttribute('uv'), ia=g.getIndex();
    nm.getNormalMatrix(p.matrix);
    for(let i=0;i<pa.count;i++){
      v.fromBufferAttribute(pa,i).applyMatrix4(p.matrix);
      pos[(vo+i)*3]=v.x; pos[(vo+i)*3+1]=v.y; pos[(vo+i)*3+2]=v.z;
      n.fromBufferAttribute(na,i).applyMatrix3(nm).normalize();
      nor[(vo+i)*3]=n.x; nor[(vo+i)*3+1]=n.y; nor[(vo+i)*3+2]=n.z;
      if(ua){ uv[(vo+i)*2]=ua.getX(i); uv[(vo+i)*2+1]=ua.getY(i); }
    }
    for(let i=0;i<ia.count;i++) idx[io+i]=ia.getX(i)+vo;
    vo+=pa.count; io+=ia.count;
  }
  const out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.BufferAttribute(pos,3));
  out.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  out.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  out.setIndex(new THREE.BufferAttribute(idx,1));
  return out;
}
function displace(geo, amp, freq){
  const pa=geo.getAttribute('position'), na=geo.getAttribute('normal');
  const v=new THREE.Vector3(), n=new THREE.Vector3();
  for(let i=0;i<pa.count;i++){
    v.fromBufferAttribute(pa,i); n.fromBufferAttribute(na,i);
    const h=seeded(Math.round(v.x*freq)*3.7+Math.round(v.y*freq)*1.3, Math.round(v.z*freq)*2.9)-.5;
    v.addScaledVector(n, h*amp);
    pa.setXYZ(i,v.x,v.y,v.z);
  }
  geo.computeVertexNormals();
  return geo;
}
// Broadleaf crown: 4 noise-displaced spheres merged. Pine: 3 stacked cones.
// One instanced mesh per kind, with per-instance colours from the old palette.
const broadGeo=displace(mergeParts([
  {geo:new THREE.SphereGeometry(.5,10,8), matrix:m4(0,.52,0)},
  {geo:new THREE.SphereGeometry(.36,9,7), matrix:m4(.3,.78,.12)},
  {geo:new THREE.SphereGeometry(.33,9,7), matrix:m4(-.32,.72,-.1)},
  {geo:new THREE.SphereGeometry(.3,8,6), matrix:m4(.02,.95,-.22)},
]),.07,6.5);
const pineGeo=displace(mergeParts([
  {geo:new THREE.ConeGeometry(.5,.95,8), matrix:m4(0,.48,0)},
  {geo:new THREE.ConeGeometry(.38,.85,8), matrix:m4(0,1.05,0)},
  {geo:new THREE.ConeGeometry(.24,.7,8), matrix:m4(0,1.55,0)},
]),.035,7);
const broadMat=material(0xffffff), pineMat=material(0xffffff);
const broadPal=[0x416b43,0x527c49,0x66884d,0x3d6544].map(c=>new THREE.Color(c));
const pinePal=[0x315b42,0x3d704d,0x496f4b].map(c=>new THREE.Color(c));
const maxTrees=620;
const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,maxTrees);
const broadMesh=new THREE.InstancedMesh(broadGeo,broadMat,maxTrees);
const pineMesh=new THREE.InstancedMesh(pineGeo,pineMat,maxTrees);
let broadTotal=0, pineTotal=0;
if(HIGH){
  // Gentle wind sway, weighted toward the top of the crown (step 4, HIGH only).
  for(const m of [broadMat,pineMat]){
    m.onBeforeCompile=shader=>{
      shader.uniforms.uWindTime=timeU;
      shader.vertexShader=shader.vertexShader
        .replace('#include <common>','#include <common>\nuniform float uWindTime;')
        .replace('#include <begin_vertex>',`#include <begin_vertex>
        {
          vec4 ip=instanceMatrix*vec4(0.0,0.0,0.0,1.0);
          float ph=ip.x*0.8+ip.z*0.6;
          float w=pow(clamp(position.y/1.1,0.0,1.5),2.0);
          transformed.x+=sin(uWindTime*1.4+ph)*0.045*w;
          transformed.z+=cos(uWindTime*1.1+ph*1.3)*0.03*w;
        }`);
    };
  }
}
const dummy=new THREE.Object3D(); let treeCount=0;
const treePositions=[];
for(let z=-22;z<=22;z+=.72) for(let x=-22;x<=22;x+=.72) {
  if(treeCount>=maxTrees || !onLand(x,z) || Math.hypot(x,z)<6.5) continue;
  const chance=seeded(x*2.1,z*2.1);
  const woodland=(Math.sin(x*.31+z*.13)+Math.cos(z*.29-x*.2)+2)/4;
  if(chance>.64-woodland*.27) {
    const px=x+(seeded(x+2,z)-.5)*.4,pz=z+(seeded(x,z+3)-.5)*.4;
    if(!onLand(px,pz)||Math.hypot(px,pz)<7) continue;
    const y=terrainHeight(px,pz),s=.72+seeded(x+7,z+9)*.78;
    treePositions.push({x:px,z:pz});
    dummy.position.set(px,y+.32*s,pz);dummy.scale.set(s,s,s);dummy.rotation.set(0,seeded(z,x)*6,0);dummy.updateMatrix();trunks.setMatrixAt(treeCount,dummy.matrix);
    const pine=seeded(x+13,z+5)>.56;
    const pal=pine?pinePal:broadPal, mesh=pine?pineMesh:broadMesh, slot=pine?pineTotal++:broadTotal++;
    dummy.position.y += pine ? 0.85*s : 0.9*s;dummy.scale.set(s*(pine ? 0.9 : 1.2),s*(pine ? 1.15 : 1),s*(pine ? 0.9 : 1.1));dummy.updateMatrix();mesh.setMatrixAt(slot,dummy.matrix);
    const cc=pal[Math.floor(seeded(x+5,z+15)*pal.length)].clone();
    cc.offsetHSL((seeded(x+9,z+27)-.5)*.02,0,(seeded(x+21,z+2)-.5)*.06);
    mesh.setColorAt(slot,cc);
    treeCount++;
  }
}
trunks.count=treeCount; trunks.castShadow=true; trunks.receiveShadow=true;world.add(trunks);
broadMesh.count=broadTotal; pineMesh.count=pineTotal;
if(broadMesh.instanceColor) broadMesh.instanceColor.needsUpdate=true;
if(pineMesh.instanceColor) pineMesh.instanceColor.needsUpdate=true;
broadMesh.castShadow=true; broadMesh.receiveShadow=true; world.add(broadMesh);
pineMesh.castShadow=true; pineMesh.receiveShadow=true; world.add(pineMesh);

// Rocky ridges and scattered boulders.
function displaceRadial(geo, amp, freq){
  const pa=geo.getAttribute('position');
  const v=new THREE.Vector3();
  for(let i=0;i<pa.count;i++){
    v.fromBufferAttribute(pa,i);
    const h=seeded(Math.round(v.x*freq)*3.7+Math.round(v.y*freq)*1.3, Math.round(v.z*freq)*2.9)-.5;
    v.addScaledVector(v.clone().normalize(), h*amp);
    pa.setXYZ(i,v.x,v.y,v.z);
  }
  geo.computeVertexNormals();
  return geo;
}
const rockGeo=displaceRadial(new THREE.DodecahedronGeometry(.7,0),.13,2.6),rockMat=material(0x858779);
const rocks=new THREE.InstancedMesh(rockGeo,rockMat,95);let rockCount=0;
const rockPositions=[];
for(let z=-20;z<=20;z+=2)for(let x=-20;x<=20;x+=2){
  if(rockCount>=95||!onLand(x,z)||Math.hypot(x,z)<8)continue;
  const h=terrainHeight(x,z);
  if(h>.72&&seeded(x+33,z-8)>.48){rockPositions.push({x,z});dummy.position.set(x,h+.07,z);dummy.scale.set(.6+seeded(x,z)*.9,.45+seeded(z,x)*.55,.55+seeded(x+4,z)*.7);dummy.rotation.set(seeded(x,z+4),seeded(z+4,x)*6,seeded(x+3,z)*.3);dummy.updateMatrix();rocks.setMatrixAt(rockCount++,dummy.matrix);}
}
rocks.count=rockCount;rocks.castShadow=true;rocks.receiveShadow=true;world.add(rocks);

// Ground detail (GRAPHICS_TASK step 4): grass tufts, shrubs and flowers.
// Scattered on gentle land away from water and the village centre. Placement
// is decorative only: treePositions / rockPositions are not touched.
function grassTexture(){
  const cv=document.createElement('canvas'); cv.width=128; cv.height=128;
  const ctx=cv.getContext('2d');
  for(let i=0;i<26;i++){
    const x0=10+Math.random()*108, bend=(Math.random()-.5)*22, h=58+Math.random()*58, w=3.4+Math.random()*2.6;
    const grad=ctx.createLinearGradient(0,128,0,128-h);
    grad.addColorStop(0,'#4d7038'); grad.addColorStop(1,'#8fae5c');
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.moveTo(x0-w/2,128);
    ctx.quadraticCurveTo(x0+bend*.4,128-h*.6,x0+bend,128-h);
    ctx.quadraticCurveTo(x0+bend*.4+w*.3,128-h*.55,x0+w/2,128);
    ctx.closePath(); ctx.fill();
  }
  const tex=new THREE.CanvasTexture(cv);
  tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
}
const grassGeo=mergeParts([
  {geo:new THREE.PlaneGeometry(.55,.46), matrix:m4(0,.23,0)},
  {geo:new THREE.PlaneGeometry(.55,.46), matrix:m4(0,.23,0,1,1,1,Math.PI/2)},
]);
const grassMesh=new THREE.InstancedMesh(grassGeo,new THREE.MeshStandardMaterial({map:grassTexture(),alphaTest:.42,side:THREE.DoubleSide,roughness:1}),1700);
const shrubGeo=displace(new THREE.SphereGeometry(.3,8,6),.06,5);
const shrubMesh=new THREE.InstancedMesh(shrubGeo,material(0xffffff),140);
const stemMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.012,.016,.2,5),material(0x4d7038),260);
const headMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(.05,7,6),material(0xffffff),260);
const headPal=[0xffffff,0xf2d06b,0xe58bb1,0xc95d4e].map(c=>new THREE.Color(c));
let grassTotal=0, shrubTotal=0, flowerTotal=0;
const grassGate=HIGH?.90:.965, shrubGate=HIGH?.84:.93;
for(let z=-22;z<=22;z+=.55) for(let x=-22;x<=22;x+=.55){
  if(!onLand(x,z) || Math.hypot(x,z)<7.5) continue;
  const slope=Math.max(Math.abs(terrainHeight(x+.6,z)-terrainHeight(x-.6,z)),Math.abs(terrainHeight(x,z+.6)-terrainHeight(x,z-.6)));
  if(slope>.55) continue;
  const y=terrainHeight(x,z);
  if(grassTotal<1700 && seeded(x*3.3,z*3.3)>grassGate){
    const sc=.7+seeded(x+4,z+8)*.8;
    dummy.position.set(x,y+.02,z); dummy.scale.set(sc,sc,sc); dummy.rotation.set(0,seeded(z+1,x)*6,0); dummy.updateMatrix();
    grassMesh.setMatrixAt(grassTotal++,dummy.matrix);
    if(flowerTotal<260 && seeded(x+31,z+7)>.82){
      dummy.position.set(x,y+.1,z); dummy.scale.set(1,1,1); dummy.updateMatrix();
      stemMesh.setMatrixAt(flowerTotal,dummy.matrix);
      dummy.position.y=y+.22; dummy.updateMatrix();
      headMesh.setMatrixAt(flowerTotal,dummy.matrix);
      headMesh.setColorAt(flowerTotal,headPal[Math.floor(seeded(x+3,z+19)*headPal.length)]);
      flowerTotal++;
    }
  }
}
for(let z=-21;z<=21;z+=1.6) for(let x=-21;x<=21;x+=1.6){
  if(shrubTotal>=140 || !onLand(x,z) || Math.hypot(x,z)<8) continue;
  if(seeded(x*1.7+9,z*1.7) > shrubGate){
    const sc=.7+seeded(x+6,z+3)*.8, y=terrainHeight(x,z);
    dummy.position.set(x,y+.12*sc,z); dummy.scale.set(sc,sc*.8,sc); dummy.rotation.set(0,seeded(z,x+2)*6,0); dummy.updateMatrix();
    shrubMesh.setMatrixAt(shrubTotal,dummy.matrix);
    const cc=new THREE.Color(0x4a7345); cc.offsetHSL((seeded(x+13,z+5)-.5)*.03,0,(seeded(x+2,z+23)-.5)*.07);
    shrubMesh.setColorAt(shrubTotal,cc);
    shrubTotal++;
  }
}
grassMesh.count=grassTotal; shrubMesh.count=shrubTotal; stemMesh.count=flowerTotal; headMesh.count=flowerTotal;
if(headMesh.instanceColor) headMesh.instanceColor.needsUpdate=true;
if(shrubMesh.instanceColor) shrubMesh.instanceColor.needsUpdate=true;
shrubMesh.castShadow=true;
world.add(grassMesh); world.add(shrubMesh); world.add(stemMesh); world.add(headMesh);
return { treePositions, rockPositions };
}
