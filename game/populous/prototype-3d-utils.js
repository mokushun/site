// THE LIVING WORLD — split from prototype-3d.js on 2026-11-22 so each part
// can be improved independently. Behaviour is unchanged by the split.
// Shared helpers: material factory, hash noise, smoothing, and the shared
// shader time uniform (used by the lake foam, the water and the tree sway).
import * as THREE from 'three';

export const timeU = { value: 0 };
// WORLD TIME rate: world minutes per real second (shared by the atmosphere
// and the villagers' day/night routine so they can never drift apart).
// 6 since 2026-11-22 (3x the previous 2; a full day takes about 4 minutes).
// The simulation economy runs on plain seconds and is NOT scaled by this.
export const WORLD_MIN_PER_SEC = 6;
// The world clock itself lives here so the atmosphere and the villagers
// always agree. It starts at 08:00 and the main module advances it once
// per frame. Nights (19:30-05:30, the villagers' sleep hours) run
// NIGHT_SPEED times faster: the user found the night long (2026-11-23).
// A full day is now about 2.9 minutes (day 140s + night 33s).
export const NIGHT_SPEED = 3;
const NIGHT_START = 19 * 60 + 30, NIGHT_END = 5 * 60 + 30;
let _worldMin = 8 * 60;
export function advanceWorldClock(dt) {
  const night = _worldMin >= NIGHT_START || _worldMin < NIGHT_END;
  _worldMin = (_worldMin + dt * WORLD_MIN_PER_SEC * (night ? NIGHT_SPEED : 1)) % 1440;
  return _worldMin;
}
export function worldMinutes() { return _worldMin; }
export const material = (color, roughness = 1, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
export const seeded = (x, z) => {
  const n = Math.sin(x * 127.1 + z * 311.7 + 19.19) * 43758.5453123;
  return n - Math.floor(n);
};
export const smooth = (a, b, x) => { const t = THREE.MathUtils.clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
