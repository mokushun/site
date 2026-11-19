import * as THREE from 'three';

// Crystal（Phase 4 で配置、収集判定は Phase 5）:
// ステージ内に置かれるエネルギー結晶。回転と上下動で存在を示す。
export class Crystal {
  constructor({ position }, scene = null) {
    this.position = { ...position };
    this.elapsed = Math.random() * Math.PI * 2;
    this.mesh = null;
    if (scene) this.buildMeshes(scene);
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
    if (!this.mesh) return;
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
