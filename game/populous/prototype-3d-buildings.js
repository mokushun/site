export function createVillageArchitecture(THREE,world,terrainHeight){
const mat = (color, roughness=1, extra={}) => new THREE.MeshStandardMaterial({color,roughness,...extra});
const walls=[0xd2bf99,0xbda77d,0xe0cfaa,0xa7a184,0xc5b49a].map(c=>mat(c));
const roofs=[0x75483a,0x59483b,0x8b6044,0x68735b].map(c=>mat(c));
const wood=mat(0x63452f),darkWood=mat(0x493528),stone=mat(0x888879),stoneLight=mat(0xb2aa92);
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
