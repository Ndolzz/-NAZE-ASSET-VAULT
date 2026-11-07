/**
 * Aset furnitur prosedural untuk kategori Bedroom & Home.
 */
import * as THREE from 'three';
import { box, cyl, sphere, cone, plane, circle, mesh } from '../../engine/modeling/procedural.js';
import { mat, glow, freshGlow } from '../../engine/materials/materials.js';
import { screenTexture } from '../electronics/electronics.js';

export function bed() {
  const g = new THREE.Group();
  const wood = mat('wood.mid');
  g.add(mesh(box(1.4, 0.3, 2.05), wood, [0, 0.15, 0]));
  g.add(mesh(box(1.34, 0.2, 1.98), mat('fabric.cream'), [0, 0.4, 0]));
  g.add(mesh(box(1.36, 0.05, 1.95), mat('fabric.blue', { color: 0x4a6f9e }), [0, 0.52, 0.12]));
  g.add(mesh(box(0.52, 0.12, 0.34), mat('plastic.white'), [-0.3, 0.56, -0.75]));
  g.add(mesh(box(0.52, 0.12, 0.34), mat('plastic.white'), [0.3, 0.56, -0.75]));
  g.add(mesh(box(1.44, 0.9, 0.09), wood, [0, 0.55, -1.0]));
  return g;
}

export function wardrobe() {
  const g = new THREE.Group();
  g.add(mesh(box(1.1, 2.0, 0.55), mat('wood.dark'), [0, 1.0, 0]));
  g.add(mesh(box(0.52, 1.9, 0.02), mat('wood.mid'), [-0.28, 1.0, 0.285]));
  g.add(mesh(box(0.52, 1.9, 0.02), mat('wood.mid'), [0.28, 1.0, 0.285]));
  g.add(mesh(cyl(0.015, 0.015, 0.12, 6), mat('metal.gray'), [0.03, 1.0, 0.31]));
  g.add(mesh(cyl(0.015, 0.015, 0.12, 6), mat('metal.gray'), [-0.03, 1.0, 0.31]));
  return g;
}

export function desk() {
  const g = new THREE.Group();
  g.add(mesh(box(1.6, 0.05, 0.7), mat('wood.light'), [0, 0.75, 0]));
  for (const [sx, sz] of [[-0.74, -0.3], [0.74, -0.3], [-0.74, 0.3], [0.74, 0.3]]) {
    g.add(mesh(cyl(0.025, 0.025, 0.75, 6), mat('wood.dark'), [sx, 0.375, sz]));
  }
  return g;
}

export function deskChair() {
  const g = new THREE.Group();
  g.add(mesh(box(0.42, 0.05, 0.42), mat('plastic.gray'), [0, 0.45, 0]));
  g.add(mesh(box(0.42, 0.5, 0.05), mat('plastic.gray'), [0, 0.72, -0.19]));
  for (const [sx, sz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
    g.add(mesh(cyl(0.02, 0.02, 0.45, 6), mat('metal.dark'), [sx, 0.225, sz]));
  }
  return g;
}

export function officeChair() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.3, 0.34, 0.04, 12), mat('metal.dark'), [0, 0.02, 0]));
  g.add(mesh(cyl(0.03, 0.03, 0.3, 8), mat('metal.gray'), [0, 0.19, 0]));
  g.add(mesh(box(0.46, 0.06, 0.46), mat('plastic.black'), [0, 0.42, 0]));
  g.add(mesh(box(0.44, 0.55, 0.05), mat('plastic.black'), [0, 0.72, -0.21]));
  g.add(mesh(box(0.06, 0.04, 0.24), mat('metal.dark'), [-0.26, 0.5, 0]));
  g.add(mesh(box(0.06, 0.04, 0.24), mat('metal.dark'), [0.26, 0.5, 0]));
  return g;
}

export function sofa() {
  const g = new THREE.Group();
  const fabric = mat('fabric.blue');
  g.add(mesh(box(1.9, 0.35, 0.85), fabric, [0, 0.28, 0]));
  g.add(mesh(box(1.9, 0.55, 0.22), fabric, [0, 0.62, -0.32]));
  g.add(mesh(box(0.22, 0.28, 0.85), fabric, [-0.85, 0.55, 0]));
  g.add(mesh(box(0.22, 0.28, 0.85), fabric, [0.85, 0.55, 0]));
  g.add(mesh(box(0.78, 0.14, 0.7), mat('fabric.cream'), [-0.4, 0.5, 0.04]));
  g.add(mesh(box(0.78, 0.14, 0.7), mat('fabric.cream'), [0.4, 0.5, 0.04]));
  return g;
}

export function coffeeTable() {
  const g = new THREE.Group();
  g.add(mesh(box(1.0, 0.04, 0.6), mat('wood.mid'), [0, 0.42, 0]));
  for (const [sx, sz] of [[-0.44, -0.24], [0.44, -0.24], [-0.44, 0.24], [0.44, 0.24]]) {
    g.add(mesh(cyl(0.02, 0.02, 0.42, 6), mat('wood.dark'), [sx, 0.21, sz]));
  }
  return g;
}

export function tv(opts) {
  const tint = (opts && opts.tint) || '#69a8ff';
  const g = new THREE.Group();
  g.add(mesh(box(1.3, 0.06, 0.4), mat('wood.dark'), [0, 0.03, 0]));
  g.add(mesh(box(0.08, 0.35, 0.08), mat('plastic.black'), [0, 0.2, 0]));
  g.add(mesh(box(1.2, 0.68, 0.05), mat('plastic.black'), [0, 0.72, 0]));
  const face = new THREE.Mesh(plane(1.14, 0.62), new THREE.MeshBasicMaterial({ map: screenTexture(tint) }));
  face.position.set(0, 0.72, 0.028);
  g.add(face);
  return g;
}

