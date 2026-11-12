/**
 * Camera-Aware CC Tracking & Intelligent Placement.
 *
 * Akar masalah yang diperbaiki (hasil audit captions/engine.ts, layout.ts,
 * anchors.ts):
 *  - Penempatan CC dipecahkan ulang setiap frame tanpa memori antar frame,
 *    sehingga posisi dapat melompat; tidak ada smoothing maupun histeresis.
 *  - Kandidat posisi adalah slot layar statis; kamera hanya memengaruhi
 *    caption ber-anchor. CC tanpa anchor menempel pada koordinat layar saat
 *    kamera pan/tilt/zoom sehingga terlihat "ditempel".
 *  - Tidak ada analisis ruang kosong: solver hanya menghukum tabrakan.
 *  - Tidak ada mekanisme recovery saat anchor hilang.
 *
 * Pendekatan: transformasi koordinat analitik (bukan optical flow). Engine
 * merender secara prosedural sehingga posisi kamera dan wilayah penting
 * diketahui pasti setiap frame; ikatan analitik lebih murah, deterministik,
 * dan bebas jitter dibanding tracking fitur.
 *
 *  1. Anchor adegan: posisi CC dipilih sekali oleh solver (kandidat layout +
 *     kandidat ruang kosong), lalu disimpan dalam RUANG ADEGAN. Setiap frame
 *     titik itu diproyeksikan ke layar memakai transform kamera yang sama
 *     dengan layer-compositor, sehingga CC mengikuti area adegan pada pan,
 *     tilt, zoom, rotasi, dan dolly-track tanpa lag.
 *  2. Ruang kosong: grid okupansi berbobot dari wilayah penting (wajah,
 *     subjek, judul, grafis) membangkitkan kandidat posisi di area bebas.
 *  3. Komposisi adaptif: solver memilih kandidat terbaik dengan penalti
 *     perpindahan zona (histeresis); perubahan zona diinterpolasi halus.
 *  4. Collision: tabrakan wajah nyaris dilarang keras; tabrakan subjek
 *     memicu re-anchor dengan cooldown agar tidak osilasi.
 *  5. Recovery: anchor hilang -> tahan posisi terakhir (clamp safe area);
 *     posisi tidak valid lagi -> re-anchor dengan transisi halus.
 *  6. Zoom: ukuran font diskalakan proporsional, dibatasi 0.85..1.18.
 */
import { ImportantRegion, Placement, SceneMeta } from "./adaptive-types";
import {
  Metrics,
  PlacementCandidate,
  RectPx,
  clampToSafe,
  overlapArea,
  rectFromNormalized,
  solvePlacement,
} from "./layout";

/** Keadaan kamera scene-local (identik dengan SceneMeta.camera). */
export type CamState = SceneMeta["camera"];

/**
 * Transform maju adegan -> layar. Harus identik dengan toScreen pada
 * captions/anchors.ts dan penerapan kamera di motion/layer-compositor.ts:
 * rotasi di sekitar pusat, skala zoom, lalu translasi pan.
 */
export function cameraToScreen(
  px: number,
  py: number,
  cam: CamState,
  w: number,
  h: number
): { x: number; y: number } {
  const rad = (cam.rotateDeg * Math.PI) / 180;
  const dx = px - w / 2;
  const dy = py - h / 2;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: (dx * cos - dy * sin) * cam.zoom + w / 2 + cam.panX * w,
    y: (dx * sin + dy * cos) * cam.zoom + h / 2 + cam.panY * h,
  };
}

/** Transform balik layar -> adegan (invers eksak dari cameraToScreen). */
export function cameraScreenToScene(
  sx: number,
  sy: number,
  cam: CamState,
  w: number,
  h: number
): { x: number; y: number } {
  const rad = (cam.rotateDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = sx - w / 2 - cam.panX * w;
  const dy = sy - h / 2 - cam.panY * h;
  return {
    x: (dx * cos + dy * sin) / cam.zoom + w / 2,
    y: (-dx * sin + dy * cos) / cam.zoom + h / 2,
  };
}

/** Skala ukuran font proporsional zoom kamera, dibatasi agar keterbacaan terjaga. */
export function zoomFontScale(zoom: number): number {
  const z = Math.max(0.6, Math.min(2.4, zoom));
  return Math.max(0.85, Math.min(1.18, Math.pow(z, 0.3)));
}

const GRID_COLS = 12;
const GRID_ROWS = 20;
/** Sel dianggap bebas bila total bobot wilayah di bawah ambang ini. */
const FREE_WEIGHT = 1.0;

export interface SpaceGrid {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  /** Bobot okupansi per sel (semakin besar semakin ramai). */
  blocked: number[];
}

/** Grid okupansi berbobot dari wilayah penting adegan. */
export function buildSpaceGrid(meta: SceneMeta, m: Metrics): SpaceGrid {
  const blocked = new Array<number>(GRID_COLS * GRID_ROWS).fill(0);
  for (const region of meta.regions) {
    const r = rectFromNormalized(region, m);
    const x0 = Math.max(0, Math.floor((r.x / m.w) * GRID_COLS));
    const x1 = Math.min(GRID_COLS - 1, Math.ceil(((r.x + r.w) / m.w) * GRID_COLS) - 1);
    const y0 = Math.max(0, Math.floor((r.y / m.h) * GRID_ROWS));
    const y1 = Math.min(GRID_ROWS - 1, Math.ceil(((r.y + r.h) / m.h) * GRID_ROWS) - 1);
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        blocked[gy * GRID_COLS + gx] += region.weight;
      }
    }
  }
  return { cols: GRID_COLS, rows: GRID_ROWS, cellW: m.w / GRID_COLS, cellH: m.h / GRID_ROWS, blocked };
}

