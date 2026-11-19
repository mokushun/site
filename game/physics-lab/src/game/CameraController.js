import * as THREE from 'three';

// 球体の後方斜め上から追従する三人称カメラ。
// マウス視点は Pointer Lock を基本とし、未対応・未ロック時は
// ドラッグでも視点変更できるようにする。
export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.yawRadians = 0;          // 0 のときカメラは球体の +Z 側（背後）
    this.pitchRadians = 0.34;     // カメラの仰角
    this.pitchMinRadians = 0.06;
    this.pitchMaxRadians = 1.35;
    this.distance = 7.5;
    this.mouseSensitivity = 0.0024;

    this.smoothedPosition = new THREE.Vector3(0, 4, 14);
    this.smoothedLookTarget = new THREE.Vector3(0, 1, 0);
    this.isPointerLocked = false;
    this.isDragging = false;
    this.lastDragX = 0;
    this.lastDragY = 0;

    this.boundMouseMove = (mouseEvent) => this.handleMouseMove(mouseEvent);
    this.boundPointerLockChange = () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
    };
    this.boundMouseDown = (mouseEvent) => {
      if (!this.isPointerLocked) {
        this.isDragging = true;
        this.lastDragX = mouseEvent.clientX;
        this.lastDragY = mouseEvent.clientY;
      }
    };
    this.boundMouseUp = () => { this.isDragging = false; };
    this.boundClick = () => this.requestPointerLock();

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('pointerlockchange', this.boundPointerLockChange);
    this.domElement.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mouseup', this.boundMouseUp);
    this.domElement.addEventListener('click', this.boundClick);
  }

  requestPointerLock() {
    if (this.isPointerLocked) return;
    // Pointer Lock 未対応環境ではドラッグ操作にフォールバックする。
    if (typeof this.domElement.requestPointerLock === 'function') {
      try {
        const lockResult = this.domElement.requestPointerLock();
        if (lockResult && typeof lockResult.catch === 'function') {
          lockResult.catch(() => { /* ユーザー操作なし等の拒否は無視（ドラッグで代替可能） */ });
        }
      } catch (ignoredError) {
        // 同期的に投げてくる環境でも落とさない。
      }
    }
  }

  handleMouseMove(mouseEvent) {
    let deltaX = 0;
    let deltaY = 0;
    if (this.isPointerLocked) {
      deltaX = mouseEvent.movementX || 0;
      deltaY = mouseEvent.movementY || 0;
    } else if (this.isDragging) {
      deltaX = mouseEvent.clientX - this.lastDragX;
      deltaY = mouseEvent.clientY - this.lastDragY;
      this.lastDragX = mouseEvent.clientX;
      this.lastDragY = mouseEvent.clientY;
    } else {
      return;
    }
    this.yawRadians -= deltaX * this.mouseSensitivity;
    this.pitchRadians += deltaY * this.mouseSensitivity;
    if (this.pitchRadians < this.pitchMinRadians) this.pitchRadians = this.pitchMinRadians;
    if (this.pitchRadians > this.pitchMaxRadians) this.pitchRadians = this.pitchMaxRadians;
  }

  // カメラ基準の移動方向（ワールド空間、XZ 平面）を返す。
  // input: {forward, strafe}（InputManager の出力）
  getMoveDirection(input) {
    const sinYaw = Math.sin(this.yawRadians);
    const cosYaw = Math.cos(this.yawRadians);
    // カメラ前方（球体方向、XZ）: (-sin, -cos)、右: (cos, -sin)
    const forwardX = -sinYaw;
    const forwardZ = -cosYaw;
    const rightX = cosYaw;
    const rightZ = -sinYaw;
    let moveX = forwardX * input.forward + rightX * input.strafe;
    let moveZ = forwardZ * input.forward + rightZ * input.strafe;
    const length = Math.hypot(moveX, moveZ);
    if (length > 1) {
      moveX /= length;
      moveZ /= length;
    }
    return { x: moveX, z: moveZ, strength: Math.min(1, length) };
  }

  // targetPosition: 球体の現在位置 {x,y,z}
  update(deltaSeconds, targetPosition) {
    const cosPitch = Math.cos(this.pitchRadians);
    const offsetX = Math.sin(this.yawRadians) * cosPitch * this.distance;
    const offsetY = Math.sin(this.pitchRadians) * this.distance;
    const offsetZ = Math.cos(this.yawRadians) * cosPitch * this.distance;

    const desiredPosition = new THREE.Vector3(
      targetPosition.x + offsetX,
      targetPosition.y + offsetY,
      targetPosition.z + offsetZ,
    );
    // 床へのめり込み防止（Phase 1 は最低高さのクランプで対応）。
    if (desiredPosition.y < 0.5) desiredPosition.y = 0.5;

    const positionBlend = 1 - Math.exp(-9 * deltaSeconds);
    this.smoothedPosition.lerp(desiredPosition, positionBlend);

    const desiredLookTarget = new THREE.Vector3(
      targetPosition.x, targetPosition.y + 0.4, targetPosition.z,
    );
    const lookBlend = 1 - Math.exp(-14 * deltaSeconds);
    this.smoothedLookTarget.lerp(desiredLookTarget, lookBlend);

    this.camera.position.copy(this.smoothedPosition);
    this.camera.lookAt(this.smoothedLookTarget);
  }

  // リスポーン・ステージ切替時にカメラを即座に合わせ直す。
  snapToTarget(targetPosition) {
    const cosPitch = Math.cos(this.pitchRadians);
    this.smoothedPosition.set(
      targetPosition.x + Math.sin(this.yawRadians) * cosPitch * this.distance,
      targetPosition.y + Math.sin(this.pitchRadians) * this.distance,
      targetPosition.z + Math.cos(this.yawRadians) * cosPitch * this.distance,
    );
    this.smoothedLookTarget.set(targetPosition.x, targetPosition.y + 0.4, targetPosition.z);
    this.camera.position.copy(this.smoothedPosition);
    this.camera.lookAt(this.smoothedLookTarget);
  }

  dispose() {
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
    this.domElement.removeEventListener('mousedown', this.boundMouseDown);
    window.removeEventListener('mouseup', this.boundMouseUp);
    this.domElement.removeEventListener('click', this.boundClick);
  }
}
