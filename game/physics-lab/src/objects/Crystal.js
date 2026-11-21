import * as THREE from 'three';

// Crystal（Phase 4 で配置、Phase 5 で収集判定を追加）:
// ステージ内に置かれるエネルギー結晶。回転と上下動で存在を示す。
// 球が収集半径に入ったら一度だけ収集される（収集後は非表示）。
export const CRYSTAL_COLLECT_RADIUS = 1.35;

export class Crystal {
  constructor({ position }, scene = null) {
    this.position = { ...position };
    this.elapsed = Math.random() * Math.PI * 2;
    this.collected = false;
    this.mesh = null;
    if (scene) this.buildMeshes(scene);
  }

  // 球の位置を受け取り、範囲内なら収集して true を返す（収集済みは常に false）。
  tryCollect(playerPosition) {
    if (this.collected) return false;
    const dx = playerPosition.x - this.position.x;
    const dy = playerPosition.y - this.position.y;
    const dz = playerPosition.z - this.position.z;
    if (dx * dx + dy * dy + dz * dz > CRYSTAL_COLLECT_RADIUS * CRYSTAL_COLLECT_RADIUS) {
      return false;
    }
    this.collected = true;
    if (this.mesh) this.mesh.visible = false;
    return true;
  }

  buildMeshes(scene) {
    this.mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42),
      new THREE.MeshStandardMaterial({
        color: 0x39d5f0, emissive: 0x39d5f0, emissiveIntensity: 1.5,
        metalness: 0.2, roughness: 0.2, transparent: true, opacity: 0.92,
      }),
    );
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    scene.add(this.mesh);
  }

  renderUpdate(deltaSeconds) {
    if (!this.mesh || this.collected) return;
    this.elapsed += deltaSeconds;
    this.mesh.rotation.y += deltaSeconds * 1.8;
    this.mesh.position.y = this.position.y + Math.sin(this.elapsed * 2) * 0.15;
  }

  dispose(scene) {
    if (this.mesh && scene) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  }
}
