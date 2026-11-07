/**
 * Caption Scene Intelligence: membangun metadata adegan per-frame dari data
 * yang sudah dimiliki engine - posisi subject (jalur klasik), layer
 * kompositor berlapis + kamera rig (jalur editorial), wilayah wajah
 * karakter, zona judul, dan elemen grafis. Tanpa layanan AI eksternal.
 */
import { SceneMeta, AnchorBox, ImportantRegion, AnchorRef } from "./adaptive-types";
import { SceneTiming } from "../core/timeline";
import { evaluateCamera } from "../motion/camera";
import { isEditorialKineticScene } from "../motion/layer-compositor";
import { LayerSpec } from "../motion/types";
import { sampleTrack } from "../core/keyframes";

interface ComposerLike {
  w: number;
  h: number;
  scale: number;
  animationIntensity: number;
  style: any;
}

const PARALLAX = 0.55;

function normBox(x: number, y: number, w: number, h: number, cw: number, ch: number) {
  return {
    x: Math.max(-0.2, Math.min(1.1, x / cw)),
    y: Math.max(-0.2, Math.min(1.1, y / ch)),
    w: Math.max(0.02, w / cw),
    h: Math.max(0.02, h / ch),
  };
}

/** Anchor + wilayah untuk jalur klasik (subject di slot illoY + bob). */
function classicAnchors(timing: SceneTiming, kit: ComposerLike, localT: number): {
  anchors: AnchorBox[];
  regions: ImportantRegion[];
} {
  const scene: any = timing.scene;
  const w = kit.w;
  const h = kit.h;
  const subjects: any[] = Array.isArray(scene?.subjects) ? scene.subjects : [];
  const slots = Math.max(1, subjects.length);
  const illoY = h * 0.44;
  const size = w * (slots === 1 ? 0.3 : 0.26);
  const anchors: AnchorBox[] = [];
  const regions: ImportantRegion[] = [];
  subjects.forEach((subject, i) => {
    const bob =
      Math.sin(localT * (0.7 + i * 0.13) * Math.PI * 2 + i * 1.7) *
      7 * kit.scale * Math.max(0.15, Math.min(1, kit.animationIntensity));
    const cx = slots === 1 ? w / 2 : (w / slots) * (i + 0.5);
    const cy = illoY + bob;
    const box = normBox(cx - size * 0.55, cy - size * 0.55, size * 1.1, size * 1.1, w, h);
    const isCharacter = subject?.kind === "character";
    const anchor: AnchorBox = {
      id: "subject:" + i,
      ...box,
      kind: isCharacter ? "character" : "object",
      faceFraction: isCharacter ? 0.38 : 0,
    };
    anchors.push(anchor);
    regions.push({ id: "subject-" + i, ...box, kind: "subject", weight: 3 });
    if (isCharacter) {
      regions.push({
        id: "face-" + i,
        x: box.x, y: box.y, w: box.w, h: box.h * anchor.faceFraction,
        kind: "face", weight: 10,
      });
    }
  });
  if (typeof scene?.title === "string" && scene.title) {
    regions.push({ id: "title", x: 0.04, y: 0.085, w: 0.92, h: 0.12, kind: "title", weight: 4 });
  }
  return { anchors, regions };
}

interface LayerWorldBox {
  id: string;
  subjectIndex?: number;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isCharacter: boolean;
}

function sampleOptional(track: any, t: number, fallback: number): number {
  if (!track || track.length === 0) return fallback;
  return sampleTrack(track, t);
}

function transformOf(layer: LayerSpec, t: number) {
  const tr: any = layer.transform ?? {};
  return {
    x: sampleOptional(tr.x, t, 0),
    y: sampleOptional(tr.y, t, 0),
    rotate: sampleOptional(tr.rotate, t, layer.rotate ?? 0),
    scale: sampleOptional(tr.scale, t, 1),
  };
}

