import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

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
  const broad = Math.sin(x*.17+1.2)*.52 + Math.cos(z*.2-.7)*.42 + Math.sin((x+z)*.105)*.3;
  const detail = Math.sin(x*.48+z*.23)*.09 + Math.cos(z*.51-x*.16)*.07;
  const hill = Math.max(0, Math.sin(x*.115+z*.07)*Math.cos(z*.13-x*.06)) * .78;
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

// Distant ocean and soft shoreline: keep ocean below inland terrain so low
// basins do not poke through dry ground as floating sheets.
const oceanMat=new THREE.MeshPhysicalMaterial({color:0x4f9baa,roughness:.28,metalness:.04,clearcoat:.35,clearcoatRoughness:.4});
const ocean=new THREE.Mesh(new THREE.PlaneGeometry(240,240),oceanMat);
ocean.rotation.x=-Math.PI/2; ocean.position.y=-1.45; ocean.receiveShadow=true; scene.add(ocean);
const waterMat=new THREE.MeshPhysicalMaterial({color:0x438fa0,roughness:.22,metalness:.06,transparent:true,opacity:.92,clearcoat:.65,depthWrite:false});
// Animated water (GRAPHICS_TASK step 3, HIGH only): a tileable normal map is
// derived from summed sine waves (integer frequencies, so it wraps cleanly),
// scrolled every frame in animate().
const waterScroll=[];
const foamTime={value:0};
function waterNormalTexture(size){
  const cv=document.createElement('canvas'); cv.width=cv.height=size;
  const ctx=cv.getContext('2d'); const img=ctx.createImageData(size,size);
  const waves=[];
  for(let i=0;i<8;i++){
    const kx=Math.floor(Math.random()*7)-3, ky=Math.floor(Math.random()*7)-3;
    if(!kx&&!ky) continue;
    waves.push({kx,ky,ph:Math.random()*Math.PI*2,amp:1/Math.hypot(kx,ky)});
  }
  const hv=(x,y)=>{
    let v=0;
    for(const w of waves) v+=Math.sin((w.kx*x+w.ky*y)/size*Math.PI*2+w.ph)*w.amp;
    return v;
  };
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    const dx=(hv(x-1,y)-hv(x+1,y))*0.9, dy=(hv(x,y-1)-hv(x,y+1))*0.9;
    const inv=1/Math.hypot(dx,dy,1), i=(y*size+x)*4;
    img.data[i]=(dx*inv*0.5+0.5)*255; img.data[i+1]=(dy*inv*0.5+0.5)*255; img.data[i+2]=(inv*0.5+0.5)*255; img.data[i+3]=255;
  }
  ctx.putImageData(img,0,0);
  const tex=new THREE.CanvasTexture(cv);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  return tex;
}
if(HIGH){
  const waterNormals=waterNormalTexture(256);
  waterMat.normalMap=waterNormals;
  waterMat.normalScale=new THREE.Vector2(0.32,0.32);
  waterMat.roughness=0.16;
  waterMat.opacity=0.90;
  waterScroll.push({tex:waterNormals,sx:0.021,sy:0.014});
  const oceanNormals=waterNormalTexture(256);
  oceanNormals.repeat.set(28,28);
  oceanMat.normalMap=oceanNormals;
  oceanMat.normalScale=new THREE.Vector2(0.2,0.2);
  oceanMat.roughness=0.17;
  waterScroll.push({tex:oceanNormals,sx:0.006,sy:0.004});
}
const waterGroup=new THREE.Group(); world.add(waterGroup);
// Each lake's water plane sits at its own level (lakeLevels, see above); the
// terrain basin is carved to that level, so the plane is never cut by the
// ground. The surface fades out toward the rim so no hard disc edge appears.
let lakeMat=waterMat;
if(HIGH){
  lakeMat=waterMat.clone();
  lakeMat.onBeforeCompile=shader=>{
    shader.uniforms.uFoamTime=foamTime;
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nattribute vec2 aLocal;\nattribute vec2 aRadii;\nvarying vec2 vLocal;\nvarying vec2 vRadii;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvLocal=aLocal;\nvRadii=aRadii;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nvarying vec2 vLocal;\nvarying vec2 vRadii;\nuniform float uFoamTime;')
      .replace('#include <color_fragment>',`#include <color_fragment>
      {
        float fr=length(vLocal/vRadii);
        float band=smoothstep(0.68,0.84,fr)*(1.0-smoothstep(0.84,0.95,fr));
        float lap=0.85+0.15*sin(uFoamTime*1.7+fr*42.0);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.92,0.97,1.0),band*0.42*lap);
        diffuseColor.a*=1.0-smoothstep(0.82,0.96,fr);
      }`);
  };
}
lakeDefs.forEach((l,li)=>{
  const lakeRx=l.rx*0.97, lakeRz=l.rz*0.97;
  const shape=new THREE.Shape(); shape.absellipse(0,0,lakeRx,lakeRz,0,Math.PI*2,false,0);
  // Higher tessellation keeps the shoreline smooth at close zoom.
  const geo=new THREE.ShapeGeometry(shape,128);
  if(HIGH){
    const pos=geo.getAttribute('position'), n=pos.count;
    const loc=new Float32Array(n*2), rad=new Float32Array(n*2);
    for(let i=0;i<n;i++){ loc[i*2]=pos.getX(i); loc[i*2+1]=pos.getY(i); rad[i*2]=lakeRx; rad[i*2+1]=lakeRz; }
    geo.setAttribute('aLocal',new THREE.BufferAttribute(loc,2));
    geo.setAttribute('aRadii',new THREE.BufferAttribute(rad,2));
  }
  const mesh=new THREE.Mesh(geo,lakeMat); mesh.rotation.x=-Math.PI/2; mesh.position.set(l.x,lakeLevels[li],l.z); waterGroup.add(mesh);
});
// River: a flat ribbon sunk into the carved channel. The old raised tube
// (radius .36 centred on the channel bottom) bulged above the banks and read
// as floating, especially among trees. The ribbon follows the channel bottom
// +.17, so the banks occlude its edges and it sits in the terrain.
{
  const xs=[];
  for(let x=-23;x<=23;x+=.5) xs.push(x);
  const posArr=new Float32Array(xs.length*2*3), uvArr=new Float32Array(xs.length*2*2), idx=[];
  xs.forEach((x,i)=>{
    const z=riverZ(x), dz=(riverZ(x+.25)-riverZ(x-.25))/.5;
    const inv=1/Math.hypot(1,dz), px=-dz*inv, pz=inv, hw=.55;
    const y=terrainHeight(x,z)+.17;
    posArr.set([x+px*hw,y,z+pz*hw, x-px*hw,y,z-pz*hw], i*6);
    uvArr.set([x*.35,0, x*.35,1], i*4);
    if(i>0){ const a=(i-1)*2; idx.push(a,a+2,a+1, a+1,a+2,a+3); }
  });
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(posArr,3));
  g.setAttribute('uv',new THREE.BufferAttribute(uvArr,2));
  g.setIndex(idx);
  g.computeVertexNormals();
  waterGroup.add(new THREE.Mesh(g,waterMat));
}

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
      shader.uniforms.uWindTime=foamTime;
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

