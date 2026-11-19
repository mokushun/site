// Phase 1 物理挙動テスト（Node で実行。描画なしで Rapier のみ検証する）
// 実行: npm run test:physics
import { PhysicsWorld, FIXED_TIMESTEP } from '../src/game/PhysicsWorld.js';
import { Player, PLAYER_SETTINGS } from '../src/game/Player.js';

let failureCount = 0;
function check(label, condition, detail = '') {
  if (condition) {
    console.log(`PASS  ${label} ${detail}`);
  } else {
    failureCount += 1;
    console.log(`FAIL  ${label} ${detail}`);
  }
}

function buildRoom(physicsWorld) {
  // LabEnvironment と同じ寸法の床・壁（物理のみ）。
  physicsWorld.createStaticCuboid({
    halfExtents: { x: 18, y: 0.5, z: 18 }, position: { x: 0, y: -0.5, z: 0 }, friction: 1.0,
  });
  const wallDefs = [
    { halfExtents: { x: 18.6, y: 2, z: 0.3 }, position: { x: 0, y: 2, z: -18.3 } },
    { halfExtents: { x: 18.6, y: 2, z: 0.3 }, position: { x: 0, y: 2, z: 18.3 } },
    { halfExtents: { x: 0.3, y: 2, z: 18 }, position: { x: -18.3, y: 2, z: 0 } },
    { halfExtents: { x: 0.3, y: 2, z: 18 }, position: { x: 18.3, y: 2, z: 0 } },
  ];
  for (const wallDef of wallDefs) physicsWorld.createStaticCuboid(wallDef);
}

function stepPlayer(physicsWorld, player, steps, moveDirection = { x: 0, z: 0 }, jumpSteps = new Set()) {
  for (let stepIndex = 0; stepIndex < steps; stepIndex += 1) {
    player.applyMovement(FIXED_TIMESTEP, moveDirection, jumpSteps.has(stepIndex));
    physicsWorld.step();
    player.updateGrounded();
  }
}

const physicsWorld = await PhysicsWorld.create();

// --- 1. 落下と床衝突 ---
{
  buildRoom(physicsWorld);
  const player = new Player(physicsWorld, null);
  stepPlayer(physicsWorld, player, 150);
  const position = player.getPosition();
  const velocity = player.getVelocity();
  check('落下して床で止まる', Math.abs(position.y - 0.5) < 0.06, `y=${position.y.toFixed(3)}`);
  check('落下後に速度がほぼ0', Math.abs(velocity.y) < 0.6, `vy=${velocity.y.toFixed(3)}`);
  check('接地判定が立つ', player.isGrounded === true);
  check('座標が NaN でない', Number.isFinite(position.x + position.y + position.z));

  // --- 2. 異常振動がない ---
  const ySamples = [];
  for (let i = 0; i < 60; i += 1) {
    stepPlayer(physicsWorld, player, 1);
    ySamples.push(player.getPosition().y);
  }
  const yRange = Math.max(...ySamples) - Math.min(...ySamples);
  check('静止時に振動しない', yRange < 0.02, `yRange=${yRange.toFixed(4)}`);

  // --- 3. 移動と速度上限 ---
  const startZ = player.getPosition().z;
  stepPlayer(physicsWorld, player, 60, { x: 0, z: -1 });
  const afterMove = player.getPosition();
  const moveVelocity = player.getVelocity();
  const horizontalSpeed = Math.hypot(moveVelocity.x, moveVelocity.z);
  check('入力方向へ移動する', startZ - afterMove.z > 2.5, `dz=${(startZ - afterMove.z).toFixed(2)}`);
  check('水平速度が上限以下', horizontalSpeed <= PLAYER_SETTINGS.maxSpeed + 0.05, `speed=${horizontalSpeed.toFixed(2)}`);
  check('移動中も接地を維持', player.isGrounded === true);

  // 停止: 入力を離すと減速して止まる
  stepPlayer(physicsWorld, player, 90, { x: 0, z: 0 });
  const stoppedVelocity = player.getVelocity();
  check('入力を離すと止まる', Math.hypot(stoppedVelocity.x, stoppedVelocity.z) < 0.3,
    `speed=${Math.hypot(stoppedVelocity.x, stoppedVelocity.z).toFixed(3)}`);

  // --- 4. ジャンプ（接地中のみ・二段ジャンプ不可） ---
  stepPlayer(physicsWorld, player, 1, { x: 0, z: 0 }, new Set([0]));
  const justAfterJump = player.getVelocity();
  check('ジャンプで上向き速度が付く', justAfterJump.y > 5.5, `vy=${justAfterJump.y.toFixed(2)}`);
  let maxHeight = 0;
  let doubleJumpVelocityY = null;
  for (let i = 0; i < 90; i += 1) {
    const wantsJump = i === 20; // 空中で再度ジャンプを試みる
    player.applyMovement(FIXED_TIMESTEP, { x: 0, z: 0 }, wantsJump);
    if (wantsJump) doubleJumpVelocityY = player.getVelocity().y;
    physicsWorld.step();
    player.updateGrounded();
    maxHeight = Math.max(maxHeight, player.getPosition().y);
  }
  check('ジャンプで十分な高さまで上がる', maxHeight > 1.6, `maxY=${maxHeight.toFixed(2)}`);
  check('空中で二段ジャンプできない', doubleJumpVelocityY < PLAYER_SETTINGS.jumpSpeed - 1.0,
    `vyAtAirJump=${doubleJumpVelocityY.toFixed(2)}`);
  stepPlayer(physicsWorld, player, 120);
  check('ジャンプ後に再び接地する', player.isGrounded === true && Math.abs(player.getPosition().y - 0.5) < 0.06,
    `y=${player.getPosition().y.toFixed(3)}`);

  // --- 5. 壁衝突 ---
  const wallPlayerStartZ = player.getPosition().z;
  stepPlayer(physicsWorld, player, 600, { x: 0, z: -1 });
  const wallPosition = player.getPosition();
  check('壁まで到達する', wallPosition.z < -16.0, `z=${wallPosition.z.toFixed(2)} (start ${wallPlayerStartZ.toFixed(1)})`);
  check('壁をすり抜けない', wallPosition.z > -17.6, `z=${wallPosition.z.toFixed(2)}`);

  // --- 6. 高速移動でも床・壁を抜けない（CCD） ---
  player.body.setTranslation({ x: 0, y: 0.5, z: 0 }, true);
  player.body.setLinvel({ x: 0, y: 0, z: -80 }, true);
  for (let i = 0; i < 30; i += 1) {
    physicsWorld.step();
    const posNow = player.getPosition();
    if (!(posNow.z > -17.7 && posNow.y > 0.2)) {
      check('高速移動ですり抜けない', false, `z=${posNow.z.toFixed(2)} y=${posNow.y.toFixed(2)} step=${i}`);
      break;
    }
    if (i === 29) check('高速移動ですり抜けない', true, `z=${posNow.z.toFixed(2)}`);
  }

  player.dispose(null);
}

physicsWorld.dispose();
console.log(failureCount === 0 ? '\nALL PHYSICS TESTS PASSED' : `\n${failureCount} TEST(S) FAILED`);
process.exit(failureCount === 0 ? 0 : 1);
