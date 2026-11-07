/**
 * Pustaka material bersama (cached). 'mat' menghasilkan MeshLambertMaterial
 * (responsif terhadap cahaya), 'glow' menghasilkan MeshBasicMaterial (tanpa
 * cahaya, untuk LED/layar/hologram yang selalu tampak terang).
 */
import * as THREE from 'three';

const cache = new Map();

const LIB = {
  'wood.dark': { color: 0x5b3a29 }, 'wood.mid': { color: 0x8a5a3b }, 'wood.light': { color: 0xb08968 },
  'metal.gray': { color: 0x9aa3ad }, 'metal.dark': { color: 0x4a525c },
  'plastic.white': { color: 0xf2f4f7 }, 'plastic.gray': { color: 0xb9c0c9 }, 'plastic.black': { color: 0x1c1f24 },
  'fabric.blue': { color: 0x3b5b8c }, 'fabric.cream': { color: 0xe8ddc8 }, 'fabric.red': { color: 0xa5484d },
  'nature.leaf': { color: 0x2f8f4e }, 'nature.leaf.dark': { color: 0x1f6b39 }, 'nature.leaf.light': { color: 0x54b468 },
  'nature.trunk': { color: 0x6b4a2f }, 'nature.grass': { color: 0x3d8f3d }, 'nature.rock': { color: 0x8d8578 },
  'nature.water': { color: 0x2f7fbf }, 'nature.sand': { color: 0xd9c48a }, 'nature.snow': { color: 0xeef4f8 },
  'home.floor': { color: 0x9c7448 }, 'home.wall': { color: 0xdcdcd4 }, 'home.tile': { color: 0xbfc4cc },
  'tech.case': { color: 0x23272e }, 'tech.panel': { color: 0x2d333c }, 'tech.screen': { color: 0x0e1a26 },
  'city.wall': { color: 0x9aa0a8 }, 'city.road': { color: 0x3c4046 }, 'city.sidewalk': { color: 0xa7a9ad },
  'lab.table': { color: 0xdfe6ec }, 'lab.floor': { color: 0x30363f },
  'accent.cyan': { color: 0x22d3ee }, 'accent.violet': { color: 0x8b5cf6 }, 'accent.orange': { color: 0xf97316 },
};

export function mat(name, override) {
  const key = name + ':' + JSON.stringify(override || {});
  if (!cache.has(key)) {
    const def = LIB[name] || { color: 0xcccccc };
    cache.set(key, new THREE.MeshLambertMaterial(Object.assign({}, def, override || {})));
  }
  return cache.get(key);
}

export function glow(name, override) {
  const key = 'G:' + name + ':' + JSON.stringify(override || {});
  if (!cache.has(key)) {
    const def = LIB[name] || { color: 0xffffff };
    cache.set(key, new THREE.MeshBasicMaterial(Object.assign({}, def, override || {})));
  }
  return cache.get(key);
}

/** Material glow baru (tidak di-cache) untuk elemen yang dianimasikan. */
export function freshGlow(colorHex, opts) {
  return new THREE.MeshBasicMaterial(Object.assign({ color: colorHex }, opts || {}));
}

export function materialStats() {
  return { cachedMaterials: cache.size };
}
