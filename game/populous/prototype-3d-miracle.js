// THE LIVING WORLD — the blessed rain (GAMEPLAY_TASK step 3, 2026-11-22).
// A rain cloud the player steers with the pointer. While it is out, the
// simulation's applyBlessedRain drains faith and restores the fertility of
// farms and cells underneath. The cloud dismisses itself when faith runs
// out; the player can also dismiss it (button or Esc, wired in the main
// module). Camera controls are untouched: the cloud only follows the
// pointer's ground point, smoothed, and never captures input.
import * as THREE from 'three';

export function createMiracle(world, terrainHeight, HIGH, hooks) {
  // hooks: { canStart(): boolean, onRain(x, z, dt): boolean, onToggle(active, reason) }
  const group = new THREE.Group();
  group.visible = false;
  world.add(group);

  // Soft dark cloud, built like the sky clouds (textured puffs) but greyer
  // and larger, so it reads as a rain cloud.
  const cloudTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const x = 24 + Math.random() * 80, y = 44 + Math.random() * 40, r = 12 + Math.random() * 20;
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0x77828d, roughness: 1, transparent: true, opacity: .95, depthWrite: false, map: cloudTex });
  const cloud = new THREE.Group();
  for (let j = 0; j < 7; j++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), cloudMat);
    puff.scale.set(2.1, .5, 1.3);
    puff.position.set((j - 3) * 1.15, Math.sin(j * 1.7) * .16, Math.cos(j * 2.1) * .3);
    cloud.add(puff);
  }
  cloud.scale.setScalar(1.35);
  group.add(cloud);

  // A soft shadow ellipse on the ground under the cloud.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(4.3, 26),
    new THREE.MeshBasicMaterial({ color: 0x16241c, transparent: true, opacity: .17, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  group.add(shadow);

  // Rain streaks falling inside a radius-4 cylinder under the cloud.
  const COUNT = HIGH ? 900 : 350;
  const positions = new Float32Array(COUNT * 3);
  const respawn = i => {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 4;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 2] = Math.sin(a) * r;
  };
  for (let i = 0; i < COUNT; i++) { respawn(i); positions[i * 3 + 1] = Math.random() * 11; }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xa9cbe4, size: .11, transparent: true, opacity: .8, depthWrite: false }));
  group.add(rain);

  let active = false, hasTarget = false;
  const pos = new THREE.Vector3(0, 0, 0), target = new THREE.Vector3();

  function setTarget(point) { if (point) { target.copy(point); hasTarget = true; } }
  function start() {
    if (active) return true;
    if (!hooks.canStart()) return false;
    active = true;
    group.visible = true;
    if (hasTarget) pos.set(target.x, 0, target.z);
    hooks.onToggle(true, 'start');
    return true;
  }
  function stop(reason = 'manual') {
    if (!active) return;
    active = false;
    group.visible = false;
    hooks.onToggle(false, reason);
  }
  function toggle() { if (active) { stop(); return true; } return start(); }

  function update(dt) {
    if (!active) return;
    if (hasTarget) {
      const k = 1 - Math.exp(-dt * 5);
      pos.x += (target.x - pos.x) * k;
      pos.z += (target.z - pos.z) * k;
    }
    const gy = terrainHeight(pos.x, pos.z);
    cloud.position.set(pos.x, gy + 12.2, pos.z);
    shadow.position.set(pos.x, gy + .07, pos.z);
    rain.position.set(pos.x, gy + .1, pos.z);
    const p = rainGeo.attributes.position;
    for (let i = 0; i < COUNT; i++) {
      let y = p.getY(i) - dt * 11;
      if (y < 0) { respawn(i); y = 11; p.setX(i, positions[i * 3]); p.setZ(i, positions[i * 3 + 2]); }
      p.setY(i, y);
    }
    p.needsUpdate = true;
    if (!hooks.onRain(pos.x, pos.z, dt)) stop('faith');
  }

  return { update, toggle, stop, setTarget, isActive: () => active };
}
