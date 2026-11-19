// Phase 4 テスト（Node、描画なし）: ステージ定義データの妥当性と、
// StageLoader が全5ステージを同じコードで構築できることを検証する。
// 実行: npm run test:phase4
import { PhysicsWorld, FIXED_TIMESTEP } from '../src/game/PhysicsWorld.js';
import { Player } from '../src/game/Player.js';
import { CheckpointManager } from '../src/game/CheckpointManager.js';
import { StageLoader } from '../src/game/StageLoader.js';
import { Goal } from '../src/objects/Goal.js';
import { STAGES } from '../src/data/stages.js';

let failureCount = 0;
function check(label, condition, detail = '') {
  if (condition) {
    console.log(`PASS  ${label} ${detail}`);
  } else {
    failureCount += 1;
    console.log(`FAIL  ${label} ${detail}`);
  }
}

check('ステージは5面ある', STAGES.length === 5, `count=${STAGES.length}`);

// --- データ妥当性 ---
for (const stage of STAGES) {
  const problems = [];
  if (!stage.playerStart) problems.push('playerStart なし');
  if (!stage.goal) problems.push('goal なし');
  if (!Array.isArray(stage.checkpoints) || stage.checkpoints.length < 2) problems.push('checkpoints が2未満');
  if (!Array.isArray(stage.boxes) || stage.boxes.length === 0) problems.push('boxes なし');
  const allPositions = [
    ...(stage.boxes ?? []).map((b) => b.position),
    ...(stage.checkpoints ?? []).map((c) => c.position),
    stage.goal?.position,
    stage.playerStart?.position,
  ];
  if (allPositions.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z))) {
    problems.push('有限でない座標がある');
  }
  // 最初のチェックポイントはスタート地点と一致すること（復帰地点の整合）。
  const start = stage.playerStart?.position;
  const firstCp = stage.checkpoints?.[0]?.position;
  if (start && firstCp && (start.x !== firstCp.x || start.y !== firstCp.y || start.z !== firstCp.z)) {
    problems.push('最初のCPとスタート地点が不一致');
  }
  check(`データ妥当性 ${stage.id} ${stage.name}`, problems.length === 0, problems.join('; '));
}

// --- 全ステージ構築＋開始地点の接地＋破棄 ---
for (const stage of STAGES) {
  const world = await PhysicsWorld.create();
  const checkpointManager = new CheckpointManager(null);
  const loader = new StageLoader(world, null);
  let loaded = null;
  let buildError = null;
  try {
    loaded = loader.load(stage, checkpointManager);
  } catch (error) {
    buildError = error;
  }
  check(`構築できる ${stage.id}`, buildError === null && loaded !== null,
    buildError ? String(buildError).slice(0, 120) : `gimmicks=${loaded.gimmicks.length} crystals=${loaded.crystals.length}`);
  if (!loaded) { world.dispose(); continue; }

  const player = new Player(world, null);
  const start = loaded.playerStart;
  player.respawnTo({ x: start.position.x, y: start.position.y, z: start.position.z, yawRadians: start.yawRadians });
  for (let i = 0; i < 90; i += 1) {
    for (const gimmick of loaded.gimmicks) {
      if (typeof gimmick.preStep === 'function') gimmick.preStep(FIXED_TIMESTEP, player);
    }
    world.step();
    player.updateGrounded();
  }
  const pos = player.getPosition();
  check(`開始地点で接地する ${stage.id}`, player.isGrounded && !player.hasFallenBelow(),
    `pos=(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}) grounded=${player.isGrounded}`);
  check(`チェックポイント登録 ${stage.id}`,
    checkpointManager.getProgress().total === stage.checkpoints.length
    && checkpointManager.getProgress().current === 1,
    `progress=${JSON.stringify(checkpointManager.getProgress())}`);

  player.dispose(null);
  loader.dispose();
  checkpointManager.dispose();
  world.dispose();
}

// --- ゴール判定 ---
{
  const goal = new Goal({ position: { x: 5, y: 2, z: 5 } }, null);
  check('ゴール範囲内は到達', goal.checkReached({ x: 5.5, y: 2.5, z: 5 }) === true);
  check('ゴール範囲外は未達', goal.checkReached({ x: 9, y: 2.5, z: 5 }) === false);
  check('ゴール上空すぎは未達', goal.checkReached({ x: 5, y: 6, z: 5 }) === false);
}

console.log(failureCount === 0 ? '\nALL PHASE4 TESTS PASSED' : `\n${failureCount} TEST(S) FAILED`);
process.exit(failureCount === 0 ? 0 : 1);