/**
 * Replika transform layer-compositor: rantai parent (offset + rotasi + skala
 * di sekitar pusat parent) lalu kamera (rotasi, zoom, pan) + parallax root.
 * Abaikan offset enter singkat; anchor adalah kondisi mapan gerakan.
 */
function layeredWorldBoxes(scene: any, w: number, h: number, localT: number): LayerWorldBox[] {
  const layers: LayerSpec[] = Array.isArray(scene?.layers) && scene.layers.length > 0
    ? scene.layers
    : [];
  if (layers.length === 0) return [];
  const byId = new Map<string, LayerSpec>();
  for (const l of layers) byId.set(l.id, l);
  const subjectKind = (subjectIndex: number | undefined): boolean => {
    if (subjectIndex === undefined) return false;
    const s = (scene?.subjects ?? [])[subjectIndex];
    return s?.kind === "character";
  };

  const applyParent = (layer: LayerSpec, px: number, py: number): { x: number; y: number } => {
    if (!layer.parent) return { x: px, y: py };
    const parent = byId.get(layer.parent);
    if (!parent) return { x: px, y: py };
    const pb = parent.box ?? [0.1, 0.1, 0.8, 0.8];
    const pw = pb[2] * w;
    const ph = pb[3] * h;
    const pcx = pb[0] * w + pw / 2;
    const pcy = pb[1] * h + ph / 2;
    const pt = transformOf(parent, localT);
    const origin = applyParent(parent, pcx + pt.x, pcy + pt.y);
    const rad = (pt.rotate * Math.PI) / 180;
    const dx = px - (pcx + pt.x);
    const dy = py - (pcy + pt.y);
    return {
      x: origin.x + (dx * Math.cos(rad) - dy * Math.sin(rad)) * pt.scale,
      y: origin.y + (dx * Math.sin(rad) + dy * Math.cos(rad)) * pt.scale,
    };
  };

  const rootZOf = (layer: LayerSpec): { z: number } => {
    let cur: LayerSpec | undefined = layer;
    while (cur?.parent) cur = byId.get(cur.parent);
    return { z: cur?.z ?? 1 };
  };

  const out: LayerWorldBox[] = [];
  for (const layer of layers) {
    if (layer.kind !== "subject") continue;
    const b = layer.box ?? [0.1, 0.1, 0.8, 0.8];
    const bw = b[2] * w;
    const bh = b[3] * h;
    const tr = transformOf(layer, localT);
    const cx = b[0] * w + bw / 2 + tr.x;
    const cy = b[1] * h + bh / 2 + tr.y;
    const world = applyParent(layer, cx, cy);
    const rootZ = rootZOf(layer);
    out.push({
      id: layer.id,
      subjectIndex: layer.subjectIndex,
      kind: "subject",
      x: world.x - (bw * tr.scale) / 2,
      y: world.y - (bh * tr.scale) / 2,
      w: bw * tr.scale,
      h: bh * tr.scale,
      isCharacter: subjectKind(layer.subjectIndex),
    });
    void rootZ;
  }
  return out;
}

