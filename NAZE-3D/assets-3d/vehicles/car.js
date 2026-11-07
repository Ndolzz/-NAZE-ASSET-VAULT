/**
 * Kendaraan prosedural sederhana (low-poly).
 */
import * as THREE from 'three';
import { box, cyl, mesh } from '../../engine/modeling/procedural.js';
import { mat, freshGlow } from '../../engine/materials/materials.js';

export function car(opts) {
  const o = opts || {};
  const color = o.color || 0x3b5b8c;
  const g = new THREE.Group();
  g.add(mesh(box(1.7, 0.45, 3.6), new THREE.MeshLambertMaterial({ color }), [0, 0.5, 0]));
  g.add(mesh(box(1.5, 0.42, 1.9), new THREE.MeshLambertMaterial({ color }), [0, 0.95, -0.2]));
  g.add(mesh(box(1.36, 0.3, 1.7), mat('tech.screen'), [0, 0.98, -0.2]));
  for (const [sx, sz] of [[-0.8, -1.2], [0.8, -1.2], [-0.8, 1.2], [0.8, 1.2]]) {
    g.add(mesh(cyl(0.3, 0.3, 0.2, 10), mat('plastic.black'), [sx, 0.3, sz], [0, 0, Math.PI / 2]));
  }
  g.add(mesh(box(0.3, 0.1, 0.02), freshGlow(0xfff2c0), [-0.55, 0.55, 1.81]));
  g.add(mesh(box(0.3, 0.1, 0.02), freshGlow(0xfff2c0), [0.55, 0.55, 1.81]));
  return g;
}

export const ASSETS = {
  car: { id: 'car', name: 'Mobil Low-Poly', category: 'vehicles', factory: car },
};
