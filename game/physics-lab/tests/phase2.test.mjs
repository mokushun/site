// Phase 2 テスト（Node、描画なし）: ブースト、チェックポイント、
// リスポーン、落下判定、タイマー書式を検証する。
// 実行: npm run test:phase2
import { PhysicsWorld, FIXED_TIMESTEP } from '../src/game/PhysicsWorld.js';
import { Player, FALL_THRESHOLD_Y } from '../src/game/Player.js';
import { BoostController, BOOST_SETTINGS } from '../src/game/BoostController.js';
import { CheckpointManager } from '../src/game/CheckpointManager.js';
import { formatElapsedTime } from '../src/ui/HUD.js';

let failureCount = 0;
function check(label, condition, detail = '') {
  if (condition) {
    console.log(`PASS  ${label} ${detail}`);
  } else {
    failureCount += 1;
    console.log(`FAIL  ${label} ${detail}`);
  }
}

// --- ブーストゲージ（単体） ---
{
  const boost = new BoostController();
  check('ゲージ初期値は満タン', boost.gauge === 100);
  let boostingNow = false;
  for (let i = 0; i < 60; i += 1) boostingNow = boost.update(FIXED_TIMESTEP, true, true);
  check('使用中はブースト有効', boostingNow === true);
  check('1秒使用でゲージが減る', boost.gauge > 55 && boost.gauge < 65, `gauge=${boost.gauge.toFixed(1)}`);
  for (let i = 0; i < 120; i += 1) boostingNow = boost.update(FIXED_TIMESTEP, true, true);
  check('ゲージが尽きたらブースト無効', boostingNow === false && boost.gauge === 0, `gauge=${boost.gauge}`);
  // 回復: 遅延内は回復せず、その後は回復する
  const gaugeBeforeDelay = boost.gauge;
  for (let i = 0; i < 18; i += 1) boost.update(FIXED_TIMESTEP, false, false); // 0.3秒
  check('回復遅延内は回復しない', boost.gauge === gaugeBeforeDelay, `gauge=${boost.gauge}`);
  for (let i = 0; i < 120; i += 1) boost.update(FIXED_TIMESTEP, false, false); // +2秒
  check('待つとゲージが回復する', boost.gauge > 25, `gauge=${boost.gauge.toFixed(1)}`);
  // 移動入力なしでは消費しない
  const boostIdle = new BoostController();
  boostIdle.update(FIXED_TIMESTEP, true, false);
  check('移動入力なしでは消費しない', boostIdle.gauge === 100 && boostIdle.isBoosting === false);
}

// --- 物理あり: ブースト速度・リスポーン・落下判定 ---
const physicsWorld = await PhysicsWorld.create();
physicsWorld.createStaticCuboid({
  halfExtents: { x: 30, y: 0.5, z: 30 }, position: { x: 0, y: -0.5, z: 0 }, friction: 1.0,
});
{
  const player = new Player(physicsWorld, null);
  const step = (steps, move, jump = false, boostKey = false) => {
    for (let i = 0; i < steps; i += 1) {
      player.applyMovement(FIXED_TIMESTEP, move, jump && i === 0, boostKey);
      physicsWorld.step();
      player.updateGrounded();
    }
  };
  step(120, { x: 0, z: 0 }); // 落下して静止
  check('初期位置で接地', player.isGrounded === true);

  step(60, { x: 0, z: -1 }, false, true); // ブーストしながら前進1秒
  const boostVelocity = player.getVelocity();
  const boostSpeed = Math.hypot(boostVelocity.x, boostVelocity.z);
  check('ブースト時は通常上限を超える', boostSpeed > 9.5, `speed=${boostSpeed.toFixed(2)}`);
  check('ブースト上限以下', boostSpeed <= BOOST_SETTINGS.boostMaxSpeed + 0.1, `speed=${boostSpeed.toFixed(2)}`);
  check('ブーストでゲージ消費', player.boost.gauge < 70, `gauge=${player.boost.gauge.toFixed(1)}`);

  // リスポーン: 位置・速度・角速度がリセットされる
  player.respawnTo({ x: 5, y: 0.65, z: -3, yawRadians: 0 });
  const respawnPosition = player.getPosition();
  const respawnVelocity = player.getVelocity();
  check('リスポーン位置へ移動', Math.abs(respawnPosition.x - 5) < 0.01 && Math.abs(respawnPosition.z + 3) < 0.01,
    `pos=${respawnPosition.x.toFixed(2)},${respawnPosition.z.toFixed(2)}`);
  check('リスポーンで速度ゼロ', Math.hypot(respawnVelocity.x, respawnVelocity.y, respawnVelocity.z) < 0.001);
  step(90, { x: 0, z: 0 });
  check('リスポーン後に床で静止', player.isGrounded === true && Math.abs(player.getPosition().y - 0.5) < 0.06,
    `y=${player.getPosition().y.toFixed(3)}`);

  // 落下判定
  check('通常位置では落下扱いしない', player.hasFallenBelow() === false);
  player.body.setTranslation({ x: 0, y: FALL_THRESHOLD_Y - 2, z: 0 }, true);
  check('閾値以下で落下扱い', player.hasFallenBelow() === true, `threshold=${FALL_THRESHOLD_Y}`);
  player.dispose(null);
}