import { createVillageArchitecture } from './prototype-3d-buildings.js';
import { createWorldSimulation } from './prototype-3d-simulation.js';
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
  const treeClearance = treePositions.reduce((d,p)=>Math.min(d,Math.hypot(p.x-x,p.z-z)),Infinity);
  const rockClearance = rockPositions.reduce((d,p)=>Math.min(d,Math.hypot(p.x-x,p.z-z)),Infinity);
  const lakeClearance = Math.min(...lakeDefs.map(l => Math.max(0,(Math.sqrt(((x-l.x)/l.rx)**2+((z-l.z)/l.rz)**2)-1)*Math.min(l.rx,l.rz))));
  const riverClearance = Math.max(0,riverDistance(x,z)-.57);
  const waterDistance = Math.min(lakeClearance,riverClearance);
  return {land:onLand(x,z),slope,treeClearance,rockClearance,waterDistance};
};
const simulation = createWorldSimulation(THREE, world, terrain, terrainHeight, uiStatus, farmEnvironment);

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

// --- Atmosphere and time (GRAPHICS_TASK step 6) --------------------------
// WORLD TIME starts at 08:00 and advances with elapsed (1 real second = 2
// world minutes; sped up from the original 3 s = 1 min at the user's request
// on 2026-11-22, so a full day takes about 12 real minutes). The sun, sky, fog and
// light levels follow it; when time is stopped, elapsed is frozen and so is
// the light. Night keeps a moonlight floor so the world never goes black.
// Bloom was not added: swapping the render path for an EffectComposer risks
// the frame loop and the look for a marginal gain (task sheet: skip if heavy).
const WORLD_START=8*60;
const worldMinutes=()=> (WORLD_START + elapsed*2) % 1440;
const _cA=new THREE.Color(), _cB=new THREE.Color();
const SUN_DAY=new THREE.Color(0xffe3b5), SUN_DUSK=new THREE.Color(0xff8f4d), SUN_NIGHT=new THREE.Color(0x93b8e8);
const FOG_DAY=new THREE.Color(0xbcd3da), FOG_DUSK=new THREE.Color(0xe9b287), FOG_NIGHT=new THREE.Color(0x27354a);
function updateSun(){
  const a=(worldMinutes()-360)/720*Math.PI;      // 06:00 sunrise -> 18:00 sunset
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
  const N=240, pos=new Float32Array(N*3); dustBase=new Float32Array(N*3);
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
const fmtClock=()=> 'WORLD TIME · '+String(Math.floor(worldMinutes()/60)).padStart(2,'0')+':'+String(Math.floor(worldMinutes()%60)).padStart(2,'0');
clockEl.textContent=fmtClock();
updateSun();

const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(.05,clock.getDelta());
  if(timeRunning){
    villageArchitecture.update(dt);
    simulation.update(dt);
    elapsed+=dt;
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
    // Population and settlement counts are now owned by the simulation module.
    clockEl.textContent=fmtClock();
  }
  if(autoRotate){yaw+=dt*.055;updateCamera();}
  updateSun();
  {
    const t=performance.now()*0.001;
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
  }
  clouds.position.x=Math.sin(performance.now()*.000018)*2.2;
  if(waterScroll.length){
    const wt=performance.now()*0.001;
    foamTime.value=wt;
    for(const w of waterScroll) w.tex.offset.set(wt*w.sx,wt*w.sy);
  }
  renderer.render(scene,camera);
}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
