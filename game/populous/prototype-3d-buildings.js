export function createVillageArchitecture(THREE,world,terrainHeight){
const mat = (color, roughness=1, extra={}) => new THREE.MeshStandardMaterial({color,roughness,...extra});
// Procedural surface textures (GRAPHICS_TASK step 5): plaster, wood grain,
// roof tiles and stone courses drawn on canvases. The maps stay near-white so
// the existing material colours keep their meaning; shapes are unchanged.
function canvasTex(size,draw){
  const cv=document.createElement('canvas'); cv.width=cv.height=size;
  draw(cv.getContext('2d'),size);
  const t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.SRGBColorSpace;
  return t;
}
const rnd=(a,b)=>a+Math.random()*(b-a);
const plasterTex=canvasTex(256,(ctx,S)=>{
  ctx.fillStyle='#f7f2e6'; ctx.fillRect(0,0,S,S);
  for(let i=0;i<2600;i++){ ctx.fillStyle=`rgba(${Math.random()<.5?120:255},${110+Math.random()*40|0},80,${Math.random()*.05})`; ctx.fillRect(Math.random()*S,Math.random()*S,rnd(1,3),rnd(1,3)); }
  for(let i=0;i<7;i++){ const x=Math.random()*S,y=Math.random()*S,r=rnd(18,52); const g=ctx.createRadialGradient(x,y,2,x,y,r); g.addColorStop(0,'rgba(150,125,90,0.10)'); g.addColorStop(1,'rgba(150,125,90,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); }
});
const woodTex=canvasTex(256,(ctx,S)=>{
  ctx.fillStyle='#f3ece1'; ctx.fillRect(0,0,S,S);
  for(let x=0;x<S;x+=2){ const v=Math.sin(x*.22)*10+Math.sin(x*.031+2)*16; ctx.fillStyle=`rgba(122,90,58,${.05+Math.abs(v)*.006})`; ctx.fillRect(x,0,2,S); }
  for(let i=0;i<5;i++){ const x=Math.random()*S,y=Math.random()*S; ctx.strokeStyle='rgba(110,80,50,0.35)'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.ellipse(x,y,rnd(3,6),rnd(6,11),0,0,7); ctx.stroke(); }
  ctx.fillStyle='rgba(100,72,44,0.20)'; for(let y=0;y<S;y+=64) ctx.fillRect(0,y,S,2);
});
const roofTex=canvasTex(256,(ctx,S)=>{
  ctx.fillStyle='#f2ede6'; ctx.fillRect(0,0,S,S);
  const row=32, col=32;
  for(let y=0;y<S;y+=row) for(let x=-col;x<S+col;x+=col){
    const ox=(y/row)%2?col/2:0, v=rnd(-7,7);
    ctx.fillStyle=`rgba(${150+v},${120+v},${105+v},0.20)`; ctx.fillRect(x+ox+1,y+1,col-2,row-2);
    ctx.strokeStyle='rgba(96,66,52,0.45)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(x+ox+col/2,y+row,col/2-1,Math.PI,0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+ox+1,y); ctx.lineTo(x+ox+1,y+row); ctx.stroke();
  }
});
const stoneTex=canvasTex(256,(ctx,S)=>{
  ctx.fillStyle='#efeee9'; ctx.fillRect(0,0,S,S);
  const row=42;
  for(let y=0;y<S;y+=row) for(let x=-70;x<S+70;x+=70){
    const ox=(y/row)%2?35:0, v=rnd(-6,6);
    ctx.fillStyle=`rgba(${128+v},${126+v},${118+v},0.16)`; ctx.fillRect(x+ox+2,2+y,66,row-4);
    ctx.strokeStyle='rgba(84,84,78,0.4)'; ctx.lineWidth=2; ctx.strokeRect(x+ox+2,2+y,66,row-4);
  }
  for(let i=0;i<1500;i++){ ctx.fillStyle=`rgba(90,88,80,${Math.random()*.06})`; ctx.fillRect(Math.random()*S,Math.random()*S,2,2); }
});
const walls=[0xd2bf99,0xbda77d,0xe0cfaa,0xa7a184,0xc5b49a].map(c=>mat(c,1,{map:plasterTex}));
const roofs=[0x75483a,0x59483b,0x8b6044,0x68735b].map(c=>mat(c,1,{map:roofTex}));
const wood=mat(0x63452f,1,{map:woodTex}),darkWood=mat(0x493528,1,{map:woodTex}),stone=mat(0x888879,1,{map:stoneTex}),stoneLight=mat(0xb2aa92,1,{map:stoneTex});
const glass=new THREE.MeshStandardMaterial({color:0xffd58b,emissive:0x98612b,emissiveIntensity:.32});
const field=mat(0x9a8954),metal=mat(0x555e58);
function box(parent,w,h,d,material,x,y,z,cast=true){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;}
function roof(parent,w,d,eave,ridge,material){
 const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,ridge-eave);shape.lineTo(w/2,0);shape.closePath();
 const geo=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false});const m=new THREE.Mesh(geo,material);m.rotation.y=Math.PI/2;m.position.set(-d/2,eave,0);m.castShadow=true;parent.add(m);return m;
}
function door(parent,z=.58,y=.23){box(parent,.24,.46,.045,darkWood,0,y,z);}
function windowPane(parent,x,y,z=.59){box(parent,.22,.24,.035,darkWood,x,y,z);box(parent,.16,.18,.04,glass,x,y,z+.018);box(parent,.025,.2,.045,wood,x,y,z+.04);box(parent,.18,.025,.045,wood,x,y,z+.04);}
function chimney(parent,x,y,z){box(parent,.18,.52,.18,stone,x,y,z);box(parent,.22,.06,.22,stoneLight,x,y+.28,z);}
function baseGroup(x,z,scale=1){const g=new THREE.Group();g.position.set(x,terrainHeight(x,z),z);g.scale.setScalar(scale);return g;}
function cottage(x,z,scale=1,variant=0){
 const g=baseGroup(x,z,scale);box(g,1.35,.88,1.15,walls[variant%walls.length],0,.46,0);roof(g,1.42,1.23,.9,1.62,roofs[variant%roofs.length]);door(g,.594);windowPane(g,-.43,.62);windowPane(g,.43,.62);chimney(g,.43,1.38,-.28);
 for(const xx of [-.62,.62])box(g,.07,.84,.07,wood,xx,.46,.59);box(g,1.3,.08,.07,wood,0,.86,.59);
 for(let i=0;i<4;i++)box(g,1.48,.08,1.25,stoneLight,0,.04+i*.015,0,false);return g;
}
function farmhouse(x,z,scale=1){
 const g=baseGroup(x,z,scale);box(g,1.75,1.02,1.45,walls[2],0,.53,0);roof(g,1.84,1.55,1.02,1.88,roofs[0]);door(g,.746);windowPane(g,-.57,.7,.746);windowPane(g,.57,.7,.746);chimney(g,.56,1.58,-.38);
 box(g,.78,.62,.92,wood,1.05,.34,-.05);const hay=new THREE.Mesh(new THREE.ConeGeometry(.48,.48,7),mat(0xb9a05e));hay.position.set(-1.15,.24,.35);hay.scale.set(1,.7,1);hay.castShadow=true;g.add(hay);return g;
}
function granary(x,z,scale=1){
 const g=baseGroup(x,z,scale);box(g,1.25,1.05,1.2,wood,0,.85,0);
 for(let y=.42;y<1.4;y+=.18)for(const side of [-1,1])box(g,1.3,.035,.035,darkWood,0,y,side*.61);
 roof(g,1.4,1.35,1.38,1.95,roofs[1]);for(const [a,b] of [[-.48,-.43],[.48,-.43],[-.48,.43],[.48,.43]])box(g,.16,.42,.16,stone,a,.21,b);box(g,.36,.32,.045,darkWood,0,.9,.625);return g;
}
function workshop(x,z,scale=1){
 const g=baseGroup(x,z,scale);box(g,1.55,1,1.3,walls[1],0,.52,0);roof(g,1.66,1.4,1.02,1.82,roofs[2]);door(g,.67);windowPane(g,-.5,.68,.67);
 for(const xx of [-.85,.85])box(g,.09,1,.09,wood,xx,.5,.48);const awning=box(g,1.85,.09,.95,roofs[1],0,1.03,.48);awning.rotation.x=-.12;
 box(g,.9,.13,.42,wood,.05,.38,.9);for(let i=0;i<3;i++)box(g,.12,.42,.12,stone,-.25+i*.27,.2,.91);chimney(g,.52,1.43,-.35);return g;
}
function windmill(x,z,scale=1){
 const g=baseGroup(x,z,scale);const tower=new THREE.Mesh(new THREE.CylinderGeometry(.42,.62,2.5,8),walls[3]);tower.position.y=1.25;tower.castShadow=true;tower.receiveShadow=true;g.add(tower);
 const cap=new THREE.Mesh(new THREE.ConeGeometry(.53,.65,8),roofs[0]);cap.position.y=2.82;cap.castShadow=true;g.add(cap);
 const hub=new THREE.Group();hub.position.set(0,2.55,.49);g.add(hub);const axle=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.35,8),wood);axle.rotation.x=Math.PI/2;hub.add(axle);
 const sails=new THREE.Group();hub.add(sails);for(let i=0;i<4;i++){const blade=new THREE.Group();blade.rotation.z=i*Math.PI/2;box(blade,.13,1.35,.07,wood,0,.78,0);box(blade,.48,.66,.045,mat(0xe5dfc9),0,1.08,.035);sails.add(blade);}
 return {group:g,animate:dt=>{sails.rotation.z+=dt*.42;}};
}
function meetingHall(x,z,scale=1){
 const g=baseGroup(x,z,scale);box(g,2.25,1.22,1.72,walls[2],0,.63,0);roof(g,2.4,1.88,1.22,2.18,roofs[0]);door(g,.88);windowPane(g,-.78,.8,.88);windowPane(g,.78,.8,.88);
 box(g,.9,.12,.55,wood,0,.62,1.08);for(const xx of [-.48,.48])box(g,.08,.68,.08,wood,xx,.32,1.27);const bell=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,.22,10),metal);bell.position.set(0,2.05,-.25);g.add(bell);return g;
}
function chapel(x,z,scale=1){
 const g=baseGroup(x,z,scale);box(g,1.4,1.55,1.25,stoneLight,0,.78,0);roof(g,1.55,1.38,1.55,2.25,roofs[1]);door(g,.64,.42);windowPane(g,0,1.1,.64);
 box(g,.42,1.1,.42,stone,0,2.05,-.2);const spire=new THREE.Mesh(new THREE.ConeGeometry(.36,.72,4),roofs[0]);spire.position.set(0,2.95,-.2);spire.castShadow=true;g.add(spire);box(g,.07,.48,.07,metal,0,3.42,-.2);box(g,.3,.07,.07,metal,0,3.48,-.2);return g;
}
function watchtower(x,z,scale=1){
 const g=baseGroup(x,z,scale);const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.43,.62,2.7,8),stone);shaft.position.y=1.35;shaft.castShadow=true;g.add(shaft);box(g,1.15,.22,1.15,wood,0,2.45,0);
 const top=new THREE.Mesh(new THREE.ConeGeometry(.78,.8,4),roofs[0]);top.position.y=3;top.rotation.y=Math.PI/4;top.castShadow=true;g.add(top);for(let i=0;i<4;i++){const a=i*Math.PI/2;const slit=box(g,.09,.38,.045,darkWood,Math.sin(a)*.44,1.65,Math.cos(a)*.44);slit.rotation.y=a;}return g;
}
 const group=new THREE.Group();
 world.add(group);
 // The world begins empty. Houses and farms are created only by the simulation.
 return {group,update:()=>{}};
}
