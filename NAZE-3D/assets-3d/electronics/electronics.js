/**
 * Aset elektronik & teknologi prosedural, termasuk elemen beranimasi
 * (LED berkedip, kipas server berputar) bila factory menerima opsi env.
 */
import { createCanvas } from '@napi-rs/canvas';
import * as THREE from 'three';
import { box, cyl, sphere, cone, plane, circle, torus, mesh } from '../../engine/modeling/procedural.js';
import { mat, glow, freshGlow } from '../../engine/materials/materials.js';

const screenCache = new Map();
export function screenTexture(hue) {
  const key = String(hue);
  if (screenCache.has(key)) return screenCache.get(key);
  const c = createCanvas(128, 80);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0c1a26';
  ctx.fillRect(0, 0, 128, 80);
  ctx.fillStyle = hue;
  for (let i = 0; i < 6; i++) {
    const h = 12 + ((i * 37) % 44);
    ctx.fillRect(12 + i * 18, 66 - h, 10, h);
  }
  ctx.strokeStyle = hue;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(8, 20);
  ctx.lineTo(48, 14);
  ctx.lineTo(88, 22);
  ctx.lineTo(120, 12);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  screenCache.set(key, tex);
  return tex;
}

export function serverRack(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  g.add(mesh(box(0.7, 2.0, 0.8), mat('tech.case'), [0, 1.0, 0]));
  g.add(mesh(box(0.62, 1.9, 0.03), mat('tech.panel'), [0, 1.0, 0.4]));
  const ledColors = [0x35ff6d, 0x36c9ff];
  const leds = [];
  for (let i = 0; i < 8; i++) {
    g.add(mesh(box(0.56, 0.16, 0.01), mat('metal.dark'), [0, 0.2 + i * 0.22, 0.42]));
    const led = mesh(box(0.05, 0.05, 0.012), freshGlow(ledColors[i % 2]), [-0.2 + (i % 3) * 0.08, 0.2 + i * 0.22, 0.43]);
    leds.push(led);
    g.add(led);
    if (i % 3 === 2) {
      g.add(mesh(box(0.2, 0.1, 0.012), mat('plastic.black'), [0.22, 0.2 + i * 0.22, 0.43]));
    }
  }
  const fan = new THREE.Group();
  fan.position.set(0, 1.75, 0.43);
  fan.add(mesh(torus(0.07, 0.015, 8), mat('metal.gray')));
  for (let b = 0; b < 3; b++) {
    const a = (b / 3) * Math.PI * 2;
    const blade = mesh(box(0.1, 0.02, 0.01), mat('plastic.gray'), [Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0.005]);
    blade.rotation.z = a;
    fan.add(blade);
  }
  g.add(fan);
  if (o.env) {
    o.env.addAnimation('server-rack-activity', (t) => {
      fan.rotation.z = t * 10;
      for (let i = 0; i < leds.length; i++) {
        const on = Math.sin(t * (2.2 + i * 0.6) + i * 1.7) > -0.3;
        leds[i].material.color.setHex(on ? ledColors[i % 2] : 0x123321);
      }
    });
  }
  return g;
}

export function monitor(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  g.add(mesh(cyl(0.09, 0.11, 0.02, 10), mat('plastic.black'), [0, 0.01, 0]));
  g.add(mesh(box(0.04, 0.18, 0.04), mat('plastic.black'), [0, 0.1, 0]));
  g.add(mesh(box(0.64, 0.4, 0.03), mat('plastic.black'), [0, 0.36, 0]));
  const face = new THREE.Mesh(plane(0.6, 0.36), new THREE.MeshBasicMaterial({ map: screenTexture(o.tint || '#36c9ff') }));
  face.position.set(0, 0.36, 0.017);
  g.add(face);
  return g;
}

export function keyboard(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  g.add(mesh(box(0.36, 0.02, 0.14), mat('plastic.black'), [0, 0.01, 0]));
  const keyMat = o.glow ? freshGlow(0x22d3ee) : mat('plastic.gray');
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 12; c++) {
      g.add(mesh(box(0.022, 0.008, 0.02), keyMat, [-0.155 + c * 0.028, 0.022, -0.045 + r * 0.03]));
    }
  }
  return g;
}

export function mouse() {
  const g = new THREE.Group();
  const m = mesh(sphere(0.05, 10), mat('plastic.black'), [0, 0.025, 0]);
  m.scale.set(1, 0.55, 1.4);
  g.add(m);
  g.add(mesh(box(0.012, 0.008, 0.01), mat('metal.gray'), [0, 0.05, -0.035]));
  return g;
}

export function pcTower(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  g.add(mesh(box(0.2, 0.45, 0.45), mat('tech.case'), [0, 0.225, 0]));
  g.add(mesh(box(0.19, 0.4, 0.01), freshGlow(0x22d3ee, { transparent: true, opacity: 0.35 }), [0.105, 0.225, 0]));
  const leds = [];
  for (let i = 0; i < 2; i++) {
    const led = mesh(box(0.02, 0.02, 0.008), freshGlow(0x35ff6d), [-0.04 + i * 0.06, 0.4, 0.228]);
    leds.push(led);
    g.add(led);
  }
  if (o.env) {
    o.env.addAnimation('pc-led-blink', (t) => {
      for (let i = 0; i < leds.length; i++) {
        leds[i].material.color.setHex(Math.sin(t * (3 + i)) > 0 ? 0x35ff6d : 0x123018);
      }
    });
  }
  return g;
}

