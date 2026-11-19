import * as THREE from 'three';
import { PhysicsWorld } from './PhysicsWorld.js';
import { GameLoop } from './GameLoop.js';
import { InputManager } from './InputManager.js';
import { CameraController } from './CameraController.js';
import { Player } from './Player.js';
import { CheckpointManager } from './CheckpointManager.js';
import { LabEnvironment } from '../objects/LabEnvironment.js';
import { HUD } from '../ui/HUD.js';
import { PauseMenu } from '../ui/PauseMenu.js';

// ゲーム本体。Phase 1 の物理・描画に加え、Phase 2 で
// ゲーム状態（playing / paused）、タイマー、チェックポイント、
// リスポーン、落下判定、ポーズを管理する。
export class Game {
  constructor(canvasElement) {
    this.canvasElement = canvasElement;
    this.hud = new HUD();
    this.physicsWorld = null;
    this.player = null;
    this.environment = null;
    this.checkpointManager = null;
    this.inputManager = null;
    this.cameraController = null;
    this.pauseMenu = null;
    this.gameLoop = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;

    this.state = 'playing'; // 'playing' | 'paused'
    this.elapsedSeconds = 0;
    this.respawnCount = 0;
    this.everPointerLocked = false;

    this.boundResize = () => this.handleResize();
    this.boundPointerLockChange = () => this.handlePointerLockChange();
  }

  async init() {
    this.physicsWorld = await PhysicsWorld.create();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasElement,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050a14);
    this.scene.fog = new THREE.Fog(0x050a14, 45, 95);

