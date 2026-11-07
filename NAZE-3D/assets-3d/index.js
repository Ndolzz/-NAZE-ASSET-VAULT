/**
 * Registry aset 3D. Setiap aset memiliki id, nama, kategori, dan factory
 * yang menghasilkan Object3D siap pakai (origin di lantai).
 */
import { ASSETS as vegetation } from './vegetation/vegetation.js';
import { ASSETS as furniture } from './furniture/furniture.js';
import { ASSETS as electronics } from './electronics/electronics.js';
import { ASSETS as buildings } from './buildings/buildings.js';
import { ASSETS as vehicles } from './vehicles/car.js';
import { ASSETS as props } from './props/props.js';
import { ASSETS as characters } from './characters/characters.js';

export const ASSET_REGISTRY = Object.assign({}, vegetation, furniture, electronics, buildings, vehicles, props, characters);

export function getAsset(id) {
  return ASSET_REGISTRY[id] || null;
}

export function listAssets() {
  return Object.values(ASSET_REGISTRY).map((a) => ({ id: a.id, name: a.name, category: a.category }));
}
