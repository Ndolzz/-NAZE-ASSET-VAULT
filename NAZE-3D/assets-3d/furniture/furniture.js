/**
 * Aset furnitur prosedural untuk kategori Bedroom & Home.
 * Versi detail: kasur berlapis, lemari bercermin, jendela bertekstur langit,
 * lukisan dinding, dan lampu plafon.
 */
import { createCanvas } from '@napi-rs/canvas';
import * as THREE from 'three';
import { box, cyl, sphere, cone, plane, circle, mesh } from '../../engine/modeling/procedural.js';
import { mat, glow, freshGlow } from '../../engine/materials/materials.js';
import { screenTexture } from '../electronics/electronics.js';

let skyTex = null;
function skyTexture() {
  if (skyTex) return skyTex;
  const c = createCanvas(128, 128);
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#3f8fd6');
  grad.addColorStop(0.62, '#8ec8ee');
  grad.addColorStop(1, '#d8ecf8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(94, 34, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  for (const [cx, cy, r] of [[36, 44, 12], [58, 52, 9], [92, 78, 14]]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.6, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  skyTex = new THREE.CanvasTexture(c);
  skyTex.needsUpdate = true;
  return skyTex;
}

let artTex = null;
function artTexture() {
  if (artTex) return artTex;
  const c = createCanvas(96, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f4ede0';
  ctx.fillRect(0, 0, 96, 128);
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#2c6ea8');
  grad.addColorStop(1, '#79b8dd');
  ctx.fillStyle = grad;
  ctx.fillRect(10, 12, 76, 70);
  ctx.fillStyle = '#f2a03d';
  ctx.beginPath();
  ctx.arc(66, 34, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#27516e';
  ctx.beginPath();
  ctx.moveTo(10, 82);
  ctx.lineTo(40, 52);
  ctx.lineTo(70, 82);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3c3c3c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, 100);
  ctx.lineTo(82, 100);
  ctx.moveTo(14, 108);
  ctx.lineTo(64, 108);
  ctx.stroke();
  artTex = new THREE.CanvasTexture(c);
  artTex.needsUpdate = true;
  return artTex;
}

export function bed() {
  const g = new THREE.Group();
  const wood = mat('wood.mid');
  const woodDark = mat('wood.dark');
  g.add(mesh(box(1.5, 0.16, 2.15), wood, [0, 0.3, 0]));
  for (const [sx, sz] of [[-0.66, -0.95], [0.66, -0.95], [-0.66, 0.95], [0.66, 0.95]]) {
    g.add(mesh(box(0.08, 0.22, 0.08), woodDark, [sx, 0.11, sz]));
  }
  g.add(mesh(box(1.5, 0.85, 0.07), wood, [0, 0.62, -1.06]));
  g.add(mesh(box(1.52, 0.06, 0.1), woodDark, [0, 1.06, -1.05]));
  g.add(mesh(box(1.42, 0.22, 2.0), mat('fabric.cream'), [0, 0.49, 0]));
  g.add(mesh(box(1.44, 0.05, 0.7), mat('fabric.cream', { color: 0xf3ecdb }), [0, 0.615, -0.55]));
  g.add(mesh(box(1.46, 0.07, 1.25), mat('fabric.blue', { color: 0x4a6f9e }), [0, 0.6, 0.42]));
  g.add(mesh(box(1.47, 0.16, 0.1), mat('fabric.blue', { color: 0x3d5c86 }), [0, 0.56, 1.02]));
  for (const px of [-0.35, 0.35]) {
    const p = mesh(sphere(0.17, 10), mat('plastic.white', { color: 0xf6f2e8 }), [px, 0.66, -0.72]);
    p.scale.set(1.3, 0.5, 0.85);
    g.add(p);
  }
  return g;
}

export function wardrobe() {
  const g = new THREE.Group();
  g.add(mesh(box(1.1, 2.0, 0.55), mat('wood.dark'), [0, 1.0, 0]));
  g.add(mesh(box(0.52, 1.9, 0.02), mat('wood.mid'), [-0.28, 1.0, 0.285]));
  g.add(mesh(box(0.52, 1.9, 0.02), mat('wood.mid'), [0.28, 1.0, 0.285]));
  g.add(mesh(plane(0.44, 1.5), freshGlow(0xbfd7e8, { transparent: true, opacity: 0.55 }), [0.28, 1.15, 0.296]));
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

export function ceilingLight() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.012, 0.012, 0.18, 6), mat('metal.dark'), [0, 0.09, 0]));
  g.add(mesh(cyl(0.26, 0.3, 0.07, 16), freshGlow(0xfff6dd), [0, 0, 0]));
  const light = new THREE.PointLight(0xfff1cc, 0.8, 7);
  light.position.set(0, -0.12, 0);
  g.add(light);
  return g;
}

