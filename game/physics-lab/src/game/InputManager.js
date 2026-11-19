// キーボード入力をゲームロジックから分離して管理する。
// ポーズ中は移動系入力を無効化するが、ポーズ切替キーだけは常時受け付ける。
export class InputManager {
  constructor(targetElement) {
    this.targetElement = targetElement;
    this.pressedKeys = new Set();
    this.jumpQueued = false;
    this.respawnQueued = false;
    this.pauseToggleQueued = false;
    this.stageSelectQueued = null;
    this.enabled = true;

    this.boundKeyDown = (keyboardEvent) => this.handleKeyDown(keyboardEvent);
    this.boundKeyUp = (keyboardEvent) => this.handleKeyUp(keyboardEvent);
    this.boundBlur = () => { this.pressedKeys.clear(); };

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundBlur);
  }

  handleKeyDown(keyboardEvent) {
    // ゲーム操作キーはブラウザのスクロール等を妨げないように抑止する。
    const gameCodes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyP', 'Space',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (gameCodes.includes(keyboardEvent.code)) {
      keyboardEvent.preventDefault();
    }
    // ポーズ切替はポーズ中（enabled=false）でも受け付ける。
    // ※ Pointer Lock 中の Esc はブラウザがロック解除に使い、keydown が
    //   届かないことがある。その場合は Game 側がロック解除を検知して止める。
    if ((keyboardEvent.code === 'Escape' || keyboardEvent.code === 'KeyP') && !keyboardEvent.repeat) {
      this.pauseToggleQueued = true;
    }
    if (!this.enabled) return;
    if (keyboardEvent.code === 'Space' && !keyboardEvent.repeat) {
      this.jumpQueued = true;
    }
    if (keyboardEvent.code === 'KeyR' && !keyboardEvent.repeat) {
      this.respawnQueued = true;
    }
    if (keyboardEvent.code.startsWith('Digit') && !keyboardEvent.repeat) {
      const digit = Number.parseInt(keyboardEvent.code.slice(5), 10);
      if (digit >= 1 && digit <= 5) {
        this.stageSelectQueued = digit - 1;
      }
    }
    this.pressedKeys.add(keyboardEvent.code);
  }

  handleKeyUp(keyboardEvent) {
    this.pressedKeys.delete(keyboardEvent.code);
  }

  isBoostHeld() {
    return this.enabled
      && (this.pressedKeys.has('ShiftLeft') || this.pressedKeys.has('ShiftRight'));
  }

  // 移動入力を -1..1 で返す。forward: W/↑ が +1、strafe: D/→ が +1。
  getMoveInput() {
    if (!this.enabled) return { forward: 0, strafe: 0 };
    const keys = this.pressedKeys;
    let forward = 0;
    let strafe = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) forward += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) forward -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) strafe += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) strafe -= 1;
    return { forward, strafe };
  }

  consumeJump() {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  }

  consumeRespawn() {
    const queued = this.respawnQueued;
    this.respawnQueued = false;
    return queued;
  }

  consumePauseToggle() {
    const queued = this.pauseToggleQueued;
    this.pauseToggleQueued = false;
    return queued;
  }

  consumeStageSelect() {
    const selected = this.stageSelectQueued;
    this.stageSelectQueued = null;
    return selected;
  }

  // ポーズ遷移時に溜まった入力を持ち越さない。
  clearTransientQueues() {
    this.jumpQueued = false;
    this.respawnQueued = false;
    this.stageSelectQueued = null;
    this.pressedKeys.clear();
  }

  dispose() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('blur', this.boundBlur);
  }
}
