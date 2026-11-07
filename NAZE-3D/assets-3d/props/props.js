/**
 * Aset props pendukung: papan tulis, proyektor, peralatan lab, objek
 * futuristik, grid, dan partikel. Beberapa beranimasi bila diberi env.
 */
import * as THREE from 'three';
import { box, cyl, sphere, cone, plane, circle, torus, mesh } from '../../engine/modeling/procedural.js';
import { mat, glow, freshGlow } from '../../engine/materials/materials.js';

export function blackboard(opts) {
  const o = opts || {};
  const w = o.w || 2.6;
  const h = o.h || 1.2;
  const g = new THREE.Group();
  g.add(mesh(box(w + 0.08, h + 0.08, 0.04), mat('wood.mid'), [0, 0, -0.02]));
  g.add(mesh(plane(w, h), mat('tech.screen', { color: 0x1d3326 }), [0, 0, 0.005]));
  g.add(mesh(box(w * 0.6, 0.03, 0.06), mat('wood.dark'), [0, -h / 2 - 0.06, 0.04]));
  return g;
}

export function whiteboard(opts) {
  const o = opts || {};
  const w = o.w || 1.6;
  const h = o.h || 1.0;
  const g = new THREE.Group();
  g.add(mesh(box(w + 0.06, h + 0.06, 0.04), mat('metal.gray'), [0, 0, -0.02]));
  g.add(mesh(plane(w, h), mat('plastic.white', { color: 0xf8fafc }), [0, 0, 0.005]));
  return g;
}

export function projector() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.02, 0.02, 0.35, 6), mat('metal.dark'), [0, 0.18, 0]));
  g.add(mesh(box(0.3, 0.12, 0.24), mat('plastic.white'), [0, 0, 0]));
  g.add(mesh(cyl(0.05, 0.05, 0.05, 10), freshGlow(0xfff6d8), [0, -0.01, 0.14], [Math.PI / 2, 0, 0]));
  return g;
}

export function book(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  g.add(mesh(box(0.09, 0.03, 0.13), freshGlow(o.color || 0xa5484d), [0, 0.015, 0]));
  return g;
}

export function mug() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.035, 0.03, 0.075, 10), mat('plastic.white'), [0, 0.037, 0]));
  g.add(mesh(torus(0.02, 0.006, 8), mat('plastic.white'), [0.045, 0.037, 0]));
  return g;
}

export function pottedPlant() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.16, 0.13, 0.24, 10), mat('fabric.red', { color: 0xa9603f }), [0, 0.12, 0]));
  g.add(mesh(cyl(0.02, 0.03, 0.3, 6), mat('nature.trunk'), [0, 0.35, 0]));
  g.add(mesh(sphere(0.22, 10), mat('nature.leaf'), [0, 0.62, 0]));
  g.add(mesh(sphere(0.15, 8), mat('nature.leaf.dark'), [0.12, 0.5, 0.08]));
  return g;
}

export function labTable() {
  const g = new THREE.Group();
  g.add(mesh(box(2.0, 0.05, 1.0), mat('lab.table'), [0, 0.75, 0]));
  for (const [sx, sz] of [[-0.9, -0.42], [0.9, -0.42], [-0.9, 0.42], [0.9, 0.42]]) {
    g.add(mesh(cyl(0.03, 0.03, 0.75, 8), mat('metal.gray'), [sx, 0.375, sz]));
  }
  return g;
}

export function energyCore(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  const cyan = freshGlow(0x22d3ee, { transparent: true, opacity: 0.9 });
  const violet = freshGlow(0x8b5cf6, { transparent: true, opacity: 0.85 });
  g.add(mesh(cyl(0.5, 0.65, 0.5, 14), mat('metal.dark'), [0, 0.25, 0]));
  const core = mesh(sphere(0.32, 14), cyan, [0, 1.15, 0]);
  g.add(core);
  const ring1 = mesh(torus(0.55, 0.03, 18), violet, [0, 1.15, 0], [Math.PI / 2, 0, 0]);
  const ring2 = mesh(torus(0.7, 0.02, 18), cyan, [0, 1.15, 0], [Math.PI / 2, 0.5, 0]);
  g.add(ring1, ring2);
  if (o.env) {
    o.env.addAnimation('energy-core-pulse', (t) => {
      ring1.rotation.z = t * 1.4;
      ring2.rotation.z = -t;
      const s = 1 + Math.sin(t * 3) * 0.05;
      core.scale.set(s, s, s);
    });
  }
  return g;
}

