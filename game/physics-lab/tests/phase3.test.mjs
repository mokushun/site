// Phase 3 テスト（Node、描画なし）: ギミック6種を個別の小さな環境で検証する。
// 実行: npm run test:phase3
import { PhysicsWorld, FIXED_TIMESTEP } from '../src/game/PhysicsWorld.js';
import { Player } from '../src/game/Player.js';
import { PlatformCarrier } from '../src/game/PlatformCarrier.js';
import { JumpPad } from '../src/objects/JumpPad.js';
import { RotatingPlatform } from '../src/objects/RotatingPlatform.js';
import { MovingPlatform } from '../src/objects/MovingPlatform.js';
import { WindZone } from '../src/objects/WindZone.js';
import { Magnet } from '../src/objects/Magnet.js';
import { Seesaw } from '../src/objects/Seesaw.js';

let failureCount = 0;
function check(label, condition, detail = '') {
  if (condition) {
    console.log(`PASS  ${label} ${detail}`);
  } else {
    failureCount += 1;
    console.log(`FAIL  ${label} ${detail}`);
  }
}

function addFloor(physicsWorld, friction = 0.9) {
  physicsWorld.createStaticCuboid({
    halfExtents: { x: 30, y: 0.5, z: 30 }, position: { x: 0, y: -0.5, z: 0 }, friction,
  });
}

