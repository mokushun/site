// THE LIVING WORLD — split from prototype-3d.js on 2026-11-22 so each part
// can be improved independently. Behaviour is unchanged by the split.
// Shared helpers: material factory, hash noise, smoothing, and the shared
// shader time uniform (used by the lake foam, the water and the tree sway).
import * as THREE from 'three';

export const timeU = { value: 0 };
export const material = (color, roughness = 1, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
export const seeded = (x, z) => {
  const n = Math.sin(x * 127.1 + z * 311.7 + 19.19) * 43758.5453123;
  return n - Math.floor(n);
};
export const smooth = (a, b, x) => { const t = THREE.MathUtils.clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
