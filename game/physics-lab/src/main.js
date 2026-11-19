import { Game } from './game/Game.js';
import { HUD } from './ui/HUD.js';

// エントリポイント。初期化失敗時はコンソールだけでなく画面にも出す。
async function bootstrap() {
  const canvasElement = document.getElementById('game-canvas');
  const game = new Game(canvasElement);
  try {
    await game.init();
    game.start();
  } catch (initError) {
    console.error('[PHYSICS LAB] 初期化に失敗しました:', initError);
    const hud = new HUD();
    hud.showError(initError && initError.message ? initError.message : String(initError));
  }
}

bootstrap();
