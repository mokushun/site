import * as THREE from 'three';

// Phase 1 用のテスト環境: 研究施設風の部屋（床・壁・段差・スロープ・柱）。
// すべての静的オブジェクトは Three.js メッシュと Rapier Fixed 剛体を対で作る。
const ROOM_HALF_SIZE = 18; // 床は 36m x 36m
const WALL_HEIGHT = 4;

function makeGridFloorTexture() {
  const canvasSize = 256;
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = canvasSize;
  textureCanvas.height = canvasSize;
  const ctx = textureCanvas.getContext('2d');
  ctx.fillStyle = '#0b1622';
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  ctx.fillStyle = '#0d1a29';
  ctx.fillRect(4, 4, canvasSize - 8, canvasSize - 8);
  ctx.strokeStyle = 'rgba(57, 213, 240, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, canvasSize, canvasSize);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(ROOM_HALF_SIZE, ROOM_HALF_SIZE); // 1タイル = 2m
  texture.anisotropy = 4;
  return texture;
}

export class LabEnvironment {
  // 第1ステージの部屋は buildTestRoom() で構築する。Phase 4 以降は
  // StageLoader がデータからプリミティブを積み上げる使い方もする。
  constructor(physicsWorld, scene, { buildRoom = true } = {}) {
    this.physicsWorld = physicsWorld;
    this.scene = scene;
    this.meshes = [];
    this.staticBodies = [];

    if (buildRoom) this.buildTestRoom();
  }

  buildTestRoom() {
    this.buildFloor();
    this.buildWalls();
    this.buildSteps();
    this.buildRamp();
    this.buildPillars();
    this.buildTestBlocks();
  }

