/**
 * Pustaka material bersama (cached). 'mat' menghasilkan MeshLambertMaterial
 * (responsif terhadap cahaya), 'glow' menghasilkan MeshBasicMaterial (tanpa
 * cahaya, untuk LED/layar/hologram). Tekstur prosedural (papan kayu) dibuat
 * sekali dan di-cache.
 */
import { createCanvas } from '@napi-rs/canvas';
import * as THREE from 'three';

const cache = new Map();

let woodTex = null;
export function woodFloorTexture() {
  if (woodTex) return woodTex;
  const c = createCanvas(256, 256);
  const ctx = c.getContext('2d');
  const plankColors = ['#a07a4e', '#96704a', '#a5805a', '#8e6a45'];
  for (let row = 0; row < 4; row++) {
    const y = row * 64;
    ctx.fillStyle = plankColors[row % plankColors.length];
    ctx.fillRect(0, y, 256, 64);
    ctx.fillStyle = 'rgba(58,36,18,0.85)';
    ctx.fillRect(((row % 2) * 128 + 118) % 256, y, 3, 64);
    ctx.fillRect(0, y + 61, 256, 2);
    ctx.strokeStyle = 'rgba(78,50,26,0.32)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 5; g++) {
      ctx.beginPath();
      const gy = y + 9 + g * 11 + (row * 7) % 5;
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(80, gy + 3, 170, gy - 3, 256, gy + 1);
      ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  woodTex = t;
  return t;
}

const LIB = {
  'wood.dark': { color: 0x5b3a29 }, 'wood.mid': { color: 0x8a5a3b }, 'wood.light': { color: 0xb08968 },
  'metal.gray': { color: 0x9aa3ad }, 'metal.dark': { color: 0x4a525c },
  'plastic.white': { color: 0xf2f4f7 }, 'plastic.gray': { color: 0xb9c0c9 }, 'plastic.black': { color: 0x1c1f24 },
  'fabric.blue': { color: 0x3b5b8c }, 'fabric.cream': { color: 0xe8ddc8 }, 'fabric.red': { color: 0xa5484d },
  'nature.leaf': { color: 0x2f8f4e }, 'nature.leaf.dark': { color: 0x1f6b39 }, 'nature.leaf.light': { color: 0x54b468 },
  'nature.trunk': { color: 0x6b4a2f }, 'nature.grass': { color: 0x3d8f3d }, 'nature.rock': { color: 0x8d8578 },
  'nature.water': { color: 0x2f7fbf }, 'nature.sand': { color: 0xd9c48a }, 'nature.snow': { color: 0xeef4f8 },
  'home.floor': { color: 0xffffff, map: 'wood' }, 'home.wall': { color: 0xdcdcd4 }, 'home.tile': { color: 0xbfc4cc },
  'tech.case': { color: 0x23272e }, 'tech.panel': { color: 0x2d333c }, 'tech.screen': { color: 0x0e1a26 },
  'city.wall': { color: 0x9aa0a8 }, 'city.road': { color: 0x3c4046 }, 'city.sidewalk': { color: 0xa7a9ad },
  'lab.table': { color: 0xdfe6ec }, 'lab.floor': { color: 0x30363f },
  'accent.cyan': { color: 0x22d3ee }, 'accent.violet': { color: 0x8b5cf6 }, 'accent.orange': { color: 0xf97316 },
};

export function mat(name, override) {
  const key = name + ':' + JSON.stringify(override || {});
  if (!cache.has(key)) {
    const def = LIB[name] || { color: 0xcccccc };
    const params = Object.assign({}, def, override || {});
    if (params.map === 'wood') params.map = woodFloorTexture();
    cache.set(key, new THREE.MeshLambertMaterial(params));
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