export function laptop() {
  const g = new THREE.Group();
  g.add(mesh(box(0.32, 0.015, 0.22), mat('metal.gray'), [0, 0.008, 0]));
  g.add(mesh(box(0.32, 0.21, 0.01), mat('plastic.black'), [0, 0.115, -0.105], [-0.35, 0, 0]));
  const face = new THREE.Mesh(plane(0.3, 0.19), new THREE.MeshBasicMaterial({ map: screenTexture('#8b5cf6') }));
  face.position.set(0, 0.115, -0.099);
  face.rotation.x = -0.35;
  g.add(face);
  return g;
}

export function router() {
  const g = new THREE.Group();
  g.add(mesh(box(0.3, 0.04, 0.2), mat('plastic.black'), [0, 0.02, 0]));
  g.add(mesh(cyl(0.008, 0.008, 0.18, 6), mat('plastic.gray'), [-0.1, 0.11, -0.08], [0.3, 0, 0.15]));
  g.add(mesh(cyl(0.008, 0.008, 0.18, 6), mat('plastic.gray'), [0.1, 0.11, -0.08], [0.3, 0, -0.15]));
  g.add(mesh(box(0.012, 0.008, 0.006), freshGlow(0x35ff6d), [0.12, 0.045, 0.1]));
  return g;
}

export function patchPanel() {
  const g = new THREE.Group();
  g.add(mesh(box(0.9, 0.5, 0.06), mat('tech.panel'), [0, 0, 0]));
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      g.add(mesh(box(0.07, 0.08, 0.02), (r + c) % 5 === 0 ? freshGlow(0x36c9ff) : mat('plastic.black'), [-0.35 + c * 0.1, -0.18 + r * 0.12, 0.035]));
    }
  }
  return g;
}

export function dashboardScreen(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  g.add(mesh(box(1.6, 0.9, 0.05), mat('plastic.black'), [0, 0, 0]));
  const face = new THREE.Mesh(plane(1.5, 0.8), new THREE.MeshBasicMaterial({ map: screenTexture(o.tint || '#22d3ee') }));
  face.position.set(0, 0, 0.028);
  g.add(face);
  return g;
}

export function holoRing(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  const r = o.radius || 0.8;
  const y = o.y || 1.2;
  const ring = mesh(torus(r, 0.015, 20), freshGlow(0x22d3ee, { transparent: true, opacity: 0.75 }), [0, y, 0], [Math.PI / 2, 0, 0]);
  g.add(ring);
  const disc = new THREE.Mesh(circle(r * 0.9, 20), freshGlow(0x22d3ee, { transparent: true, opacity: 0.1 }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = y;
  g.add(disc);
  if (o.env) {
    o.env.addAnimation('holo-ring-spin', (t) => {
      ring.rotation.z = t * 0.8;
      disc.material.opacity = 0.08 + Math.abs(Math.sin(t * 2)) * 0.06;
    });
  }
  return g;
}

export function lightStrip() {
  const g = new THREE.Group();
  g.add(mesh(box(0.1, 0.02, 2.5), freshGlow(0xbfe8ff), [0, 0, 0]));
  return g;
}

export function rgbStrip(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  const m = freshGlow(0x8b5cf6);
  g.add(mesh(box(0.04, 0.04, 2.4), m, [0, 0, 0]));
  if (o.env) {
    const colors = [0x8b5cf6, 0x22d3ee, 0xf472b6];
    o.env.addAnimation('rgb-cycle', (t) => {
      m.color.setHex(colors[Math.floor(t * 2) % colors.length]);
    });
  }
  return g;
}

export const ASSETS = {
  'server-rack': { id: 'server-rack', name: 'Rak Server (LED + kipas animatif)', category: 'electronics', factory: serverRack },
  monitor: { id: 'monitor', name: 'Monitor', category: 'electronics', factory: monitor },
  keyboard: { id: 'keyboard', name: 'Keyboard', category: 'electronics', factory: keyboard },
  mouse: { id: 'mouse', name: 'Mouse', category: 'electronics', factory: mouse },
  'pc-tower': { id: 'pc-tower', name: 'PC Tower (LED)', category: 'electronics', factory: pcTower },
  laptop: { id: 'laptop', name: 'Laptop', category: 'electronics', factory: laptop },
  router: { id: 'router', name: 'Router', category: 'electronics', factory: router },
  'patch-panel': { id: 'patch-panel', name: 'Patch Panel', category: 'electronics', factory: patchPanel },
  'dashboard-screen': { id: 'dashboard-screen', name: 'Dashboard Display', category: 'electronics', factory: dashboardScreen },
  'holo-ring': { id: 'holo-ring', name: 'Antarmuka Holografik', category: 'electronics', factory: holoRing },
  'light-strip': { id: 'light-strip', name: 'Strip Lampu', category: 'electronics', factory: lightStrip },
  'rgb-strip': { id: 'rgb-strip', name: 'Strip RGB (animasi warna)', category: 'electronics', factory: rgbStrip },
};
