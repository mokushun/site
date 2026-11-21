// ステージ定義データ（Phase 4）。
// すべてのステージはこのデータ形式で表し、StageLoader が同じコードで構築する。
// 座標系: 床上面の高さを boxes の上面で表す。position は箱の中心。
// style: floor（グリッド床）/ glass / trim（発光）/ step / ramp / pillar /
//        block / platform（浮島）。color を指定すると色を上書きできる。
// ramps は rotationXDegrees で X 軸まわりに傾ける。

const STAGE_1 = {
  id: 'stage-01',
  name: 'TEST LAB',
  targetTimeSeconds: 75,
  rankACrystals: 2,
  playerStart: { position: { x: 0, y: 0, z: 6 }, yawRadians: 0 },
  boxes: [
    { style: 'floor', size: { x: 36, y: 1, z: 36 }, position: { x: 0, y: -0.5, z: 0 } },
    { style: 'glass', size: { x: 37.2, y: 4, z: 0.6 }, position: { x: 0, y: 2, z: -18.3 } },
    { style: 'glass', size: { x: 37.2, y: 4, z: 0.6 }, position: { x: 0, y: 2, z: 18.3 } },
    { style: 'glass', size: { x: 0.6, y: 4, z: 36 }, position: { x: -18.3, y: 2, z: 0 } },
    { style: 'glass', size: { x: 0.6, y: 4, z: 36 }, position: { x: 18.3, y: 2, z: 0 } },
    { style: 'trim', size: { x: 37.2, y: 0.18, z: 0.25 }, position: { x: 0, y: 4.05, z: -18.3 } },
    { style: 'trim', size: { x: 37.2, y: 0.18, z: 0.25 }, position: { x: 0, y: 4.05, z: 18.3 } },
    { style: 'trim', size: { x: 0.25, y: 0.18, z: 36 }, position: { x: -18.3, y: 4.05, z: 0 } },
    { style: 'trim', size: { x: 0.25, y: 0.18, z: 36 }, position: { x: 18.3, y: 4.05, z: 0 } },
    { style: 'step', size: { x: 4, y: 0.5, z: 2.2 }, position: { x: -8, y: 0.25, z: -10 } },
    { style: 'step', size: { x: 4, y: 1.0, z: 2.2 }, position: { x: -8, y: 0.5, z: -12.2 } },
    { style: 'step', size: { x: 4, y: 1.5, z: 2.2 }, position: { x: -8, y: 0.75, z: -14.4 } },
    { style: 'step', size: { x: 4, y: 0.4, z: 2.2 }, position: { x: -8, y: 1.7, z: -17 } },
    { style: 'block', size: { x: 2.4, y: 1.2, z: 2.4 }, position: { x: 4, y: 0.6, z: -12 } },
    { style: 'block', size: { x: 1.6, y: 0.8, z: 1.6 }, position: { x: -2, y: 0.4, z: 12 } },
    { style: 'step', size: { x: 4, y: 0.4, z: 4 }, position: { x: 7, y: 5.2, z: -15 } },
  ],
  ramps: [
    { style: 'ramp', size: { x: 5, y: 0.5, z: 9 }, position: { x: 10, y: 1.9, z: -2 }, rotationXDegrees: 32, friction: 0.6 },
  ],
  cylinders: [
    { radius: 0.7, height: 3.2, position: { x: -12, y: 1.6, z: 4 } },
    { radius: 0.7, height: 3.2, position: { x: 6, y: 1.6, z: 10 } },
    { radius: 0.7, height: 3.2, position: { x: 12, y: 1.6, z: 12 } },
    { radius: 0.7, height: 3.2, position: { x: -4, y: 1.6, z: -6 } },
  ],
  checkpoints: [
    { id: 'cp-start', name: 'スタート地点', position: { x: 0, y: 0, z: 6 }, yawRadians: 0 },
    { id: 'cp-north', name: '北エリア', position: { x: 0, y: 0, z: -10 }, yawRadians: Math.PI },
    { id: 'cp-steps', name: 'ステップ上段', position: { x: -8, y: 1.9, z: -17 }, yawRadians: Math.PI },
    { id: 'cp-southeast', name: '南東エリア', position: { x: 12, y: 0, z: 12 }, yawRadians: -Math.PI / 4 },
  ],
  goal: { position: { x: 0, y: 0, z: -16 } },
  jumpPads: [{ position: { x: 7, y: 0, z: -15 }, power: 13 }],
  rotatingPlatforms: [{ position: { x: -12, y: 0.05, z: -5 }, radius: 3, thickness: 0.5, angularSpeed: 0.5 }],
  movingPlatforms: [{ from: { x: -12, y: 1.0, z: 15 }, to: { x: 2, y: 1.0, z: 15 }, speed: 2.2, waitSeconds: 0.8 }],
  windZones: [{ center: { x: 13, y: 3, z: -9 }, size: { x: 4, y: 6, z: 4 }, direction: { x: 0, y: 1, z: 0 }, strength: 24 }],
  magnets: [{ position: { x: -15, y: 1.0, z: 14 }, radius: 5.5, strength: 26, polarity: 'attract' }],
  seesaws: [{ position: { x: 9, y: 0, z: 16 } }],
  crystals: [
    { position: { x: 7, y: 6.1, z: -15 } },
    { position: { x: -8, y: 2.7, z: -17 } },
    { position: { x: 13, y: 6.8, z: -9 } },
  ],
};