// --- チェックポイント管理 ---
{
  const manager = new CheckpointManager(null);
  manager.addCheckpoint({ id: 'a', name: 'A', position: { x: 0, y: 0, z: 6 }, yawRadians: 0 });
  manager.addCheckpoint({ id: 'b', name: 'B', position: { x: 0, y: 0, z: -10 }, yawRadians: Math.PI });
  manager.addCheckpoint({ id: 'c', name: 'C', position: { x: -8, y: 1.9, z: -17 }, yawRadians: 0 });

  check('初期チェックポイントが有効', manager.activeCheckpoint.id === 'a');
  check('進捗は 1/3', manager.getProgress().current === 1 && manager.getProgress().total === 3);
  const farResult = manager.update({ x: 10, y: 0.5, z: 10 });
  check('範囲外では切り替わらない', farResult === null && manager.activeCheckpoint.id === 'a');
  const nearResult = manager.update({ x: 0.4, y: 0.5, z: -9.2 });
  check('範囲内で B が有効化', nearResult !== null && nearResult.id === 'b' && manager.activeCheckpoint.id === 'b');
  const respawnPoint = manager.getRespawnPoint();
  check('復帰地点は B', respawnPoint.z === -10 && Math.abs(respawnPoint.y - 0.65) < 0.001 && respawnPoint.yawRadians === Math.PI,
    `y=${respawnPoint.y}`);
  const againResult = manager.update({ x: 0, y: 0.5, z: -10 });
  check('有効中の再入では何も起きない', againResult === null);
  const highResult = manager.update({ x: -8, y: 2.4, z: -17 });
  check('高さのある C も有効化できる', highResult !== null && highResult.id === 'c');
  const wrongHeight = new CheckpointManager(null);
  wrongHeight.addCheckpoint({ id: 'a', name: 'A', position: { x: 0, y: 0, z: 6 }, yawRadians: 0 });
  wrongHeight.addCheckpoint({ id: 'c', name: 'C', position: { x: -8, y: 1.9, z: -17 }, yawRadians: 0 });
  const groundResult = wrongHeight.update({ x: -8, y: 0.5, z: -17 });
  check('真下の地面からは高所CPを誤認しない', groundResult === null);
}

// --- タイマー書式 ---
check('時刻書式 0秒', formatElapsedTime(0) === '00:00.0', formatElapsedTime(0));
check('時刻書式 65.27秒', formatElapsedTime(65.27) === '01:05.2', formatElapsedTime(65.27));
check('時刻書式 600秒', formatElapsedTime(600) === '10:00.0', formatElapsedTime(600));

physicsWorld.dispose();
console.log(failureCount === 0 ? '\nALL PHASE2 TESTS PASSED' : `\n${failureCount} TEST(S) FAILED`);
process.exit(failureCount === 0 ? 0 : 1);
