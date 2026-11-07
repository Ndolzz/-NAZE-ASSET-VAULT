/**
 * Procedural geometry helpers dengan cache global.
 * Semua geometri dibuat dari primitif Three.js dan di-cache berdasarkan kunci
 * sehingga aset yang sama otomatis berbagi instance geometri (geometry reuse).
 * Konvensi aset: titik asal (0,0,0) berada di lantai pada pusat objek.
 */
import * as THREE from 'three';

const cache = new Map();

export function geo(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export const box = (w, h, d) => geo('box:' + w + '|' + h + '|' + d, () => new THREE.BoxGeometry(w, h, d));
export const cyl = (rt, rb, h, seg = 12) => geo('cyl:' + rt + '|' + rb + '|' + h + '|' + seg, () => new THREE.CylinderGeometry(rt, rb, h, seg));
export const sphere = (r, seg = 12) => geo('sph:' + r + '|' + seg, () => new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1)));
export const cone = (r, h, seg = 10) => geo('cone:' + r + '|' + h + '|' + seg, () => new THREE.ConeGeometry(r, h, seg));
export const plane = (w, h) => geo('plane:' + w + '|' + h, () => new THREE.PlaneGeometry(w, h));
export const torus = (r, t, seg = 16) => geo('tor:' + r + '|' + t + '|' + seg, () => new THREE.TorusGeometry(r, t, 8, seg));
export const circle = (r, seg = 16) => geo('circle:' + r + '|' + seg, () => new THREE.CircleGeometry(r, seg));

/** Mesh helper singkat. */
export function mesh(geometry, material, pos, rot) {
  const m = new THREE.Mesh(geometry, material);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  return m;
}

export function geometryStats() {
  return { cachedGeometries: cache.size };
}

export function disposeGeometries() {
  for (const g of cache.values()) g.dispose();
  cache.clear();
}
