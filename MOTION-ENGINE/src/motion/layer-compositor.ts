/**
 * Layer compositor for Editorial Kinetic Motion.
 * Declarative layer tree per scene: parent-child transforms, null objects,
 * anchor points, masks, z-depth parallax, and a camera rig (zoom, pan,
 * rotation, dolly, tracking). Opt-in per scene via the style motion system
 * or explicit layers/camera fields; the classic composition path is untouched.
 *
 * Coordinate model: every layer box is normalized (0..1) against the full
 * canvas, including children. A parent's rotate/scale/skew pivots around
 * the parent's own center, so children keep their absolute box coordinates
 * while inheriting the parent's motion (null-object workflow).
 */
import { LayerSpec, CameraSpec, TrackSpec, TransformSpec } from "./types";
import { evaluateCamera } from "./camera";
import { applyTextStyleDefaults, drawStyledTypography } from "./text-styles";
import { drawEditorialElement, resolveFill } from "./editorial";
import { sampleTrack, progress } from "../core/keyframes";
import { applyEasing, hashString } from "../core/easing";
import { Palette } from "../color/palette";
import { StyleDef } from "../styles/types";
import { SceneTiming } from "../core/timeline";

const PARALLAX = 0.55;

export interface LayerKit {
  palette: Palette;
  style: StyleDef;
  fontFamily: string;
  scale: number;
  timeline: any;
  w: number;
  h: number;
  __scene?: any;
}

function sampleOptional(track: TrackSpec | undefined, t: number, fallback: number): number {
  if (!track || track.length === 0) return fallback;
  return sampleTrack(track, t);
}

function enterProgress(layer: LayerSpec, orderIndex: number, t: number): number {
  const enter = layer.enter ?? {};
  const at = enter.at ?? Math.min(0.6, orderIndex * 0.07);
  const dur = enter.dur ?? 0.7;
  const ease = enter.ease ?? "easeOutCubic";
  return progress(t, at, at + dur, ease);
}

interface LayerCenter {
  x: number;
  y: number;
}

function layerCenterNormalized(layer: LayerSpec, w: number, h: number, t: number): LayerCenter {
  const box = layer.box ?? [0.1, 0.1, 0.8, 0.8];
  const tr = layer.transform ?? {};
  const ox = sampleOptional(tr.x, t, 0);
  const oy = sampleOptional(tr.y, t, 0);
  return {
    x: box[0] + box[2] / 2 + ox / w,
    y: box[1] + box[3] / 2 + oy / h,
  };
}

interface EvaluatedTransform {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  alpha: number;
  skew: number;
  blur: number;
}

function evaluateTransform(layer: LayerSpec, enter: number, w: number, boxH: number, t: number): EvaluatedTransform {
  const tr: TransformSpec = layer.transform ?? {};
  const staticRotate = layer.rotate ?? 0;
  const enterType = layer.enter?.type ?? "rise";
  let ex = 0;
  let ey = 0;
  let escale = 1;
  let erot = 0;
  const e = applyEasing("easeOutCubic", Math.min(1, Math.max(0, enter)));
  switch (enterType) {
    case "slideL":
      ex = (1 - e) * -w * 0.85;
      break;
    case "slideR":
      ex = (1 - e) * w * 0.85;
      break;
    case "rise":
      ey = (1 - e) * boxH * 0.45;
      break;
    case "pop":
      escale = 0.6 + 0.4 * applyEasing("easeOutBack", Math.min(1, Math.max(0, enter)));
      break;
    case "spin":
      erot = (1 - e) * -18;
      break;
    case "wipe":
    case "none":
    default:
      break;
  }
  return {
    x: sampleOptional(tr.x, t, ex),
    y: sampleOptional(tr.y, t, ey),
    rotate: sampleOptional(tr.rotate, t, staticRotate) + erot,
    scale: sampleOptional(tr.scale, t, escale),
    alpha: Math.min(sampleOptional(tr.alpha, t, 1), enterType === "none" ? 1 : enter),
    skew: sampleOptional(tr.skew, t, 0),
    blur: sampleOptional(tr.blur, t, 0),
  };
}

