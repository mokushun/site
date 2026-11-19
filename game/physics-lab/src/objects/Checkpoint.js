import * as THREE from 'three';

// チェックポイント（Phase 2）。接触（範囲内に入る）と復帰地点を担う。
// 判定は距離ベース（物理センサーを使わず、毎ステップの位置チェック）。
export const CHECKPOINT_RANGE = {
  horizontalRadius: 1.7,
  // 球中心との差で判定する。高所CP（上面 1.9m）の真下の地面（中心 0.5m、
  // 差 1.4m）を誤認せず、台上の中心（2.4m、差 0.5m）を通す値。
  verticalTolerance: 1.1,
};

const COLOR_INACTIVE = 0x39d5f0; // シアン
const COLOR_ACTIVE = 0xffd75e;   // ゴールド

export class Checkpoint {
  // position: {x, y, z}（y は足場上面の高さ）。yawRadians は復帰時のカメラ向き。
  constructor({ id, name, position, yawRadians = 0 }, scene = null) {
    this.id = id;
    this.name = name;
    this.position = { ...position };
    this.yawRadians = yawRadians;
    this.isActive = false;
    this.group = null;
    this.discMaterial = null;
    this.beamMaterial = null;
    if (scene) {
      this.buildMeshes(scene);
    }
  }

  buildMeshes(scene) {
    this.group = new THREE.Group();
    this.group.position.set(this.position.x, this.position.y, this.position.z);

    this.discMaterial = new THREE.MeshStandardMaterial({
      color: COLOR_INACTIVE, emissive: COLOR_INACTIVE, emissiveIntensity: 0.55,
      metalness: 0.3, roughness: 0.4, transparent: true, opacity: 0.85,
    });
    const discMesh = new THREE.Mesh(new THREE.CircleGeometry(1.4, 40), this.discMaterial);
    discMesh.rotation.x = -Math.PI / 2;
    discMesh.position.y = 0.03;
    discMesh.receiveShadow = true;
    this.group.add(discMesh);

    const ringMesh = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.7, 48), this.discMaterial);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.03;
    this.group.add(ringMesh);

    this.beamMaterial = new THREE.MeshBasicMaterial({
      color: COLOR_INACTIVE, transparent: true, opacity: 0.05,
      depthWrite: false, side: THREE.FrontSide,
    });
    const beamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 2.8, 20, 1, true), this.beamMaterial);
    beamMesh.position.y = 1.4;
    this.group.add(beamMesh);

    scene.add(this.group);
  }

  isWithinRange(playerPosition) {
    const deltaX = playerPosition.x - this.position.x;
    const deltaZ = playerPosition.z - this.position.z;
    const horizontalDistance = Math.hypot(deltaX, deltaZ);
    const verticalDistance = Math.abs(playerPosition.y - this.position.y);
    return horizontalDistance <= CHECKPOINT_RANGE.horizontalRadius
      && verticalDistance <= CHECKPOINT_RANGE.verticalTolerance;
  }

  // 復帰位置: チェックポイントの少し上（球の半径ぶん + 余裕）。
  getRespawnPoint() {
    return {
      x: this.position.x,
      y: this.position.y + 0.65,
      z: this.position.z,
      yawRadians: this.yawRadians,
    };
  }

  setActive(active) {
    this.isActive = active;
    if (this.discMaterial) {
      const colorValue = active ? COLOR_ACTIVE : COLOR_INACTIVE;
      this.discMaterial.color.setHex(colorValue);
      this.discMaterial.emissive.setHex(colorValue);
      this.discMaterial.emissiveIntensity = active ? 1.1 : 0.55;
    }
    if (this.beamMaterial) {
      this.beamMaterial.color.setHex(active ? COLOR_ACTIVE : COLOR_INACTIVE);
      this.beamMaterial.opacity = active ? 0.13 : 0.05;
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
