// ランク評価（Phase 5、仕様 §8）。純粋関数として Node テスト可能に保つ。
//   S: 目標タイム以内 かつ クリスタル全収集
//   A: 目標タイム以内 かつ クリスタルが rankACrystals 個以上
//   B: 通常クリア（上記以外）
// 目標タイムと A の必要個数はステージ定義データ側で調整する。
export const RANK_ORDER = { B: 0, A: 1, S: 2 };

export function evaluateRank({ timeSeconds, crystalsCollected, crystalsTotal, targetTimeSeconds, rankACrystals }) {
  const withinTarget = timeSeconds <= targetTimeSeconds;
  if (withinTarget && crystalsCollected >= crystalsTotal) return 'S';
  if (withinTarget && crystalsCollected >= rankACrystals) return 'A';
  return 'B';
}

// candidate が current より良いランクか（current が未記録なら常に true）。
export function isBetterRank(candidate, current) {
  if (current === null || current === undefined) return true;
  return (RANK_ORDER[candidate] ?? 0) > (RANK_ORDER[current] ?? 0);
}
