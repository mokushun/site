// THE LIVING WORLD — crop fields (GAMEPLAY_TASK step 4, 2026-11-22).
// One field per farm: soil whose colour follows fertility, plus the crop
// visuals for the farm's tier —
//   tier 0 wheat:        thin stems with golden heads
//   tier 1 beans / veg:  bushy green mounds on stakes, tiny flowers
//   tier 2 fruit trees:  short trunks with canopies and red/orange fruit
// Growth is driven by the simulation (growth01 within the harvest cycle);
// low fertility wilts the plants (shorter, tilted, browning) and cracks
// appear on the dry soil. Fertile fields get edge flowers, and on high
// quality a few sparkles drift above the richest soil.
// The simulation owns the numbers; this module only draws them.
import * as THREE from 'three';

const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, ...extra });

// Shared unit geometries; per-plant size comes from mesh scale.
const GEO = {
  stem: new THREE.CylinderGeometry(.014, .02, 1, 5),
  head: new THREE.ConeGeometry(.055, .2, 6),
  mound: new THREE.SphereGeometry(.17, 8, 6),
  stake: new THREE.CylinderGeometry(.014, .014, 1, 5),
  trunk: new THREE.CylinderGeometry(.035, .055, 1, 6),
  canopy: new THREE.SphereGeometry(.27, 9, 7),
};
function soilTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f2ecdf'; ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 18) { ctx.fillStyle = 'rgba(70,50,26,0.34)'; ctx.fillRect(0, y, 256, 7); ctx.fillStyle = 'rgba(255,250,235,0.20)'; ctx.fillRect(0, y + 9, 256, 4); }
  for (let i = 0; i < 1800; i++) { ctx.fillStyle = `rgba(80,58,32,${Math.random() * .14})`; ctx.fillRect(Math.random() * 256, Math.random() * 256, 2.4, 2.4); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function crackTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(38,26,16,0.85)'; ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    let x = Math.random() * 256, y = Math.random() * 256;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) { x += (Math.random() - .5) * 56; y += (Math.random() - .5) * 56; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function dotTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}
let sharedSoilTex = null, sharedCrackTex = null, sharedDotTex = null;

const DRY_SOIL = new THREE.Color(0xa8906c), RICH_SOIL = new THREE.Color(0x59452e);

export function createCropField(tier, fertility, high = true) {
  sharedSoilTex = sharedSoilTex || soilTexture();
  sharedCrackTex = sharedCrackTex || crackTexture();
  sharedDotTex = sharedDotTex || dotTexture();

  const group = new THREE.Group();
  const soilMat = mat(0xffffff, { map: sharedSoilTex, bumpMap: sharedSoilTex, bumpScale: .4 });
  const soil = new THREE.Mesh(new THREE.BoxGeometry(2.5, .045, 2.1), soilMat);
  soil.position.y = .023; soil.receiveShadow = true; group.add(soil);
  const crackMat = new THREE.MeshBasicMaterial({ map: sharedCrackTex, transparent: true, opacity: 0, depthWrite: false });
  const cracks = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2), crackMat);
  cracks.rotation.x = -Math.PI / 2; cracks.position.y = .05; group.add(cracks);

  // Per-field materials (colours shift with wilting, so they cannot be shared).
  const stemMat = mat(0x7d9b4a), headMat = mat(0xd9a94e), leafMat = mat(0x5d8a3c),
    darkLeafMat = mat(0x4a7038), trunkMat = mat(0x6a4a2e), stakeMat = mat(0x8a6a44);

  const plants = new THREE.Group(); group.add(plants);
  let plantItems = []; // {root, phase, tilt}

  function pointsCloud(list, size, color, vertexColors = false) {
    const arr = new Float32Array(list.length * 3), cols = new Float32Array(list.length * 3);
    list.forEach((p, i) => { arr[i * 3] = p[0]; arr[i * 3 + 1] = p[1]; arr[i * 3 + 2] = p[2]; if (p[3]) { cols[i * 3] = p[3][0]; cols[i * 3 + 1] = p[3][1]; cols[i * 3 + 2] = p[3][2]; } });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    if (vertexColors) g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: sharedDotTex, transparent: true, depthWrite: false, vertexColors, sizeAttenuation: true }));
  }

  function buildPlants(t) {
    while (plants.children.length) plants.remove(plants.children[0]);
    plantItems = [];
    const add = (root, x, z, phase) => { root.position.set(x, .045, z); plants.add(root); plantItems.push({ root, phase, tilt: (phase % 1 > .5 ? 1 : -1) }); };
    if (t === 0) {
      const rows = high ? 5 : 4, cols = high ? 6 : 5;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const root = new THREE.Group();
        const h = .34 + ((r * 7 + c * 13) % 5) * .035;
        const stem = new THREE.Mesh(GEO.stem, stemMat); stem.scale.set(1, h, 1); stem.position.y = h / 2; root.add(stem);
        const head = new THREE.Mesh(GEO.head, headMat); head.position.y = h + .07; head.castShadow = true; root.add(head);
        add(root, -1 + c * (2 / (cols - 1)) + ((r % 2) * .06 - .03), -.78 + r * (1.56 / (rows - 1)), (r * cols + c) * .37);
      }
    } else if (t === 1) {
      const rows = high ? 5 : 4, cols = high ? 5 : 4;
      const flowers = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const root = new THREE.Group();
        const mound = new THREE.Mesh(GEO.mound, leafMat); mound.scale.set(1, .62, 1); mound.position.y = .1; mound.castShadow = true; root.add(mound);
        const stake = new THREE.Mesh(GEO.stake, stakeMat); stake.scale.set(1, .5, 1); stake.position.y = .25; stake.rotation.z = .08; root.add(stake);
        const x = -1 + c * (2 / (cols - 1)), z = -.78 + r * (1.56 / (rows - 1));
        flowers.push([x + .08, .3, z + .05], [x - .07, .26, z - .06]);
        add(root, x, z, (r * cols + c) * .53);
      }
      const fl = pointsCloud(flowers, .075, 0xf3d9e8); fl.position.y = .045; plants.add(fl);
    } else {
      const rows = high ? 4 : 3, cols = high ? 4 : 3;
      const fruits = [];
      const FRUIT_COLS = [[.9, .25, .15], [1, .55, .2], [.95, .4, .15]];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const root = new THREE.Group();
        const trunk = new THREE.Mesh(GEO.trunk, trunkMat); trunk.scale.set(1, .5, 1); trunk.position.y = .25; root.add(trunk);
        const can = new THREE.Mesh(GEO.canopy, darkLeafMat); can.position.y = .68; can.castShadow = true; root.add(can);
        const can2 = new THREE.Mesh(GEO.canopy, leafMat); can2.scale.setScalar(.62); can2.position.set(.14, .82, .08); root.add(can2);
        const x = -1 + c * (2 / (cols - 1)), z = -.78 + r * (1.56 / (rows - 1));
        for (let k = 0; k < 4; k++) {
          const a = (r * 3 + c * 5 + k) * 1.7;
          fruits.push([x + Math.cos(a) * .22, .62 + (k % 2) * .18, z + Math.sin(a) * .22, FRUIT_COLS[k % 3]]);
        }
        add(root, x, z, (r * cols + c) * .61);
      }
      const fr = pointsCloud(fruits, .11, 0xffffff, true); fr.position.y = .045; plants.add(fr);
    }
  }
  buildPlants(tier);

  // Fertile-soil markers: flowers along the edge, sparkles on high quality.
  const edgePts = [];
  for (let i = 0; i < 14; i++) { const side = i % 2 ? 1.28 : -1.28; edgePts.push([side, .1, -1 + (i / 13) * 2]); }
  const edgeFlowers = pointsCloud(edgePts, .09, 0xf2c14e);
  group.add(edgeFlowers);
  const sparkPts = [];
  for (let i = 0; i < 12; i++) sparkPts.push([(Math.random() - .5) * 2.2, .3 + Math.random() * .5, (Math.random() - .5) * 1.8]);
  const sparkles = pointsCloud(sparkPts, .13, 0xfff2b0);
  group.add(sparkles);

  let curTier = tier;
  function setTier(t) { if (t !== curTier) { curTier = t; buildPlants(t); } }

  const _c = new THREE.Color();
  function update(growth01, fert, time) {
    const wilt = THREE.MathUtils.clamp((.25 - fert) / .25, 0, 1); // 1 = fully wilted
    const grow = (.25 + .75 * growth01) * (1 - wilt * .45);
    for (const it of plantItems) {
      it.root.scale.set(1, grow * (0.92 + (it.phase % .16)), 1);
      it.root.rotation.z = wilt * .3 * it.tilt;
    }
    stemMat.color.copy(_c.set(0x7d9b4a)).lerp(new THREE.Color(0xa08b52), wilt);
    headMat.color.copy(_c.set(0xd9a94e)).lerp(new THREE.Color(0xa87f3e), wilt * .8);
    leafMat.color.copy(_c.set(0x5d8a3c)).lerp(new THREE.Color(0x8a7a3a), wilt);
    darkLeafMat.color.copy(_c.set(0x4a7038)).lerp(new THREE.Color(0x77683a), wilt);
    soilMat.color.copy(DRY_SOIL).lerp(RICH_SOIL, THREE.MathUtils.clamp(fert, 0, 1));
    crackMat.opacity = THREE.MathUtils.clamp((.32 - fert) / .32, 0, 1) * .85;
    edgeFlowers.visible = fert >= .6;
    sparkles.visible = high && fert >= .75;
    if (sparkles.visible) sparkles.position.y = Math.sin(time * 1.4) * .05;
  }
  update(0, fertility, 0);
  return { group, setTier, update };
}
