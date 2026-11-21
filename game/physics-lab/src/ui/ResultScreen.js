import { formatElapsedTime } from './HUD.js';

// リザルト画面（Phase 5）。クリア時のタイム・クリスタル数・リスポーン回数と
// ランクを表示し、再挑戦 / 次ステージ / ステージ選択への導線を持つ。
// ゲーム状態の変更は Game 側のコールバックで行う。
export class ResultScreen {
  constructor({ onRetry, onNext, onSelectStage }) {
    this.onSelectStage = onSelectStage;
    this.rootElement = document.getElementById('result-screen');
    this.stageNameElement = document.getElementById('result-stage-name');
    this.rankElement = document.getElementById('result-rank');
    this.timeElement = document.getElementById('result-time');
    this.crystalsElement = document.getElementById('result-crystals');
    this.respawnElement = document.getElementById('result-respawn');
    this.bestElement = document.getElementById('result-best');
    this.noteElement = document.getElementById('result-note');
    this.conditionsElement = document.getElementById('result-conditions');
    this.nextButton = document.getElementById('result-next');
    this.stageSelectElement = document.getElementById('result-stage-select');
    this.isVisible = false;

    const retryButton = document.getElementById('result-retry');
    if (retryButton) retryButton.addEventListener('click', () => onRetry());
    if (this.nextButton) this.nextButton.addEventListener('click', () => onNext());
  }

  // result: {
  //   stageName, rank, timeSeconds, crystalsCollected, crystalsTotal,
  //   respawnCount, bestTimeSeconds|null, isNewBestTime, unlockedNewStage,
  //   saved, hasNext, targetTimeSeconds, rankACrystals,
  //   stageButtons: [{ index, name, locked, bestRank|null }]
  // }
  show(result) {
    this.isVisible = true;
    if (this.stageNameElement) this.stageNameElement.textContent = result.stageName;
    if (this.rankElement) {
      this.rankElement.textContent = result.rank;
      this.rankElement.dataset.rank = result.rank;
    }
    if (this.timeElement) this.timeElement.textContent = formatElapsedTime(result.timeSeconds);
    if (this.crystalsElement) {
      this.crystalsElement.textContent = `${result.crystalsCollected} / ${result.crystalsTotal}`;
    }
    if (this.respawnElement) this.respawnElement.textContent = String(result.respawnCount);
    if (this.bestElement) {
      this.bestElement.textContent = result.bestTimeSeconds !== null && result.bestTimeSeconds !== undefined
        ? formatElapsedTime(result.bestTimeSeconds)
        : '—';
    }
    if (this.conditionsElement) {
      this.conditionsElement.textContent =
        `S: ${formatElapsedTime(result.targetTimeSeconds)} 以内 + クリスタル全収集　` +
        `A: ${formatElapsedTime(result.targetTimeSeconds)} 以内 + クリスタル ${result.rankACrystals} 個以上`;
    }
    if (this.noteElement) {
      const notes = [];
      if (result.isNewBestTime) notes.push('ベストタイム更新!');
      if (result.unlockedNewStage) notes.push('次のステージが解放されました');
      if (!result.saved) notes.push('セーブに失敗しました（今回の記録は保存されません）');
      this.noteElement.textContent = notes.join('　');
    }
    if (this.nextButton) {
      this.nextButton.style.display = result.hasNext ? '' : 'none';
    }
    this.buildStageButtons(result.stageButtons);
    if (this.rootElement) this.rootElement.hidden = false;
  }

  buildStageButtons(stageButtons) {
    if (!this.stageSelectElement) return;
    this.stageSelectElement.innerHTML = '';
    for (const entry of stageButtons ?? []) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'result-stage-button';
      if (entry.locked) {
        button.textContent = `${entry.index + 1} 🔒`;
        button.disabled = true;
      } else {
        button.textContent = entry.bestRank
          ? `${entry.index + 1} ${entry.name} [${entry.bestRank}]`
          : `${entry.index + 1} ${entry.name}`;
        button.addEventListener('click', () => this.onSelectStage(entry.index));
      }
      this.stageSelectElement.appendChild(button);
    }
  }

  hide() {
    this.isVisible = false;
    if (this.rootElement) this.rootElement.hidden = true;
  }
}
