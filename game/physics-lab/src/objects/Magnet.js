import * as THREE from 'three';

// Magnet（Phase 3）: 範囲内の球体に引力または斥力を与える。
// 強さ・範囲・極性・有効状態はパラメータ化し、加速度に上限を設ける。
// 距離で減衰する（中心で最大、範囲の縁で 0）。中心付近にはデッドゾーンを
// 設けて振動を防ぐ。
export class Magnet {
  constructor({
    position, radius = 5.5, strength = 26, polarity = 'attract', enabled = true, maxAccel = 30,
  }, scene = null) {
    this.position = { ...position };
    this.radius = radius;
    this.strength = strength;
    this.polarity = polarity; // 'attract' | 'repel'
    this.enabled = enabled;
    this.maxAccel = maxAccel;
    this.deadZoneRadius = 0.8;
    this.group = null;
    if (scene) this.buildMeshes(scene);
  }

  buildMeshes(scene) {
    this.group = new THREE.Group();
    const coreColor = this.polarity === 'attract' ? 0xff5470 : 0x5470ff;

    // 台座の柱。
    const poleMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, this.position.y, 12),
      new THREE.MeshStandardMaterial({ color: 0x476b84, metalness: 0.7, roughness: 0.3 }),
    );
    poleMesh.position.set(this.position.x, this.position.y / 2, this.position.z);
    poleMesh.castShadow = true;
    this.group.add(poleMesh);

    const coreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 24, 18),
      new THREE.MeshStandardMaterial({
        color: coreColor, emissive: coreColor, emissiveIntensity: 1.5,
        metalness: 0.3, roughness: 0.3,
      }),
    );
    coreMesh.position.set(this.position.x, this.position.y, this.position.z);
    this.group.add(coreMesh);

    // 作用範囲を示すワイヤー球。
    const rangeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, 24, 16),
      new THREE.MeshBasicMaterial({
        color: coreColor, wireframe: true, transparent: true, opacity: 0.07, depthWrite: false,
      }),
    );
    rangeMesh.position.set(this.position.x, this.position.y, this.position.z);
    this.group.add(rangeMesh);

    scene.add(this.group);
  }

  // このステップで球体に与える加速度ベクトルを返す（範囲外はゼロ）。
  computeAccel(playerPosition) {
    const deltaX = this.position.x - playerPosition.x;
    const deltaY = this.position.y - playerPosition.y;
    const deltaZ = this.position.z - playerPosition.z;
    const distance = Math.hypot(deltaX, deltaY, deltaZ);
    if (distance >= this.radius || distance <= this.deadZoneRadius || distance === 0) {
      return { x: 0, y: 0, z: 0, distance };
    }
    let accelMagnitude = this.strength * (1 - distance / this.radius);
    if (accelMagnitude > this.maxAccel) accelMagnitude = this.maxAccel;
    const sign = this.polarity === 'attract' ? 1 : -1;
    return {
      x: sign * (deltaX / distance) * accelMagnitude,
      y: sign * (deltaY / distance) * accelMagnitude,
      z: sign * (deltaZ / distance) * accelMagnitude,
      distance,
    };
  }

  preStep(deltaSeconds, player) {
    if (!this.enabled) return false;
    const accel = this.computeAccel(player.getPosition());
    if (accel.x === 0 && accel.y === 0 && accel.z === 0) return false;
    const velocity = player.getVelocity();
    player.body.setLinvel({
      x: velocity.x + accel.x * deltaSeconds,
      y: velocity.y + accel.y * deltaSeconds,
      z: velocity.z + accel.z * deltaSeconds,
    }, true);
    return true;
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
