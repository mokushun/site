import * as THREE from 'three';
import { PhysicsWorld } from './PhysicsWorld.js';
import { GameLoop } from './GameLoop.js';
import { InputManager } from './InputManager.js';
import { CameraController } from './CameraController.js';
import { Player } from './Player.js';
import { CheckpointManager } from './CheckpointManager.js';
import { PlatformCarrier } from './PlatformCarrier.js';
import { StageLoader } from './StageLoader.js';
import { STAGES } from '../data/stages.js';
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
    this.checkpointManager = null;
    this.platformCarrier = null;
    this.stageLoader = null;
    this.currentStageIndex = 0;
    this.goal = null;
    this.crystals = [];
    this.goalReached = false;
    this.goalTimerSeconds = 0;
    this.gimmicks = [];
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
    this.scene.fog = new THREE.Fog(0x050a14, 55, 150);

    this.camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 300,
    );

    this.buildLights();

    this.player = new Player(this.physicsWorld, this.scene);
    this.player.updateGrounded();

    this.checkpointManager = new CheckpointManager(this.scene);
    this.inputManager = new InputManager(this.canvasElement);
    this.cameraController = new CameraController(this.camera, this.canvasElement);

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

    // URL の ?stage=N（1始まり）で開始ステージを指定できる。
    let initialStageIndex = 0;
    const stageParam = Number.parseInt(new URLSearchParams(window.location.search).get('stage') ?? '', 10);
    if (Number.isFinite(stageParam) && stageParam >= 1 && stageParam <= STAGES.length) {
      initialStageIndex = stageParam - 1;
    }
    this.loadStage(initialStageIndex);

    this.hud.hideLoading();
    this.hud.setHintVisible(true);
  }

  // ステージをデータから読み込む（Phase 4）。前のステージは破棄する。
  loadStage(stageIndex) {
    if (this.stageLoader) {
      this.stageLoader.dispose();
      this.stageLoader = null;
    }
    this.checkpointManager.dispose();
    this.platformCarrier = new PlatformCarrier(this.physicsWorld);
    this.stageLoader = new StageLoader(this.physicsWorld, this.scene);
    const loaded = this.stageLoader.load(STAGES[stageIndex], this.checkpointManager);
    this.gimmicks = loaded.gimmicks;
    this.goal = loaded.goal;
    this.crystals = loaded.crystals;
    for (const gimmick of this.gimmicks) {
      if (gimmick.collider && typeof gimmick.applyCarry === 'function') {
        this.platformCarrier.register(gimmick);
      }
    }
    this.currentStageIndex = stageIndex;
    this.elapsedSeconds = 0;
    this.respawnCount = 0;
    this.goalReached = false;
    this.goalTimerSeconds = 0;

    const start = loaded.playerStart;
    this.player.respawnTo({
      x: start.position.x, y: start.position.y, z: start.position.z,
      yawRadians: start.yawRadians,
    });
    this.cameraController.yawRadians = start.yawRadians;
    this.cameraController.pitchRadians = 0.32;
    this.cameraController.snapToTarget(this.player.getPosition());
    this.hud.setStageLabel(`STAGE ${stageIndex + 1} / ${STAGES.length}: ${loaded.stageName}`);

    // ステージ切替時はポーズを解除してすぐ遊べる状態にする。
    if (this.state === 'paused') {
      this.state = 'playing';
      this.inputManager.enabled = true;
      this.pauseMenu.hide();
    }
    this.inputManager.clearTransientQueues();
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
    for (const gimmick of this.gimmicks) {
      if (typeof gimmick.preStep === 'function') {
        gimmick.preStep(fixedDeltaSeconds, this.player);
      }
    }
    if (this.platformCarrier) {
      this.platformCarrier.applyCarry(this.player);
    }
    this.physicsWorld.step();
    this.player.updateGrounded();
    if (this.platformCarrier) {
      this.platformCarrier.updateSupport(this.player);
    }

    const newlyActivated = this.checkpointManager.update(this.player.getPosition());
    if (newlyActivated) {
      this.hud.showNotification(`チェックポイント到達 — ${newlyActivated.name}`);
    }

    if (this.goal && !this.goalReached && this.goal.checkReached(this.player.getPosition())) {
      this.goalReached = true;
      this.goalTimerSeconds = 1.4;
      const stageName = STAGES[this.currentStageIndex].name;
      this.hud.showNotification(`GOAL! — ${stageName} クリア`);
    }

    if (this.player.hasFallenBelow()) {
      this.respawn('fall');
    }
  }

  respawn(source) {
    const respawnPoint = this.checkpointManager.getRespawnPoint();
    if (this.platformCarrier) this.platformCarrier.clearSupport();
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
    const stageSelect = this.inputManager.consumeStageSelect();
    if (stageSelect !== null && stageSelect !== this.currentStageIndex) {
      this.loadStage(stageSelect);
    }
    // ゴール後は少し置いてから次のステージへ（最後なら最初に戻る）。
    if (this.goalReached) {
      this.goalTimerSeconds -= frameDeltaSeconds;
      if (this.goalTimerSeconds <= 0) {
        this.loadStage((this.currentStageIndex + 1) % STAGES.length);
      }
    }
    if (this.state === 'playing') {
      this.player.syncMesh();
      for (const gimmick of this.gimmicks) {
        if (typeof gimmick.syncMesh === 'function') gimmick.syncMesh();
        if (typeof gimmick.renderUpdate === 'function') gimmick.renderUpdate(frameDeltaSeconds);
      }
      if (this.goal) this.goal.renderUpdate(frameDeltaSeconds);
      for (const crystal of this.crystals) crystal.renderUpdate(frameDeltaSeconds);
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
    if (this.stageLoader) this.stageLoader.dispose();
    this.gimmicks = [];
    if (this.checkpointManager) this.checkpointManager.dispose();
    if (this.physicsWorld) this.physicsWorld.dispose();
    if (this.renderer) this.renderer.dispose();
  }
}
