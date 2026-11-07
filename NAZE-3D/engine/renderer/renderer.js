/**
 * Renderer headless NAZE: rasterisasi murni JavaScript ke Canvas 2D
 * (@napi-rs/canvas) tanpa GPU. Paket npm three tidak menyertakan
 * SoftwareRenderer, sehingga modul ini mengimplementasikan pipeline render
 * sendiri dengan antarmuka mirip renderer three.js:
 *   - proyeksi perspektif + clipping bidang near per segitiga;
 *   - painter's algorithm, dengan pass ground terpisah agar objek di atas
 *     lantai tidak tertutup segitiga lantai raksasa;
 *   - pencahayaan aproksimasi: ambient + hemisphere + directional + point;
 *   - fog linear; tekstur affine (exact untuk billboard menghadap kamera).
 * Kompensasi keterbatasan: tanpa shadow map, tanpa instancing (geometri
 * di-cache bersama), DOF/bloom no-op.
 */
import { createCanvas } from '@napi-rs/canvas';
import * as THREE from 'three';

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

/** Polyfill DOM minimal untuk kompatibilitas pustaka yang mengharapkan browser. */
let polyfilled = false;
export function installNodePolyfills() {
  if (polyfilled) return;
  const g = globalThis;
  if (!g.document) {
    g.document = {
      createElement: (tag) => (tag === 'canvas' ? ensureSharedCanvas() : { style: {} }),
      createElementNS: (ns, tag) => (tag === 'canvas' ? ensureSharedCanvas() : { style: {} }),
      createTextNode: () => ({ data: '' }),
    };
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

const _pv = new THREE.Vector3();
const _nv = new THREE.Vector3();
const _e1 = new THREE.Vector3();
const _e2 = new THREE.Vector3();
const _lp = new THREE.Vector3();
const _pp = new THREE.Vector3();
const _mv = new THREE.Matrix4();

function clamp255(x) {
  return x < 0 ? 0 : x > 255 ? 255 : Math.round(x);
}

function cssRGB(r, g, b) {
  return 'rgb(' + clamp255(r) + ',' + clamp255(g) + ',' + clamp255(b) + ')';
}

function collectLights(scene, view) {
  const L = { ambient: [0, 0, 0], hemi: null, dirs: [], points: [] };
  scene.traverse((o) => {
    if (!o.isLight) return;
    const i = o.intensity === undefined ? 1 : o.intensity;
    if (o.isAmbientLight) {
      L.ambient[0] += o.color.r * i;
      L.ambient[1] += o.color.g * i;
      L.ambient[2] += o.color.b * i;
    } else if (o.isHemisphereLight) {
      L.hemi = {
        sky: [o.color.r, o.color.g, o.color.b],
        ground: [o.groundColor.r, o.groundColor.g, o.groundColor.b],
        intensity: i,
      };
    } else if (o.isDirectionalLight) {
      _lp.setFromMatrixPosition(o.matrixWorld).applyMatrix4(view);
      const len = _lp.length() || 1e-6;
      L.dirs.push({
        x: -_lp.x / len,
        y: -_lp.y / len,
        z: -_lp.z / len,
        color: [o.color.r * i, o.color.g * i, o.color.b * i],
      });
    } else if (o.isPointLight || o.isSpotLight) {
      const p = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(view);
      L.points.push({ x: p.x, y: p.y, z: p.z, color: [o.color.r * i, o.color.g * i, o.color.b * i], distance: o.distance || 0 });
    }
  });
  return L;
}

function shadeFace(mat, n, cx, cy, cz, L, out) {
  const base = mat.color || { r: 0.8, g: 0.8, b: 0.8 };
  if (mat.isMeshBasicMaterial) {
    out[0] = base.r; out[1] = base.g; out[2] = base.b;
    return;
  }
  let ar = L.ambient[0]; let ag = L.ambient[1]; let ab = L.ambient[2];
  if (L.hemi) {
    const t = (n.y + 1) * 0.5;
    ar += (L.hemi.ground[0] * (1 - t) + L.hemi.sky[0] * t) * L.hemi.intensity;
    ag += (L.hemi.ground[1] * (1 - t) + L.hemi.sky[1] * t) * L.hemi.intensity;
    ab += (L.hemi.ground[2] * (1 - t) + L.hemi.sky[2] * t) * L.hemi.intensity;
  }
  let dr = 0; let dg = 0; let db = 0;
  for (let k = 0; k < L.dirs.length; k++) {
    const d = L.dirs[k];
    const dot = n.x * d.x + n.y * d.y + n.z * d.z;
    if (dot > 0) { dr += d.color[0] * dot; dg += d.color[1] * dot; db += d.color[2] * dot; }
  }
  for (let k = 0; k < L.points.length; k++) {
    const p = L.points[k];
    const vx = p.x - cx; const vy = p.y - cy; const vz = p.z - cz;
    const dist = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1e-6;
    const dot = (n.x * vx + n.y * vy + n.z * vz) / dist;
    if (dot <= 0) continue;
    let att;
    if (p.distance > 0) { att = 1 - dist / p.distance; if (att < 0) att = 0; }
    else { att = 1 / (1 + 0.12 * dist * dist); }
    const c = att * dot;
    dr += p.color[0] * c; dg += p.color[1] * c; db += p.color[2] * c;
  }
  out[0] = base.r * (ar + dr);
  out[1] = base.g * (ag + dg);
  out[2] = base.b * (ab + db);
  if (mat.emissive) { out[0] += mat.emissive.r; out[1] += mat.emissive.g; out[2] += mat.emissive.b; }
}

function clipNear(poly, near) {
  const out = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const aIn = a.z < -near;
    const bIn = b.z < -near;
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const t = (-near - a.z) / (b.z - a.z);
      out.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: -near,
        u: a.u + (b.u - a.u) * t,
        v: a.v + (b.v - a.v) * t,
      });
    }
  }
  return out;
}