export function robotArm(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  const metal = mat('metal.gray');
  const dark = mat('metal.dark');
  g.add(mesh(cyl(0.22, 0.28, 0.12, 12), dark, [0, 0.06, 0]));
  g.add(mesh(box(0.16, 0.5, 0.16), metal, [0, 0.35, 0]));
  const shoulder = new THREE.Group();
  shoulder.position.set(0, 0.6, 0);
  shoulder.add(mesh(box(0.12, 0.45, 0.12), metal, [0.24, 0.14, 0], [0, 0, -0.5]));
  const elbow = new THREE.Group();
  elbow.position.set(0.44, 0.3, 0);
  elbow.add(mesh(box(0.1, 0.35, 0.1), metal, [0.14, 0.1, 0], [0, 0, -0.9]));
  elbow.add(mesh(box(0.08, 0.08, 0.16), dark, [0.28, -0.02, 0]));
  shoulder.add(elbow);
  g.add(shoulder);
  g.add(mesh(sphere(0.06, 8), freshGlow(0xf97316), [0, 0.6, 0.14]));
  if (o.env) {
    o.env.addAnimation('robot-arm-sway', (t) => {
      shoulder.rotation.y = Math.sin(t * 0.8) * 0.5;
    });
  }
  return g;
}

export function crystal(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  const m = freshGlow(0x8b5cf6, { transparent: true, opacity: 0.8 });
  g.add(mesh(cone(0.16, 0.5, 5), m, [0, 0.25, 0]));
  g.add(mesh(cone(0.16, 0.5, 5), m, [0, 0.25, 0], [Math.PI, 0, 0]));
  if (o.env) {
    o.env.addAnimation('crystal-glow', (t) => {
      m.opacity = 0.55 + Math.abs(Math.sin(t * 2)) * 0.35;
    });
  }
  return g;
}

export function holoPanel(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  const m = new THREE.Mesh(plane(1.2, 0.7), freshGlow(0x22d3ee, { transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
  m.position.y = 1.5;
  g.add(m);
  const bm = freshGlow(0x22d3ee, { transparent: true, opacity: 0.7 });
  g.add(mesh(box(1.24, 0.02, 0.01), bm, [0, 1.86, 0]));
  g.add(mesh(box(1.24, 0.02, 0.01), bm, [0, 1.14, 0]));
  g.add(mesh(box(0.02, 0.74, 0.01), bm, [-0.61, 1.5, 0]));
  g.add(mesh(box(0.02, 0.74, 0.01), bm, [0.61, 1.5, 0]));
  if (o.env) {
    o.env.addAnimation('holo-panel-flicker', (t) => {
      m.material.opacity = 0.18 + Math.abs(Math.sin(t * 2.7)) * 0.08;
    });
  }
  return g;
}

export function glassTube() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.18, 0.18, 0.6, 10), freshGlow(0x9fd8ff, { transparent: true, opacity: 0.25 }), [0, 0.3, 0]));
  g.add(mesh(cyl(0.12, 0.12, 0.5, 10), freshGlow(0x22d3ee, { transparent: true, opacity: 0.5 }), [0, 0.28, 0]));
  g.add(mesh(cyl(0.2, 0.2, 0.02, 10), mat('metal.dark'), [0, 0.01, 0]));
  return g;
}

export function floatingPlatform() {
  const g = new THREE.Group();
  g.add(mesh(box(1.6, 0.12, 1.6), mat('tech.panel'), [0, 0, 0]));
  const rim = freshGlow(0x22d3ee, { transparent: true, opacity: 0.8 });
  g.add(mesh(box(1.66, 0.02, 0.04), rim, [0, 0.06, 0.8]));
  g.add(mesh(box(1.66, 0.02, 0.04), rim, [0, 0.06, -0.8]));
  g.add(mesh(box(0.04, 0.02, 1.66), rim, [0.8, 0.06, 0]));
  g.add(mesh(box(0.04, 0.02, 1.66), rim, [-0.8, 0.06, 0]));
  return g;
}

export function dataPillar(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  g.add(mesh(cyl(0.22, 0.3, 0.25, 10), mat('metal.dark'), [0, 0.125, 0]));
  g.add(mesh(cyl(0.05, 0.05, 1.6, 6), mat('tech.panel'), [0, 0.8, 0]));
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const r = mesh(torus(0.26, 0.02, 12), freshGlow(0x22d3ee, { transparent: true, opacity: 0.7 }), [0, 0.45 + i * 0.35, 0], [Math.PI / 2, 0, 0]);
    rings.push(r);
    g.add(r);
  }
  if (o.env) {
    o.env.addAnimation('data-pillar-pulse', (t) => {
      for (let i = 0; i < rings.length; i++) {
        rings[i].material.opacity = 0.25 + Math.abs(Math.sin(t * 2.5 - i * 0.8)) * 0.6;
      }
    });
  }
  return g;
}