function placeBall(player, x, y, z) {
  player.body.setTranslation({ x, y, z }, true);
  player.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  player.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

// --- 1. JumpPad ---
{
  const world = await PhysicsWorld.create();
  addFloor(world);
  const pad = new JumpPad({ position: { x: 0, y: 0, z: 0 }, power: 13 }, null);
  const player = new Player(world, null);
  placeBall(player, 0, 1.2, 0);

  let firedCount = 0;
  let maxVelocityY = 0;
  let maxHeight = 0;
  for (let i = 0; i < 40; i += 1) {
    if (pad.preStep(FIXED_TIMESTEP, player)) firedCount += 1;
    world.step();
    player.updateGrounded();
    maxVelocityY = Math.max(maxVelocityY, player.getVelocity().y);
    maxHeight = Math.max(maxHeight, player.getPosition().y);
  }
  check('ジャンプ台が発動する', firedCount >= 1, `fired=${firedCount}`);
  check('上向き速度が強さ通り', maxVelocityY > 11, `vy=${maxVelocityY.toFixed(2)}`);
  check('高く跳ぶ', maxHeight > 4, `maxY=${maxHeight.toFixed(2)}`);

  // 多重発動防止: クールダウン中は台の上に留めても再発動しない。
  const pad2 = new JumpPad({ position: { x: 0, y: 0, z: 0 }, power: 13, cooldownSeconds: 0.6 }, null);
  placeBall(player, 0, 0.6, 0);
  let fired2 = 0;
  for (let i = 0; i < 30; i += 1) { // 0.5秒（クールダウン 0.6秒の内側）
    placeBall(player, 0, 0.6, 0);
    if (pad2.preStep(FIXED_TIMESTEP, player)) fired2 += 1;
    world.step();
  }
  check('クールダウン中は再発動しない（初回のみ）', fired2 === 1, `fired=${fired2}`);
  let fired3 = 0;
  for (let i = 0; i < 30; i += 1) { // さらに0.5秒（累計1.0秒 > 0.6秒）
    placeBall(player, 0, 0.6, 0);
    if (pad2.preStep(FIXED_TIMESTEP, player)) fired3 += 1;
    world.step();
  }
  check('クールダウン後は再発動する', fired3 >= 1, `fired=${fired3}`);
  player.dispose(null);
  world.dispose();
}

// --- 2. RotatingPlatform ---
{
  const world = await PhysicsWorld.create();
  addFloor(world);
  const platform = new RotatingPlatform(world, {
    position: { x: 0, y: 0.05, z: 0 }, radius: 3, thickness: 0.5, angularSpeed: 0.5,
  }, null);
  const carrier = new PlatformCarrier(world);
  carrier.register(platform);
  const player = new Player(world, null);
  placeBall(player, 2, 1.4, 0);
  for (let i = 0; i < 40; i += 1) { world.step(); player.updateGrounded(); carrier.updateSupport(player); }
  const startPos = player.getPosition();
  const startAngle = Math.atan2(startPos.z, startPos.x);
  for (let i = 0; i < 180; i += 1) {
    platform.preStep(FIXED_TIMESTEP);
    carrier.applyCarry(player);
    world.step();
    player.updateGrounded();
    carrier.updateSupport(player);
  }
  const endPos = player.getPosition();
  const endAngle = Math.atan2(endPos.z, endPos.x);
  let angleDelta = endAngle - startAngle;
  while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
  while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
  const distanceFromCenter = Math.hypot(endPos.x, endPos.z);
  // Rapier の Y 回転は atan2(z,x) では負方向に進む。運搬補助により
  // プラットフォームの回転（-1.50 rad）に近い角度まで運ばれること。
  check('回転床が球体を運ぶ（角度が変わる）', angleDelta < -1.0,
    `dAngle=${angleDelta.toFixed(2)} rad (platform -1.50 rad)`);
  check('球体が床から落ちない', distanceFromCenter < 3.3 && endPos.y > 0.55 && endPos.y < 1.15,
    `dist=${distanceFromCenter.toFixed(2)} y=${endPos.y.toFixed(2)}`);
  player.dispose(null);
  platform.dispose(null, world);
  world.dispose();
}

// --- 3. MovingPlatform ---
{
  const world = await PhysicsWorld.create();
  addFloor(world);
  const platform = new MovingPlatform(world, {
    from: { x: 0, y: 1.0, z: 0 }, to: { x: 8, y: 1.0, z: 0 }, speed: 3, waitSeconds: 0.5,
  }, null);
  const carrier = new PlatformCarrier(world);
  carrier.register(platform);
  const player = new Player(world, null);
  placeBall(player, 0, 2.2, 0);
  // 落下中はプラットフォームを動かさず、乗ってから運ぶ様子を見る。
  for (let i = 0; i < 30; i += 1) { world.step(); player.updateGrounded(); carrier.updateSupport(player); }
  const settledY = player.getPosition().y;
  for (let i = 0; i < 120; i += 1) {
    platform.preStep(FIXED_TIMESTEP);
    carrier.applyCarry(player);
    world.step();
    player.updateGrounded();
    carrier.updateSupport(player);
  }
  const carriedPos = player.getPosition();
  check('移動床に乗って運ばれる', carriedPos.x > 3.5, `ballX=${carriedPos.x.toFixed(2)} platformX=${platform.currentPosition.x.toFixed(2)}`);
  check('運ばれている間も上に留まる', Math.abs(carriedPos.y - settledY) < 0.3,
    `y=${carriedPos.y.toFixed(2)} settledY=${settledY.toFixed(2)}`);
  const peakPlatformX = platform.currentPosition.x;
  for (let i = 0; i < 300; i += 1) { platform.preStep(FIXED_TIMESTEP); world.step(); }
  check('端で折り返す', platform.currentPosition.x < peakPlatformX - 1.5,
    `peak=${peakPlatformX.toFixed(2)} now=${platform.currentPosition.x.toFixed(2)}`);
  player.dispose(null);
  platform.dispose(null, world);
  world.dispose();
}

// --- 4. WindZone ---
{
  const world = await PhysicsWorld.create();
  addFloor(world);
  const wind = new WindZone({
    center: { x: 0, y: 3, z: 0 }, size: { x: 4, y: 6, z: 4 },
    direction: { x: 0, y: 1, z: 0 }, strength: 24,
  }, null);
  const player = new Player(world, null);
  placeBall(player, 0, 0.6, 0);
  let maxHeight = 0;
  for (let i = 0; i < 90; i += 1) {
    wind.preStep(FIXED_TIMESTEP, player);
    world.step();
    maxHeight = Math.max(maxHeight, player.getPosition().y);
  }
  check('上昇気流で球体が浮き上がる', maxHeight > 2.5, `maxY=${maxHeight.toFixed(2)}`);

  placeBall(player, 10, 0.6, 0);
  for (let i = 0; i < 60; i += 1) { wind.preStep(FIXED_TIMESTEP, player); world.step(); player.updateGrounded(); }
  check('範囲外は影響を受けない', player.isGrounded && Math.abs(player.getPosition().y - 0.5) < 0.06,
    `y=${player.getPosition().y.toFixed(3)}`);

  wind.enabled = false;
  placeBall(player, 0, 0.6, 0);
  for (let i = 0; i < 30; i += 1) { wind.preStep(FIXED_TIMESTEP, player); world.step(); player.updateGrounded(); }
  check('無効化すると働かない', player.isGrounded && Math.abs(player.getPosition().y - 0.5) < 0.06);
  player.dispose(null);
  world.dispose();
}

// --- 5. Magnet ---
{
  const world = await PhysicsWorld.create();
  addFloor(world, 0.15);
  const magnet = new Magnet({ position: { x: 0, y: 1, z: 0 }, radius: 6, strength: 26, polarity: 'attract' }, null);

  const accelNear = magnet.computeAccel({ x: 1, y: 0.5, z: 0 });
  const accelFar = magnet.computeAccel({ x: 8, y: 0.5, z: 0 });
  const accelDead = magnet.computeAccel({ x: 0.3, y: 0.8, z: 0 });
  check('加速度に上限がある', Math.hypot(accelNear.x, accelNear.y, accelNear.z) <= 30.01,
    `|a|=${Math.hypot(accelNear.x, accelNear.y, accelNear.z).toFixed(1)}`);
  check('範囲外はゼロ', accelFar.x === 0 && accelFar.y === 0 && accelFar.z === 0);
  check('中心デッドゾーンはゼロ', accelDead.x === 0 && accelDead.y === 0 && accelDead.z === 0);
  check('引力は中心方向', accelNear.x < 0, `ax=${accelNear.x.toFixed(1)}`);

  const player = new Player(world, null);
  placeBall(player, 4.5, 0.5, 0);
  const startDistance = Math.hypot(4.5, 0);
  for (let i = 0; i < 120; i += 1) { magnet.preStep(FIXED_TIMESTEP, player); world.step(); }
  const attractedPos = player.getPosition();
  const attractedDistance = Math.hypot(attractedPos.x, attractedPos.z);
  check('引力で引き寄せられる', attractedDistance < startDistance - 1.2,
    `dist ${startDistance.toFixed(1)} -> ${attractedDistance.toFixed(2)}`);

  const repelMagnet = new Magnet({ position: { x: 0, y: 1, z: 0 }, radius: 6, strength: 26, polarity: 'repel' }, null);
  placeBall(player, 2.5, 0.5, 0);
  for (let i = 0; i < 90; i += 1) { repelMagnet.preStep(FIXED_TIMESTEP, player); world.step(); }
  const repelledPos = player.getPosition();
  const repelledDistance = Math.hypot(repelledPos.x, repelledPos.z);
  check('斥力で押し出される', repelledDistance > 3.4, `dist 2.5 -> ${repelledDistance.toFixed(2)}`);
  player.dispose(null);
  world.dispose();
}

// --- 6. Seesaw ---
{
  const world = await PhysicsWorld.create();
  addFloor(world);
  const seesaw = new Seesaw(world, { position: { x: 0, y: 0, z: 0 } }, null);
  for (let i = 0; i < 90; i += 1) world.step();
  check('無負荷では水平を保つ', Math.abs(seesaw.getTiltAngle()) < 0.03,
    `tilt=${seesaw.getTiltAngle().toFixed(3)}`);

  const player = new Player(world, null);
  placeBall(player, 2.2, 2.6, 0);
  for (let i = 0; i < 300; i += 1) world.step();
  const tilt = seesaw.getTiltAngle();
  check('球の重みで傾く', tilt < -0.07, `tilt=${tilt.toFixed(3)} rad`);
  check('傾きが暴走しない', Math.abs(tilt) < 0.6, `tilt=${tilt.toFixed(3)}`);
  const plankPos = seesaw.body.translation();
  check('支点から外れない', Math.hypot(plankPos.x, plankPos.z) < 0.35 && Math.abs(plankPos.y - 0.74) < 0.2,
    `plank=(${plankPos.x.toFixed(2)}, ${plankPos.y.toFixed(2)}, ${plankPos.z.toFixed(2)})`);
  const ballPos = player.getPosition();
  // 傾いた板から球が転がり落ち、板端が床に着いて傾きが安定するのが
  // シーソーの自然な挙動。球は板の外側の床で静止する。
  check('球は転がり落ちて床で静止する', ballPos.x > 3.1 && Math.abs(ballPos.y - 0.5) < 0.12,
    `ball=(${ballPos.x.toFixed(2)}, ${ballPos.y.toFixed(2)})`);
  player.dispose(null);
  seesaw.dispose(null, world);
  world.dispose();
}

console.log(failureCount === 0 ? '\nALL PHASE3 TESTS PASSED' : `\n${failureCount} TEST(S) FAILED`);
process.exit(failureCount === 0 ? 0 : 1);