    this.camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 300,
    );

    this.buildLights();

    this.environment = new LabEnvironment(this.physicsWorld, this.scene);
    this.player = new Player(this.physicsWorld, this.scene);
    this.player.updateGrounded();

    this.checkpointManager = new CheckpointManager(this.scene);
    this.setupCheckpoints();

    this.inputManager = new InputManager(this.canvasElement);
    this.cameraController = new CameraController(this.camera, this.canvasElement);
    this.cameraController.snapToTarget(this.player.getPosition());

    this.pauseMenu = new PauseMenu({
      onResume: () => this.resumeGame(true),
      onRespawn: () => { this.respawn('menu'); this.resumeGame(true); },
    });

    window.addEventListener('resize', this.boundResize);
    document.addEventListener('pointerlockchange', this.boundPointerLockChange);

    this.gameLoop = new GameLoop({
      onPhysicsStep: (fixedDeltaSeconds) => this.physicsStep(fixedDeltaSeconds),
      onRender: (frameDeltaSeconds) => this.renderFrame(frameDeltaSeconds),
    });

    this.hud.hideLoading();
    this.hud.setHintVisible(true);
  }

  setupCheckpoints() {
    // 初期位置も最初のチェックポイントとして扱う。
    this.checkpointManager.addCheckpoint({
      id: 'cp-start', name: 'スタート地点',
      position: { x: 0, y: 0, z: 6 }, yawRadians: 0,
    });
    this.checkpointManager.addCheckpoint({
      id: 'cp-north', name: '北エリア',
      position: { x: 0, y: 0, z: -10 }, yawRadians: Math.PI,
    });
    this.checkpointManager.addCheckpoint({
      id: 'cp-steps', name: 'ステップ上段',
      position: { x: -8, y: 1.9, z: -17 }, yawRadians: Math.PI,
    });
    this.checkpointManager.addCheckpoint({
      id: 'cp-southeast', name: '南東エリア',
      position: { x: 12, y: 0, z: 12 }, yawRadians: -Math.PI / 4,
    });
  }

  buildLights() {
    const ambientLight = new THREE.AmbientLight(0x8fb8d8, 0.55);
    this.scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x9fd8ef, 0x1a2432, 0.5);
    this.scene.add(hemisphereLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(14, 24, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -24;
    keyLight.shadow.camera.right = 24;
    keyLight.shadow.camera.top = 24;
    keyLight.shadow.camera.bottom = -24;
    keyLight.shadow.camera.far = 60;
    this.scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x39d5f0, 60, 60, 1.8);
    fillLight.position.set(-10, 6, -8);
    this.scene.add(fillLight);
  }

  physicsStep(fixedDeltaSeconds) {
    if (this.state !== 'playing') return;
    this.elapsedSeconds += fixedDeltaSeconds;

    if (this.inputManager.consumeRespawn()) {
      this.respawn('key');
    }

    const moveInput = this.inputManager.getMoveInput();
    const cameraMove = this.cameraController.getMoveDirection(moveInput);
    const wantsJump = this.inputManager.consumeJump();
    const wantsBoost = this.inputManager.isBoostHeld();
    const moveDirection = {
      x: cameraMove.x * cameraMove.strength,
      z: cameraMove.z * cameraMove.strength,
    };
    this.player.applyMovement(fixedDeltaSeconds, moveDirection, wantsJump, wantsBoost);
    this.physicsWorld.step();
    this.player.updateGrounded();

    const newlyActivated = this.checkpointManager.update(this.player.getPosition());
    if (newlyActivated) {
      this.hud.showNotification(`チェックポイント到達 — ${newlyActivated.name}`);
    }

    if (this.player.hasFallenBelow()) {
      this.respawn('fall');
    }
  }

  respawn(source) {
    const respawnPoint = this.checkpointManager.getRespawnPoint();
    this.player.respawnTo(respawnPoint);
    this.cameraController.yawRadians = respawnPoint.yawRadians;
    this.cameraController.snapToTarget(this.player.getPosition());
    this.respawnCount += 1;
    if (source === 'fall') {
      this.hud.showNotification('落下しました — チェックポイントに戻ります');
    } else if (source === 'key') {
      this.hud.showNotification('チェックポイントに戻りました');
    }
  }

  pauseGame() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.inputManager.enabled = false;
    this.inputManager.clearTransientQueues();
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    this.pauseMenu.show();
    this.hud.setHintVisible(false);
  }

  resumeGame(requestLock) {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.inputManager.enabled = true;
    this.inputManager.clearTransientQueues();
    this.pauseMenu.hide();
    this.hud.setHintVisible(document.pointerLockElement !== this.canvasElement);
    if (requestLock) {
      this.cameraController.requestPointerLock();
    }
  }

  togglePause() {
    if (this.state === 'playing') {
      this.pauseGame();
    } else {
      this.resumeGame(false);
    }
  }

  handlePointerLockChange() {
    const isLocked = document.pointerLockElement === this.canvasElement;
    if (isLocked) {
      this.everPointerLocked = true;
      this.hud.setHintVisible(false);
      return;
    }
    // ロックが外れた。プレイ中ならポーズする（Esc でロック解除＝ポーズ扱い）。
    if (this.state === 'playing' && this.everPointerLocked) {
      this.pauseGame();
    } else if (this.state === 'playing') {
      this.hud.setHintVisible(true);
    }
  }

  renderFrame(frameDeltaSeconds) {
    if (this.inputManager.consumePauseToggle()) {
      this.togglePause();
    }
    if (this.state === 'playing') {
      this.player.syncMesh();
      this.cameraController.update(frameDeltaSeconds, this.player.getPosition());
    }
    this.hud.updateStatus({
      elapsedSeconds: this.elapsedSeconds,
      respawnCount: this.respawnCount,
      checkpointProgress: this.checkpointManager.getProgress(),
    });
    this.hud.updateBoost(this.player.boost);
    this.hud.updateDebug(this.player, {
      state: this.state,
      respawnCount: this.respawnCount,
      checkpointProgress: this.checkpointManager.getProgress(),
    });
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start() {
    this.gameLoop.start();
  }

  dispose() {
    if (this.gameLoop) this.gameLoop.stop();
    window.removeEventListener('resize', this.boundResize);
    document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
    if (this.inputManager) this.inputManager.dispose();
    if (this.cameraController) this.cameraController.dispose();
    if (this.player) this.player.dispose(this.scene);
    if (this.checkpointManager) this.checkpointManager.dispose();
    if (this.environment) this.environment.dispose();
    if (this.physicsWorld) this.physicsWorld.dispose();
    if (this.renderer) this.renderer.dispose();
  }
}
