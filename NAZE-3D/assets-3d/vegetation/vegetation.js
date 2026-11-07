/**
 * Aset vegetasi prosedural: pohon, rumput, bebatuan, awan, air, kaktus.
 * Konvensi: origin di lantai, pusat objek.
 */
import * as THREE from 'three';
import { box, cyl, sphere, cone, plane, circle, mesh } from '../../engine/modeling/procedural.js';
import { mat, glow, freshGlow } from '../../engine/materials/materials.js';

export function palmTree() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.09, 0.15, 2.6, 8), mat('nature.trunk'), [0, 1.3, 0]));
  g.add(mesh(cyl(0.08, 0.11, 1.0, 8), mat('nature.trunk'), [0.3, 3.0, 0], [0, 0, -0.35]));
  const crownX = 0.47;
  const crownY = 3.45;
  g.add(mesh(sphere(0.2, 8), mat('nature.leaf.dark'), [crownX, crownY, 0]));
  for (let i = 0; i < 6; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(crownX, crownY, 0);
    pivot.rotation.y = (i / 6) * Math.PI * 2;
    pivot.add(mesh(cone(0.22, 1.5, 5), mat('nature.leaf'), [0.6, -0.15, 0], [0, 0, -1.25]));
    g.add(pivot);
  }
  return g;
}

export function pineTree() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.08, 0.11, 0.9, 8), mat('nature.trunk'), [0, 0.45, 0]));
  for (let i = 0; i < 3; i++) {
    g.add(mesh(cone(1.1 - i * 0.26, 1.0, 8), mat('nature.leaf.dark'), [0, 1.2 + i * 0.62, 0]));
  }
  return g;
}

export function broadleafTree() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.09, 0.12, 1.2, 8), mat('nature.trunk'), [0, 0.6, 0]));
  g.add(mesh(sphere(0.55, 10), mat('nature.leaf'), [0, 1.55, 0]));
  g.add(mesh(sphere(0.42, 8), mat('nature.leaf.light'), [0.35, 1.35, 0.2]));
  g.add(mesh(sphere(0.38, 8), mat('nature.leaf.dark'), [-0.3, 1.4, -0.25]));
  return g;
}

export function bush() {
  const g = new THREE.Group();
  g.add(mesh(sphere(0.35, 9), mat('nature.leaf'), [0, 0.28, 0]));
  g.add(mesh(sphere(0.26, 8), mat('nature.leaf.dark'), [0.28, 0.2, 0.12]));
  return g;
}

export function grassPatch() {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    g.add(mesh(cone(0.05, 0.35, 4), mat('nature.grass'), [(i % 3) * 0.16 - 0.16, 0.17, Math.floor(i / 3) * 0.16 - 0.08], [0, 0, (i % 2 ? 0.12 : -0.1)]));
  }
  return g;
}

export function flower(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  g.add(mesh(cyl(0.015, 0.015, 0.35, 5), mat('nature.leaf'), [0, 0.17, 0]));
  g.add(mesh(sphere(0.06, 8), freshGlow(o.color || 0xff6b81), [0, 0.38, 0]));
  return g;
}

export function rock() {
  const g = new THREE.Group();
  const r = mesh(sphere(0.4, 8), mat('nature.rock'), [0, 0.24, 0]);
  r.scale.set(1, 0.6, 0.85);
  g.add(r);
  return g;
}

export function cloud() {
  const g = new THREE.Group();
  const m = glow('plastic.white', { color: 0xf4f8ff });
  g.add(mesh(sphere(0.5, 9), m, [0, 0, 0]));
  g.add(mesh(sphere(0.65, 9), m, [0.6, -0.05, 0.1]));
  g.add(mesh(sphere(0.45, 9), m, [-0.55, -0.08, -0.05]));
  return g;
}

export function waterPlane(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(o.w || 20, o.d || 20, 12, 12);
  const w = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x2f7fbf, transparent: true, opacity: 0.85 }));
  w.rotation.x = -Math.PI / 2;
  w.position.y = 0.02;
  g.add(w);
  const base = Float32Array.from(geo.attributes.position.array);
  if (o.env) {
    o.env.addAnimation('water-waves', (t) => {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        pos.array[i * 3 + 2] = Math.sin(t * 1.6 + x * 0.8 + y * 0.6) * 0.06;
      }
      pos.needsUpdate = true;
    });
  }
  return g;
}

export function cactus() {
  const g = new THREE.Group();
  const m = mat('nature.leaf', { color: 0x3f8f56 });
  g.add(mesh(cyl(0.12, 0.14, 1.1, 8), m, [0, 0.55, 0]));
  g.add(mesh(cyl(0.05, 0.05, 0.3, 6), m, [0.22, 0.62, 0], [0, 0, -Math.PI / 2]));
  g.add(mesh(cyl(0.05, 0.05, 0.3, 6), m, [0.35, 0.78, 0]));
  g.add(mesh(cyl(0.05, 0.05, 0.26, 6), m, [-0.2, 0.45, 0], [0, 0, Math.PI / 2]));
  g.add(mesh(cyl(0.05, 0.05, 0.24, 6), m, [-0.3, 0.56, 0]));
  return g;
}

export function mountainPeak() {
  const g = new THREE.Group();
  g.add(mesh(cone(5, 8, 7), mat('nature.rock'), [0, 4, 0]));
  g.add(mesh(cone(1.5, 2.0, 7), mat('nature.snow'), [0, 6.7, 0]));
  return g;
}

export const ASSETS = {
  'palm-tree': { id: 'palm-tree', name: 'Pohon Palem', category: 'vegetation', factory: palmTree },
  'pine-tree': { id: 'pine-tree', name: 'Pohon Pinus', category: 'vegetation', factory: pineTree },
  'broadleaf-tree': { id: 'broadleaf-tree', name: 'Pohon Daun Lebar', category: 'vegetation', factory: broadleafTree },
  bush: { id: 'bush', name: 'Semak', category: 'vegetation', factory: bush },
  'grass-patch': { id: 'grass-patch', name: 'Rumpun Rumput', category: 'vegetation', factory: grassPatch },
  flower: { id: 'flower', name: 'Bunga', category: 'vegetation', factory: flower },
  rock: { id: 'rock', name: 'Batu', category: 'vegetation', factory: rock },
  cloud: { id: 'cloud', name: 'Awan', category: 'vegetation', factory: cloud },
  'water-plane': { id: 'water-plane', name: 'Permukaan Air (animasi gelombang)', category: 'vegetation', factory: waterPlane },
  cactus: { id: 'cactus', name: 'Kaktus', category: 'vegetation', factory: cactus },
  'mountain-peak': { id: 'mountain-peak', name: 'Puncak Gunung', category: 'vegetation', factory: mountainPeak },
};