const byZ = (a, b) => a.z - b.z;
const byZLayer = (a, b) => (a.z - b.z) || (a.layer - b.layer);

function drawItems(ctx, items) {
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (it.alpha <= 0.01) continue;
    if (it.kind === 0) {
      ctx.globalAlpha = it.alpha;
      ctx.fillStyle = it.fill;
      ctx.beginPath();
      ctx.moveTo(it.x0, it.y0);
      ctx.lineTo(it.x1, it.y1);
      ctx.lineTo(it.x2, it.y2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.save();
      ctx.globalAlpha = it.alpha;
      ctx.beginPath();
      ctx.moveTo(it.x0, it.y0);
      ctx.lineTo(it.x1, it.y1);
      ctx.lineTo(it.x2, it.y2);
      ctx.closePath();
      ctx.clip();
      const s1x = it.u1 - it.u0; const s1y = it.v1 - it.v0;
      const s2x = it.u2 - it.u0; const s2y = it.v2 - it.v0;
      const denom = s1x * s2y - s2x * s1y;
      if (Math.abs(denom) > 1e-9) {
        const d1x = it.x1 - it.x0; const d1y = it.y1 - it.y0;
        const d2x = it.x2 - it.x0; const d2y = it.y2 - it.y0;
        const m11 = (d1x * s2y - d2x * s1y) / denom;
        const m12 = (d1y * s2y - d2y * s1y) / denom;
        const m21 = (d2x * s1x - d1x * s2x) / denom;
        const m22 = (d2y * s1x - d1y * s2x) / denom;
        const ox = it.x0 - (m11 * it.u0 + m21 * it.v0);
        const oy = it.y0 - (m12 * it.u0 + m22 * it.v0);
        ctx.transform(m11, m12, m21, m22, ox, oy);
        ctx.drawImage(it.img, 0, 0);
      }
      ctx.restore();
    }
  }
}

export class SoftwareCanvasRenderer {
  constructor() {
    this.width = 0;
    this.height = 0;
    this._projScreen = new THREE.Matrix4();
    this._frustum = new THREE.Frustum();
    this._buf = null;
    this._pts = null;
    this._poly = [];
    this._items = [];
    this._ground = [];
  }

