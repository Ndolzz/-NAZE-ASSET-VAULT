/**
 * Adaptive positioning: safe area responsif, wrapping berbasis pengukuran,
 * pembangkit kandidat posisi, deteksi tabrakan, dan scoring konflik visual.
 * Semua perhitungan px; wilayah penting diberikan normalized dan dikonversi.
 */
import { Placement, SceneMeta, ImportantRegion, AnchorBox } from "./adaptive-types";

export interface SafeArea {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Metrics {
  w: number;
  h: number;
  /** Faktor skala: min(w, h) / 1080 - ukuran token tema dikalikan ini. */
  unit: number;
  safe: SafeArea;
  /** Format deteksi: "9x16" | "16x9" | "1x1" | "other". */
  format: string;
}

/**
 * Safe area untuk platform vertikal (TikTok/Reels): UI sistem di atas dan
 * tombol aksi di kanan bawah dijauhi. Berlaku ke semua format.
 */
export function safeAreaFor(format: string, override?: Partial<SafeArea>): SafeArea {
  const base: SafeArea =
    format === "16x9"
      ? { top: 0.06, bottom: 0.08, left: 0.05, right: 0.05 }
      : { top: 0.05, bottom: 0.12, left: 0.05, right: 0.07 };
  return { ...base, ...(override ?? {}) };
}

export function metricsFor(w: number, h: number, override?: Partial<SafeArea>): Metrics {
  const ratio = w / Math.max(1, h);
  const format = Math.abs(ratio - 9 / 16) < 0.02 ? "9x16" : Math.abs(ratio - 16 / 9) < 0.02 ? "16x9" : Math.abs(ratio - 1) < 0.02 ? "1x1" : "other";
  return {
    w,
    h,
    unit: Math.min(w, h) / 1080,
    safe: safeAreaFor(format, override),
    format,
  };
}

export interface RectPx {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function overlapArea(a: RectPx, b: RectPx): number {
  const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ix > 0 && iy > 0 ? ix * iy : 0;
}

export function inflate(r: RectPx, by: number): RectPx {
  return { x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 };
}

export function rectFromNormalized(n: { x: number; y: number; w: number; h: number }, m: Metrics): RectPx {
  return { x: n.x * m.w, y: n.y * m.h, w: n.w * m.w, h: n.h * m.h };
}

/** Membungkus teks ke baris berdasarkan pengukuran ctx, maksimum maxLines. */
export function wrapTextToWidth(
  ctx: any,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = (text ?? "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? current + " " + word : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines) {
    // Cutoff bertanda elipsis bila ada sisa kata.
    const consumed = lines.join(" ");
    const rest = words.join(" ").slice(consumed.length).trim();
    if (rest.length > 0 && lines.length > 0) {
      const last = lines[lines.length - 1];
      lines[lines.length - 1] =
        (last.length > 4 ? last.slice(0, last.length - 1) : last) + "…";
    }
  }
  return lines;
}

export interface MeasuredBlock {
  lines: string[];
  lineHeight: number;
  blockW: number;
  blockH: number;
}

export function measureBlock(ctx: any, text: string, opts: {
  maxWidth: number;
  maxLines: number;
  lineHeightFactor: number;
}): MeasuredBlock {
  const lines = wrapTextToWidth(ctx, text, opts.maxWidth, opts.maxLines);
  if (lines.length === 0) return { lines: [], lineHeight: 0, blockW: 0, blockH: 0 };
  const lineHeight = Math.round((ctx.font ? fontSizeOf(ctx) : 40) * opts.lineHeightFactor);
  let widest = 0;
  for (const l of lines) widest = Math.max(widest, ctx.measureText(l).width);
  return {
    lines,
    lineHeight,
    blockW: Math.ceil(widest),
    blockH: lines.length * lineHeight,
  };
}

/** Ekstraksi ukuran font dari string ctx.font aktif ("600 54px Family"). */
export function fontSizeOf(ctx: any): number {
  const match = /(\d+(?:\.\d+)?)px/.exec(String(ctx.font ?? ""));
  return match ? parseFloat(match[1]) : 40;
}

export interface PlacementCandidate {
  rect: RectPx;
  placement: Placement;
  /** Skor dasar preferensi (lebih kecil = lebih diprioritaskan). */
  preference: number;
  anchor: AnchorBox | null;
}

function anchorPx(anchor: AnchorBox | null, m: Metrics): RectPx | null {
  if (!anchor) return null;
  return rectFromNormalized(anchor, m);
}

/**
 * Membangkitkan kandidat posisi untuk satu kotak caption.
 * Untuk "auto", kandidat diurutkan berdasar preferensi tipe (typeBias).
 */
export function candidatesForPlacement(
  placement: Placement,
  box: { w: number; h: number },
  m: Metrics,
  anchor: AnchorBox | null,
  typeBias: Partial<Record<Placement, number>> = {},
  gap = 18
): PlacementCandidate[] {
  const out: PlacementCandidate[] = [];
  const push = (rect: RectPx, p: Placement) => {
    const clamped = clampToSafe(rect, m);
    out.push({ rect: clamped, placement: p, preference: typeBias[p] ?? 1, anchor });
  };
  const { w, h } = box;
  const s = m.safe;
  const left = s.left * m.w;
  const right = m.w - s.right * m.w - w;
  const topY = s.top * m.h;
  const bottomY = m.h - s.bottom * m.h - h;
  const midX = (m.w - w) / 2;
  const midY = (m.h - h) / 2;
  const a = anchorPx(anchor, m);

  switch (placement) {
    case "bottom":
      push({ x: midX, y: bottomY, w, h }, "bottom");
      break;
    case "top":
      push({ x: midX, y: topY, w, h }, "top");
      break;
    case "center":
      push({ x: midX, y: midY, w, h }, "center");
      break;
    case "left":
      push({ x: left, y: midY, w, h }, "left");
      break;
    case "right":
      push({ x: right, y: midY, w, h }, "right");
      break;
    case "corner-tl":
      push({ x: left, y: topY, w, h }, "corner-tl");
      break;
    case "corner-tr":
      push({ x: right, y: topY, w, h }, "corner-tr");
      break;
    case "corner-bl":
      push({ x: left, y: bottomY, w, h }, "corner-bl");
      break;
    case "corner-br":
      push({ x: right, y: bottomY, w, h }, "corner-br");
      break;
    case "float": {
      // Kotak-kotak kandidat pada zona tengah frame.
      const xs = [left, midX, right];
      const ys = [topY, m.h * 0.3 - h / 2, midY, m.h * 0.68 - h / 2, bottomY];
      for (const y of ys) for (const x of xs) {
        push({ x, y, w, h }, "float");
      }
      break;
    }
    case "above-anchor":
    case "below-anchor":
    case "side-anchor": {
      if (!a) { push({ x: midX, y: bottomY, w, h }, "bottom"); break; }
      const above = { x: a.x + a.w / 2 - w / 2, y: a.y - h - gap * m.unit, w, h };
      const below = { x: a.x + a.w / 2 - w / 2, y: a.y + a.h + gap * m.unit, w, h };
      const sideL = { x: a.x - w - gap * m.unit, y: a.y + a.h * 0.3, w, h };
      const sideR = { x: a.x + a.w + gap * m.unit, y: a.y + a.h * 0.3, w, h };
      if (placement === "above-anchor") {
        push(above, "above-anchor");
        push(below, "below-anchor");
        push(sideR, "side-anchor");
        push(sideL, "side-anchor");
      } else if (placement === "below-anchor") {
        push(below, "below-anchor");
        push(above, "above-anchor");
        push(sideR, "side-anchor");
        push(sideL, "side-anchor");
      } else {
        push(sideR, "side-anchor");
        push(sideL, "side-anchor");
        push(above, "above-anchor");
        push(below, "below-anchor");
      }
      break;
    }
    case "fullscreen":
      push({ x: midX, y: midY, w, h }, "fullscreen");
      break;
    default: {
      // "auto": urutan umum terbaik untuk subtitle.
      push({ x: midX, y: bottomY, w, h }, "bottom");
      push({ x: midX, y: topY, w, h }, "top");
      push({ x: midX, y: midY, w, h }, "center");
      push({ x: left, y: midY, w, h }, "left");
      push({ x: right, y: midY, w, h }, "right");
      push({ x: left, y: topY, w, h }, "corner-tl");
      push({ x: right, y: topY, w, h }, "corner-tr");
      push({ x: left, y: bottomY, w, h }, "corner-bl");
      push({ x: right, y: bottomY, w, h }, "corner-br");
      break;
    }
  }
  return out;
}

export function clampToSafe(rect: RectPx, m: Metrics): RectPx {
  const minX = m.safe.left * m.w;
  const maxX = m.w - m.safe.right * m.w - rect.w;
  const minY = m.safe.top * m.h;
  const maxY = m.h - m.safe.bottom * m.h - rect.h;
  return {
    x: Math.max(minX, Math.min(maxX, rect.x)),
    y: Math.max(minY, Math.min(maxY, rect.y)),
    w: rect.w,
    h: rect.h,
  };
}

export interface SolvedPlacement {
  rect: RectPx;
  placement: Placement;
  score: number;
  conflicts: string[];
}

/**
 * Scoring kandidat: penalti bobot tabrakan dengan wilayah penting, penalti
 * tumpukan dengan caption aktif lain, penalti jarak anchor, plus preferensi.
 * Kandidat ber skor terendah menang; posisi utama yang penuh konflik otomatis
 * tergantikan alternatifnya.
 */
export function solvePlacement(
  candidates: PlacementCandidate[],
  occupied: RectPx[],
  regions: ImportantRegion[],
  m: Metrics
): SolvedPlacement | null {
  if (candidates.length === 0) return null;
  let best: SolvedPlacement | null = null;
  for (const cand of candidates) {
    const conflicts: string[] = [];
    let score = cand.preference;
    const area = Math.max(1, cand.rect.w * cand.rect.h);
    for (const region of regions) {
      const rpx = rectFromNormalized(region, m);
      const ov = overlapArea(inflate(cand.rect, 6 * m.unit), rpx);
      if (ov > 0) {
        score += (ov / area) * region.weight;
        conflicts.push(region.id + ":" + region.kind);
      }
    }
    for (const other of occupied) {
      const ov = overlapArea(inflate(cand.rect, 10 * m.unit), other);
      if (ov > 0) {
        score += (ov / area) * 9 + 0.5;
        conflicts.push("caption-stack");
      }
    }
    // Preferensi jarak ke anchor untuk bubble: makin dekat makin baik.
    if (cand.anchor) {
      const a = rectFromNormalized(cand.anchor, m);
      const dx = (cand.rect.x + cand.rect.w / 2) - (a.x + a.w / 2);
      const dy = (cand.rect.y + cand.rect.h / 2) - (a.y + a.h / 2);
      const dist = Math.sqrt(dx * dx + dy * dy) / m.h;
      score += dist * 1.2;
    }
    // Penalti kecil bila menempel batas safe area.
    const edgeSlack = Math.min(
      cand.rect.x - m.safe.left * m.w,
      m.w - m.safe.right * m.w - (cand.rect.x + cand.rect.w),
      cand.rect.y - m.safe.top * m.h,
      m.h - m.safe.bottom * m.h - (cand.rect.y + cand.rect.h)
    );
    if (edgeSlack < 4 * m.unit) score += 0.4;
    if (!best || score < best.score) best = { ...cand, score, conflicts };
  }
  return best;
}