/**
 * Kandidat posisi dari ruang kosong aktual: pita baris sel bebas diperluas
 * menjadi kotak, kotak caption diletakkan di kiri/tengah/kanan run. Bobot
 * preferensi naik bila kandidat sejajar dengan span subjek/wajah sehingga
 * CC memilih sisi yang berlawanan dari objek utama.
 */
export function negativeSpaceCandidates(
  meta: SceneMeta,
  box: { w: number; h: number },
  m: Metrics
): PlacementCandidate[] {
  const grid = buildSpaceGrid(meta, m);
  const { cols, rows, blocked } = grid;
  const cw = Math.max(1, Math.ceil(box.w / grid.cellW));
  const ch = Math.max(1, Math.ceil(box.h / grid.cellH));
  const free = (gx: number, gy: number) =>
    gx >= 0 && gx < cols && gy >= 0 && gy < rows && blocked[gy * cols + gx] < FREE_WEIGHT;
  const out: PlacementCandidate[] = [];
  const seen = new Set<string>();
  const subjects = meta.regions.filter((r) => r.kind === "subject" || r.kind === "face");
  const pushRect = (x: number, y: number) => {
    const rect = clampToSafe({ x, y, w: box.w, h: box.h }, m);
    const key = Math.round(rect.x / 24) + ":" + Math.round(rect.y / 24);
    if (seen.has(key)) return;
    seen.add(key);
    let preference = 0.45;
    for (const s of subjects) {
      const rpx = rectFromNormalized(s, m);
      const spanX = inflate(rpx, 0.08 * m.w);
      const ovX = Math.min(rect.x + rect.w, spanX.x + spanX.w) - Math.max(rect.x, spanX.x);
      if (ovX > 0) preference += 0.5 * (ovX / rect.w) * (s.kind === "face" ? 1.5 : 1);
      const ovY = Math.min(rect.y + rect.h, rpx.y + rpx.h) - Math.max(rect.y, rpx.y);
      if (ovX > 0 && ovY > 0) preference += 0.3;
    }
    out.push({ rect, placement: "float", preference, anchor: null });
  };
  for (let gy = 0; gy + ch <= rows; gy++) {
    let run = 0;
    for (let gx = 0; gx <= cols; gx++) {
      let ok = gx < cols;
      if (ok) {
        for (let yy = gy; yy < gy + ch; yy++) {
          if (!free(gx, yy)) {
            ok = false;
            break;
          }
        }
      }
      if (ok) {
        run++;
        continue;
      }
      if (run >= cw) {
        const x0 = (gx - run) * grid.cellW;
        const runW = run * grid.cellW;
        const yC = (gy + ch / 2) * grid.cellH;
        pushRect(x0, yC - box.h / 2);
        pushRect(x0 + runW / 2 - box.w / 2, yC - box.h / 2);
        pushRect(x0 + runW - box.w, yC - box.h / 2);
      }
      run = 0;
    }
  }
  return out.slice(0, 15);
}

interface TrackState {
  /** Pusat CC dalam ruang adegan (normalized) untuk mode scene. */
  sceneCenter: { x: number; y: number } | null;
  /** Rect terakhir yang digambar (px layar). */
  drawn: RectPx | null;
  placement: string | null;
  lastLocalT: number;
  transitionFrom: { x: number; y: number } | null;
  transitionStart: number;
  lastReanchor: number;
}

export type TrackMode = "scene" | "anchor" | "held" | "recovered" | "solved";

export interface TrackDecision {
  rect: RectPx;
  placement: Placement;
  mode: TrackMode;
  /** True bila CC mengikuti proyeksi kamera frame ini. */
  tracked: boolean;
}

