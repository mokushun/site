// ポーズメニュー（Phase 2）。表示・非表示とボタンの配線だけを担い、
// ゲーム状態の変更は Game 側のコールバックで行う。
export class PauseMenu {
  constructor({ onResume, onRespawn }) {
    this.rootElement = document.getElementById('pause-menu');
    this.resumeButton = document.getElementById('pause-resume');
    this.respawnButton = document.getElementById('pause-respawn');
    this.isVisible = false;

    if (this.resumeButton) {
      this.resumeButton.addEventListener('click', () => onResume());
    }
    if (this.respawnButton) {
      this.respawnButton.addEventListener('click', () => onRespawn());
    }
  }

  show() {
    this.isVisible = true;
    if (this.rootElement) this.rootElement.hidden = false;
  }

  hide() {
    this.isVisible = false;
    if (this.rootElement) this.rootElement.hidden = true;
  }
}
