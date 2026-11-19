import RAPIER from '@dimforge/rapier3d-compat';

// Rapier 物理ワールドの生成と固定タイムステップ管理を担う。
// Three.js には依存しない（Node 上の物理テストからも利用できる）。
export const FIXED_TIMESTEP = 1 / 60;
export const GRAVITY_Y = -9.81;

export class PhysicsWorld {
  constructor(rapierWorld) {
    this.rapierWorld = rapierWorld;
    this.rapierWorld.timestep = FIXED_TIMESTEP;
  }

  // RAPIER.init() は非同期。必ずこのファクトリ経由で生成する。
  static async create() {
    await RAPIER.init();
    const world = new RAPIER.World({ x: 0, y: GRAVITY_Y, z: 0 });
    return new PhysicsWorld(world);
  }

  step() {
    this.rapierWorld.step();
  }

  // 静的な床・壁・障害物用の Fixed 剛体 + Cuboid Collider を作る。
  // halfExtents: {x,y,z}、position: {x,y,z}、rotationQuat: {x,y,z,w} | null
  createStaticCuboid({ halfExtents, position, rotationQuat = null, friction = 0.9, restitution = 0.0 }) {
    let bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
    if (rotationQuat) {
      bodyDesc = bodyDesc.setRotation({ x: rotationQuat.x, y: rotationQuat.y, z: rotationQuat.z, w: rotationQuat.w });
    }
    const body = this.rapierWorld.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
      .setFriction(friction)
      .setRestitution(restitution);
    const collider = this.rapierWorld.createCollider(colliderDesc, body);
    return { body, collider };
  }

  createStaticCylinder({ halfHeight, radius, position, friction = 0.9, restitution = 0.0 }) {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
    const body = this.rapierWorld.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cylinder(halfHeight, radius)
      .setFriction(friction)
      .setRestitution(restitution);
    const collider = this.rapierWorld.createCollider(colliderDesc, body);
    return { body, collider };
  }

  // 下向きレイで接地判定などに使う。ヒットしたら距離、なければ null。
  castRayDown(origin, maxDistance, excludeCollider) {
    const ray = new RAPIER.Ray(origin, { x: 0, y: -1, z: 0 });
    const hit = this.rapierWorld.castRay(
      ray, maxDistance, true,
      undefined, undefined, excludeCollider ?? undefined, undefined,
    );
    return hit ? hit.timeOfImpact : null;
  }

  dispose() {
    this.rapierWorld.free();
    this.rapierWorld = null;
  }
}

export { RAPIER };
