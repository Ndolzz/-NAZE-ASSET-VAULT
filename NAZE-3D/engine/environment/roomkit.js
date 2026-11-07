/**
 * Kit ruangan: lantai, dinding, plafon, papan skirting, dan ruangan tertutup
 * siap pakai. Lantai disubdivisi dan ditandai ground agar renderer
 * menggambarnya pada pass pertama; dinding dan plafon tidak melempar
 * bayangan planar (noShadow) agar ruangan tidak tergelapkan.
 */
import * as THREE from 'three';
import { plane, box } from '../modeling/procedural.js';
import { mat } from '../materials/materials.js';

export function makeFloor(w, d, materialName, override) {
  const m = new THREE.Mesh(plane(w, d, 8, 8), mat(materialName || 'nature.grass', override));
  m.rotation.x = -Math.PI / 2;
  m.userData.ground = true;
  return m;
}

export function makeWall(w, h, materialName, override) {
  const m = new THREE.Mesh(plane(w, h), mat(materialName || 'home.wall', override));
  m.userData.noShadow = true;
  return m;
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
    ceiling.userData.noShadow = true;
    g.add(ceiling);
  }
  if (o.baseboard !== false) {
    const bb = mat('wood.dark');
    const bbBack = new THREE.Mesh(box(w, 0.09, 0.025), bb);
    bbBack.position.set(0, 0.045, -d / 2 + 0.0125);
    bbBack.userData.noShadow = true;
    g.add(bbBack);
    const bbLeft = new THREE.Mesh(box(0.025, 0.09, d), bb);
    bbLeft.position.set(-w / 2 + 0.0125, 0.045, 0);
    bbLeft.userData.noShadow = true;
    g.add(bbLeft);
    const bbRight = new THREE.Mesh(box(0.025, 0.09, d), bb);
    bbRight.position.set(w / 2 - 0.0125, 0.045, 0);
    bbRight.userData.noShadow = true;
    g.add(bbRight);
  }
  return { group: g, floor, back, left, right, ceiling, w, d, h };
}
