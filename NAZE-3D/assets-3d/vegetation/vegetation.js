/**
 * Aset vegetasi prosedural: pohon detail, rumput, bebatuan, awan, air, kaktus.
 * Konvensi: origin di lantai, pusat objek.
 */
import * as THREE from 'three';
import { box, cyl, sphere, cone, plane, circle, mesh } from '../../engine/modeling/procedural.js';
import { mat, glow, freshGlow } from '../../engine/materials/materials.js';

export function palmTree() {
  const g = new THREE.Group();
  const trunk = mat('nature.trunk');
  const trunkDark = mat('nature.trunk', { color: 0x5a3d26 });
  let x = 0;
  let y = 0;
  for (let s = 0; s < 5; s++) {
    g.add(mesh(cyl(0.15 - s * 0.014, 0.13 - s * 0.014, 0.58, 8), s % 2 ? trunkDark : trunk, [x, y + 0.29, 0]));
    x += 0.09;
    y += 0.56;
  }
  const crownX = x + 0.02;
  const crownY = y + 0.12;
  g.add(mesh(sphere(0.2, 10), mat('nature.leaf.dark'), [crownX, crownY, 0]));
  g.add(mesh(sphere(0.14, 8), mat('nature.leaf'), [crownX - 0.1, crownY + 0.06, 0.05]));
  for (let i = 0; i < 8; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(crownX, crownY, 0);
    pivot.rotation.y = (i / 8) * Math.PI * 2;
    pivot.add(mesh(cone(0.2, 1.5, 5), mat(i % 2 ? 'nature.leaf' : 'nature.leaf.dark'), [0.55, -0.1, 0], [0, 0, -1.2]));
    pivot.add(mesh(cone(0.13, 1.0, 5), mat('nature.leaf.light'), [0.75, -0.28, 0], [0, 0, -1.45]));
    g.add(pivot);
  }
  const nutMat = mat('nature.trunk', { color: 0x4e3520 });
  for (let n = 0; n < 3; n++) {
    const a = (n / 3) * Math.PI * 2 + 0.5;
    g.add(mesh(sphere(0.07, 8), nutMat, [crownX + Math.cos(a) * 0.16, crownY - 0.12, Math.sin(a) * 0.16]));
  }
  return g;
}

export function pineTree() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.09, 0.13, 0.5, 8), mat('nature.trunk'), [0, 0.25, 0]));
  g.add(mesh(cyl(0.16, 0.2, 0.14, 8), mat('nature.trunk', { color: 0x5a3d26 }), [0, 0.07, 0]));
  for (let i = 0; i < 5; i++) {
    g.add(mesh(cone(1.25 - i * 0.2, 0.9, 8), mat(i % 2 ? 'nature.leaf' : 'nature.leaf.dark'), [0, 0.75 + i * 0.5, 0]));
  }
  return g;
}

export function broadleafTree() {
  const g = new THREE.Group();
  const trunk = mat('nature.trunk');
  g.add(mesh(cyl(0.09, 0.13, 1.25, 8), trunk, [0, 0.62, 0]));
  g.add(mesh(cyl(0.06, 0.08, 0.7, 6), trunk, [0.28, 1.35, 0], [0, 0, -0.6]));
  g.add(mesh(cyl(0.06, 0.08, 0.6, 6), trunk, [-0.26, 1.28, 0.05], [0, 0, 0.6]));
  g.add(mesh(sphere(0.55, 12), mat('nature.leaf'), [0, 1.75, 0]));
  g.add(mesh(sphere(0.42, 10), mat('nature.leaf.light'), [0.45, 1.62, 0.22]));
  g.add(mesh(sphere(0.4, 10), mat('nature.leaf.light'), [-0.45, 1.66, -0.18]));
  g.add(mesh(sphere(0.36, 10), mat('nature.leaf.dark'), [0.12, 2.15, 0.1]));
  g.add(mesh(sphere(0.33, 10), mat('nature.leaf.dark'), [-0.28, 1.98, 0.3]));
  g.add(mesh(sphere(0.3, 8), mat('nature.leaf'), [0.35, 2.05, -0.25]));
  return g;
}

export function bush() {
  const g = new THREE.Group();
  g.add(mesh(sphere(0.35, 10), mat('nature.leaf'), [0, 0.28, 0]));
  g.add(mesh(sphere(0.26, 8), mat('nature.leaf.dark'), [0.28, 0.2, 0.12]));
  g.add(mesh(sphere(0.24, 8), mat('nature.leaf.light'), [-0.26, 0.22, -0.1]));
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
  const r2 = mesh(sphere(0.22, 8), mat('nature.rock', { color: 0x7d756a }), [0.34, 0.12, 0.18]);
  r2.scale.set(1, 0.7, 1);
  g.add(r2);
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
