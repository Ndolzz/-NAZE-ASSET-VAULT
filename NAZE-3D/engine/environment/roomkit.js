/**
 * Kit ruangan: lantai, dinding, dan ruangan tertutup siap pakai.
 */
import * as THREE from 'three';
import { plane } from '../modeling/procedural.js';
import { mat } from '../materials/materials.js';

export function makeFloor(w, d, materialName, override) {
  const m = new THREE.Mesh(plane(w, d), mat(materialName || 'nature.grass', override));
  m.rotation.x = -Math.PI / 2;
  return m;
}

export function makeWall(w, h, materialName, override) {
  return new THREE.Mesh(plane(w, h), mat(materialName || 'home.wall', override));
}

export function makeRoom(opts) {
  const o = opts || {};
  const w = o.w || 6;
  const d = o.d || 6;
  const h = o.h || 3.2;
  const g = new THREE.Group();
  const floor = makeFloor(w, d, o.floor, o.floorOverride);
  g.add(floor);
  const back = makeWall(w, h, o.wall, o.wallOverride);
  back.position.set(0, h / 2, -d / 2);
  g.add(back);
  const left = makeWall(d, h, o.wall, o.wallOverride);
  left.position.set(-w / 2, h / 2, 0);
  left.rotation.y = Math.PI / 2;
  g.add(left);
  const right = makeWall(d, h, o.wall, o.wallOverride);
  right.position.set(w / 2, h / 2, 0);
  right.rotation.y = -Math.PI / 2;
  g.add(right);
  let ceiling = null;
  if (o.ceiling !== false) {
    ceiling = new THREE.Mesh(plane(w, d), mat('plastic.white', { color: 0xe8e8e2 }));
    ceiling.position.set(0, h, 0);
    ceiling.rotation.x = Math.PI / 2;
    g.add(ceiling);
  }
  return { group: g, floor, back, left, right, ceiling, w, d, h };
}