export function pictureFrame() {
  const g = new THREE.Group();
  g.add(mesh(box(0.5, 0.62, 0.035), mat('wood.dark'), [0, 0, 0]));
  const art = new THREE.Mesh(plane(0.42, 0.54), new THREE.MeshBasicMaterial({ map: artTexture() }));
  art.position.set(0, 0, 0.02);
  g.add(art);
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
  const outer = mesh(circle(0.9, 20), mat('fabric.red', { color: 0x8c4a52 }));
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = 0.008;
  outer.userData.ground = true;
  const mid = mesh(circle(0.72, 20), mat('fabric.cream', { color: 0xd9cdb4 }));
  mid.rotation.x = -Math.PI / 2;
  mid.position.y = 0.012;
  mid.userData.ground = true;
  const inner = mesh(circle(0.4, 20), mat('fabric.blue', { color: 0x54718f }));
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.016;
  inner.userData.ground = true;
  g.add(outer, mid, inner);
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
  const sky = new THREE.Mesh(plane(1.16, 1.36), new THREE.MeshBasicMaterial({ map: skyTexture() }));
  sky.position.set(0, 0, -0.02);
  g.add(sky);
  const f = mat('plastic.white');
  g.add(mesh(box(1.3, 0.07, 0.05), f, [0, 0.75, 0]));
  g.add(mesh(box(1.3, 0.07, 0.05), f, [0, -0.75, 0]));
  g.add(mesh(box(0.07, 1.5, 0.05), f, [-0.62, 0, 0]));
  g.add(mesh(box(0.07, 1.5, 0.05), f, [0.62, 0, 0]));
  g.add(mesh(box(0.05, 1.5, 0.05), f, [0, 0, 0]));
  g.add(mesh(box(1.42, 0.05, 0.14), mat('wood.mid'), [0, -0.8, 0.04]));
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
  wardrobe: { id: 'wardrobe', name: 'Lemari (Bercermin)', category: 'furniture', factory: wardrobe },
  desk: { id: 'desk', name: 'Meja Kerja', category: 'furniture', factory: desk },
  'desk-chair': { id: 'desk-chair', name: 'Kursi Belajar', category: 'furniture', factory: deskChair },
  'office-chair': { id: 'office-chair', name: 'Kursi Kantor', category: 'furniture', factory: officeChair },
  sofa: { id: 'sofa', name: 'Sofa', category: 'furniture', factory: sofa },
  'coffee-table': { id: 'coffee-table', name: 'Meja Tamu', category: 'furniture', factory: coffeeTable },
  tv: { id: 'tv', name: 'Televisi', category: 'furniture', factory: tv },
  'table-lamp': { id: 'table-lamp', name: 'Lampu Tidur', category: 'furniture', factory: tableLamp },
  'floor-lamp': { id: 'floor-lamp', name: 'Lampu Lantai', category: 'furniture', factory: floorLamp },
  'ceiling-light': { id: 'ceiling-light', name: 'Lampu Plafon', category: 'furniture', factory: ceilingLight },
  bookshelf: { id: 'bookshelf', name: 'Rak Buku', category: 'furniture', factory: bookshelf },
  rug: { id: 'rug', name: 'Karpet Bermotif', category: 'furniture', factory: rug },
  door: { id: 'door', name: 'Pintu', category: 'furniture', factory: door },
  'window-frame': { id: 'window-frame', name: 'Jendela (Pemandangan Langit)', category: 'furniture', factory: windowFrame },
  'wall-clock': { id: 'wall-clock', name: 'Jam Dinding', category: 'furniture', factory: wallClock },
  'picture-frame': { id: 'picture-frame', name: 'Lukisan Dinding', category: 'furniture', factory: pictureFrame },
};
