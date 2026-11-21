// HUD（Phase 2）: 左上にステージ・進行状況、右上にタイムとリスポーン回数、
// 右下にブーストゲージ、左下に操作ガイド、中央付近に通知を表示する。
// クリスタル数・ランクは Phase 5 で追加する。
export function formatElapsedTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((totalSeconds * 10) % 10);
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}.${tenths}`;
}

export class HUD {
  constructor() {
    this.loadingElement = document.getElementById('hud-loading');
    this.hintElement = document.getElementById('hud-hint');
    this.errorElement = document.getElementById('hud-error');
    this.debugElement = document.getElementById('hud-debug');
    this.timeElement = document.getElementById('hud-time');
    this.respawnElement = document.getElementById('hud-respawn');
    this.progressElement = document.getElementById('hud-progress');
    this.boostFillElement = document.getElementById('hud-boost-fill');
    this.boostLabelElement = document.getElementById('hud-boost-label');
    this.notifyElement = document.getElementById('hud-notify');
    this.crystalElement = document.getElementById('hud-crystal');
    this.targetElement = document.getElementById('hud-target');
    this.stageLabelElement = document.querySelector('.hud-phase');
    this.debugUpdateCounter = 0;
    this.notifyTimeoutId = null;
  }

  hideLoading() {
    if (this.loadingElement) this.loadingElement.style.display = 'none';
  }

  setStageLabel(text) {
    if (this.stageLabelElement) {
      this.stageLabelElement.textContent = text;
    }
  }

  setCrystalProgress(collected, total) {
    if (this.crystalElement) {
      this.crystalElement.textContent = `${collected} / ${total}`;
    }
  }

  // 目標タイムと S ランク条件をタイトル欄に出す（ランク条件の画面表示、仕様 §8）。
  setTargetInfo(targetTimeSeconds, crystalsTotal) {
    if (this.targetElement) {
      this.targetElement.textContent =
        `TARGET ${formatElapsedTime(targetTimeSeconds)} · S = 目標以内 + クリスタル ${crystalsTotal} 個`;
    }
  }

  setHintVisible(visible) {
    if (this.hintElement) {
      this.hintElement.style.display = visible ? 'block' : 'none';
    }
  }

  showError(messageText) {
    this.hideLoading();
    this.setHintVisible(false);
    if (this.errorElement) {
      this.errorElement.hidden = false;
      this.errorElement.textContent = `初期化に失敗しました。\n${messageText}\nページを再読み込みしてください。通信環境によっては CDN からの読み込みに失敗することがあります。`;
    }
  }

  showNotification(messageText) {
    if (!this.notifyElement) return;
    this.notifyElement.textContent = messageText;
    this.notifyElement.classList.add('hud-notify-visible');
    if (this.notifyTimeoutId !== null) {
      clearTimeout(this.notifyTimeoutId);
    }
    this.notifyTimeoutId = setTimeout(() => {
      this.notifyElement.classList.remove('hud-notify-visible');
      this.notifyTimeoutId = null;
    }, 1900);
  }

  updateStatus({ elapsedSeconds, respawnCount, checkpointProgress }) {
    if (this.timeElement) {
      this.timeElement.textContent = formatElapsedTime(elapsedSeconds);
    }
    if (this.respawnElement) {
      this.respawnElement.textContent = String(respawnCount);
    }
    if (this.progressElement && checkpointProgress) {
      this.progressElement.textContent =
        `CHECKPOINT ${checkpointProgress.current} / ${checkpointProgress.total}`;
    }
  }

  updateBoost(boostController) {
    if (this.boostFillElement) {
      const ratio = boostController.getGaugeRatio();
      this.boostFillElement.style.width = `${Math.round(ratio * 100)}%`;
      this.boostFillElement.classList.toggle('hud-boost-active', boostController.isBoosting);
      this.boostFillElement.classList.toggle('hud-boost-empty', ratio <= 0);
    }
    if (this.boostLabelElement) {
      this.boostLabelElement.textContent = boostController.isBoosting ? 'BOOST!' : 'BOOST (Shift)';
    }
  }

  // 毎フレーム呼ばれても重くならないよう、数フレームに1回だけ更新する。
  updateDebug(player, gameState) {
    if (!this.debugElement) return;
    this.debugUpdateCounter += 1;
    if (this.debugUpdateCounter % 6 !== 0) return;
    const position = player.getPosition();
    const velocity = player.getVelocity();
    const speed = Math.hypot(velocity.x, velocity.z);
    const progress = gameState.checkpointProgress;
    this.debugElement.textContent =
      `pos  x ${position.x.toFixed(1)}  y ${position.y.toFixed(1)}  z ${position.z.toFixed(1)}\n` +
      `speed ${speed.toFixed(1)} m/s   ${player.isGrounded ? 'GROUNDED' : 'AIRBORNE'}\n` +
      `boost ${Math.round(player.boost.gauge)}%   cp ${progress.current}/${progress.total}   respawn ${gameState.respawnCount}   ${gameState.state}`;
  }
}