export function tableLamp() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.07, 0.09, 0.02, 10), mat('metal.dark'), [0, 0.01, 0]));
  g.add(mesh(cyl(0.015, 0.015, 0.3, 6), mat('metal.gray'), [0, 0.16, 0]));
  g.add(mesh(cone(0.11, 0.16, 10), mat('fabric.cream'), [0, 0.36, 0], [Math.PI, 0, 0]));
  const light = new THREE.PointLight(0xffd9a0, 0.5, 3.5);
  light.position.set(0, 0.34, 0);
  g.add(light);
  return g;
}

export function floorLamp() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.12, 0.15, 0.03, 10), mat('metal.dark'), [0, 0.015, 0]));
  g.add(mesh(cyl(0.02, 0.02, 0.95, 6), mat('metal.gray'), [0, 0.49, 0]));
  g.add(mesh(cone(0.16, 0.22, 10), mat('fabric.cream'), [0, 1.05, 0], [Math.PI, 0, 0]));
  const light = new THREE.PointLight(0xffd9a0, 0.55, 4.5);
  light.position.set(0, 1.0, 0);
  g.add(light);
  return g;
}

export function bookshelf() {
  const g = new THREE.Group();
  const wood = mat('wood.mid');
  g.add(mesh(box(0.04, 1.8, 0.3), wood, [-0.48, 0.9, 0]));
  g.add(mesh(box(0.04, 1.8, 0.3), wood, [0.48, 0.9, 0]));
  g.add(mesh(box(1.0, 0.04, 0.3), wood, [0, 1.78, 0]));
  g.add(mesh(box(1.0, 0.04, 0.3), wood, [0, 0.02, 0]));
  const bookColors = [0xa5484d, 0x3b5b8c, 0x8b5cf6, 0x2f8f4e, 0xf97316];
  let n = 0;
  for (let s = 0; s < 3; s++) {
    g.add(mesh(box(1.0, 0.04, 0.3), wood, [0, 0.45 + s * 0.45, 0]));
    for (let i = 0; i < 6; i++) {
      g.add(mesh(box(0.09, 0.32, 0.2), freshGlow(bookColors[(n++) % 5]), [-0.4 + i * 0.15, 0.62 + s * 0.45, 0.02]));
    }
  }
  return g;
}

export function rug() {
  const g = new THREE.Group();
  const m = mesh(circle(0.9, 20), mat('fabric.red', { color: 0x8c4a52 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.008;
  g.add(m);
  return g;
}

export function door() {
  const g = new THREE.Group();
  g.add(mesh(box(0.06, 2.1, 0.95), mat('wood.mid'), [0, 1.05, 0]));
  g.add(mesh(sphere(0.035, 8), mat('metal.gray'), [0.05, 1.05, 0.35]));
  return g;
}

export function windowFrame() {
  const g = new THREE.Group();
  const f = mat('plastic.white');
  g.add(mesh(box(1.3, 0.07, 0.05), f, [0, 0.75, 0]));
  g.add(mesh(box(1.3, 0.07, 0.05), f, [0, -0.75, 0]));
  g.add(mesh(box(0.07, 1.5, 0.05), f, [-0.62, 0, 0]));
  g.add(mesh(box(0.07, 1.5, 0.05), f, [0.62, 0, 0]));
  g.add(mesh(box(0.05, 1.5, 0.05), f, [0, 0, 0]));
  g.add(mesh(plane(1.16, 1.36), freshGlow(0xbfe3ff, { transparent: true, opacity: 0.45 }), [0, 0, -0.01]));
  return g;
}

export function wallClock() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.16, 0.16, 0.025, 16), mat('plastic.white'), [0, 0, 0], [Math.PI / 2, 0, 0]));
  g.add(mesh(box(0.014, 0.09, 0.012), mat('plastic.black'), [0, 0.035, 0.015]));
  g.add(mesh(box(0.012, 0.06, 0.012), mat('plastic.black'), [0.03, 0.01, 0.015], [0, 0, 0.5]));
  return g;
}

export const ASSETS = {
  bed: { id: 'bed', name: 'Kasur Lengkap', category: 'furniture', factory: bed },
  wardrobe: { id: 'wardrobe', name: 'Lemari', category: 'furniture', factory: wardrobe },
  desk: { id: 'desk', name: 'Meja Kerja', category: 'furniture', factory: desk },
  'desk-chair': { id: 'desk-chair', name: 'Kursi Belajar', category: 'furniture', factory: deskChair },
  'office-chair': { id: 'office-chair', name: 'Kursi Kantor', category: 'furniture', factory: officeChair },
  sofa: { id: 'sofa', name: 'Sofa', category: 'furniture', factory: sofa },
  'coffee-table': { id: 'coffee-table', name: 'Meja Tamu', category: 'furniture', factory: coffeeTable },
  tv: { id: 'tv', name: 'Televisi', category: 'furniture', factory: tv },
  'table-lamp': { id: 'table-lamp', name: 'Lampu Tidur', category: 'furniture', factory: tableLamp },
  'floor-lamp': { id: 'floor-lamp', name: 'Lampu Lantai', category: 'furniture', factory: floorLamp },
  bookshelf: { id: 'bookshelf', name: 'Rak Buku', category: 'furniture', factory: bookshelf },
  rug: { id: 'rug', name: 'Karpet', category: 'furniture', factory: rug },
  door: { id: 'door', name: 'Pintu', category: 'furniture', factory: door },
  'window-frame': { id: 'window-frame', name: 'Jendela', category: 'furniture', factory: windowFrame },
  'wall-clock': { id: 'wall-clock', name: 'Jam Dinding', category: 'furniture', factory: wallClock },
};