  setSize(w, h) {
    this.width = Math.max(2, Math.floor(w));
    this.height = Math.max(2, Math.floor(h));
    ensureSharedCanvas(this.width, this.height);
  }

  render(scene, camera) {
    const ctx = sharedCtx;
    if (!ctx) throw new Error('SoftwareCanvasRenderer: setSize() harus dipanggil sebelum render()');
    const w = this.width;
    const h = this.height;
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    if (camera.isPerspectiveCamera) camera.updateProjectionMatrix();
    const view = camera.matrixWorldInverse;
    const proj = camera.projectionMatrix;
    this._projScreen.multiplyMatrices(proj, view);
    const frustum = this._frustum.setFromProjectionMatrix(this._projScreen);
    const near = Math.max(0.01, camera.near || 0.1);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = scene.background && scene.background.isColor
      ? cssRGB(scene.background.r * 255, scene.background.g * 255, scene.background.b * 255)
      : 'rgb(6,8,12)';
    ctx.fillRect(0, 0, w, h);

    const lights = collectLights(scene, view);
    const fog = scene.fog && scene.fog.isFog ? scene.fog : null;
    const items = this._items; items.length = 0;
    const ground = this._ground; ground.length = 0;

    scene.traverse((obj) => {
      if (!obj.isMesh || obj.visible === false) return;
      if (frustum.intersectsObject(obj) === false) return;
      this._processMesh(obj, view, proj, w, h, near, lights, fog,
        obj.userData.ground === true ? ground : items);
    });

    ground.sort(byZLayer);
    items.sort(byZ);
    drawItems(ctx, ground);
    drawItems(ctx, items);
    ctx.globalAlpha = 1;
  }