const TRANSITION_SECONDS = 0.3;
const REANCHOR_COOLDOWN = 0.6;
const STALE_SECONDS = 1.5;
/** Tabrakan wajah nyaris dilarang keras (fraksi area CC). */
const FACE_OVERLAP_LIMIT = 0.02;
/** Tabrakan subjek memicu re-anchor (fraksi area CC). */
const SUBJECT_OVERLAP_LIMIT = 0.35;
/** Batas kecepatan perpindahan CC (fraksi tinggi frame per detik). */
const MAX_SPEED_H_PER_S = 2.5;
/** Bila proyeksi anchor tertarik lebih jauh dari ini, re-anchor. */
const PULL_LIMIT_H = 0.25;

function centerRect(cx: number, cy: number, box: { w: number; h: number }): RectPx {
  return { x: cx - box.w / 2, y: cy - box.h / 2, w: box.w, h: box.h };
}

function easeOutCubic(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 3);
}

function conflictInfo(
  rect: RectPx,
  regions: ImportantRegion[],
  m: Metrics
): { faceFrac: number; subjectFrac: number; score: number } {
  const area = Math.max(1, rect.w * rect.h);
  let faceFrac = 0;
  let subjectFrac = 0;
  let score = 0;
  for (const region of regions) {
    const rpx = rectFromNormalized(region, m);
    const ov = overlapArea(inflate(rect, 6 * m.unit), rpx);
    if (ov <= 0) continue;
    const frac = ov / area;
    score += frac * region.weight;
    if (region.kind === "face") faceFrac = Math.max(faceFrac, frac);
    if (region.kind === "subject") subjectFrac = Math.max(subjectFrac, frac);
  }
  return { faceFrac, subjectFrac, score };
}

export interface SolveArgs {
  capId: string;
  /** "scene": tanpa anchor, ikat ke area adegan; "anchor": ikuti anchor bergerak. */
  kind: "scene" | "anchor";
  requested: Placement;
  box: { w: number; h: number };
  m: Metrics;
  meta: SceneMeta;
  localT: number;
  /** Kandidat dari layout.candidatesForPlacement (sudah memuat bias tipe). */
  baseCandidates: PlacementCandidate[];
  occupied: RectPx[];
}

/**
 * Solver penempatan berkelanjutan per caption:
 *  - mode "scene": menyimpan pusat CC dalam ruang adegan dan memproyeksikannya
 *    setiap frame (tracking kamera eksak, tanpa lag).
 *  - mode "anchor": mengikuti anchor bergerak lewat kandidat layout.
 *  - "held": anchor hilang / cooldown -> pertahankan posisi terakhir.
 *  - "recovered": re-anchor karena komposisi berubah -> transisi halus.
 * Semua hasil di-clamp ke safe area dan dibatasi kecepatan maksimum agar
 * tidak ada lompatan tiba-tiba maupun keluar frame.
 */
export class CaptionTracker {
  private states = new Map<string, TrackState>();

  reset(): void {
    this.states.clear();
  }

  size(): number {
    return this.states.size;
  }

  /** Buang state caption yang sudah lama tidak dirender. */
  prune(localT: number): void {
    for (const [key, st] of this.states) {
      if (localT - st.lastLocalT > 5) this.states.delete(key);
    }
  }