const STAGE_2 = {
  id: 'stage-02',
  name: 'STEP VALLEY',
  targetTimeSeconds: 90,
  rankACrystals: 2,
  playerStart: { position: { x: 0, y: 0, z: 3 }, yawRadians: Math.PI },
  boxes: [
    { style: 'platform', size: { x: 10, y: 1.2, z: 10 }, position: { x: 0, y: -0.6, z: 0 } },
    { style: 'platform', size: { x: 6, y: 1.2, z: 6 }, position: { x: 0, y: -0.6, z: -9 } },
    { style: 'platform', size: { x: 4, y: 1.2, z: 4 }, position: { x: 6, y: 0.2, z: -9 } },
    { style: 'platform', size: { x: 4, y: 1.2, z: 4 }, position: { x: 11, y: 1.0, z: -9 } },
    { style: 'platform', size: { x: 4, y: 1.2, z: 4 }, position: { x: 16, y: 1.8, z: -9 } },
    { style: 'platform', size: { x: 8, y: 1.2, z: 8 }, position: { x: 31, y: 1.8, z: -9 } },
  ],
  ramps: [],
  cylinders: [],
  checkpoints: [
    { id: 'cp-start', name: 'スタート地点', position: { x: 0, y: 0, z: 3 }, yawRadians: Math.PI },
    { id: 'cp-mid', name: '中段', position: { x: 11, y: 1.6, z: -9 }, yawRadians: Math.PI / 2 },
  ],
  goal: { position: { x: 31, y: 2.4, z: -9 } },
  jumpPads: [],
  rotatingPlatforms: [],
  movingPlatforms: [{ from: { x: 20.5, y: 2.2, z: -9 }, to: { x: 26.5, y: 2.2, z: -9 }, speed: 2.0, waitSeconds: 0.6 }],
  windZones: [],
  magnets: [],
  seesaws: [],
  crystals: [
    { position: { x: 6, y: 1.6, z: -9 } },
    { position: { x: 16, y: 3.2, z: -9 } },
    { position: { x: 33, y: 3.2, z: -11 } },
  ],
};

const STAGE_3 = {
  id: 'stage-03',
  name: 'WIND CANYON',
  targetTimeSeconds: 90,
  rankACrystals: 2,
  playerStart: { position: { x: 0, y: 0, z: 3 }, yawRadians: Math.PI },
  boxes: [
    { style: 'platform', size: { x: 8, y: 1.2, z: 8 }, position: { x: 0, y: -0.6, z: 0 } },
    { style: 'platform', size: { x: 6, y: 1.2, z: 6 }, position: { x: 0, y: -0.6, z: -8 } },
    { style: 'platform', size: { x: 6, y: 1.2, z: 6 }, position: { x: 0, y: 6.4, z: -11 } },
    { style: 'platform', size: { x: 2.2, y: 0.8, z: 10 }, position: { x: 0, y: 6.6, z: -19 } },
    { style: 'platform', size: { x: 8, y: 1.2, z: 8 }, position: { x: 0, y: 6.4, z: -28 } },
  ],
  ramps: [],
  cylinders: [],
  checkpoints: [
    { id: 'cp-start', name: 'スタート地点', position: { x: 0, y: 0, z: 3 }, yawRadians: Math.PI },
    { id: 'cp-ledge', name: '上層', position: { x: 0, y: 7, z: -12 }, yawRadians: Math.PI },
  ],
  goal: { position: { x: 0, y: 7, z: -28 } },
  jumpPads: [{ position: { x: 0, y: 0, z: -8 }, power: 13 }],
  rotatingPlatforms: [],
  movingPlatforms: [],
  windZones: [
    { center: { x: 0, y: 5, z: -8 }, size: { x: 4.5, y: 10, z: 5 }, direction: { x: 0, y: 1, z: 0 }, strength: 26 },
    { center: { x: 0, y: 8, z: -19 }, size: { x: 3, y: 3, z: 10 }, direction: { x: 0, y: 0, z: -1 }, strength: 7 },
  ],
  magnets: [],
  seesaws: [],
  crystals: [
    { position: { x: 0, y: 3.5, z: -8 } },
    { position: { x: 0, y: 7.8, z: -19 } },
    { position: { x: 2, y: 7.8, z: -28 } },
  ],
};