/** Metadata per-frame: anchor, wilayah penting, dan kamera. */
export function buildSceneMeta(timing: SceneTiming, kit: ComposerLike, localT: number): SceneMeta {
  const scene: any = timing.scene;
  const w = kit.w;
  const h = kit.h;
  const layered = isEditorialKineticScene(kit.style, scene);

  let anchors: AnchorBox[] = [];
  let regions: ImportantRegion[] = [];

  if (layered) {
    const centers = new Map<string, { x: number; y: number }>();
    const layers: LayerSpec[] = Array.isArray(scene?.layers) ? scene.layers : [];
    for (const layer of layers) {
      const b = layer.box ?? [0.1, 0.1, 0.8, 0.8];
      const tr = transformOf(layer, localT);
      centers.set(layer.id, {
        x: b[0] + b[2] / 2 + tr.x / w,
        y: b[1] + b[3] / 2 + tr.y / h,
      });
    }
    const cam = evaluateCamera(scene?.camera ?? null, localT, timing.duration, centers);
    const world = layeredWorldBoxes(scene, w, h, localT);

    const toScreen = (px: number, py: number): { x: number; y: number } => {
      const rad = (cam.rotateDeg * Math.PI) / 180;
      const dx = px - w / 2;
      const dy = py - h / 2;
      const sx = (dx * Math.cos(rad) - dy * Math.sin(rad)) * cam.zoom + w / 2 + cam.panX * w;
      const sy = (dx * Math.sin(rad) + dy * Math.cos(rad)) * cam.zoom + h / 2 + cam.panY * h;
      return { x: sx, y: sy };
    };

    for (const box of world) {
      const par = PARALLAX * (((box.id ? 1 : 1), 1) - 1) * 0.35; // netral; parallax root kecil diabaikan untuk anchor
      void par;
      const a = toScreen(box.x + box.w / 2, box.y + box.h / 2);
      const nb = normBox(a.x - box.w / 2, a.y - box.h / 2, box.w, box.h, w, h);
      const anchor: AnchorBox = {
        id: "layer:" + box.id,
        ...nb,
        kind: box.isCharacter ? "character" : "object",
        faceFraction: box.isCharacter ? 0.38 : 0,
      };
      anchors.push(anchor);
      if (box.subjectIndex !== undefined) {
        anchors.push({ ...anchor, id: "subject:" + box.subjectIndex });
      }
      regions.push({ id: "layer-" + box.id, ...nb, kind: "subject", weight: 3 });
      if (box.isCharacter) {
        regions.push({
          id: "face-" + box.id,
          x: nb.x, y: nb.y, w: nb.w, h: nb.h * anchor.faceFraction,
          kind: "face", weight: 10,
        });
      }
    }
    // Layer grafis lain (tipografi, panel, kartu) dihitung dari box statisnya
    // sebagai wilayah penting bobot rendah (mengabaikan offset enter).
    for (const layer of layers) {
      if (layer.kind === "subject" || layer.kind === "null") continue;
      const b = layer.box ?? [0.1, 0.1, 0.8, 0.8];
      const weight = layer.kind === "typography" ? 3.5 : 1.2;
      const a = toScreen(b[0] * w + (b[2] * w) / 2, b[1] * h + (b[3] * h) / 2);
      const nb = normBox(a.x - (b[2] * w) / 2, a.y - (b[3] * h) / 2, b[2] * w, b[3] * h, w, h);
      regions.push({ id: "gfx-" + layer.id, ...nb, kind: "graphic", weight });
    }
    return {
      sceneId: timing.scene.id,
      duration: timing.duration,
      localT,
      anchors,
      regions,
      camera: { zoom: cam.zoom, panX: cam.panX, panY: cam.panY, rotateDeg: cam.rotateDeg },
      narration: String(scene?.narration ?? ""),
    };
  }

  const classic = classicAnchors(timing, kit, localT);
  return {
    sceneId: timing.scene.id,
    duration: timing.duration,
    localT,
    anchors: classic.anchors,
    regions: classic.regions,
    camera: { zoom: 1, panX: 0, panY: 0, rotateDeg: 0 },
    narration: String((timing.scene as any)?.narration ?? ""),
  };
}

/** Resolusi AnchorRef menjadi AnchorBox pada metadata frame berjalan. */
export function resolveAnchor(ref: AnchorRef | undefined, meta: SceneMeta, localT: number): AnchorBox | null {
  if (!ref) return null;
  if (ref.point) {
    const p = ref.point(localT);
    return {
      id: "point",
      x: p.x, y: p.y, w: 0.001, h: 0.001,
      kind: "point",
      faceFraction: 0,
    };
  }
  if (typeof ref.subject === "number") {
    const found = meta.anchors.find((a) => a.id === "subject:" + ref.subject);
    if (found) return found;
  }
  if (typeof ref.layer === "string") {
    const found = meta.anchors.find((a) => a.id === "layer:" + ref.layer);
    if (found) return found;
  }
  return meta.anchors[0] ?? null;
}
