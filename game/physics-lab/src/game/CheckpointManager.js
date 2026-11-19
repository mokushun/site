import { Checkpoint } from '../objects/Checkpoint.js';

// チェックポイントの登録・有効化・復帰地点の管理（Phase 2）。
// 初期位置も最初のチェックポイントとして扱う。
export class CheckpointManager {
  constructor(scene = null) {
    this.scene = scene;
    this.checkpoints = [];
    this.activeCheckpoint = null;
  }

  addCheckpoint(definition) {
    const checkpoint = new Checkpoint(definition, this.scene);
    this.checkpoints.push(checkpoint);
    if (this.checkpoints.length === 1) {
      this.activate(checkpoint);
    }
    return checkpoint;
  }

  activate(checkpoint) {
    if (this.activeCheckpoint === checkpoint) return;
    if (this.activeCheckpoint) this.activeCheckpoint.setActive(false);
    this.activeCheckpoint = checkpoint;
    checkpoint.setActive(true);
  }

  // 毎物理ステップ呼ぶ。新しく有効化されたチェックポイントがあれば返す。
  update(playerPosition) {
    for (const checkpoint of this.checkpoints) {
      if (checkpoint === this.activeCheckpoint) continue;
      if (checkpoint.isWithinRange(playerPosition)) {
        this.activate(checkpoint);
        return checkpoint;
      }
    }
    return null;
  }

  getRespawnPoint() {
    if (this.activeCheckpoint) return this.activeCheckpoint.getRespawnPoint();
    return { x: 0, y: 3, z: 6, yawRadians: 0 };
  }

  getProgress() {
    if (!this.activeCheckpoint) return { current: 0, total: this.checkpoints.length };
    return {
      current: this.checkpoints.indexOf(this.activeCheckpoint) + 1,
      total: this.checkpoints.length,
    };
  }

  dispose() {
    for (const checkpoint of this.checkpoints) {
      checkpoint.dispose(this.scene);
    }
    this.checkpoints = [];
    this.activeCheckpoint = null;
  }
}
