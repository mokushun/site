import * as THREE from 'three';
import { RAPIER } from '../game/PhysicsWorld.js';

// MovingPlatform（Phase 3）: 始点・終点間を往復する足場。
// Kinematic Velocity-Based 剛体を使い、毎ステップ速度を設定する。
// 摩擦で球体を運ぶ（Position-Based では摩擦の効きが弱いことを
// 単体テストで確認したため、回転床と同じ Velocity-Based に統一）。
// 速度・待機時間はパラメータ化する。
export class MovingPlatform {
  constructor(physicsWorld, {
    from, to, size = { x: 3.4, y: 0.4, z: 2.6 }, speed = 2.2, waitSeconds = 0.8, friction = 1.0,
  }, scene = null) {
    this.from = { ...from };
    this.to = { ...to };
    this.size = { ...size };
    this.speed = speed;
    this.waitSeconds = waitSeconds;
    this.segmentLength = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
    this.unitDirection = this.segmentLength > 0
      ? {
        x: (to.x - from.x) / this.segmentLength,
        y: (to.y - from.y) / this.segmentLength,
        z: (to.z - from.z) / this.segmentLength,
      }
      : { x: 0, y: 0, z: 0 };
    this.travelledDistance = 0;
    this.directionSign = 1;
    this.waitRemaining = 0;
    this.currentPosition = { ...from };
    this.pendingDelta = { x: 0, y: 0, z: 0 };

    const bodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased()
      .setTranslation(from.x, from.y, from.z);
    this.body = physicsWorld.rapierWorld.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
      .setFriction(friction);
    this.collider = physicsWorld.rapierWorld.createCollider(colliderDesc, this.body);

    this.mesh = null;
    if (scene) this.buildMeshes(scene);
  }

  buildMeshes(scene) {
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x44586e, metalness: 0.6, roughness: 0.35,
      emissive: 0x0a2436, emissiveIntensity: 0.5,
    });
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z), platformMaterial,
    );
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.set(this.from.x, this.from.y, this.from.z);
    scene.add(this.mesh);

    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x39d5f0, emissive: 0x39d5f0, emissiveIntensity: 1.3,
      metalness: 0.3, roughness: 0.4,
    });
    const trimMesh = new THREE.Mesh(
      new THREE.BoxGeometry(this.size.x + 0.06, 0.08, this.size.z + 0.06), trimMaterial,
    );
    trimMesh.position.y = this.size.y / 2 - 0.02;
    this.mesh.add(trimMesh);
  }

  // 物理ステップ前に呼ぶ。端までの残距離を見て速度を設定する。
  preStep(deltaSeconds) {
    let velocity = { x: 0, y: 0, z: 0 };
    if (this.segmentLength > 0) {
      if (this.waitRemaining > 0) {
        this.waitRemaining -= deltaSeconds;
      } else {
        const remainingDistance = this.directionSign > 0
          ? this.segmentLength - this.travelledDistance
          : this.travelledDistance;
        const stepDistance = Math.min(this.speed * deltaSeconds, remainingDistance);
        const stepSpeed = deltaSeconds > 0 ? stepDistance / deltaSeconds : 0;
        velocity = {
          x: this.unitDirection.x * this.directionSign * stepSpeed,
          y: this.unitDirection.y * this.directionSign * stepSpeed,
          z: this.unitDirection.z * this.directionSign * stepSpeed,
        };
        this.travelledDistance += this.directionSign * stepDistance;
        if (remainingDistance - stepDistance <= 0.0001) {
          this.directionSign *= -1;
          this.waitRemaining = this.waitSeconds;
        }
      }
    }
    this.pendingDelta = {
      x: velocity.x * deltaSeconds, y: velocity.y * deltaSeconds, z: velocity.z * deltaSeconds,
    };
    this.body.setLinvel(velocity, true);
    const ratio = this.segmentLength > 0 ? this.travelledDistance / this.segmentLength : 0;
    this.currentPosition = {
      x: this.from.x + (this.to.x - this.from.x) * ratio,
      y: this.from.y + (this.to.y - this.from.y) * ratio,
      z: this.from.z + (this.to.z - this.from.z) * ratio,
    };
  }

  // PlatformCarrier から呼ばれる。乗っている球体を足場の移動ぶん運ぶ。
  applyCarry(player) {
    if (this.pendingDelta.x === 0 && this.pendingDelta.y === 0 && this.pendingDelta.z === 0) return;
    const position = player.getPosition();
    player.body.setTranslation({
      x: position.x + this.pendingDelta.x,
      y: position.y + this.pendingDelta.y,
      z: position.z + this.pendingDelta.z,
    }, true);
  }

  syncMesh() {
    if (!this.mesh) return;
    const translation = this.body.translation();
    this.mesh.position.set(translation.x, translation.y, translation.z);
  }

  dispose(scene, physicsWorld) {
    if (this.mesh && scene) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    physicsWorld.rapierWorld.removeRigidBody(this.body);
  }
}
