// 足場の運搬補助（Phase 3）。
// Rapier では自由回転する球体は摩擦だけでは移動床・回転床に運ばれにくい
// （単体テストで確認: 箱や回転固定の球は運ばれるが、転がる球は置いていかれる）。
// そこで、球体が乗っている足場をレイで特定し、足場の移動ぶんだけ
// 球体も一緒に動かすゲームプレイ側の補助を行う。
export class PlatformCarrier {
  constructor(physicsWorld) {
    this.physicsWorld = physicsWorld;
    this.gimmickByCollider = new Map();
    this.supportGimmick = null;
  }

  register(gimmick) {
    if (gimmick && gimmick.collider) {
      this.gimmickByCollider.set(gimmick.collider, gimmick);
    }
  }

  clearSupport() {
    this.supportGimmick = null;
  }

  // 物理ステップ後に呼ぶ。球体の真下にある足場を特定する。
  updateSupport(player) {
    const position = player.getPosition();
    const probeDistance = player.radius + 0.18;
    const hitCollider = this.physicsWorld.castRayDownCollider(
      { x: position.x, y: position.y, z: position.z }, probeDistance, player.collider,
    );
    this.supportGimmick = hitCollider ? (this.gimmickByCollider.get(hitCollider) ?? null) : null;
    return this.supportGimmick;
  }

  // 物理ステップ前に呼ぶ。乗っている足場の動きに球体を追従させる。
  applyCarry(player) {
    if (this.supportGimmick && typeof this.supportGimmick.applyCarry === 'function') {
      this.supportGimmick.applyCarry(player);
    }
  }
}