function drawMask(ctx: any, shape: string, x: number, y: number, w: number, h: number, inset: number): void {
  const ix = w * inset;
  const iy = h * inset;
  ctx.beginPath();
  if (shape === "circle") {
    ctx.ellipse(x + w / 2, y + h / 2, Math.max(1, w / 2 - ix), Math.max(1, h / 2 - iy), 0, 0, Math.PI * 2);
  } else if (shape === "band") {
    ctx.rect(x + ix, y, w - ix * 2, h);
  } else {
    ctx.rect(x + ix, y + iy, w - ix * 2, h - iy * 2);
  }
  ctx.clip();
}

function drawLayerTree(
  ctx: any,
  rawLayer: LayerSpec,
  childrenOf: Map<string, LayerSpec[]>,
  orderOf: Map<string, number>,
  kit: LayerKit,
  cam: any,
  w: number,
  h: number,
  t: number,
  depth: number
): void {
  const layer = applyTextStyleDefaults(rawLayer);
  const enter = enterProgress(layer, orderOf.get(layer.id) ?? 0, t);
  const box = layer.box ?? [0.1, 0.1, 0.8, 0.8];
  const bw = box[2] * w;
  const bh = box[3] * h;
  const cx = box[0] * w + bw / 2;
  const cy = box[1] * h + bh / 2;
  const transform = evaluateTransform(layer, enter, w, bh, t);

  if (transform.alpha <= 0.01) return;

  const px = cx + transform.x;
  const py = cy + transform.y;

  ctx.save();
  if (depth === 0) {
    const z = layer.z ?? 1;
    const par = PARALLAX * (z - 1) * 0.35;
    ctx.translate(-cam.panX * w * par * 0.5, -cam.panY * h * par * 0.5);
  }
  ctx.translate(px, py);
  ctx.rotate((transform.rotate * Math.PI) / 180);
  if (transform.skew !== 0) {
    const sk = Math.tan((transform.skew * Math.PI) / 180);
    ctx.transform(1, 0, sk, 1, 0, 0);
  }
  ctx.scale(transform.scale, transform.scale);
  ctx.globalAlpha *= transform.alpha;
  if (transform.blur > 0 && typeof (ctx as any).filter === "string") {
    try {
      (ctx as any).filter = `blur(${transform.blur.toFixed(2)}px)`;
    } catch {
      // Blur unsupported on this canvas build; ignore gracefully.
    }
  }
  if (layer.mask) {
    drawMask(ctx, layer.mask.shape, -bw / 2, -bh / 2, bw, bh, layer.mask.inset ?? 0);
  }

  const fill = resolveFill(layer.fill, kit.palette);
  const s = kit.scale;
  const lx = -bw / 2;
  const ly = -bh / 2;

  if (layer.kind === "typography") {
    drawStyledTypography(
      ctx,
      layer,
      { palette: kit.palette, style: kit.style, fontFamily: kit.fontFamily, scale: s },
      fill,
      bw,
      bh,
      enter,
      t
    );
  } else if (layer.kind !== "null") {
    drawEditorialElement(ctx, layer, { x: lx, y: ly, w: bw, h: bh }, enter, t, fill, { palette: kit.palette, style: kit.style, scale: s }, kit.__scene?.subjects ?? []);
  }

  if (transform.blur > 0 && typeof (ctx as any).filter === "string") {
    (ctx as any).filter = "none";
  }

  // Static-pivot compensation: children keep absolute canvas coordinates.
  // They inherit this layer's rotation/scale/skew around its static box
  // center and follow its transform offsets (null-object workflow).
  ctx.translate(-cx, -cy);
  const children = childrenOf.get(layer.id) ?? [];
  for (const child of children) {
    drawLayerTree(ctx, child, childrenOf, orderOf, kit, cam, w, h, t, depth + 1);
  }
  ctx.restore();
}