  addStaticCylinder({ radius, height, position, material, physicsFriction = 0.9 }) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 24);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (this.scene) this.scene.add(mesh);
    this.meshes.push(mesh);
    const entry = this.physicsWorld.createStaticCylinder({
      halfHeight: height / 2,
      radius,
      position,
      friction: physicsFriction,
    });
    this.staticBodies.push(entry);
    return mesh;
  }

  addStaticBox({ size, position, rotationEuler = null, material, physicsFriction = 0.9 }) {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    if (rotationEuler) {
      mesh.rotation.set(rotationEuler.x, rotationEuler.y, rotationEuler.z);
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (this.scene) this.scene.add(mesh);
    this.meshes.push(mesh);

    let rotationQuat = null;
    if (rotationEuler) {
      const euler = new THREE.Euler(rotationEuler.x, rotationEuler.y, rotationEuler.z);
      const quat = new THREE.Quaternion().setFromEuler(euler);
      rotationQuat = { x: quat.x, y: quat.y, z: quat.z, w: quat.w };
    }
    const entry = this.physicsWorld.createStaticCuboid({
      halfExtents: { x: size.x / 2, y: size.y / 2, z: size.z / 2 },
      position,
      rotationQuat,
      friction: physicsFriction,
    });
    this.staticBodies.push(entry);
    return mesh;
  }

  buildFloor() {
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: makeGridFloorTexture(),
      color: 0xffffff,
      metalness: 0.35,
      roughness: 0.55,
    });
    // 床上面が y=0 になるよう、厚み 1 の箱を y=-0.5 に置く。
    this.addStaticBox({
      size: { x: ROOM_HALF_SIZE * 2, y: 1, z: ROOM_HALF_SIZE * 2 },
      position: { x: 0, y: -0.5, z: 0 },
      material: floorMaterial,
      physicsFriction: 1.0,
    });
  }

  buildWalls() {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a4a63,
      metalness: 0.4,
      roughness: 0.35,
      transparent: true,
      opacity: 0.55,
      emissive: 0x0a2436,
      emissiveIntensity: 0.7,
    });
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x39d5f0, emissive: 0x39d5f0, emissiveIntensity: 1.6,
      metalness: 0.2, roughness: 0.4,
    });
    const thickness = 0.6;
    const half = ROOM_HALF_SIZE;
    const wallDefs = [
      { size: { x: half * 2 + thickness * 2, y: WALL_HEIGHT, z: thickness }, position: { x: 0, y: WALL_HEIGHT / 2, z: -half - thickness / 2 } },
      { size: { x: half * 2 + thickness * 2, y: WALL_HEIGHT, z: thickness }, position: { x: 0, y: WALL_HEIGHT / 2, z: half + thickness / 2 } },
      { size: { x: thickness, y: WALL_HEIGHT, z: half * 2 }, position: { x: -half - thickness / 2, y: WALL_HEIGHT / 2, z: 0 } },
      { size: { x: thickness, y: WALL_HEIGHT, z: half * 2 }, position: { x: half + thickness / 2, y: WALL_HEIGHT / 2, z: 0 } },
    ];
    for (const wallDef of wallDefs) {
      this.addStaticBox({ ...wallDef, material: wallMaterial });
      // 壁の上端に発光トリム（物理なし、見た目のみ）。
      const trimGeometry = new THREE.BoxGeometry(
        wallDef.size.x === thickness ? 0.25 : wallDef.size.x,
        0.18,
        wallDef.size.z === thickness ? 0.25 : wallDef.size.z,
      );
      const trimMesh = new THREE.Mesh(trimGeometry, trimMaterial);
      trimMesh.position.set(wallDef.position.x, WALL_HEIGHT + 0.05, wallDef.position.z);
      this.scene.add(trimMesh);
      this.meshes.push(trimMesh);
    }
  }

  buildSteps() {
    // ジャンプと段差の確認用ステップ（北側）。
    const stepMaterial = new THREE.MeshStandardMaterial({
      color: 0x35586e, metalness: 0.5, roughness: 0.4,
      emissive: 0x0a2436, emissiveIntensity: 0.5,
    });
    const heights = [0.5, 1.0, 1.5];
    heights.forEach((height, index) => {
      this.addStaticBox({
        size: { x: 4, y: height, z: 2.2 },
        position: { x: -8 + index * 0, y: height / 2, z: -10 - index * 2.2 },
        material: stepMaterial,
      });
    });
    // 一番上に小さな台（到達確認用）。
    this.addStaticBox({
      size: { x: 4, y: 0.4, z: 2.2 },
      position: { x: -8, y: 1.7, z: -17 },
      material: stepMaterial,
    });
  }

  buildRamp() {
    // スロープ（東側）。32度傾斜。
    const rampMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e5d54, metalness: 0.4, roughness: 0.5,
      emissive: 0x0a2e26, emissiveIntensity: 0.5,
    });
    const angleRadians = THREE.MathUtils.degToRad(32);
    this.addStaticBox({
      size: { x: 5, y: 0.5, z: 9 },
      position: { x: 10, y: 1.9, z: -2 },
      rotationEuler: { x: angleRadians, y: 0, z: 0 },
      material: rampMaterial,
      physicsFriction: 0.6,
    });
  }

  buildPillars() {
    // 円柱の柱（西側と中央付近）。衝突と回り込みの確認用。
    const pillarMaterial = new THREE.MeshStandardMaterial({
      color: 0x476b84, metalness: 0.7, roughness: 0.3,
      emissive: 0x0a2436, emissiveIntensity: 0.4,
    });
    const pillarPositions = [
      { x: -12, z: 4 }, { x: 6, z: 10 }, { x: 12, z: 12 }, { x: -4, z: -6 },
    ];
    for (const pillarPos of pillarPositions) {
      const pillarHeight = 3.2;
      const pillarRadius = 0.7;
      const geometry = new THREE.CylinderGeometry(pillarRadius, pillarRadius, pillarHeight, 24);
      const mesh = new THREE.Mesh(geometry, pillarMaterial);
      mesh.position.set(pillarPos.x, pillarHeight / 2, pillarPos.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.meshes.push(mesh);
      const entry = this.physicsWorld.createStaticCylinder({
        halfHeight: pillarHeight / 2,
        radius: pillarRadius,
        position: { x: pillarPos.x, y: pillarHeight / 2, z: pillarPos.z },
      });
      this.staticBodies.push(entry);
    }
  }

  buildTestBlocks() {
    // 壁際の低いブロック（反発・摩擦の目視確認用）。
    const blockMaterial = new THREE.MeshStandardMaterial({
      color: 0x74552e, metalness: 0.3, roughness: 0.6,
      emissive: 0x2e1f08, emissiveIntensity: 0.5,
    });
    this.addStaticBox({
      size: { x: 2.4, y: 1.2, z: 2.4 },
      position: { x: 4, y: 0.6, z: -12 },
      material: blockMaterial,
    });
    this.addStaticBox({
      size: { x: 1.6, y: 0.8, z: 1.6 },
      position: { x: -2, y: 0.4, z: 12 },
      material: blockMaterial,
    });
  }

  dispose() {
    for (const mesh of this.meshes) {
      if (this.scene) this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
    }
    for (const entry of this.staticBodies) {
      this.physicsWorld.rapierWorld.removeRigidBody(entry.body);
    }
    this.meshes = [];
    this.staticBodies = [];
  }
}
