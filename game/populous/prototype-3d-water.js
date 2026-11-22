// THE LIVING WORLD — split from prototype-3d.js on 2026-11-22 so each part
// can be improved independently. Behaviour is unchanged by the split.
// Water: the ocean, lake surfaces with shore foam, and the river ribbon.
// update(t) scrolls the normal maps and advances the shared time uniform.
import * as THREE from 'three';
import { timeU } from './prototype-3d-utils.js';

export function createWater(scene, world, T, HIGH){
const { terrainHeight, lakeDefs, lakeLevels, riverZ } = T;
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
    shader.uniforms.uFoamTime=timeU;
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
return { update(t){
  timeU.value = t;
  for(const w of waterScroll) w.tex.offset.set(t*w.sx, t*w.sy);
} };
}
