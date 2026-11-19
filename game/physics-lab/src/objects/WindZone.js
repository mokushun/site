import * as THREE from 'three';

// WindZone（Phase 3）: 範囲内の球体に指定方向の力を与える。
// 方向・強さ（加速度）・範囲・有効状態はパラメータ化する。
// 対象は軸平行な方向を想定する（粒子アニメーションの都合）。
export class WindZone {
  constructor({
    center, size, direction, strength = 24, enabled = true,
  }, scene = null) {
    this.center = { ...center };
    this.size = { ...size };
    const dirLength = Math.hypot(direction.x, direction.y, direction.z) || 1;
    this.direction = {
      x: direction.x / dirLength, y: direction.y / dirLength, z: direction.z / dirLength,
    };
    this.strength = strength;
    this.enabled = enabled;
    this.group = null;
    this.particlePoints = null;
    this.particleSpeed = 3.6;
    if (scene) this.buildMeshes(scene);
  }

  buildMeshes(scene) {
    this.group = new THREE.Group();
    this.group.position.set(this.center.x, this.center.y, this.center.z);

    const boxGeometry = new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z);
    const fillMesh = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({
      color: 0x39d5f0, transparent: true, opacity: 0.05, depthWrite: false,
    }));
    this.group.add(fillMesh);
    const edgeLines = new THREE.LineSegments(
      new THREE.EdgesGeometry(boxGeometry),
      new THREE.LineBasicMaterial({ color: 0x39d5f0, transparent: true, opacity: 0.4 }),
    );
    this.group.add(edgeLines);

    // 風の流れを示す粒子。
    const particleCount = 110;
    const positions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * this.size.x;
      positions[index * 3 + 1] = (Math.random() - 0.5) * this.size.y;
      positions[index * 3 + 2] = (Math.random() - 0.5) * this.size.z;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particlePoints = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
      color: 0x9fe8fa, size: 0.13, transparent: true, opacity: 0.85, depthWrite: false,
    }));
    this.group.add(this.particlePoints);

    scene.add(this.group);
  }

  containsPoint(point) {
    return Math.abs(point.x - this.center.x) <= this.size.x / 2
      && Math.abs(point.y - this.center.y) <= this.size.y / 2
      && Math.abs(point.z - this.center.z) <= this.size.z / 2;
  }

  // 物理ステップ前に呼ぶ。範囲内なら球体の速度に風の加速度を足す。
  preStep(deltaSeconds, player) {
    if (!this.enabled) return false;
    const playerPosition = player.getPosition();
    if (!this.containsPoint(playerPosition)) return false;
    const velocity = player.getVelocity();
    player.body.setLinvel({
      x: velocity.x + this.direction.x * this.strength * deltaSeconds,
      y: velocity.y + this.direction.y * this.strength * deltaSeconds,
      z: velocity.z + this.direction.z * this.strength * deltaSeconds,
    }, true);
    return true;
  }

  renderUpdate(deltaSeconds) {
    if (!this.particlePoints || !this.enabled) return;
    const positions = this.particlePoints.geometry.attributes.position;
    const half = { x: this.size.x / 2, y: this.size.y / 2, z: this.size.z / 2 };
    for (let index = 0; index < positions.count; index += 1) {
      let px = positions.getX(index) + this.direction.x * this.particleSpeed * deltaSeconds;
      let py = positions.getY(index) + this.direction.y * this.particleSpeed * deltaSeconds;
      let pz = positions.getZ(index) + this.direction.z * this.particleSpeed * deltaSeconds;
      // 軸方向に範囲外へ出たら反対側に戻す。
      if (this.direction.x > 0.5 && px > half.x) px = -half.x;
      if (this.direction.x < -0.5 && px < -half.x) px = half.x;
      if (this.direction.y > 0.5 && py > half.y) py = -half.y;
      if (this.direction.y < -0.5 && py < -half.y) py = half.y;
      if (this.direction.z > 0.5 && pz > half.z) pz = -half.z;
      if (this.direction.z < -0.5 && pz < -half.z) pz = half.z;
      positions.setXYZ(index, px, py, pz);
    }
    positions.needsUpdate = true;
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
