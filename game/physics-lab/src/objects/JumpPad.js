import * as THREE from 'three';

// JumpPad（Phase 3）: 接触した球体に上向きの速度変化を与える。
// 強さ・半径はパラメータ化し、クールダウンで多重発動を防ぐ。
export class JumpPad {
  constructor({ position, radius = 1.25, power = 13, cooldownSeconds = 0.6 }, scene = null) {
    this.position = { ...position };
    this.radius = radius;
    this.power = power;
    this.cooldownSeconds = cooldownSeconds;
    this.cooldownRemaining = 0;
    this.flashRemaining = 0;
    this.group = null;
    this.padMaterial = null;
    if (scene) this.buildMeshes(scene);
  }

  buildMeshes(scene) {
    this.group = new THREE.Group();
    this.group.position.set(this.position.x, this.position.y, this.position.z);

    this.padMaterial = new THREE.MeshStandardMaterial({
      color: 0xff9f43, emissive: 0xff9f43, emissiveIntensity: 0.9,
      metalness: 0.4, roughness: 0.35,
    });
    const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(this.radius, this.radius * 1.08, 0.18, 36), this.padMaterial);
    baseMesh.position.y = 0.09;
    baseMesh.receiveShadow = true;
    this.group.add(baseMesh);

    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x1a0f00 });
    const arrowMesh = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 4), arrowMaterial);
    arrowMesh.position.y = 0.22;
    this.group.add(arrowMesh);

    scene.add(this.group);
  }

  // 物理ステップ前に呼ぶ。発動したら true。
  preStep(deltaSeconds, player) {
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining -= deltaSeconds;
    }
    const playerPosition = player.getPosition();
    const deltaX = playerPosition.x - this.position.x;
    const deltaZ = playerPosition.z - this.position.z;
    const horizontalDistance = Math.hypot(deltaX, deltaZ);
    const heightAbovePad = playerPosition.y - this.position.y;
    const isOnPad = horizontalDistance <= this.radius
      && heightAbovePad >= 0 && heightAbovePad <= 1.0;
    if (!isOnPad || this.cooldownRemaining > 0) return false;

    const velocity = player.getVelocity();
    // すでに十分な上昇速度がある場合は再発動しない（多重発動防止）。
    if (velocity.y > 2) return false;
    player.body.setLinvel({ x: velocity.x, y: this.power, z: velocity.z }, true);
    this.cooldownRemaining = this.cooldownSeconds;
    this.flashRemaining = 0.25;
    return true;
  }

  renderUpdate(deltaSeconds) {
    if (!this.padMaterial) return;
    if (this.flashRemaining > 0) {
      this.flashRemaining -= deltaSeconds;
      this.padMaterial.emissiveIntensity = 3.2;
    } else {
      this.padMaterial.emissiveIntensity = 0.9;
    }
  }

  dispose(scene) {
    if (this.group && scene) {
      scene.remove(this.group);
      this.group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
  }
}
