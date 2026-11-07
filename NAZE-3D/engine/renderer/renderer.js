/**
 * Renderer headless berbasis SoftwareRenderer three.js (rasterisasi murni JS).
 * Berjalan di Node tanpa GPU: cocok untuk CI dan Termux ARMv7.
 * Kompensasi keterbatasan profil perangkat lunak:
 *   - bayangan dinamis tidak tersedia -> gunakan contact shadow manual;
 *   - InstancedMesh tidak didukung -> aset berbagi geometri melalui cache;
 *   - DOF/bloom/degradasi berkualitas diabaikan secara eksplisit.
 */
import { createCanvas } from '@napi-rs/canvas';

export const QUALITY_PROFILES = {
  low: { width: 360, height: 640, shadows: false, instancing: false, detail: 'low' },
  medium: { width: 540, height: 960, shadows: false, instancing: true, detail: 'medium' },
  high: { width: 1080, height: 1920, shadows: true, instancing: true, detail: 'high' },
};

let sharedCanvas = null;
let sharedCtx = null;

export function ensureSharedCanvas(w, h) {
  if (!sharedCanvas) {
    sharedCanvas = createCanvas(w || 64, h || 64);
    sharedCtx = sharedCanvas.getContext('2d');
  } else if (w && h && (sharedCanvas.width !== w || sharedCanvas.height !== h)) {
    sharedCanvas.width = w;
    sharedCanvas.height = h;
  }
  return sharedCanvas;
}

/** Elemen canvas palsu yang menulis ke satu backing canvas bersama. */
function wrapCanvas() {
  const backing = ensureSharedCanvas();
  const store = { style: {} };
  return new Proxy({}, {
    get(_t, prop) {
      if (prop in store) return store[prop];
      const v = backing[prop];
      return typeof v === 'function' ? v.bind(backing) : v;
    },
    set(_t, prop, value) {
      if (prop === 'style') { store.style = value; return true; }
      try { backing[prop] = value; } catch (e) { store[prop] = value; }
      return true;
    },
    has(_t, prop) { return prop in store || prop in backing; },
  });
}

let polyfilled = false;
export function installNodePolyfills() {
  if (polyfilled) return;
  const g = globalThis;
  if (!g.document) {
    g.document = { createElement: (tag) => (tag === 'canvas' ? wrapCanvas() : { style: {} }) };
  }
  if (!g.ImageData) {
    g.ImageData = class ImageData {
      constructor(a, b) {
        if (typeof a === 'number') { this.width = a; this.height = b; }
        else { this.width = a.width; this.height = a.height; }
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      }
    };
  }
  if (!g.self) g.self = g;
  if (!g.window) g.window = g;
  polyfilled = true;
}

let SoftwareRendererCtor = null;

export async function loadSoftwareRenderer() {
  if (SoftwareRendererCtor) return SoftwareRendererCtor;
  installNodePolyfills();
  const candidates = [
    'three/examples/jsm/renderers/software/SoftwareRenderer.js',
    'three/addons/renderers/software/SoftwareRenderer.js',
  ];
  let lastErr = null;
  for (const p of candidates) {
    try {
      const mod = await import(p);
      if (mod.SoftwareRenderer) { SoftwareRendererCtor = mod.SoftwareRenderer; return SoftwareRendererCtor; }
    } catch (e) { lastErr = e; }
  }
  throw new Error('SoftwareRenderer tidak dapat dimuat: ' + (lastErr ? lastErr.message : 'tidak dikenal'));
}

export async function createRenderer(opts) {
  const options = opts || {};
  const profile = QUALITY_PROFILES[options.quality] || QUALITY_PROFILES.low;
  const w = options.width || profile.width;
  const h = options.height || profile.height;
  const SR = await loadSoftwareRenderer();
  const renderer = new SR();
  renderer.setSize(w, h);
  ensureSharedCanvas(w, h);
  return { renderer, width: w, height: h, profile, type: 'software' };
}

/** Piksel RGBA frame terakhir. */
export function readPixels(handle) {
  ensureSharedCanvas(handle.width, handle.height);
  const img = sharedCtx.getImageData(0, 0, handle.width, handle.height);
  return img.data;
}

/** PNG frame terakhir. */
export function readPng() {
  const backing = ensureSharedCanvas();
  return backing.toBuffer('image/png');
}