  _processMesh(obj, view, proj, w, h, near, lights, fog, out) {
    const geo = obj.geometry;
    const posA = geo.attributes.position;
    if (!posA) return;
    const uvA = geo.attributes.uv;
    const index = geo.index;
    const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    if (!mat || !mat.isMaterial) return;

    const mv = _mv.multiplyMatrices(view, obj.matrixWorld);
    const vc = posA.count;
    let buf = this._buf;
    if (!buf || buf.length < vc * 3) {
      buf = new Float32Array(vc * 3 * 2);
      this._buf = buf;
    }
    for (let i = 0; i < vc; i++) {
      _pv.fromBufferAttribute(posA, i).applyMatrix4(mv);
      buf[i * 3] = _pv.x;
      buf[i * 3 + 1] = _pv.y;
      buf[i * 3 + 2] = _pv.z;
    }

    const map = mat.map && mat.map.image ? mat.map : null;
    const iw = map ? (map.image.width || 1) : 1;
    const ih = map ? (map.image.height || 1) : 1;
    const flipY = !map || map.flipY !== false;
    const alpha = mat.transparent === true ? mat.opacity : 1;
    const side = mat.side;
    const layer = obj.userData.groundLayer || 0;
    const isBasic = mat.isMeshBasicMaterial === true;
    const matColorCss = mat.color
      ? cssRGB(mat.color.r * 255, mat.color.g * 255, mat.color.b * 255)
      : 'rgb(204,204,204)';
    const tint = [0, 0, 0];

    const ic = index ? index.count : vc;
    const poly = this._poly;
    for (let t = 0; t < ic; t += 3) {
      const a = index ? index.getX(t) : t;
      const b = index ? index.getX(t + 1) : t + 1;
      const c = index ? index.getX(t + 2) : t + 2;
      const ax = buf[a * 3]; const ay = buf[a * 3 + 1]; const az = buf[a * 3 + 2];
      const bx = buf[b * 3]; const by = buf[b * 3 + 1]; const bz = buf[b * 3 + 2];
      const cx = buf[c * 3]; const cy = buf[c * 3 + 1]; const cz = buf[c * 3 + 2];
      if (az >= -near && bz >= -near && cz >= -near) continue;

      _e1.set(bx - ax, by - ay, bz - az);
      _e2.set(cx - ax, cy - ay, cz - az);
      _nv.crossVectors(_e1, _e2);
      const nlen = _nv.length();
      if (nlen > 1e-9) _nv.multiplyScalar(1 / nlen);
      else _nv.set(0, 0, 1);
      const gx = (ax + bx + cx) / 3;
      const gy = (ay + by + cy) / 3;
      const gz = (az + bz + cz) / 3;

      let fill = matColorCss;
      if (!map) {
        shadeFace(mat, _nv, gx, gy, gz, lights, tint);
        let r = tint[0] * 255;
        let g = tint[1] * 255;
        let bl = tint[2] * 255;
        if (isBasic) { r = mat.color.r * 255; g = mat.color.g * 255; bl = mat.color.b * 255; }
        if (fog) {
          let f = (-gz - fog.near) / (fog.far - fog.near);
          f = f < 0 ? 0 : f > 1 ? 1 : f;
          r = r * (1 - f) + fog.color.r * 255 * f;
          g = g * (1 - f) + fog.color.g * 255 * f;
          bl = bl * (1 - f) + fog.color.b * 255 * f;
        }
        fill = cssRGB(r, g, bl);
      }

      poly.length = 0;
      this._pushVertex(poly, ax, ay, az, uvA, a, iw, ih, flipY);
      this._pushVertex(poly, bx, by, bz, uvA, b, iw, ih, flipY);
      this._pushVertex(poly, cx, cy, cz, uvA, c, iw, ih, flipY);
      let clipped = poly;
      if (az >= -near || bz >= -near || cz >= -near) {
        clipped = clipNear(poly, near);
        if (clipped.length < 3) continue;
      }

      let pts = this._pts;
      if (!pts || pts.length < clipped.length) {
        pts = [];
        for (let i = 0; i < clipped.length; i++) pts.push({ x: 0, y: 0 });
        this._pts = pts;
      }
      for (let i = 0; i < clipped.length; i++) {
        _pp.set(clipped[i].x, clipped[i].y, clipped[i].z).applyMatrix4(proj);
        pts[i].x = (_pp.x * 0.5 + 0.5) * w;
        pts[i].y = (1 - (_pp.y * 0.5 + 0.5)) * h;
      }

      for (let i = 1; i < clipped.length - 1; i++) {
        const p0 = pts[0];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const area2 = (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y);
        if (Math.abs(area2) < 1e-9) continue;
        if (side === THREE.FrontSide && area2 >= 0) continue;
        if (side === THREE.BackSide && area2 < 0) continue;
        out.push({
          z: (clipped[0].z + clipped[i].z + clipped[i + 1].z) / 3,
          layer,
          kind: map ? 1 : 0,
          alpha,
          x0: p0.x, y0: p0.y,
          x1: p1.x, y1: p1.y,
          x2: p2.x, y2: p2.y,
          fill,
          u0: clipped[0].u, v0: clipped[0].v,
          u1: clipped[i].u, v1: clipped[i].v,
          u2: clipped[i + 1].u, v2: clipped[i + 1].v,
          img: map ? map.image : null,
        });
      }
    }
  }

  _pushVertex(poly, x, y, z, uvA, i, iw, ih, flipY) {
    let u = 0;
    let v = 0;
    if (uvA) {
      u = uvA.getX(i) * iw;
      v = (flipY ? 1 - uvA.getY(i) : uvA.getY(i)) * ih;
    }
    poly.push({ x, y, z, u, v });
  }
}

/** Kompatibilitas: mengembalikan kelas renderer perangkat lunak modul ini. */
export async function loadSoftwareRenderer() {
  installNodePolyfills();
  return SoftwareCanvasRenderer;
}

export async function createRenderer(opts) {
  const options = opts || {};
  const profile = QUALITY_PROFILES[options.quality] || QUALITY_PROFILES.low;
  const w = options.width || profile.width;
  const h = options.height || profile.height;
  const renderer = new SoftwareCanvasRenderer();
  renderer.setSize(w, h);
  return { renderer, width: renderer.width, height: renderer.height, profile, type: 'canvas-raster' };
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