function autoLayersForScene(scene: any): LayerSpec[] {
  const layers: LayerSpec[] = [];
  const subjects = Array.isArray(scene?.subjects) ? scene.subjects : [];
  // Komposisi auto bervariasi per scene (seed dari id scene) agar tidak semua
  // adegan berpusat sama: 0 tengah, 1 blok bawah + subjek atas, 2 headline atas.
  const variant = hashString(String(scene?.id ?? "scene")) % 3;
  const titleBox: [number, number, number, number] =
    variant === 1 ? [0.06, 0.62, 0.88, 0.24] : variant === 2 ? [0.05, 0.1, 0.9, 0.26] : [0.05, 0.3, 0.9, 0.28];
  const subjectY = variant === 1 ? 0.16 : 0.6;
  layers.push({ id: "auto-grid", kind: "grid", box: [0, 0, 1, 1], fill: "text", z: 0.8, enter: { type: "wipe" } });
  if (subjects.length > 0) {
    layers.push({ id: "auto-halftone", kind: "halftone", box: [0, 0.05, 1, 0.1], fill: "accent", z: 0.85, enter: { type: "wipe", at: 0.1 } });
  }
  if (typeof scene?.title === "string" && scene.title) {
    layers.push({
      id: "auto-title",
      kind: "typography",
      mode: variant === 1 ? "oversized" : "stacked",
      text: scene.title,
      box: titleBox,
      fill: "primary",
      z: 1.1,
      enter: { type: "rise", at: 0.15 },
    });
  }
  subjects.forEach((subject: any, i: number) => {
    const cols = Math.min(2, subjects.length);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bw = 0.8 / cols;
    const bh = 0.22;
    layers.push({
      id: `auto-subject-${i}`,
      kind: "subject",
      subjectIndex: i,
      box: [0.1 + col * bw + 0.04, subjectY + row * (bh + 0.03), bw - 0.08, bh],
      z: 1.2,
      enter: { type: "pop", at: 0.4 + i * 0.15 },
    });
  });
  return layers;
}

/**
 * Gate: a scene renders through the layered compositor when its style opts
 * into the editorial-kinetic motion system, or when it defines layers/camera.
 */
export function isEditorialKineticScene(style: any, scene: any): boolean {
  if (scene && Array.isArray(scene.layers) && scene.layers.length > 0) return true;
  if (scene && scene.camera && Array.isArray(scene.camera.shots)) return true;
  const system = style?.motion?.system ?? style?.motion;
  return system === "editorial-kinetic";
}

export function renderLayeredSceneContent(
  ctx: any,
  timing: SceneTiming,
  kit: LayerKit,
  globalT: number
): void {
  const scene: any = timing.scene;
  const w = kit.w || 1080;
  const h = kit.h || 1920;
  const localT = Math.max(0, globalT - timing.start);
  const sceneDuration = timing.duration > 0 ? timing.duration : 0;
  const layers: LayerSpec[] = Array.isArray(scene?.layers) && scene.layers.length > 0
    ? scene.layers
    : autoLayersForScene(scene);

  const childrenOf = new Map<string, LayerSpec[]>();
  const orderOf = new Map<string, number>();
  layers.forEach((layer, i) => {
    orderOf.set(layer.id, i);
    if (layer.parent) {
      const list = childrenOf.get(layer.parent) ?? [];
      list.push(layer);
      childrenOf.set(layer.parent, list);
    }
  });

  const centers = new Map<string, { x: number; y: number }>();
  for (const layer of layers) {
    centers.set(layer.id, layerCenterNormalized(layer, w, h, localT));
  }

  const cam = evaluateCamera(scene?.camera ?? null, localT, sceneDuration, centers);
  const layerKit: LayerKit = { ...kit, __scene: scene };

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((cam.rotateDeg * Math.PI) / 180);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-w / 2 + cam.panX * w, -h / 2 + cam.panY * h);

  const roots = layers.filter((l) => !l.parent).sort((a, b) => (a.z ?? 1) - (b.z ?? 1));
  for (const root of roots) {
    drawLayerTree(ctx, root, childrenOf, orderOf, layerKit, cam, w, h, localT, 0);
  }
  ctx.restore();
}