const STAGE_4 = {
  id: 'stage-04',
  name: 'MAGNET PIT',
  targetTimeSeconds: 120,
  rankACrystals: 2,
  playerStart: { position: { x: -12, y: 0, z: 12 }, yawRadians: -Math.PI / 4 },
  boxes: [
    { style: 'platform', size: { x: 30, y: 1.2, z: 10 }, position: { x: 0, y: -0.6, z: -10 } },
    { style: 'platform', size: { x: 30, y: 1.2, z: 10 }, position: { x: 0, y: -0.6, z: 10 } },
    { style: 'platform', size: { x: 10, y: 1.2, z: 10 }, position: { x: -10, y: -0.6, z: 0 } },
    { style: 'platform', size: { x: 10, y: 1.2, z: 10 }, position: { x: 10, y: -0.6, z: 0 } },
    { style: 'platform', size: { x: 4, y: 1.2, z: 4 }, position: { x: 0, y: -0.6, z: 0 } },
  ],
  ramps: [],
  cylinders: [],
  checkpoints: [
    { id: 'cp-start', name: 'スタート地点', position: { x: -12, y: 0, z: 12 }, yawRadians: -Math.PI / 4 },
    { id: 'cp-island', name: '中央の小島', position: { x: 0, y: 0, z: 0 }, yawRadians: 0 },
    { id: 'cp-north', name: '北エリア', position: { x: -10, y: 0, z: -10 }, yawRadians: Math.PI * 0.75 },
  ],
  goal: { position: { x: 12, y: 0, z: -12 } },
  jumpPads: [],
  rotatingPlatforms: [],
  movingPlatforms: [{ from: { x: 3.5, y: 0.3, z: -8 }, to: { x: 3.5, y: 0.3, z: 8 }, speed: 2.0, waitSeconds: 0.6 }],
  windZones: [],
  magnets: [
    { position: { x: 0, y: 1.2, z: 0 }, radius: 7, strength: 26, polarity: 'attract' },
    { position: { x: 7, y: 1, z: -7 }, radius: 5, strength: 24, polarity: 'repel' },
  ],
  seesaws: [{ position: { x: -3.5, y: 0, z: 0 } }],
  crystals: [
    { position: { x: 0, y: 0.9, z: 0 } },
    { position: { x: 3.5, y: 1.6, z: 0 } },
    { position: { x: 12, y: 0.9, z: -12 } },
  ],
};

const STAGE_5 = {
  id: 'stage-05',
  name: 'FINAL CIRCUIT',
  targetTimeSeconds: 150,
  rankACrystals: 2,
  playerStart: { position: { x: 0, y: 0, z: 6 }, yawRadians: Math.PI },
  boxes: [
    { style: 'platform', size: { x: 8, y: 1.2, z: 8 }, position: { x: 0, y: -0.6, z: 4 } },
    { style: 'platform', size: { x: 5, y: 1.2, z: 5 }, position: { x: 0, y: 4.4, z: -8 } },
    { style: 'platform', size: { x: 5, y: 1.2, z: 6 }, position: { x: 0, y: 4.4, z: -20 } },
    { style: 'platform', size: { x: 6, y: 1.2, z: 6 }, position: { x: 17, y: 4.4, z: -20 } },
    { style: 'platform', size: { x: 5, y: 1.2, z: 5 }, position: { x: 22, y: 4.4, z: -20 } },
    { style: 'platform', size: { x: 6, y: 1.2, z: 6 }, position: { x: 22, y: 10.4, z: -26 } },
  ],
  ramps: [],
  cylinders: [],
  checkpoints: [
    { id: 'cp-start', name: 'スタート地点', position: { x: 0, y: 0, z: 6 }, yawRadians: Math.PI },
    { id: 'cp-ledge', name: '第1レッジ', position: { x: 0, y: 5, z: -8 }, yawRadians: Math.PI },
    { id: 'cp-east', name: '東プラットフォーム', position: { x: 17, y: 5, z: -20 }, yawRadians: Math.PI / 2 },
    { id: 'cp-wind', name: '気流前', position: { x: 22, y: 5, z: -20 }, yawRadians: Math.PI },
  ],
  goal: { position: { x: 22, y: 11, z: -26 } },
  jumpPads: [{ position: { x: 0, y: 0, z: -1 }, power: 13 }],
  rotatingPlatforms: [{ position: { x: 0, y: 5.05, z: -14 }, radius: 2.8, thickness: 0.5, angularSpeed: 0.6 }],
  movingPlatforms: [{ from: { x: 5, y: 5, z: -20 }, to: { x: 13, y: 5, z: -20 }, speed: 2.4, waitSeconds: 0.6 }],
  windZones: [{ center: { x: 22, y: 8, z: -20 }, size: { x: 4, y: 10, z: 4 }, direction: { x: 0, y: 1, z: 0 }, strength: 26 }],
  magnets: [],
  seesaws: [],
  crystals: [
    { position: { x: 0, y: 6.1, z: -14 } },
    { position: { x: 9, y: 5.9, z: -20 } },
    { position: { x: 22, y: 8.5, z: -20 } },
  ],
};

export const STAGES = [STAGE_1, STAGE_2, STAGE_3, STAGE_4, STAGE_5];
