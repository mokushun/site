import { createCropField } from './prototype-3d-crops.js';
export function createWorldSimulation(THREE, world, terrain, terrainHeight, onStatus, farmEnvironment = () => ({land:true,slope:0,treeClearance:99,rockClearance:99,waterDistance:4}), highQuality = true) {
  // GAMEPLAY_TASK (2026-11-22): all gameplay balance values live here.
  const TUNING = {
    tickSeconds: 5,
    crops: [ // tier 1..3: growth length (ticks), base yield, fertility lost per harvest, faith per harvest
      { name: '麦', growthTicks: 6, yieldBase: 20, fertilityLoss: .06, faith: 1 },
      { name: '豆・野菜', growthTicks: 6, yieldBase: 26, fertilityLoss: .045, faith: 2 },
      { name: '果樹', growthTicks: 8, yieldBase: 34, fertilityLoss: .07, faith: 3 },
    ],
    farmRegen: .004,           // per tick, far below the harvest loss
    waterReliefMax: .30,       // harvest loss reduced by up to 30% beside water
    consumePerPerson: .72,     // food per person per tick (unchanged from before)
    foragePerPerson: .9,       // food per person per tick while no farm is active yet
    faithCapBase: 40, faithCapPerHouse: 8,
    faithSurplusRate: .1,      // per person per tick while food > population*2
    faithStarvationLoss: 5,
    faithFloorRate: 1,         // per tick while faith is below the rain minimum (see tick)
    rainMinFaith: 10, rainCostPerSecond: 2, rainFertilityPerSecond: .02, rainRadius: 4,
    newFarmFertilityJitter: .12,
  };
  const TIER_UP = [.6, .8], TIER_DOWN = [.55, .75];
  function tierFor(f, cur) {
    let t = cur;
    while (t < 2 && f >= TIER_UP[t]) t++;
    while (t > 0 && f < TIER_DOWN[t - 1]) t--;
    return t;
  }
  const hash2 = (x, z) => { const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return n - Math.floor(n); };
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
  let elapsed = 0, food = 8, wood = 10, population = 1, faith = 0;
  const births = [];
  let farmCount = 0, houseCount = 0, foodRate = 0, nextTick = 0;
  const buildings = [];
  const farms = [];
  const constructionSites = [];
  function createScaffold(x,z,type) {
    const g=new THREE.Group();g.position.set(x,terrainHeight(x,z)+.03,z);
    if(type==='farm'){
      // Land clearing (開墾中): bare tilled soil, corner stakes and dirt
      // mounds — no wooden frame, so it never reads as a building site.
      const patch=new THREE.Mesh(new THREE.BoxGeometry(2.1,.07,1.75),mat(0x6e5136,{map:soilT,bumpMap:soilT,bumpScale:.35}));
      patch.position.y=.035;patch.receiveShadow=true;g.add(patch);
      const stakeM=mat(0x8a6a44);
      for(const sx of [-1,1])for(const sz of [-1,1]){
        const stake=new THREE.Mesh(new THREE.BoxGeometry(.06,.3,.06),stakeM);
        stake.position.set(sx*1.02,.15,sz*.85);stake.rotation.z=sx*.12;g.add(stake);
      }
      const moundM=mat(0x7d5f3d);
      for(const [mx,mz,ms] of [[-.55,-.35,1],[.5,.3,.8],[.1,-.55,.65]]){
        const mound=new THREE.Mesh(new THREE.SphereGeometry(.17,7,5),moundM);
        mound.scale.set(ms,ms*.45,ms);mound.position.set(mx,.09,mz);g.add(mound);
      }
      world.add(g);return g;
    }
    const wood=mat(0x9a7446,{map:woodT,bumpMap:woodT,bumpScale:.3}),beam=mat(0xb18a58,{map:woodT,bumpMap:woodT,bumpScale:.3});
    const w=.82,d=.72,h=1.35;
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
  const mat = (c, extra={}) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, ...extra });
  // Visible surface textures for the buildings and farms this module creates
  // (presentation only, no logic change). The first step-5 pass textured the
  // separate catalogue in prototype-3d-buildings.js, but the houses a player
  // actually sees are built here — that is why nothing looked different.
  // Textures are high-contrast and double as bump maps so the relief shows.
  function simTex(size,draw){
    const cv=document.createElement('canvas'); cv.width=cv.height=size;
    draw(cv.getContext('2d'),size);
    const t=new THREE.CanvasTexture(cv);
    t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.SRGBColorSpace;
    return t;
  }
  const srnd=(a,b)=>a+Math.random()*(b-a);
  const plasterT=simTex(256,(ctx,S)=>{
    ctx.fillStyle='#f6f0df'; ctx.fillRect(0,0,S,S);
    for(let i=0;i<2400;i++){ ctx.fillStyle=`rgba(${Math.random()<.5?110:255},${100+Math.random()*40|0},70,${Math.random()*.10})`; ctx.fillRect(Math.random()*S,Math.random()*S,srnd(1,3.4),srnd(1,3.4)); }
    for(let i=0;i<10;i++){ const x=Math.random()*S,y=Math.random()*S,r=srnd(20,58); const g=ctx.createRadialGradient(x,y,2,x,y,r); g.addColorStop(0,'rgba(140,112,78,0.20)'); g.addColorStop(1,'rgba(140,112,78,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); }
    const band=ctx.createLinearGradient(0,S*.8,0,S); band.addColorStop(0,'rgba(105,84,58,0)'); band.addColorStop(1,'rgba(105,84,58,0.42)'); ctx.fillStyle=band; ctx.fillRect(0,S*.8,S,S*.2);
  });
  const roofT=simTex(256,(ctx,S)=>{
    ctx.fillStyle='#f4eee6'; ctx.fillRect(0,0,S,S);
    const row=30,col=30;
    for(let y=0;y<S;y+=row) for(let x=-col;x<S+col;x+=col){
      const ox=(y/row)%2?col/2:0, v=srnd(-16,16);
      ctx.fillStyle=`rgba(${168+v},${128+v},${104+v},0.42)`; ctx.fillRect(x+ox+1,y+1,col-2,row-2);
      ctx.strokeStyle='rgba(52,30,20,0.65)'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(x+ox+col/2,y+row,col/2-1,Math.PI,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+ox+1,y); ctx.lineTo(x+ox+1,y+row); ctx.stroke();
    }
  });
  const woodT=simTex(256,(ctx,S)=>{
    ctx.fillStyle='#f3ece0'; ctx.fillRect(0,0,S,S);
    for(let x=0;x<S;x+=2){ const v=Math.sin(x*.22)*10+Math.sin(x*.031+2)*16; ctx.fillStyle=`rgba(110,78,46,${.10+Math.abs(v)*.013})`; ctx.fillRect(x,0,2,S); }
    ctx.fillStyle='rgba(80,55,30,0.5)'; for(let x=0;x<S;x+=52) ctx.fillRect(x,0,3,S);
    for(let i=0;i<6;i++){ const x=Math.random()*S,y=Math.random()*S; ctx.strokeStyle='rgba(96,66,36,0.55)'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.ellipse(x,y,srnd(3,6),srnd(6,12),0,0,7); ctx.stroke(); }
  });
  const soilT=simTex(256,(ctx,S)=>{
    ctx.fillStyle='#f2ecdf'; ctx.fillRect(0,0,S,S);
    for(let y=0;y<S;y+=18){ ctx.fillStyle='rgba(70,50,26,0.34)'; ctx.fillRect(0,y,S,7); ctx.fillStyle='rgba(255,250,235,0.20)'; ctx.fillRect(0,y+9,S,4); }
    for(let i=0;i<1800;i++){ ctx.fillStyle=`rgba(80,58,32,${Math.random()*.14})`; ctx.fillRect(Math.random()*S,Math.random()*S,2.4,2.4); }
  });
  const wallMat = mat(0xcbb895,{map:plasterT,bumpMap:plasterT,bumpScale:.5}), roofMat = mat(0x80513d,{map:roofT,bumpMap:roofT,bumpScale:.7}), woodMat = mat(0x62452f,{map:woodT,bumpMap:woodT,bumpScale:.4});
  function buildHouse(x, z) {
    const g = new THREE.Group(); g.position.set(x, terrainHeight(x,z), z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2,.78,1.05), wallMat); base.position.y=.4; base.castShadow=true; base.receiveShadow=true; g.add(base);
    const roofShape = new THREE.Shape(); roofShape.moveTo(-.72,0); roofShape.lineTo(0,.65); roofShape.lineTo(.72,0); roofShape.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(roofShape,{depth:1.18,bevelEnabled:false});
    const roof = new THREE.Mesh(roofGeo,roofMat); roof.rotation.y=Math.PI/2; roof.position.set(-.59,.78,0); roof.castShadow=true; g.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(.22,.42,.04),woodMat); door.position.set(0,.22,.55);g.add(door);
    g.visible=false;world.add(g);
    const scaffold=createScaffold(x,z,'house');constructionSites.push({scaffold,building:g,remaining:25,type:'house'});
    buildings.push({x,z,type:'house',occupants:houseCount===0?1:0,done:false});houseCount++;
  }
  function buildFarm(x,z,cellFertility) {
    // Each farm owns its fertility now: the cell value plus a fixed per-farm
    // jitter (position hash), then it lives and declines on its own.
    const fertility = THREE.MathUtils.clamp(cellFertility + (hash2(x * 1.71 + 31.7, z * 2.33 + 11.1) - .5) * 2 * TUNING.newFarmFertilityJitter, .05, 1);
    const g = new THREE.Group(); g.position.set(x, terrainHeight(x,z)+.025, z);
    const tier = tierFor(fertility, 0);
    const field = createCropField(tier, fertility, highQuality);
    g.add(field.group);
    g.visible=false;world.add(g);
    const scaffold=createScaffold(x,z,'farm');constructionSites.push({scaffold,building:g,remaining:25,type:'farm'});
    const site=farmEnvironment(x,z);
    farms.push({x,z,fertility,waterDistance:site.waterDistance??8,group:g,field,tier,growth:0,active:false});buildings.push({x,z,type:'farm'});farmCount++;
    const cell = nearestCell(x,z); if(cell) cell.farm=true;
  }
  function nearestCell(x,z) { let best=null,dist=Infinity; for(const c of cells){const d=(c.x-x)**2+(c.z-z)**2;if(d<dist){dist=d;best=c;}}return best; }
  function availableSpot(type) {
    const candidates=[];
    for(let z=-14;z<=14;z+=2)for(let x=-14;x<=14;x+=2){
      if(Math.hypot(x,z)<2.5 || Math.hypot(x,z)>17) continue;
      const cell=nearestCell(x,z); if(!cell || cell.farm && type==='farm') continue;
      if(type==='farm'){
        if(cell.fertility<(farmCount===0?.45:.58)) continue;
        const site=farmEnvironment(x,z);
        if(!site.land || site.slope>.2 || site.treeClearance<2.5 || site.rockClearance<1.8) continue;
        if(site.waterDistance<.8 || site.waterDistance>8.5) continue;
      }
      if(type==='house' && Math.hypot(x,z)>11) continue;
      const near=buildings.some(b=>Math.hypot(b.x-x,b.z-z)<(type==='farm'?3.1:2.1));
      if(!near){
        const site=type==='farm'?farmEnvironment(x,z):null;
        const waterBonus=site?Math.max(0,1-Math.abs(site.waterDistance-3.2)/5.3):0;
        const flatBonus=site?Math.max(0,1-site.slope/.2):0;
        candidates.push({x,z,score:type==='farm'?cell.fertility*.55+waterBonus*.25+flatBonus*.2:Math.hypot(x,z)});
      }
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
  // Blessed rain (GAMEPLAY_TASK step 3): the miracle module calls this
  // every frame while its cloud is out. Faith drains per second; farms and
  // cells under the cloud regain fertility. Returns false when faith is
  // gone, so the caller can dismiss the cloud. This replaces the old free
  // fertility tool and free rain (both removed).
  let cellsDirty = false, colorTimer = 0;
  function applyBlessedRain(x, z, dt) {
    if (faith <= 0) return false;
    faith = Math.max(0, faith - TUNING.rainCostPerSecond * dt);
    const r = TUNING.rainRadius;
    for (const f of farms) {
      const d = Math.hypot(f.x - x, f.z - z);
      if (d < r + 1.2) f.fertility = Math.min(1, f.fertility + TUNING.rainFertilityPerSecond * dt * Math.max(0, 1 - d / (r + 1.2) * .8));
    }
    for (const c of cells) {
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < r) { const w = 1 - d / r; c.fertility = Math.min(1, c.fertility + .008 * dt * w); c.moisture = Math.min(1, c.moisture + .05 * dt * w); cellsDirty = true; }
    }
    return faith > 0;
  }
  function canBless() { return faith >= TUNING.rainMinFaith; }
  function tick() {
    const faithCap=TUNING.faithCapBase+buildings.filter(b=>b.type==='house'&&b.done).length*TUNING.faithCapPerHouse;
    // Per-farm growth and harvest (GAMEPLAY_TASK step 1). A farm grows for
    // its crop's growthTicks, then harvests: food jumps, fertility drops.
    farms.forEach(f=>{
      if(f.active){
        f.fertility=Math.min(1,f.fertility+TUNING.farmRegen);
        f.growth++;
        const def=TUNING.crops[f.tier];
        if(f.growth>=def.growthTicks){
          f.growth=0;
          food+=def.yieldBase*(0.4+f.fertility);
          faith+=def.faith;
          const relief=THREE.MathUtils.clamp(1-f.waterDistance/8.5,0,1)*TUNING.waterReliefMax;
          f.fertility=THREE.MathUtils.clamp(f.fertility-def.fertilityLoss*(1-relief),.05,1);
          const nt=tierFor(f.fertility,f.tier);
          if(nt!==f.tier){
            onStatus(nt>f.tier?`畑が肥沃になり、${TUNING.crops[nt].name}が育つようになった`:`畑が痩せて、${TUNING.crops[nt].name}に戻った`);
            f.tier=nt;
            f.field.setTier(nt);
          }
        }
      }
      // The field module draws growth progress, wilting and soil colour.
      const def=TUNING.crops[f.tier];
      f.field.update(f.active?f.growth/def.growthTicks:0, f.fertility, elapsed);
    });
    // Informational only now: expected food per tick from the standing farms.
    foodRate=farms.reduce((s,f)=>s+(f.active?TUNING.crops[f.tier].yieldBase*(0.4+f.fertility)/TUNING.crops[f.tier].growthTicks:0),0);
    wood=Math.min(80,wood+population*.22*5);
    food=Math.max(0,food-population*TUNING.consumePerPerson+(farms.some(f=>f.active)?0:population*TUNING.foragePerPerson));
    // The first person can forage, but lasting population growth requires housing.
    if(houseCount>0 && food>population*3 && population<houseCount*3){
      const home=buildings.filter(b=>b.type==='house'&&b.done).find(b=>(b.occupants||0)<3);
      if(home){home.occupants=(home.occupants||0)+1;population++;food-=population*.8;births.push({x:home.x,z:home.z,house:buildings.indexOf(home)});}
    }
    else if(food<population*.55 && population>1){population--;food=Math.max(0,food-2);faith=Math.max(0,faith-TUNING.faithStarvationLoss);
      // The dead resident's home frees up (this was missing: occupants only
      // ever increased, so after a few starvation deaths every house looked
      // full and births — and with them farm expansion — stopped for good).
      const freed=buildings.filter(b=>b.type==='house'&&b.done&&(b.occupants||0)>0).sort((a,b)=>(b.occupants||0)-(a.occupants||0))[0];
      if(freed)freed.occupants--;}
    // Faith (GAMEPLAY_TASK step 2): grows while the village eats well.
    if(food>population*2) faith=Math.min(faithCap,faith+population*TUNING.faithSurplusRate);
    // A baseline of prayer: faith always recovers up to the rain minimum,
    // so a starving village can never be locked out of the miracle for
    // good (before this, harvest-only income plus starvation penalties
    // could pin faith near 0 forever: no rain, no recovery, no growth).
    if(faith<TUNING.rainMinFaith) faith=Math.min(TUNING.rainMinFaith,faith+TUNING.faithFloorRate);
    faith=Math.min(faith,faithCap);
    if((farmCount===0 && food>8) || (farmCount<Math.max(1,Math.ceil((population+1)/5)) && food>35 && wood>=4)){
      const p=availableSpot('farm');if(p){const c=nearestCell(p.x,p.z);wood=Math.max(0,wood-4);buildFarm(p.x,p.z,c.fertility);onStatus('水辺に近い平地に農地が作られました');}
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
    onStatus(null,{food:Math.floor(food),wood:Math.floor(wood),population,farmCount,houseCount,foodRate:foodRate.toFixed(1),fertility:farms.length?Math.round(farms.reduce((s,f)=>s+f.fertility,0)/farms.length*100):'—',faith:Math.floor(faith),faithCap,births:births.splice(0),farmLocations:farms.map(f=>({x:f.x,z:f.z})),farmDetails:farms.map(f=>({x:f.x,z:f.z,crop:TUNING.crops[f.tier].name,fertility:Math.round(f.fertility*100),ticksLeft:f.active?TUNING.crops[f.tier].growthTicks-f.growth:null,yieldEst:Math.round(TUNING.crops[f.tier].yieldBase*(0.4+f.fertility))})),houseLocations:buildings.filter(b=>b.type==='house'&&b.done).map(b=>({x:b.x,z:b.z})),constructionLocations:constructionSites.map(s=>({x:s.building.position.x,z:s.building.position.z,type:s.type})),forestLocation:{x:17,z:-8}});
  }
  function update(dt) {
    elapsed+=dt;
    for(let i=constructionSites.length-1;i>=0;i--){
      const site=constructionSites[i];site.remaining-=dt;
      // Reveal the finished structure after a short visible construction phase.
      if(site.remaining<=0){site.building.visible=true;world.remove(site.scaffold);constructionSites.splice(i,1);const doneB=buildings.find(b=>b.x===site.building.position.x&&b.z===site.building.position.z);if(doneB)doneB.done=true;const doneF=farms.find(f=>f.group===site.building);if(doneF)doneF.active=true;}
    }
    if(cellsDirty){ colorTimer+=dt; if(colorTimer>.5){ updateTerrainColors(); cellsDirty=false; colorTimer=0; } }
    nextTick+=dt;if(nextTick>=5){nextTick=0;tick();}
  }
  // Start from an untouched landscape. The first resident must establish food production and shelter.
  updateTerrainColors();
  onStatus('文明のはじまり — 住民は一人。最初の農地を作ろう');
  tick();
  return { update, applyBlessedRain, canBless, getStats:()=>({food,wood,population,farmCount,houseCount,faith:Math.floor(faith)}) };
}
