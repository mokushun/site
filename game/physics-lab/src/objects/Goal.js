import * as THREE from 'three';

// Goal（Phase 4）: ステージのゴール地点。範囲内に入ると到達。
// ランクやリザルトは Phase 5 で扱うため、ここでは判定と見た目のみ。
export class Goal {
  constructor({ position }, scene = null) {
    this.position = { ...position };
    this.reachRadius = 1.6;
    this.reachHeight = 2.0;
    this.group = null;
    this.ringMesh = null;
    this.beamMaterial = null;
    if (scene) this.buildMeshes(scene);
  }

  buildMeshes(scene) {
    this.group = new THREE.Group();
    this.group.position.set(this.position.x, this.position.y, this.position.z);

    const discMaterial = new THREE.MeshStandardMaterial({
      color: 0x51e07a, emissive: 0x51e07a, emissiveIntensity: 1.0,
      metalness: 0.4, roughness: 0.35, transparent: true, opacity: 0.9,
    });
    const discMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.12, 36), discMaterial);
    discMesh.position.y = 0.06;
    this.group.add(discMesh);

    this.ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.06, 10, 40),
      new THREE.MeshStandardMaterial({
        color: 0x51e07a, emissive: 0x51e07a, emissiveIntensity: 1.6,
        metalness: 0.3, roughness: 0.3,
      }),
    );
    this.ringMesh.rotation.x = Math.PI / 2;
    this.ringMesh.position.y = 0.16;
    this.group.add(this.ringMesh);

    this.beamMaterial = new THREE.MeshBasicMaterial({
      color: 0x51e07a, transparent: true, opacity: 0.13,
      depthWrite: false, side: THREE.FrontSide,
    });
    const beamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 3.6, 20, 1, true), this.beamMaterial);
    beamMesh.position.y = 1.8;
    this.group.add(beamMesh);

    scene.add(this.group);
  }

  checkReached(playerPosition) {
    const deltaX = playerPosition.x - this.position.x;
    const deltaZ = playerPosition.z - this.position.z;
    const horizontalDistance = Math.hypot(deltaX, deltaZ);
    const heightDelta = playerPosition.y - this.position.y;
    return horizontalDistance <= this.reachRadius && heightDelta >= -0.5 && heightDelta <= this.reachHeight;
  }

  renderUpdate(deltaSeconds) {
    if (this.ringMesh) {
      this.ringMesh.rotation.z += deltaSeconds * 1.4;
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
