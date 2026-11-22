// THE LIVING WORLD — split from prototype-3d.js on 2026-11-22 so each part
// can be improved independently. Behaviour is unchanged by the split.
// Terrain: height field, lakes and river carving, the terrain mesh and its
// procedural textures. Per-run terrain variation belongs here (lakeDefs,
// riverZ and naturalHeight are the seeds of the landscape).
import * as THREE from 'three';
import { seeded, smooth } from './prototype-3d-utils.js';

export function createTerrain(world, HIGH){
// Per-run landscape (2026-11-22, user request): the lakes, the river's
// course and the hill phases are redrawn on every load, so no two visits
// share the same map. The centre (about r < 5.5) is always kept dry so the
// village starts on open land, and the river is kept out of the centre too.
const _R = Math.random;
const lakeDefs = [];
for (let tries = 0; tries < 80 && lakeDefs.length < 3; tries++) {
  const a = _R() * Math.PI * 2, r = 10.5 + _R() * 6;
  const l = { x: Math.cos(a) * r, z: Math.sin(a) * r, rx: 3.4 + _R() * 2, rz: 2.6 + _R() * 1.6 };
  if (Math.hypot(l.x, l.z) - Math.max(l.rx, l.rz) < 5.5) continue;
  if (lakeDefs.some(o => Math.hypot(o.x - l.x, o.z - l.z) < 9)) continue;
  lakeDefs.push(l);
}
for (const d of [{x:-13,z:7,rx:5.2,rz:3.8},{x:-8,z:-12,rx:3.8,rz:2.8},{x:15,z:10,rx:4.1,rz:3.2}]) {
  if (lakeDefs.length >= 3) break;
  if (!lakeDefs.some(o => Math.hypot(o.x - d.x, o.z - d.z) < 9)) lakeDefs.push(d);
}
let riverZ = x => -4.8 + Math.sin(x * 0.105) * 3.3 + Math.sin(x * 0.24) * 0.75;
for (let tries = 0; tries < 40; tries++) {
  const base = (_R() < .5 ? -1 : 1) * (4.6 + _R() * 2.4), p1 = _R() * 6.283, p2 = _R() * 6.283;
  const f = x => base + Math.sin(x * 0.105 + p1) * 3.3 + Math.sin(x * 0.24 + p2) * 0.75;
  let ok = true;
  for (let x = -7; x <= 7; x += .5) if (Math.abs(f(x)) < 3.6) { ok = false; break; }
  if (ok) { riverZ = f; break; }
}
const _ph1 = _R() * 6.283, _ph2 = _R() * 6.283, _ph3 = _R() * 6.283, _ph4 = _R() * 6.283;
// lakeDistance also records which lake is nearest in _lakeIdx (no allocation).
let _lakeIdx = 0;
function lakeDistance(x,z) {
  let d = Infinity;
  for (let k = 0; k < lakeDefs.length; k++) {
    const l = lakeDefs[k];
    const v = Math.sqrt(((x-l.x)/l.rx)**2 + ((z-l.z)/l.rz)**2);
    if (v < d) { d = v; _lakeIdx = k; }
  }
  return d;
}
function riverDistance(x,z) { return Math.abs(z-riverZ(x)); }
// Terrain before lakes and the river are carved into it.
function naturalHeight(x,z) {
  const broad = Math.sin(x*.17+1.2+_ph1)*.52 + Math.cos(z*.2-.7+_ph2)*.42 + Math.sin((x+z)*.105+_ph3)*.3;
  const detail = Math.sin(x*.48+z*.23)*.09 + Math.cos(z*.51-x*.16)*.07;
  const hill = Math.max(0, Math.sin(x*.115+z*.07+_ph4)*Math.cos(z*.13-x*.06+_ph3)) * .78;
  const edge = smooth(24, 29, Math.max(Math.abs(x),Math.abs(z)));
  return broad + detail + hill - edge*1.15;
}
// One flat water level per lake: just under the lowest point of the natural
// terrain on a ring around the lake. The basin is then carved to that level, so
// the flat water plane always sits fully inside its basin (the old shared
// carve depth let sloping terrain bury one side of the plane, leaving only a
// crescent or a straight-cut sliver).
const lakeLevels = lakeDefs.map(l => {
  let m = Infinity;
  for (let a = 0; a < 48; a++) {
    const t = a / 48 * Math.PI * 2;
    m = Math.min(m, naturalHeight(l.x + Math.cos(t) * l.rx * 1.25, l.z + Math.sin(t) * l.rz * 1.25));
  }
  return THREE.MathUtils.clamp(m - .06, -.9, .4);
});
function terrainHeight(x,z) {
  let h = naturalHeight(x,z);
  const lake = lakeDistance(x,z);
  if (lake < 1.9) {
    const lv = lakeLevels[_lakeIdx];
    // Inside the ellipse the bed drops below the waterline; outside it the
    // bank rises gently and blends into the natural terrain.
    const bed = lake < 1
      ? lv - .45 * (1 - smooth(.25, 1, lake))
      : lv + .08 * smooth(1, 1.4, lake);
    h = THREE.MathUtils.lerp(bed, h, smooth(1.1, 1.9, lake));
  }
  const river = riverDistance(x,z);
  if (river < 1.35) h -= (1-smooth(.55,1.35,river)) * .36;
  return h;
}
function isWater(x,z) { return lakeDistance(x,z)<.94 || (riverDistance(x,z)<.57 && Math.abs(x)<22); }
function onLand(x,z) { return !isWater(x,z) && Math.max(Math.abs(x),Math.abs(z))<22.5; }

// Continuous terrain mesh: the tile-like block surface is replaced with a sculpted landscape.
const divisions = 112, extent = 25, verts = (divisions+1)*(divisions+1);
const positions = new Float32Array(verts*3), colors = new Float32Array(verts*3), indices = [];
// shoreArr: per-vertex "near water" weight (1 at the waterline, fading out
// about 1.7 lake-radii / 1.6 units from a lake / the river). Sand and the
// dirt tint are applied only by this weight, not by absolute height (the old
// height rule painted every low-lying area brown, far from any water).
const shoreArr = new Float32Array(verts);
const cLow = new THREE.Color(0x8c8a62), cGrass = new THREE.Color(0x729653), cMeadow = new THREE.Color(0x9caf70);
const cHigh = new THREE.Color(0x777d6b), cDirt = new THREE.Color(0x987b59);
for(let iz=0;iz<=divisions;iz++) for(let ix=0;ix<=divisions;ix++) {
  const x=-extent+2*extent*ix/divisions, z=-extent+2*extent*iz/divisions;
  const y=terrainHeight(x,z), k=(iz*(divisions+1)+ix)*3;
  positions[k]=x; positions[k+1]=y; positions[k+2]=z;
  const shore=Math.max(1-smooth(1.0,1.7,lakeDistance(x,z)), 1-smooth(.5,1.6,riverDistance(x,z)));
  shoreArr[iz*(divisions+1)+ix]=shore;
  const n=seeded(ix*.31,iz*.31);
  let col = y>.85 ? cHigh.clone().lerp(cLow,.35) : cGrass.clone().lerp(cMeadow,smooth(.1,.85,n*.35+y*.2));
  if (shore>0) col.lerp(cDirt,.45*shore);
  col.multiplyScalar(.94+n*.1);
  colors[k]=col.r; colors[k+1]=col.g; colors[k+2]=col.b;
}
for(let z=0;z<divisions;z++) for(let x=0;x<divisions;x++) {
  const a=z*(divisions+1)+x,b=a+1,c=a+divisions+1,d=c+1;
  indices.push(a,c,b,b,c,d);
}
const terrainGeo=new THREE.BufferGeometry();
const uvArr=new Float32Array(verts*2);
for(let i=0;i<verts;i++){uvArr[i*2]=positions[i*3]/3.2;uvArr[i*2+1]=positions[i*3+2]/3.2;}
terrainGeo.setAttribute('uv',new THREE.BufferAttribute(uvArr,2));
terrainGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
terrainGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));
terrainGeo.setAttribute('aShore',new THREE.BufferAttribute(shoreArr,1));
terrainGeo.setIndex(indices); terrainGeo.computeVertexNormals();
// Procedural terrain textures (GRAPHICS_TASK step 2, HIGH only).
// Canvas value-noise is mapped through colour ramps for grass / dirt / rock /
// wet sand, plus a shared noise bump map. The splat mix runs in
// onBeforeCompile using world position (height + slope), so no uv layout is
// needed for the colour blend; the original vertex colours stay as a weak tint.
function noiseCanvas(size, octaves){
  const cv=document.createElement('canvas'); cv.width=cv.height=size;
  const ctx=cv.getContext('2d');
  ctx.fillStyle='#7a7a7a'; ctx.fillRect(0,0,size,size);
  let amp=0.55, cell=4;
  for(let o=0;o<octaves;o++){
    const small=document.createElement('canvas'); small.width=small.height=cell;
    const sctx=small.getContext('2d'); const img=sctx.createImageData(cell,cell);
    for(let i=0;i<img.data.length;i+=4){ const v=105+Math.random()*95|0; img.data[i]=img.data[i+1]=img.data[i+2]=v; img.data[i+3]=255; }
    sctx.putImageData(img,0,0);
    ctx.globalAlpha=amp; ctx.imageSmoothingEnabled=true;
    ctx.drawImage(small,0,0,size,size);
    amp*=0.55; cell*=2;
  }
  ctx.globalAlpha=1;
  return cv;
}
function rampTexture(size, stops, fleck){
  const noise=noiseCanvas(size,4);
  const nctx=noise.getContext('2d'); const src=nctx.getImageData(0,0,size,size);
  const cv=document.createElement('canvas'); cv.width=cv.height=size;
  const ctx=cv.getContext('2d'); const out=ctx.createImageData(size,size);
  const cols=stops.map(c=>new THREE.Color(c));
  for(let i=0;i<src.data.length;i+=4){
    const t=src.data[i]/255, seg=Math.min(cols.length-2, Math.floor(t*(cols.length-1))), f=t*(cols.length-1)-seg;
    const a=cols[seg], b=cols[seg+1];
    out.data[i]=255*(a.r+(b.r-a.r)*f); out.data[i+1]=255*(a.g+(b.g-a.g)*f); out.data[i+2]=255*(a.b+(b.b-a.b)*f); out.data[i+3]=255;
  }
  ctx.putImageData(out,0,0);
  if(fleck){ ctx.fillStyle=fleck; for(let i=0;i<size*6;i++){ ctx.globalAlpha=Math.random()*0.22; ctx.fillRect(Math.random()*size,Math.random()*size,1.6,1.6);} ctx.globalAlpha=1; }
  const tex=new THREE.CanvasTexture(cv);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=4;
  return tex;
}
const terrainMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
if(HIGH){
  const grassTex=rampTexture(256,[0x59793c,0x74975a,0x95b26e],'#c9d189');
  const dirtTex=rampTexture(256,[0x6b4e33,0x8a6a48,0xa5835e],'#59422a');
  const rockTex=rampTexture(256,[0x5c5e55,0x7c7f72,0x9c9e92],'#4a4c44');
  const sandTex=rampTexture(256,[0x87714e,0xa68d5f,0xc2ad7f],'#77643f');
  const bumpTex=new THREE.CanvasTexture(noiseCanvas(256,4));
  bumpTex.wrapS=bumpTex.wrapT=THREE.RepeatWrapping;
  terrainMat.bumpMap=bumpTex; terrainMat.bumpScale=0.15;
  terrainMat.onBeforeCompile=shader=>{
    shader.uniforms.tGrass={value:grassTex};
    shader.uniforms.tDirt={value:dirtTex};
    shader.uniforms.tRock={value:rockTex};
    shader.uniforms.tSand={value:sandTex};
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNormal;\nattribute float aShore;\nvarying float vShore;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvWPos=(modelMatrix*vec4(transformed,1.0)).xyz;\nvWNormal=normalize(mat3(modelMatrix)*objectNormal);\nvShore=aShore;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNormal;\nvarying float vShore;\nuniform sampler2D tGrass;\nuniform sampler2D tDirt;\nuniform sampler2D tRock;\nuniform sampler2D tSand;')
      .replace('#include <color_fragment>',`#include <color_fragment>
      {
        vec2 uvNear=vWPos.xz*0.55;
        vec2 uvFar=vWPos.xz*0.045;
        vec3 grassC=mix(texture2D(tGrass,uvFar).rgb,texture2D(tGrass,uvNear).rgb,0.55);
        vec3 dirtC=mix(texture2D(tDirt,uvFar).rgb,texture2D(tDirt,uvNear).rgb,0.55);
        vec3 rockC=mix(texture2D(tRock,uvFar).rgb,texture2D(tRock,uvNear).rgb,0.55);
        vec3 sandC=mix(texture2D(tSand,uvFar).rgb,texture2D(tSand,uvNear).rgb,0.55);
        float macro=texture2D(tDirt,uvFar*1.7).g;
        float slope=1.0-clamp(vWNormal.y,0.0,1.0);
        float rockW=smoothstep(0.12,0.32,slope+max(0.0,vWPos.y-0.95)*0.25);
        float sandW=smoothstep(0.35,0.95,vShore)*(1.0-rockW);
        float dirtW=smoothstep(0.58,0.78,macro)*(1.0-rockW)*(1.0-sandW);
        vec3 splat=grassC;
        splat=mix(splat,dirtC,dirtW*0.85);
        splat=mix(splat,sandC,sandW);
        splat=mix(splat,rockC,rockW);
        vec3 tint=mix(vec3(1.0),vColor*1.45,0.42);
        diffuseColor.rgb=splat*tint;
      }`);
  };
}
const terrain=new THREE.Mesh(terrainGeo,terrainMat);
terrain.receiveShadow=true; terrain.castShadow=false; world.add(terrain);
return { terrain, terrainHeight, naturalHeight, isWater, onLand, lakeDefs, lakeLevels, riverZ, riverDistance, lakeDistance };
}
