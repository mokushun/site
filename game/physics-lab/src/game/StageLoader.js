import * as THREE from 'three';
import { LabEnvironment } from '../objects/LabEnvironment.js';
import { JumpPad } from '../objects/JumpPad.js';
import { RotatingPlatform } from '../objects/RotatingPlatform.js';
import { MovingPlatform } from '../objects/MovingPlatform.js';
import { WindZone } from '../objects/WindZone.js';
import { Magnet } from '../objects/Magnet.js';
import { Seesaw } from '../objects/Seesaw.js';
import { Goal } from '../objects/Goal.js';
import { Crystal } from '../objects/Crystal.js';

// ステージ定義データ（src/data/stages.js）からステージを構築する（Phase 4）。
// どのステージもこの同じコードで構築される。ステージ固有処理は持たない。
export class StageLoader {
  constructor(physicsWorld, scene) {
    this.physicsWorld = physicsWorld;
    this.scene = scene;
    this.environment = new LabEnvironment(physicsWorld, scene, { buildRoom: false });
    this.gimmicks = [];
    this.goal = null;
    this.crystals = [];
    this.materialCache = new Map();
    this.ownedMaterials = [];
  }

  makeGridTexture(sizeX, sizeZ) {
    // ブラウザ以外（Node テスト）では document がないため、その場合は
    // テクスチャなしの単色マテリアルにフォールバックする。
    if (typeof document === 'undefined') return null;
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
    texture.repeat.set(Math.max(1, Math.round(sizeX / 2)), Math.max(1, Math.round(sizeZ / 2)));
    texture.anisotropy = 4;
    return texture;
  }

  makeMaterial(style, colorOverride, size) {
    // 床・浮島・ステップはグリッドテクスチャで質感と奥行きを出す。
    if (style === 'floor' || style === 'platform' || style === 'step') {
      const texture = this.makeGridTexture(size.x, size.z);
      const params = { metalness: 0.35, roughness: 0.55, color: 0x0d1a29 };
      if (texture) {
        params.map = texture;
        params.color = 0xffffff;
      }
      if (colorOverride) params.color = colorOverride;
      const texturedMaterial = new THREE.MeshStandardMaterial(params);
      this.ownedMaterials.push(texturedMaterial);
      return texturedMaterial;
    }
    const cacheKey = `${style}|${colorOverride ?? ''}`;
    if (this.materialCache.has(cacheKey)) return this.materialCache.get(cacheKey);
    let material;
    switch (style) {
      case 'glass':
        material = new THREE.MeshStandardMaterial({
          color: 0x2a4a63, metalness: 0.4, roughness: 0.35,
          transparent: true, opacity: 0.55, emissive: 0x0a2436, emissiveIntensity: 0.7,
        });
        break;
      case 'trim':
        material = new THREE.MeshStandardMaterial({
          color: 0x39d5f0, emissive: 0x39d5f0, emissiveIntensity: 1.6, metalness: 0.2, roughness: 0.4,
        });
        break;
      case 'ramp':
        material = new THREE.MeshStandardMaterial({
          color: colorOverride ?? 0x2e5d54, metalness: 0.4, roughness: 0.5,
          emissive: 0x0a2e26, emissiveIntensity: 0.5,
        });
        break;
      case 'block':
        material = new THREE.MeshStandardMaterial({
          color: colorOverride ?? 0x74552e, metalness: 0.3, roughness: 0.6,
          emissive: 0x2e1f08, emissiveIntensity: 0.5,
        });
        break;
      case 'pillar':
        material = new THREE.MeshStandardMaterial({
          color: colorOverride ?? 0x476b84, metalness: 0.7, roughness: 0.3,
          emissive: 0x0a2436, emissiveIntensity: 0.4,
        });
        break;
      default:
        material = new THREE.MeshStandardMaterial({
          color: colorOverride ?? 0x35586e, metalness: 0.5, roughness: 0.45,
          emissive: 0x0a2436, emissiveIntensity: 0.45,
        });
        break;
    }
    this.materialCache.set(cacheKey, material);
    return material;
  }

  load(definition, checkpointManager) {
    const env = this.environment;
    for (const box of definition.boxes ?? []) {
      env.addStaticBox({
        size: box.size,
        position: box.position,
        material: this.makeMaterial(box.style ?? 'platform', box.color, box.size),
        physicsFriction: box.friction ?? 0.9,
      });
    }
    for (const ramp of definition.ramps ?? []) {
      env.addStaticBox({
        size: ramp.size,
        position: ramp.position,
        rotationEuler: { x: THREE.MathUtils.degToRad(ramp.rotationXDegrees ?? 0), y: 0, z: 0 },
        material: this.makeMaterial(ramp.style ?? 'ramp', ramp.color, ramp.size),
        physicsFriction: ramp.friction ?? 0.9,
      });
    }
    for (const cylinder of definition.cylinders ?? []) {
      env.addStaticCylinder({
        radius: cylinder.radius,
        height: cylinder.height,
        position: cylinder.position,
        material: this.makeMaterial('pillar', cylinder.color, { x: 1, z: 1 }),
      });
    }
    for (const checkpointDef of definition.checkpoints ?? []) {
      checkpointManager.addCheckpoint(checkpointDef);
    }
    const world = this.physicsWorld;
    const scene = this.scene;
    for (const def of definition.jumpPads ?? []) this.gimmicks.push(new JumpPad(def, scene));
    for (const def of definition.rotatingPlatforms ?? []) this.gimmicks.push(new RotatingPlatform(world, def, scene));
    for (const def of definition.movingPlatforms ?? []) this.gimmicks.push(new MovingPlatform(world, def, scene));
    for (const def of definition.windZones ?? []) this.gimmicks.push(new WindZone(def, scene));
    for (const def of definition.magnets ?? []) this.gimmicks.push(new Magnet(def, scene));
    for (const def of definition.seesaws ?? []) this.gimmicks.push(new Seesaw(world, def, scene));

    this.goal = new Goal(definition.goal, scene);
    this.crystals = (definition.crystals ?? []).map((def) => new Crystal(def, scene));

    return {
      gimmicks: this.gimmicks,
      goal: this.goal,
      crystals: this.crystals,
      playerStart: definition.playerStart,
      stageName: definition.name,
    };
  }

  dispose() {
    for (const gimmick of this.gimmicks) {
      if (typeof gimmick.dispose === 'function') gimmick.dispose(this.scene, this.physicsWorld);
    }
    this.gimmicks = [];
    if (this.goal) { this.goal.dispose(this.scene); this.goal = null; }
    for (const crystal of this.crystals) crystal.dispose(this.scene);
    this.crystals = [];
    this.environment.dispose();
    for (const material of this.materialCache.values()) material.dispose();
    this.materialCache.clear();
    for (const material of this.ownedMaterials) {
      if (material.map) material.map.dispose();
      material.dispose();
    }
    this.ownedMaterials = [];
  }
}
