// キーボード入力をゲームロジックから分離して管理する。
// ポーズ中などの入力無効化は、利用側が enabled を切り替える。
export class InputManager {
  constructor(targetElement) {
    this.targetElement = targetElement;
    this.pressedKeys = new Set();
    this.jumpQueued = false;
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
    const gameCodes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (gameCodes.includes(keyboardEvent.code)) {
      keyboardEvent.preventDefault();
    }
    if (!this.enabled) return;
    if (keyboardEvent.code === 'Space' && !keyboardEvent.repeat) {
      this.jumpQueued = true;
    }
    this.pressedKeys.add(keyboardEvent.code);
  }

  handleKeyUp(keyboardEvent) {
    this.pressedKeys.delete(keyboardEvent.code);
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

  // ジャンプ入力を消費する（押した瞬間に1回だけ true）。
  consumeJump() {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  }

  dispose() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('blur', this.boundBlur);
  }
}
