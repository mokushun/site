import * as THREE from 'three';
import { RAPIER } from '../game/PhysicsWorld.js';

// RotatingPlatform（Phase 3）: 指定軸・速度で回転する足場。
// Kinematic Velocity-Based 剛体を使い、摩擦で球体を運ぶ。
export class RotatingPlatform {
  constructor(physicsWorld, {
    position, radius = 3, thickness = 0.5, angularSpeed = 0.5, friction = 1.0,
  }, scene = null) {
    this.position = { ...position };
    this.radius = radius;
    this.angularSpeed = angularSpeed;

    const bodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased()
      .setTranslation(position.x, position.y, position.z);
    this.body = physicsWorld.rapierWorld.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cylinder(thickness / 2, radius)
      .setFriction(friction);
    this.collider = physicsWorld.rapierWorld.createCollider(colliderDesc, this.body);
    this.body.setAngvel({ x: 0, y: angularSpeed, z: 0 }, true);
    this.pendingAngle = 0;

    this.group = null;
    if (scene) this.buildMeshes(scene);
  }

  // 物理ステップ前に呼ぶ。運搬補助用にこのステップの回転角を記録する。
  preStep(deltaSeconds) {
    this.pendingAngle = this.angularSpeed * deltaSeconds;
  }

  // PlatformCarrier から呼ばれる。乗っている球体を中心まわりに回して運ぶ。
  applyCarry(player) {
    if (this.pendingAngle === 0) return;
    const position = player.getPosition();
    const relativeX = position.x - this.position.x;
    const relativeZ = position.z - this.position.z;
    const cosAngle = Math.cos(this.pendingAngle);
    const sinAngle = Math.sin(this.pendingAngle);
    player.body.setTranslation({
      x: this.position.x + relativeX * cosAngle + relativeZ * sinAngle,
      y: position.y,
      z: this.position.z - relativeX * sinAngle + relativeZ * cosAngle,
    }, true);
  }

  buildMeshes(scene) {
    this.group = new THREE.Group();
    const discMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d5a74, metalness: 0.6, roughness: 0.35,
      emissive: 0x0a2436, emissiveIntensity: 0.5,
    });
    const discMesh = new THREE.Mesh(new THREE.CylinderGeometry(this.radius, this.radius, 0.5, 40), discMaterial);
    discMesh.castShadow = true;
    discMesh.receiveShadow = true;
    this.group.add(discMesh);

    // 回転が目で分かるマーカー（4方向の小箱と中心柱）。
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: 0x39d5f0, emissive: 0x39d5f0, emissiveIntensity: 1.2,
      metalness: 0.3, roughness: 0.4,
    });
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2;
      const markerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), markerMaterial);
      markerMesh.position.set(Math.cos(angle) * (this.radius - 0.55), 0.3, Math.sin(angle) * (this.radius - 0.55));
      this.group.add(markerMesh);
    }
    const hubMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.34, 20), markerMaterial);
    hubMesh.position.y = 0.3;
    this.group.add(hubMesh);

    this.group.position.set(this.position.x, this.position.y, this.position.z);
    scene.add(this.group);
  }

  syncMesh() {
    if (!this.group) return;
    const translation = this.body.translation();
    const rotation = this.body.rotation();
    this.group.position.set(translation.x, translation.y, translation.z);
    this.group.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }

  dispose(scene, physicsWorld) {
    if (this.group && scene) {
      scene.remove(this.group);
      this.group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
    physicsWorld.rapierWorld.removeRigidBody(this.body);
  }
}
