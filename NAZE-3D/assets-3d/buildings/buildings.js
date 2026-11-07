/**
 * Aset bangunan & elemen kota prosedural. Jendela memakai plane (2 segitiga)
 * untuk performa pada resolusi tinggi.
 */
import * as THREE from 'three';
import { box, cyl, sphere, cone, plane, mesh } from '../../engine/modeling/procedural.js';
import { mat, glow, freshGlow } from '../../engine/materials/materials.js';

export function buildingBlock(opts) {
  const o = opts || {};
  const w = o.w || 3;
  const h = o.h || 8;
  const d = o.d || 3;
  const g = new THREE.Group();
  const color = o.color || 0x9aa0a8;
  g.add(mesh(box(w, h, d), new THREE.MeshLambertMaterial({ color }), [0, h / 2, 0]));
  const rows = Math.max(2, Math.floor((h - 1.4) / 1.1));
  const cols = Math.max(2, Math.floor(w / 1.0));
  const winMat = glow('city.window', { color: 0xffd27a });
  const darkMat = mat('tech.screen');
  const winGeo = plane(0.34, 0.5);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = (r * 7 + c * 3 + (o.seed || 0)) % 5 < 2;
      g.add(mesh(winGeo, lit ? winMat : darkMat, [-w / 2 + (c + 0.5) * (w / cols), 0.9 + r * 1.1, d / 2 + 0.011]));
    }
  }
  g.add(mesh(box(w, 0.12, d), mat('metal.dark'), [0, h + 0.06, 0]));
  return g;
}

export function house() {
  const g = new THREE.Group();
  g.add(mesh(box(2.4, 1.8, 2.2), mat('city.wall'), [0, 0.9, 0]));
  g.add(mesh(cone(1.9, 1.1, 4), mat('fabric.red'), [0, 2.35, 0], [0, Math.PI / 4, 0]));
  g.add(mesh(box(0.5, 0.9, 0.05), mat('wood.dark'), [0, 0.45, 1.11]));
  g.add(mesh(box(0.5, 0.5, 0.03), mat('tech.screen', { color: 0x9fd8ff }), [0.8, 1.1, 1.11]));
  return g;
}

export function roadStrip() {
  const g = new THREE.Group();
  g.add(mesh(box(6, 0.02, 40), mat('city.road'), [0, 0.01, 0]));
  const dash = glow('plastic.white', { color: 0xf2f4f7 });
  const dashGeo = plane(0.12, 1.0);
  for (let z = -19; z < 20; z += 2.4) {
    const m = mesh(dashGeo, dash, [0, 0.026, z]);
    m.rotation.x = -Math.PI / 2;
    g.add(m);
  }
  return g;
}

export function sidewalk() {
  const g = new THREE.Group();
  g.add(mesh(box(1.6, 0.04, 40), mat('city.sidewalk'), [0, 0.02, 0]));
  return g;
}

export function streetLamp() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.04, 0.06, 3.2, 8), mat('metal.dark'), [0, 1.6, 0]));
  g.add(mesh(box(0.7, 0.05, 0.05), mat('metal.dark'), [0.35, 3.2, 0]));
  g.add(mesh(box(0.18, 0.08, 0.12), freshGlow(0xfff2c0), [0.68, 3.15, 0]));
  const light = new THREE.PointLight(0xffe8b0, 0.7, 8);
  light.position.set(0.68, 3.0, 0);
  g.add(light);
  return g;
}

export function parkBench() {
  const g = new THREE.Group();
  const wood = mat('wood.mid');
  for (let i = 0; i < 3; i++) g.add(mesh(box(1.4, 0.03, 0.12), wood, [0, 0.45, -0.18 + i * 0.18]));
  for (let i = 0; i < 2; i++) g.add(mesh(box(1.4, 0.12, 0.03), wood, [0, 0.65 + i * 0.14, 0.24]));
  for (const sx of [-0.6, 0.6]) {
    g.add(mesh(box(0.05, 0.45, 0.05), mat('metal.dark'), [sx, 0.225, 0]));
    g.add(mesh(box(0.05, 0.3, 0.05), mat('metal.dark'), [sx, 0.6, 0.2]));
  }
  return g;
}

export function trafficLight() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.03, 0.04, 2.6, 8), mat('metal.dark'), [0, 1.3, 0]));
  g.add(mesh(box(0.18, 0.5, 0.14), mat('plastic.black'), [0, 2.75, 0]));
  g.add(mesh(sphere(0.05, 8), freshGlow(0xff4444), [0, 2.92, 0.08]));
  g.add(mesh(sphere(0.05, 8), freshGlow(0xffd24a), [0, 2.75, 0.08]));
  g.add(mesh(sphere(0.05, 8), freshGlow(0x35ff6d), [0, 2.58, 0.08]));
  return g;
}

export const ASSETS = {
  'building-block': { id: 'building-block', name: 'Gedung (jendela acak menyala)', category: 'buildings', factory: buildingBlock },
  house: { id: 'house', name: 'Rumah', category: 'buildings', factory: house },
  'road-strip': { id: 'road-strip', name: 'Jalan (garis putus)', category: 'buildings', factory: roadStrip },
  sidewalk: { id: 'sidewalk', name: 'Trotuar', category: 'buildings', factory: sidewalk },
  'street-lamp': { id: 'street-lamp', name: 'Lampu Jalan', category: 'buildings', factory: streetLamp },
  'park-bench': { id: 'park-bench', name: 'Bangku Taman', category: 'buildings', factory: parkBench },
  'traffic-light': { id: 'traffic-light', name: 'Lampu Lalu Lintas', category: 'buildings', factory: trafficLight },
};
