import * as THREE from 'three';
import { RAPIER } from '../game/PhysicsWorld.js';

// Seesaw（Phase 3）: 支点と Revolute Joint を使い、球体の重量で傾く板。
// Joint の角度制限（対応環境のみ）＋板端が床に着くことで可動範囲を制限し、
// 角減衰を強めにして振動・暴走を防ぐ。
export class Seesaw {
  constructor(physicsWorld, {
    position, length = 6, width = 1.6, thickness = 0.3, fulcrumHeight = 0.55, friction = 1.1,
  }, scene = null) {
    this.position = { ...position };
    this.length = length;
    const plankCenterY = position.y + fulcrumHeight + thickness / 2 + 0.02;

    this.body = physicsWorld.rapierWorld.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, plankCenterY, position.z)
        .setLinearDamping(0.05)
        .setAngularDamping(0.8),
    );
    const plankCollider = RAPIER.ColliderDesc.cuboid(length / 2, thickness / 2, width / 2)
      .setFriction(friction)
      .setDensity(0.6);
    this.collider = physicsWorld.rapierWorld.createCollider(plankCollider, this.body);

    const anchorBody = physicsWorld.rapierWorld.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, plankCenterY, position.z),
    );
    const jointData = RAPIER.JointData.revolute(
      { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 },
    );
    this.joint = physicsWorld.rapierWorld.createImpulseJoint(jointData, this.body, anchorBody, true);
    // 角度制限に対応していれば有効化する（±0.45 rad）。未対応でも
    // 板端が床に着くことで傾きは制限される。
    if (typeof this.joint.setLimitsEnabled === 'function'
      && typeof this.joint.setLimits === 'function') {
      this.joint.setLimitsEnabled(true);
      this.joint.setLimits([-0.45, 0.45]);
    }

    this.group = null;
    if (scene) this.buildMeshes(scene, plankCenterY, fulcrumHeight, thickness, width);
  }

  buildMeshes(scene, plankCenterY, fulcrumHeight, thickness, width) {
    this.group = new THREE.Group();

    const fulcrumMaterial = new THREE.MeshStandardMaterial({
      color: 0x476b84, metalness: 0.6, roughness: 0.4,
    });
    const fulcrumMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, fulcrumHeight, width * 0.9), fulcrumMaterial,
    );
    fulcrumMesh.position.set(this.position.x, this.position.y + fulcrumHeight / 2, this.position.z);
    fulcrumMesh.castShadow = true;
    fulcrumMesh.receiveShadow = true;
    this.group.add(fulcrumMesh);

    const plankMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a6d3b, metalness: 0.3, roughness: 0.55,
      emissive: 0x2e1f08, emissiveIntensity: 0.4,
    });
    this.plankMesh = new THREE.Mesh(
      new THREE.BoxGeometry(this.length, thickness, width), plankMaterial,
    );
    this.plankMesh.position.set(this.position.x, plankCenterY, this.position.z);
    this.plankMesh.castShadow = true;
    this.plankMesh.receiveShadow = true;
    this.group.add(this.plankMesh);

    scene.add(this.group);
  }

  // 板の傾き（z軸まわりの角度）を返す。
  getTiltAngle() {
    const rotation = this.body.rotation();
    // クォータニオンから z 軸まわりの回転角を近似する（他軸は Joint で固定）。
    return 2 * Math.atan2(rotation.z, rotation.w);
  }

  syncMesh() {
    if (!this.plankMesh) return;
    const translation = this.body.translation();
    const rotation = this.body.rotation();
    this.plankMesh.position.set(translation.x, translation.y, translation.z);
    this.plankMesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }

  dispose(scene, physicsWorld) {
    if (this.group && scene) {
      scene.remove(this.group);
      this.group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
    physicsWorld.rapierWorld.removeImpulseJoint(this.joint);
    physicsWorld.rapierWorld.removeRigidBody(this.body);
  }
}
