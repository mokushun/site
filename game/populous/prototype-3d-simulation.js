export function createWorldSimulation(THREE, world, terrain, terrainHeight, onStatus) {
  const size = 40, step = 2, count = size / step;
  const cells = [];
  for (let z = 0; z < count; z++) for (let x = 0; x < count; x++) {
    const wx = -20 + (x + .5) * step, wz = -20 + (z + .5) * step;
    const seed = Math.abs(Math.sin(wx * 12.9898 + wz * 78.233) * 43758.5453) % 1;
    cells.push({ x: wx, z: wz, fertility: .35 + seed * .38, moisture: .35 + seed * .25, farm: false });
  }
  const baseColors = terrain.geometry.attributes.color.array.slice();
  const colors = terrain.geometry.attributes.color;
  // Fertility is mapped to the nearest logical cell; the terrain mesh remains continuous.
  let mode = 'observe', rainLeft = 0, elapsed = 0, food = 8, wood = 10, population = 1;
  const births = [];
  let farmCount = 0, houseCount = 0, foodRate = 0, nextTick = 0;
  const buildings = [];
  const farms = [];
  const constructionSites = [];
  function createScaffold(x,z,type) {
    const g=new THREE.Group();g.position.set(x,terrainHeight(x,z)+.03,z);
    const wood=mat(0x9a7446),beam=mat(0xb18a58);
    const w=type==='farm'?1.45:.82,d=type==='farm'?1.2:.72,h=type==='farm'?.85:1.35;
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const post=new THREE.Mesh(new THREE.BoxGeometry(.07,h,.07),wood);
      post.position.set(sx*w/2,h/2,sz*d/2);post.castShadow=true;g.add(post);
    }
    for(const y of [.35,h*.78]){
      const beamX=new THREE.Mesh(new THREE.BoxGeometry(w+.12,.065,.065),beam);beamX.position.y=y;g.add(beamX);
      const beamZ=new THREE.Mesh(new THREE.BoxGeometry(.065,.065,d+.12),beam);beamZ.position.y=y;g.add(beamZ);
    }
    world.add(g);return g;
  }
  const rainCount = 360;
  const rainPositions = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPositions[i*3] = (Math.random() - .5) * 48;
    rainPositions[i*3+1] = Math.random() * 18 + 2;
    rainPositions[i*3+2] = (Math.random() - .5) * 48;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xc9e8f4, size: .075, transparent: true, opacity: .8 }));
  rain.visible = false; world.add(rain);

  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 1 });
  const wallMat = mat(0xcbb895), roofMat = mat(0x80513d), woodMat = mat(0x62452f);
  const soilMat = mat(0x765c39), cropMats = [mat(0x81994d), mat(0x9eaa5a)];
  function buildHouse(x, z) {
    const g = new THREE.Group(); g.position.set(x, terrainHeight(x,z), z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2,.78,1.05), wallMat); base.position.y=.4; base.castShadow=true; base.receiveShadow=true; g.add(base);
    const roofShape = new THREE.Shape(); roofShape.moveTo(-.72,0); roofShape.lineTo(0,.65); roofShape.lineTo(.72,0); roofShape.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(roofShape,{depth:1.18,bevelEnabled:false});
    const roof = new THREE.Mesh(roofGeo,roofMat); roof.rotation.y=Math.PI/2; roof.position.set(-.59,.78,0); roof.castShadow=true; g.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(.22,.42,.04),woodMat); door.position.set(0,.22,.55);g.add(door);
    g.visible=false;world.add(g);
    const scaffold=createScaffold(x,z,'house');constructionSites.push({scaffold,building:g,remaining:5});
    buildings.push({x,z,type:'house',occupants:houseCount===0?1:0});houseCount++;
  }
  function buildFarm(x,z,fertility) {
    const g = new THREE.Group(); g.position.set(x, terrainHeight(x,z)+.025, z);
    const plot = new THREE.Mesh(new THREE.BoxGeometry(2.5,.045,2.1),soilMat); plot.receiveShadow=true;g.add(plot);
    const cropPlants=[];
    for(let row=0;row<5;row++) for(let col=0;col<6;col++){
      const baseHeight=.24+fertility*.16;
      const crop = new THREE.Mesh(new THREE.ConeGeometry(.075,baseHeight,5),cropMats[(row+col)%2]);
      crop.position.set(-.95+col*.38,baseHeight*.55,-.72+row*.36);crop.castShadow=true;g.add(crop);
      cropPlants.push({mesh:crop,baseHeight,phase:(row*6+col)*.37});
    }
    g.visible=false;world.add(g);
    const scaffold=createScaffold(x,z,'farm');constructionSites.push({scaffold,building:g,remaining:5});
    farms.push({x,z,fertility,group:g,cropPlants});buildings.push({x,z,type:'farm'});farmCount++;
    const cell = nearestCell(x,z); if(cell) cell.farm=true;
  }
  function nearestCell(x,z) { let best=null,dist=Infinity; for(const c of cells){const d=(c.x-x)**2+(c.z-z)**2;if(d<dist){dist=d;best=c;}}return best; }
  function availableSpot(type) {
    const candidates=[];
    for(let z=-14;z<=14;z+=2)for(let x=-14;x<=14;x+=2){
      if(Math.hypot(x,z)<5 || Math.hypot(x,z)>17) continue;
      const cell=nearestCell(x,z); if(!cell || cell.farm && type==='farm') continue;
      if(type==='farm' && cell.fertility<(farmCount===0?.45:.58)) continue;
      if(type==='house' && Math.hypot(x,z)>11) continue;
      const near=buildings.some(b=>Math.hypot(b.x-x,b.z-z)<(type==='farm'?3.1:2.1));
      if(!near)candidates.push({x,z,score:type==='farm'?cell.fertility:Math.hypot(x,z)});
    }
    candidates.sort((a,b)=>type==='farm'?b.score-a.score:a.score-b.score);
    return candidates[0] || null;
  }
  function updateTerrainColors() {
    const pos=terrain.geometry.attributes.position;
    for(let i=0;i<colors.count;i++){
      const x=pos.getX(i),z=pos.getZ(i); const c=nearestCell(x,z);
      const fertility=c?c.fertility:.4;
      const base=new THREE.Color(baseColors[i*3],baseColors[i*3+1],baseColors[i*3+2]);
      const fertile=new THREE.Color(0x9ab66b);
      base.lerp(fertile,Math.max(0,fertility-.42)*.42);
      colors.setXYZ(i,base.r,base.g,base.b);
    }
    colors.needsUpdate=true;
  }
  function affectFertility(x,z,amount,radius=5) {
    for(const c of cells){const d=Math.hypot(c.x-x,c.z-z);if(d<radius){const w=1-d/radius;c.fertility=THREE.MathUtils.clamp(c.fertility+amount*w,.08,1);c.moisture=THREE.MathUtils.clamp(c.moisture+amount*.55*w,0,1);}}
    updateTerrainColors();
    onStatus('土地の肥沃度を高めた。農地が育ちやすくなります');
  }
  function startRain() { rainLeft=16;rain.visible=true;mode='observe';onStatus('雨が降り始めた。土壌の水分と肥沃度が上がります'); }
  function setMode(next) { mode=next;onStatus(mode==='fertility'?'肥沃度を変える場所をクリックしてください':'観察モード'); }
  function handleClick(event,camera,canvas) {
    if(mode!=='fertility')return false;
    const rect=canvas.getBoundingClientRect(),mouse=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    const ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);const hit=ray.intersectObject(terrain,false)[0];
    if(hit){affectFertility(hit.point.x,hit.point.z,.28,5.5);mode='observe';return true;}
    return false;
  }
  function tick() {
    const avg=cells.reduce((s,c)=>s+c.fertility,0)/cells.length;
    farms.forEach(f=>{
      const c=nearestCell(f.x,f.z);f.fertility=c?c.fertility:f.fertility;
      // Fertile soil produces taller, fuller-looking crops; poor soil leaves them short.
      const growth=.55+f.fertility*1.35;
      f.cropPlants.forEach(plant=>{
        const height=plant.baseHeight*growth;
        plant.mesh.scale.y=growth;
        plant.mesh.position.y=height*.55;
      });
    });
    foodRate=farms.reduce((s,f)=>s+(1.7+f.fertility*1.6),0)+(farmCount===0?population*.18:0);
    wood=Math.min(80,wood+population*.22*5);
    food=Math.max(0,food+foodRate*5-population*.72);
    // The first person can forage, but lasting population growth requires housing.
    if(houseCount>0 && food>population*4 && population<houseCount*3){
      const home=buildings.filter(b=>b.type==='house').find(b=>(b.occupants||0)<3);
      if(home){home.occupants=(home.occupants||0)+1;population++;food-=population*.8;births.push({x:home.x,z:home.z,house:buildings.indexOf(home)});}
    }
    else if(food<population*.55 && population>1){population--;food=Math.max(0,food-2);}
    if((farmCount===0 && food>8) || (farmCount<Math.max(1,Math.ceil((population+1)/5)) && food>35 && wood>=4)){
      const p=availableSpot('farm');if(p){const c=nearestCell(p.x,p.z);wood=Math.max(0,wood-4);buildFarm(p.x,p.z,c.fertility);onStatus('木材を使って農地が作られました');}
    }
    const farmCapacity=Math.max(1,farmCount)*5;
    const needsHouse=(houseCount===0 && farmCount>0 && food>15 && wood>=8) ||
      (houseCount>0 && population>=houseCount*3 && farmCapacity>=population && food>35 && wood>=14);
    if(needsHouse){
      const p=availableSpot('house');
      if(p){
        if(houseCount>0)wood-=14;else wood=Math.max(0,wood-8);
        food-=12;buildHouse(p.x,p.z);onStatus('木材と食料が集まり、新しい住宅が建ちました');
      }
    }
    updateTerrainColors();
    onStatus(null,{food:Math.floor(food),wood:Math.floor(wood),population,farmCount,houseCount,foodRate:foodRate.toFixed(1),fertility:(avg*100).toFixed(0),births:births.splice(0),farmLocations:farms.map(f=>({x:f.x,z:f.z})),houseLocations:buildings.filter(b=>b.type==='house').map(b=>({x:b.x,z:b.z})),constructionLocations:constructionSites.map(s=>({x:s.building.position.x,z:s.building.position.z})),forestLocation:{x:17,z:-8}});
  }
  function update(dt) {
    elapsed+=dt;
    for(let i=constructionSites.length-1;i>=0;i--){
      const site=constructionSites[i];site.remaining-=dt;
      // Reveal the finished structure after a short visible construction phase.
      if(site.remaining<=0){site.building.visible=true;world.remove(site.scaffold);constructionSites.splice(i,1);}
    }
    if(rainLeft>0){
      rainLeft-=dt;rain.visible=true;
      const p=rainGeo.attributes.position;
      for(let i=0;i<rainCount;i++){let y=p.getY(i)-dt*13;if(y<0){y=14+Math.random()*5;p.setX(i,(Math.random()-.5)*48);p.setZ(i,(Math.random()-.5)*48);}p.setY(i,y);}
      p.needsUpdate=true;
      for(const c of cells){c.moisture=Math.min(1,c.moisture+dt*.012);c.fertility=Math.min(1,c.fertility+dt*.0018);}
      if(rainLeft<=0){rain.visible=false;updateTerrainColors();onStatus('雨が止んだ');}
    }
    nextTick+=dt;if(nextTick>=5){nextTick=0;tick();}
  }
  // Start from an untouched landscape. The first resident must establish food production and shelter.
  updateTerrainColors();
  onStatus('文明のはじまり — 住民は一人。最初の農地を作ろう');
  tick();
  return { update, setMode, startRain, handleClick, getStats:()=>({food,wood,population,farmCount,houseCount}) };
}
