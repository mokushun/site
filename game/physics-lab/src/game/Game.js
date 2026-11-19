import * as THREE from 'three';
import { PhysicsWorld } from './PhysicsWorld.js';
import { GameLoop } from './GameLoop.js';
import { InputManager } from './InputManager.js';
import { CameraController } from './CameraController.js';
import { Player } from './Player.js';
import { LabEnvironment } from '../objects/LabEnvironment.js';
import { HUD } from '../ui/HUD.js';

// Phase 1 のゲーム本体: Three.js 初期化、研究施設の部屋、球体、
// 重力・衝突、WASD 移動、ジャンプ、三人称追従カメラを束ねる。
export class Game {
  constructor(canvasElement) {
    this.canvasElement = canvasElement;
    this.hud = new HUD();
    this.physicsWorld = null;
    this.player = null;
    this.environment = null;
    this.inputManager = null;
    this.cameraController = null;
    this.gameLoop = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.boundResize = () => this.handleResize();
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

    this.inputManager = new InputManager(this.canvasElement);
    this.cameraController = new CameraController(this.camera, this.canvasElement);
    this.cameraController.snapToTarget(this.player.getPosition());

    window.addEventListener('resize', this.boundResize);

    this.gameLoop = new GameLoop({
      onPhysicsStep: (fixedDeltaSeconds) => this.physicsStep(fixedDeltaSeconds),
      onRender: (frameDeltaSeconds) => this.renderFrame(frameDeltaSeconds),
    });

    this.hud.hideLoading();
    this.hud.setHintVisible(true);
    document.addEventListener('pointerlockchange', () => {
      this.hud.setHintVisible(document.pointerLockElement !== this.canvasElement);
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
    const moveInput = this.inputManager.getMoveInput();
    const cameraMove = this.cameraController.getMoveDirection(moveInput);
    const wantsJump = this.inputManager.consumeJump();
    const moveDirection = {
      x: cameraMove.x * cameraMove.strength,
      z: cameraMove.z * cameraMove.strength,
    };
    this.player.applyMovement(fixedDeltaSeconds, moveDirection, wantsJump);
    this.physicsWorld.step();
    this.player.updateGrounded();
  }

  renderFrame(frameDeltaSeconds) {
    this.player.syncMesh();
    this.cameraController.update(frameDeltaSeconds, this.player.getPosition());
    this.hud.updateDebug(this.player);
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
    if (this.inputManager) this.inputManager.dispose();
    if (this.cameraController) this.cameraController.dispose();
    if (this.player) this.player.dispose(this.scene);
    if (this.environment) this.environment.dispose();
    if (this.physicsWorld) this.physicsWorld.dispose();
    if (this.renderer) this.renderer.dispose();
  }
}
