// Phase 5 テスト（Node、描画なし）: ランク評価、セーブの読み書きと検証、
// ステージ解放、クリスタル収集判定を検証する。
// 実行: npm run test:phase5
import { evaluateRank, isBetterRank } from '../src/game/Rank.js';
import { SaveManager, SAVE_KEY, SAVE_VERSION } from '../src/game/SaveManager.js';
import { Crystal } from '../src/objects/Crystal.js';
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

function createStubStorage() {
  const entries = new Map();
  return {
    getItem: (key) => (entries.has(key) ? entries.get(key) : null),
    setItem: (key, value) => { entries.set(key, String(value)); },
    entries,
  };
}

// --- ランク評価 ---
const rankBase = { crystalsTotal: 3, targetTimeSeconds: 90, rankACrystals: 2 };
check('S: 目標以内＋全収集', evaluateRank({ ...rankBase, timeSeconds: 80, crystalsCollected: 3 }) === 'S');
check('S: 目標ちょうど＋全収集', evaluateRank({ ...rankBase, timeSeconds: 90, crystalsCollected: 3 }) === 'S');
check('A: 目標以内＋2個', evaluateRank({ ...rankBase, timeSeconds: 80, crystalsCollected: 2 }) === 'A');
check('B: 目標以内でも1個は B', evaluateRank({ ...rankBase, timeSeconds: 80, crystalsCollected: 1 }) === 'B');
check('B: 全収集でも目標超過は B', evaluateRank({ ...rankBase, timeSeconds: 91, crystalsCollected: 3 }) === 'B');
check('B: 目標超過＋0個', evaluateRank({ ...rankBase, timeSeconds: 200, crystalsCollected: 0 }) === 'B');
check('ランク比較 S>A>B', isBetterRank('S', 'A') && isBetterRank('A', 'B') && !isBetterRank('B', 'A') && isBetterRank('B', null));

// --- ステージデータに目標タイムがある ---
check('全ステージに目標タイムとA条件がある', STAGES.every(
  (s) => Number.isFinite(s.targetTimeSeconds) && s.targetTimeSeconds > 0
    && Number.isFinite(s.rankACrystals) && s.rankACrystals >= 1,
));

// --- セーブ: 初期状態 ---
{
  const manager = new SaveManager(5, createStubStorage());
  check('初期はステージ1のみ解放', manager.isUnlocked(0) && !manager.isUnlocked(1));
  check('初期は記録なし', manager.getRecord(0) === null);
}

// --- セーブ: クリア記録と解放 ---
{
  const storage = createStubStorage();
  const manager = new SaveManager(5, storage);
  const first = manager.recordClear(0, { timeSeconds: 80, crystalsCollected: 3, rank: 'S' });
  check('クリアで次ステージ解放', first.unlockedNewStage === true && manager.isUnlocked(1));
  check('初回はベストタイム', first.isNewBestTime === true && first.record.bestTimeSeconds === 80);
  check('保存される', first.saved === true && storage.entries.has(SAVE_KEY));

  const slower = manager.recordClear(0, { timeSeconds: 95, crystalsCollected: 1, rank: 'B' });
  check('遅い記録はベストを上書きしない', slower.isNewBestTime === false
    && slower.record.bestTimeSeconds === 80 && slower.record.bestRank === 'S'
    && slower.record.bestCrystals === 3);
  check('再クリアでは解放は新規でない', slower.unlockedNewStage === false);

  const faster = manager.recordClear(0, { timeSeconds: 70, crystalsCollected: 2, rank: 'A' });
  check('速い記録はベスト更新、ランクは S を保持', faster.isNewBestTime === true
    && faster.record.bestTimeSeconds === 70 && faster.record.bestRank === 'S');

  // 別インスタンスで読み直しても残る（ブラウザ再起動相当）。
  const reloaded = new SaveManager(5, storage);
  check('再読み込みで記録が残る', reloaded.getRecord(0)?.bestTimeSeconds === 70
    && reloaded.getRecord(0)?.bestRank === 'S' && reloaded.isUnlocked(1));

  // 最終ステージのクリアでは解放は増えない。
  const last = new SaveManager(5, createStubStorage());
  last.recordClear(4, { timeSeconds: 10, crystalsCollected: 3, rank: 'S' });
  check('最終面クリアで解放数は上限を超えない', last.getUnlockedStageCount() <= 5);
}

// --- セーブ: 不正データでも起動できる ---
{
  const broken = createStubStorage();
  broken.setItem(SAVE_KEY, '{not json');
  check('壊れたJSONはデフォルトに戻る', new SaveManager(5, broken).isUnlocked(0));

  const oldVersion = createStubStorage();
  oldVersion.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION + 99, unlockedStageCount: 5, stages: {} }));
  check('旧/未来バージョンはデフォルトに戻る', !new SaveManager(5, oldVersion).isUnlocked(1));

  const weird = createStubStorage();
  weird.setItem(SAVE_KEY, JSON.stringify({
    version: SAVE_VERSION,
    unlockedStageCount: 99,
    stages: { 0: { bestTimeSeconds: 'abc', bestRank: 'X', bestCrystals: 2 }, 9: { bestRank: 'S' } },
  }));
  const sanitized = new SaveManager(5, weird);
  check('解放数はステージ数に丸められる', sanitized.getUnlockedStageCount() === 5);
  check('不正な記録フィールドは落とされる', sanitized.getRecord(0)?.bestTimeSeconds === undefined
    && sanitized.getRecord(0)?.bestRank === undefined && sanitized.getRecord(0)?.bestCrystals === 2);
}

// --- セーブ: 保存失敗でも継続できる ---
{
  const failingStorage = {
    getItem: () => null,
    setItem: () => { throw new Error('QuotaExceeded'); },
  };
  const manager = new SaveManager(5, failingStorage);
  const outcome = manager.recordClear(0, { timeSeconds: 50, crystalsCollected: 3, rank: 'S' });
  check('保存失敗でも記録処理は完了し saved=false', outcome.saved === false
    && outcome.record.bestRank === 'S' && manager.isUnlocked(1));
}

// --- クリスタル収集 ---
{
  const crystal = new Crystal({ position: { x: 0, y: 1, z: 0 } }, null);
  check('遠くでは収集されない', crystal.tryCollect({ x: 5, y: 1, z: 0 }) === false && !crystal.collected);
  check('範囲内で収集される', crystal.tryCollect({ x: 0.5, y: 1.2, z: 0 }) === true && crystal.collected);
  check('二重収集しない', crystal.tryCollect({ x: 0, y: 1, z: 0 }) === false);
}

console.log(failureCount === 0 ? '\nALL PHASE5 TESTS PASSED' : `\n${failureCount} TEST(S) FAILED`);
process.exit(failureCount === 0 ? 0 : 1);