export function particleField(opts) {
  const o = opts || {};
  const count = o.count || 24;
  const g = new THREE.Group();
  const parts = [];
  for (let i = 0; i < count; i++) {
    const p = mesh(box(0.03, 0.03, 0.03), freshGlow(o.color || 0x22d3ee), [(Math.random() - 0.5) * 8, Math.random() * 4, (Math.random() - 0.5) * 8]);
    p.userData.seed = Math.random() * 10;
    parts.push(p);
    g.add(p);
  }
  if (o.env) {
    o.env.addAnimation('particle-field-drift', (t) => {
      for (const p of parts) {
        const s = p.userData.seed;
        p.position.y = ((s + t * 0.25) % 1) * 4 + 0.2;
        p.rotation.y = t + s;
      }
    });
  }
  return g;
}

export function gridLine() {
  const g = new THREE.Group();
  g.add(mesh(box(0.02, 0.004, 8), freshGlow(0x22d3ee, { transparent: true, opacity: 0.5 }), [0, 0, 0]));
  return g;
}

export function tripodCamera() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    g.add(mesh(cyl(0.012, 0.012, 1.3, 6), mat('metal.dark'), [Math.cos(a) * 0.18, 0.6, Math.sin(a) * 0.18], [Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25]));
  }
  g.add(mesh(box(0.14, 0.09, 0.09), mat('plastic.black'), [0, 1.32, 0]));
  g.add(mesh(cyl(0.03, 0.03, 0.02, 10), mat('metal.dark'), [0, 1.32, 0.055], [Math.PI / 2, 0, 0]));
  return g;
}

export function deskMic() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.08, 0.1, 0.02, 10), mat('metal.dark'), [0, 0.01, 0]));
  g.add(mesh(cyl(0.012, 0.012, 0.28, 6), mat('metal.gray'), [0, 0.15, 0], [0, 0, 0.25]));
  g.add(mesh(cyl(0.035, 0.035, 0.09, 10), mat('plastic.black'), [0.035, 0.32, 0], [0, 0, 0.5]));
  return g;
}

export const ASSETS = {
  blackboard: { id: 'blackboard', name: 'Papan Tulis', category: 'props', factory: blackboard },
  whiteboard: { id: 'whiteboard', name: 'Whiteboard', category: 'props', factory: whiteboard },
  projector: { id: 'projector', name: 'Proyektor', category: 'props', factory: projector },
  book: { id: 'book', name: 'Buku', category: 'props', factory: book },
  mug: { id: 'mug', name: 'Mug', category: 'props', factory: mug },
  'potted-plant': { id: 'potted-plant', name: 'Tanaman Pot', category: 'props', factory: pottedPlant },
  'lab-table': { id: 'lab-table', name: 'Meja Laboratorium', category: 'props', factory: labTable },
  'energy-core': { id: 'energy-core', name: 'Inti Energi (animatif)', category: 'props', factory: energyCore },
  'robot-arm': { id: 'robot-arm', name: 'Lengan Robot', category: 'props', factory: robotArm },
  crystal: { id: 'crystal', name: 'Kristal Energi', category: 'props', factory: crystal },
  'holo-panel': { id: 'holo-panel', name: 'Panel Holografik', category: 'props', factory: holoPanel },
  'glass-tube': { id: 'glass-tube', name: 'Tabung Kaca', category: 'props', factory: glassTube },
  'floating-platform': { id: 'floating-platform', name: 'Platform Melayang', category: 'props', factory: floatingPlatform },
  'data-pillar': { id: 'data-pillar', name: 'Pilar Data (denyut)', category: 'props', factory: dataPillar },
  'particle-field': { id: 'particle-field', name: 'Medan Partikel', category: 'props', factory: particleField },
  'grid-line': { id: 'grid-line', name: 'Garis Grid Bercahaya', category: 'props', factory: gridLine },
  'tripod-camera': { id: 'tripod-camera', name: 'Kamera Tripod', category: 'props', factory: tripodCamera },
  'desk-mic': { id: 'desk-mic', name: 'Mikrofon Meja', category: 'props', factory: deskMic },
};
