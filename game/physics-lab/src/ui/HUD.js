// Phase 1 の最小 HUD: 読み込み表示、視点ロックのヒント、
// 実験データ風のデバッグ表示（位置・速度・接地）を担う。
// 本格的な HUD（タイム・クリスタル等）は Phase 2 以降。
export class HUD {
  constructor() {
    this.loadingElement = document.getElementById('hud-loading');
    this.hintElement = document.getElementById('hud-hint');
    this.errorElement = document.getElementById('hud-error');
    this.debugElement = document.getElementById('hud-debug');
    this.debugUpdateCounter = 0;
  }

  hideLoading() {
    if (this.loadingElement) this.loadingElement.style.display = 'none';
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

  // 毎フレーム呼ばれても重くならないよう、数フレームに1回だけ更新する。
  updateDebug(player) {
    if (!this.debugElement) return;
    this.debugUpdateCounter += 1;
    if (this.debugUpdateCounter % 6 !== 0) return;
    const position = player.getPosition();
    const velocity = player.getVelocity();
    const speed = Math.hypot(velocity.x, velocity.z);
    this.debugElement.textContent =
      `pos  x ${position.x.toFixed(1)}  y ${position.y.toFixed(1)}  z ${position.z.toFixed(1)}\n` +
      `speed ${speed.toFixed(1)} m/s   ${player.isGrounded ? 'GROUNDED' : 'AIRBORNE'}`;
  }
}
