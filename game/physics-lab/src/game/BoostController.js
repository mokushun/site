// ブーストのゲージ管理（Phase 2）。
// ゲージ制: 使うと減り、しばらく使わないと回復する。ロジックのみで
// Three.js / Rapier に依存しない（Node テスト対象）。
export const BOOST_SETTINGS = {
  maxGauge: 100,
  drainPerSecond: 40,     // 全開で約 2.5 秒
  regenPerSecond: 22,
  regenDelaySeconds: 0.7, // 使い終わってから回復が始まるまで
  boostMaxSpeed: 13,      // 通常 8 m/s に対して
  boostAccelRate: 18,
};

export class BoostController {
  constructor() {
    this.gauge = BOOST_SETTINGS.maxGauge;
    this.isBoosting = false;
    this.secondsSinceLastUse = Number.POSITIVE_INFINITY;
  }

  // 毎物理ステップ呼ぶ。戻り値は「今ステップでブーストが効いているか」。
  update(deltaSeconds, wantsBoost, hasMoveInput) {
    const canBoost = wantsBoost && hasMoveInput && this.gauge > 0;
    this.isBoosting = canBoost;
    if (canBoost) {
      this.gauge = Math.max(0, this.gauge - BOOST_SETTINGS.drainPerSecond * deltaSeconds);
      this.secondsSinceLastUse = 0;
      if (this.gauge <= 0) this.isBoosting = false;
    } else if (wantsBoost && hasMoveInput) {
      // ブーストを試み続けている間は回復しない（ゲージが少し戻って
      // 点滅的に再発動するのを防ぐ。キーを離すと回復が始まる）。
      this.secondsSinceLastUse = 0;
    } else {
      this.secondsSinceLastUse += deltaSeconds;
      if (this.secondsSinceLastUse >= BOOST_SETTINGS.regenDelaySeconds) {
        this.gauge = Math.min(
          BOOST_SETTINGS.maxGauge,
          this.gauge + BOOST_SETTINGS.regenPerSecond * deltaSeconds,
        );
      }
    }
    return this.isBoosting;
  }

  getGaugeRatio() {
    return this.gauge / BOOST_SETTINGS.maxGauge;
  }
}
