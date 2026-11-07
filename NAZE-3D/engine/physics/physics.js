/**
 * Fisika ringan: penempatan di lantai, AABB, dan deteksi tabrakan.
 * Konvensi aset (origin di lantai) membuat objek tidak melayang secara struktural.
 */
import * as THREE from 'three';

const _box = new THREE.Box3();

export function aabbOf(object) {
  object.updateWorldMatrix(true, true);
  return _box.setFromObject(object);
}

export function collides(a, b) {
  return a.intersectsBox(b);
}

/** true bila alas objek menempel di lantai (toleransi 5cm). */
export function grounded(object, tolerance) {
  const box = aabbOf(object);
  return Math.abs(box.min.y) < (tolerance ?? 0.05);
}

export function groundHeight() {
  return 0;
}

/** Dorong keluar secara horizontal bila dua AABB bertumpuk (sumbu XZ saja). */
export function pushApart(movable, obstacle, amount) {
  const a = new THREE.Box3().setFromObject(movable);
  const b = new THREE.Box3().setFromObject(obstacle);
  if (!a.intersectsBox(b)) return movable;
  const dx = a.getCenter(new THREE.Vector3()).x - b.getCenter(new THREE.Vector3()).x;
  const dz = a.getCenter(new THREE.Vector3()).z - b.getCenter(new THREE.Vector3()).z;
  if (Math.abs(dx) > Math.abs(dz)) movable.position.x += Math.sign(dx || 1) * (amount ?? 0.05);
  else movable.position.z += Math.sign(dz || 1) * (amount ?? 0.05);
  return movable;
}
