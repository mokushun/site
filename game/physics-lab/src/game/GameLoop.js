import { FIXED_TIMESTEP } from './PhysicsWorld.js';

// 描画ループと物理更新を分離する。
// 経過時間を蓄積し、固定 60Hz で物理を進める。1フレームのステップ数に
// 上限を設け、タブ復帰時の暴走（spiral of death）を防ぐ。
export class GameLoop {
  constructor({ onPhysicsStep, onRender }) {
    this.onPhysicsStep = onPhysicsStep;
    this.onRender = onRender;
    this.accumulatorSeconds = 0;
    this.maxStepsPerFrame = 5;
    this.maxFrameDeltaSeconds = 0.1;
    this.running = false;
    this.animationFrameId = null;
    this.previousTimestampMs = null;
    this.boundTick = (timestampMs) => this.tick(timestampMs);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.previousTimestampMs = null;
    this.animationFrameId = requestAnimationFrame(this.boundTick);
  }

  stop() {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  tick(timestampMs) {
    if (!this.running) return;
    this.animationFrameId = requestAnimationFrame(this.boundTick);

    if (this.previousTimestampMs === null) {
      this.previousTimestampMs = timestampMs;
      this.onRender(0);
      return;
    }
    let frameDeltaSeconds = (timestampMs - this.previousTimestampMs) / 1000;
    this.previousTimestampMs = timestampMs;
    if (frameDeltaSeconds > this.maxFrameDeltaSeconds) {
      frameDeltaSeconds = this.maxFrameDeltaSeconds;
    }

    this.accumulatorSeconds += frameDeltaSeconds;
    let stepsThisFrame = 0;
    while (this.accumulatorSeconds >= FIXED_TIMESTEP && stepsThisFrame < this.maxStepsPerFrame) {
      this.onPhysicsStep(FIXED_TIMESTEP);
      this.accumulatorSeconds -= FIXED_TIMESTEP;
      stepsThisFrame += 1;
    }
    // 上限に達してまだ借りがある場合は捨てる（スローモーション化を防ぐ）。
    if (stepsThisFrame >= this.maxStepsPerFrame && this.accumulatorSeconds >= FIXED_TIMESTEP) {
      this.accumulatorSeconds = 0;
    }

    this.onRender(frameDeltaSeconds);
  }
}
