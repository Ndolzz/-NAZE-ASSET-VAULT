/**
 * Preset pencahayaan dan atmosfer. Renderer perangkat lunak mendukung
 * AmbientLight/HemisphereLight/DirectionalLight/PointLight/SpotLight dan fog.
 */
import * as THREE from 'three';

export const LIGHTING_PRESETS = {
  daylight: {
    background: 0x9fd4ff, fog: [0x9fd4ff, 30, 140],
    ambient: { color: 0xdfefff, intensity: 0.75 },
    hemi: { sky: 0xbfe3ff, ground: 0x6a7f52, intensity: 0.5 },
    dir: { color: 0xfff2cf, intensity: 1.0, position: [6, 12, 4] },
  },
  sunset: {
    background: 0xff9d5c, fog: [0xffb27a, 25, 120],
    ambient: { color: 0xffd9b0, intensity: 0.6 },
    dir: { color: 0xffb066, intensity: 0.9, position: [10, 3, 4] },
  },
  night: {
    background: 0x0a1024, fog: [0x0a1024, 20, 110],
    ambient: { color: 0x30405e, intensity: 0.55 },
    dir: { color: 0x8fb7ff, intensity: 0.3, position: [4, 10, 2] },
    points: [{ color: 0xffc27a, intensity: 0.5, position: [0, 2.5, 0], distance: 12 }],
  },
  'indoor-warm': {
    background: 0x2a241e, ambient: { color: 0xffd8a8, intensity: 0.7 },
    points: [{ color: 0xffc27a, intensity: 0.9, position: [0, 2.6, 0], distance: 14 }],
  },
  'indoor-cool': {
    background: 0x20262e, ambient: { color: 0xbcd3ff, intensity: 0.75 },
    points: [{ color: 0x9fc8ff, intensity: 0.8, position: [0, 2.6, 0], distance: 14 }],
  },
  cinematic: {
    background: 0x151318, ambient: { color: 0x8f8fa8, intensity: 0.5 },
    dir: { color: 0xfff0dd, intensity: 1.2, position: [6, 9, 3] },
    points: [{ color: 0x6fa8ff, intensity: 0.6, position: [-6, 4, -4], distance: 20 }],
  },
  neon: {
    background: 0x0d0b1e, ambient: { color: 0x4a3d7a, intensity: 0.55 },
    points: [
      { color: 0x22d3ee, intensity: 0.9, position: [3, 2.5, -2], distance: 16 },
      { color: 0xf472b6, intensity: 0.9, position: [-3, 2.5, 2], distance: 16 },
    ],
  },
  'dark-technology': {
    background: 0x0a0e14, ambient: { color: 0x3f5570, intensity: 0.55 },
    dir: { color: 0x69a8ff, intensity: 0.5, position: [3, 8, 5] },
    points: [{ color: 0x36c9ff, intensity: 0.8, position: [0, 2.5, -3], distance: 14 }],
  },
  laboratory: {
    background: 0xdfe8ef, ambient: { color: 0xffffff, intensity: 0.85 },
    dir: { color: 0xffffff, intensity: 0.7, position: [5, 10, 5] },
  },
  natural: {
    background: 0x8fc7e8, ambient: { color: 0xffffff, intensity: 0.7 },
    hemi: { sky: 0xcfe8ff, ground: 0x76976a, intensity: 0.55 },
    dir: { color: 0xfff5e0, intensity: 0.9, position: [5, 11, 6] },
  },
  dramatic: {
    background: 0x0d0d10, ambient: { color: 0x2a2a33, intensity: 0.4 },
    spot: { color: 0xffffff, intensity: 1.3, position: [0, 7, 0], target: [0, 0, 0] },
  },
};

export function applyLighting(scene, presetName) {
  const lights = [];
  scene.traverse((o) => { if (o.isLight) lights.push(o); });
  for (const l of lights) if (l.parent) l.parent.remove(l);

  const p = LIGHTING_PRESETS[presetName] || LIGHTING_PRESETS.natural;
  scene.background = new THREE.Color(p.background);
  scene.fog = p.fog ? new THREE.Fog(p.fog[0], p.fog[1], p.fog[2]) : null;

  if (p.ambient) scene.add(new THREE.AmbientLight(p.ambient.color, p.ambient.intensity));
  if (p.hemi) scene.add(new THREE.HemisphereLight(p.hemi.sky, p.hemi.ground, p.hemi.intensity));
  if (p.dir) {
    const d = new THREE.DirectionalLight(p.dir.color, p.dir.intensity);
    d.position.set(p.dir.position[0], p.dir.position[1], p.dir.position[2]);
    scene.add(d);
  }
  if (p.points) {
    for (const pt of p.points) {
      const l = new THREE.PointLight(pt.color, pt.intensity, pt.distance || 0);
      l.position.set(pt.position[0], pt.position[1], pt.position[2]);
      scene.add(l);
    }
  }
  if (p.spot) {
    const s = new THREE.SpotLight(p.spot.color, p.spot.intensity, 30, Math.PI / 5, 0.4);
    s.position.set(p.spot.position[0], p.spot.position[1], p.spot.position[2]);
    const t = new THREE.Object3D();
    t.position.set(p.spot.target[0], p.spot.target[1], p.spot.target[2]);
    scene.add(t);
    s.target = t;
    scene.add(s);
  }
  return p;
}
