import * as THREE from 'three';
import { RAPIER } from './PhysicsWorld.js';

// プレイヤー球体。Rapier の Dynamic RigidBody + 球 Collider を持ち、
// 速度ステアリングで操作する（操作性優先。現実の物理の完全再現は狙わない）。
export const BALL_RADIUS = 0.5;
export const PLAYER_SETTINGS = {
  maxSpeed: 8,          // 水平速度の上限 [m/s]
  groundAccelRate: 14,   // 地上での目標速度への接近率 [1/s]
  airAccelRate: 2.2,     // 空中操作力（地上より弱くする）
  jumpSpeed: 7.8,        // ジャンプ初速 [m/s]
  linearDamping: 0.05,
  angularDamping: 0.4,
  friction: 0.8,
  restitution: 0.25,
  spawnPosition: { x: 0, y: 3, z: 6 },
};

export class Player {
  // scene が null の場合は描画オブジェクトを作らない（物理テスト用）。
  constructor(physicsWorld, scene = null) {
    this.physicsWorld = physicsWorld;
    this.radius = BALL_RADIUS;
    this.isGrounded = false;

    const settings = PLAYER_SETTINGS;
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(settings.spawnPosition.x, settings.spawnPosition.y, settings.spawnPosition.z)
      .setLinearDamping(settings.linearDamping)
      .setAngularDamping(settings.angularDamping)
      .setCcdEnabled(true); // 高速移動時のすり抜け防止
    this.body = physicsWorld.rapierWorld.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.ball(this.radius)
      .setFriction(settings.friction)
      .setRestitution(settings.restitution)
      .setDensity(1.0);
    this.collider = physicsWorld.rapierWorld.createCollider(colliderDesc, this.body);

    this.mesh = null;
    if (scene) {
      this.mesh = this.createMesh();
      scene.add(this.mesh);
      this.syncMesh();
    }
  }

  createMesh() {
    const geometry = new THREE.SphereGeometry(this.radius, 40, 28);
    const material = new THREE.MeshStandardMaterial({
      color: 0xdfe9ee,
      metalness: 0.85,
      roughness: 0.28,
      emissive: 0x0a2e3a,
      emissiveIntensity: 0.6,
    });
    const sphereMesh = new THREE.Mesh(geometry, material);
    sphereMesh.castShadow = true;

    // 回転が目で分かるよう、帯とドットを付ける。
    const bandGeometry = new THREE.TorusGeometry(this.radius * 0.99, 0.035, 10, 48);
    const bandMaterial = new THREE.MeshStandardMaterial({
      color: 0x39d5f0, emissive: 0x39d5f0, emissiveIntensity: 1.4,
      metalness: 0.2, roughness: 0.4,
    });
    const bandMesh = new THREE.Mesh(bandGeometry, bandMaterial);
    bandMesh.rotation.x = Math.PI / 2;
    sphereMesh.add(bandMesh);

    const dotGeometry = new THREE.SphereGeometry(0.09, 12, 10);
    const dotMesh = new THREE.Mesh(dotGeometry, bandMaterial);
    dotMesh.position.set(0, this.radius * 0.82, this.radius * 0.45);
    sphereMesh.add(dotMesh);

    return sphereMesh;
  }

  getPosition() {
    const translation = this.body.translation();
    return { x: translation.x, y: translation.y, z: translation.z };
  }

  getVelocity() {
    return this.body.linvel();
  }

  // 接地判定: 球の中心から真下へレイを飛ばし、半径 + 余裕以内に
  // 自分以外の Collider があれば接地とみなす。
  updateGrounded() {
    const position = this.getPosition();
    const probeDistance = this.radius + 0.18;
    const hitDistance = this.physicsWorld.castRayDown(
      { x: position.x, y: position.y, z: position.z }, probeDistance, this.collider,
    );
    this.isGrounded = hitDistance !== null;
    return this.isGrounded;
  }

  // 物理ステップ前に呼ぶ。moveDirection はワールド空間の希望移動方向
  // （正規化済み、強さ 0..1 を掛けたもの）。cameraRelative で計算済みのこと。
  applyMovement(fixedDeltaSeconds, moveDirection, wantsJump) {
    const velocity = this.body.linvel();
    const settings = PLAYER_SETTINGS;
    const targetVelocityX = moveDirection.x * settings.maxSpeed;
    const targetVelocityZ = moveDirection.z * settings.maxSpeed;
    const accelRate = this.isGrounded ? settings.groundAccelRate : settings.airAccelRate;
    const blendFactor = 1 - Math.exp(-accelRate * fixedDeltaSeconds);
    const nextVelocityX = velocity.x + (targetVelocityX - velocity.x) * blendFactor;
    const nextVelocityZ = velocity.z + (targetVelocityZ - velocity.z) * blendFactor;

    let nextVelocityY = velocity.y;
    if (wantsJump && this.isGrounded) {
      nextVelocityY = settings.jumpSpeed;
    }
    this.body.setLinvel({ x: nextVelocityX, y: nextVelocityY, z: nextVelocityZ }, true);
  }

  syncMesh() {
    if (!this.mesh) return;
    const translation = this.body.translation();
    const rotation = this.body.rotation();
    this.mesh.position.set(translation.x, translation.y, translation.z);
    this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }

  dispose(scene) {
    if (this.mesh && scene) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    this.physicsWorld.rapierWorld.removeRigidBody(this.body);
  }
}