  solve(args: SolveArgs): TrackDecision {
    const { capId, kind, box, m, meta, localT } = args;
    let st = this.states.get(capId);
    if (!st || localT - st.lastLocalT > STALE_SECONDS) {
      st = {
        sceneCenter: null,
        drawn: null,
        placement: null,
        lastLocalT: localT,
        transitionFrom: null,
        transitionStart: -1,
        lastReanchor: -10,
      };
    }
    const cam = meta.camera;
    const dt = Math.max(0.001, Math.min(0.25, localT - st.lastLocalT));
    let target: RectPx | null = null;
    let mode: TrackMode = kind === "scene" ? "scene" : "anchor";
    let tracked = false;

    // 1) Lanjutkan ikatan adegan yang sudah ada (tracking kamera eksak).
    if (kind === "scene" && st.sceneCenter) {
      const p = cameraToScreen(st.sceneCenter.x * m.w, st.sceneCenter.y * m.h, cam, m.w, m.h);
      const rect = clampToSafe(centerRect(p.x, p.y, box), m);
      const pull = Math.hypot(rect.x + rect.w / 2 - p.x, rect.y + rect.h / 2 - p.y);
      if (pull <= PULL_LIMIT_H * m.h) {
        const conf = conflictInfo(rect, meta.regions, m);
        if (conf.faceFrac <= FACE_OVERLAP_LIMIT && conf.subjectFrac <= SUBJECT_OVERLAP_LIMIT) {
          target = rect;
          mode = "scene";
          tracked = true;
        }
      }
    }

    // 2) Pecahkan penempatan baru bila perlu (awal, invalid, atau anchor).
    if (!target) {
      const extra = kind === "scene" ? negativeSpaceCandidates(meta, box, m) : [];
      const withBias = args.baseCandidates.concat(extra).map((c) => {
        const conf = conflictInfo(c.rect, meta.regions, m);
        let preference = c.preference + conf.score * 0.15 + conf.faceFrac * 6;
        if (st!.placement) preference += c.placement === st!.placement ? -0.05 : 0.25;
        return { ...c, preference };
      });
      const solved = solvePlacement(withBias, args.occupied, meta.regions, m);
      const heldConf = st.drawn ? conflictInfo(st.drawn, meta.regions, m) : null;
      const mustMove =
        !!heldConf &&
        (heldConf.faceFrac > FACE_OVERLAP_LIMIT || heldConf.subjectFrac > SUBJECT_OVERLAP_LIMIT);
      const cooldownOk = localT - st.lastReanchor >= REANCHOR_COOLDOWN;
      const sameZone = !!solved && st.placement !== null && solved.placement === st.placement;
      if (solved && (!st.drawn || cooldownOk || mustMove || sameZone)) {
        target = solved.rect;
        if (kind === "scene") {
          const c = cameraScreenToScene(target.x + target.w / 2, target.y + target.h / 2, cam, m.w, m.h);
          st.sceneCenter = { x: c.x / m.w, y: c.y / m.h };
        }
        mode = st.drawn ? (kind === "scene" ? "recovered" : "anchor") : "solved";
        if (st.drawn && !sameZone) st.lastReanchor = localT;
        st.placement = solved.placement;
      } else if (st.drawn && !mustMove) {
        // Cooldown re-anchor dan posisi lama masih layak: pertahankan.
        target = st.drawn;
        mode = "held";
      } else if (st.drawn && solved) {
        // Posisi lama tidak layak: paksa re-anchor meski cooldown berjalan.
        target = solved.rect;
        if (kind === "scene") {
          const c = cameraScreenToScene(target.x + target.w / 2, target.y + target.h / 2, cam, m.w, m.h);
          st.sceneCenter = { x: c.x / m.w, y: c.y / m.h };
        }
        mode = kind === "scene" ? "recovered" : "anchor";
        st.lastReanchor = localT;
        st.placement = solved.placement;
      } else {
        // Tidak ada kandidat sama sekali: fallback aman bawah-tengah.
        target = clampToSafe(centerRect(m.w / 2, m.h * 0.82, box), m);
        mode = st.drawn ? "recovered" : "solved";
        if (kind === "scene") {
          const c = cameraScreenToScene(target.x + target.w / 2, target.y + target.h / 2, cam, m.w, m.h);
          st.sceneCenter = { x: c.x / m.w, y: c.y / m.h };
        }
        if (st.drawn) st.lastReanchor = localT;
      }
    }

    // 3) Perhalus perpindahan: transisi terinterpolasi + batas kecepatan.
    const targetCenter = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
    let center = targetCenter;
    if (st.drawn) {
      const prevCenter = { x: st.drawn.x + st.drawn.w / 2, y: st.drawn.y + st.drawn.h / 2 };
      const jump = Math.hypot(targetCenter.x - prevCenter.x, targetCenter.y - prevCenter.y);
      if (mode === "recovered" && jump > 12 * m.unit) {
        if (st.transitionFrom === null || localT - st.transitionStart > TRANSITION_SECONDS + 0.5) {
          st.transitionFrom = prevCenter;
          st.transitionStart = localT;
        }
      }
      if (st.transitionFrom !== null) {
        const prog = (localT - st.transitionStart) / TRANSITION_SECONDS;
        if (prog < 1) {
          const e = easeOutCubic(prog);
          center = {
            x: st.transitionFrom.x + (targetCenter.x - st.transitionFrom.x) * e,
            y: st.transitionFrom.y + (targetCenter.y - st.transitionFrom.y) * e,
          };
        } else {
          st.transitionFrom = null;
        }
      }
      const maxStep = MAX_SPEED_H_PER_S * m.h * dt;
      const step = Math.hypot(center.x - prevCenter.x, center.y - prevCenter.y);
      if (step > maxStep) {
        const k = maxStep / step;
        center = {
          x: prevCenter.x + (center.x - prevCenter.x) * k,
          y: prevCenter.y + (center.y - prevCenter.y) * k,
        };
      }
    }
    const rect = clampToSafe(centerRect(center.x, center.y, box), m);
    st.drawn = rect;
    st.lastLocalT = localT;
    this.states.set(capId, st);
    return { rect, placement: st.placement ?? args.requested, mode, tracked };
  }
}
