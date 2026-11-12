/**
 * Pengujian Camera-Aware Tracking & Intelligent Placement (tsx + @napi-rs/canvas).
 * Mencakup 9 kondisi footage yang diminta + asersi otomatis collision,
 * stabilitas tracking, safe margin, dan konsistensi transformasi.
 * Exit 1 bila ada asersi gagal.
 */
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  Metrics,
  PlacementCandidate,
  RectPx,
  candidatesForPlacement,
  clampToSafe,
  metricsFor,
  overlapArea,
  rectFromNormalized,
} from "./layout";
import {
  buildSpaceGrid,
  cameraScreenToScene,
  cameraToScreen,
  CaptionTracker,
  negativeSpaceCandidates,
  zoomFontScale,
} from "./tracking";
import { AnchorBox, ImportantRegion, Placement, SceneMeta } from "./adaptive-types";
import { createCaptionEngine } from "./engine";
import { distributeWordTimings } from "./sync";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    passed++;
    console.log("PASS " + name);
  } else {
    failed++;
    console.error("FAIL " + name + (detail ? " -> " + detail : ""));
  }
}

function registerTestFont(): string {
  const roots = [
    process.env.NAZE_REPO_ROOT,
    path.resolve(process.cwd(), ".."),
    process.cwd(),
    path.resolve(process.cwd(), "../.."),
  ].filter((p): p is string => typeof p === "string" && p.length > 0);
  const rels = [
    "FONTS/GOOGLE/SANS/plusjakartasans.ttf",
    "FONTS/GOOGLE/DISPLAY/archivoblack.ttf",
    "FONTS/GOOGLE/TECHNO/orbitron.ttf",
  ];
  for (const root of roots) {
    for (const rel of rels) {
      const abs = path.resolve(root, rel);
      if (!fs.existsSync(abs)) continue;
      try {
        if (GlobalFonts.registerFromPath(abs, "NazeTestSans")) return "NazeTestSans";
      } catch {
        /* lanjut ke kandidat berikutnya */
      }
    }
  }
  return "sans-serif";
}

const TEST_FONT = registerTestFont();
const palette: any = {
  id: "test-warm",
  name: "Test Warm",
  background: "#161210",
  primary: "#F2E9DC",
  secondary: "#E63B2E",
  accent: "#F5C518",
  text: "#F7F4EF",
  dark: true,
};
const style: any = { id: "test-style", typography: { fontFamily: TEST_FONT }, motion: { system: "editorial-kinetic" } };

const subj = (x: number, y: number, w = 0.3, h = 0.3): ImportantRegion => ({ id: "subj", x, y, w, h, kind: "subject", weight: 3 });
const faceR = (x: number, y: number, w = 0.3, h = 0.12): ImportantRegion => ({ id: "face", x, y, w, h, kind: "face", weight: 10 });
const gfx = (x: number, y: number, w: number, h: number): ImportantRegion => ({ id: "gfx", x, y, w, h, kind: "graphic", weight: 1.2 });

function makeMeta(camera: SceneMeta["camera"], regions: ImportantRegion[], localT = 0): SceneMeta {
  return { sceneId: "s1", duration: 6, localT, anchors: [], regions, camera, narration: "" };
}
function centerOf(r: RectPx): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
function lerpCam(a: SceneMeta["camera"], b: SceneMeta["camera"], k: number): SceneMeta["camera"] {
  return {
    zoom: a.zoom + (b.zoom - a.zoom) * k,
    panX: a.panX + (b.panX - a.panX) * k,
    panY: a.panY + (b.panY - a.panY) * k,
    rotateDeg: a.rotateDeg + (b.rotateDeg - a.rotateDeg) * k,
  };
}
function framePixels(ctx: any, w: number, h: number): Uint8ClampedArray {
  return ctx.getImageData(0, 0, w, h).data;
}
function countChanged(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < a.length; i += 40) if (Math.abs(a[i] - b[i]) > 8) n++;
  return n;
}

async function run(): Promise<void> {
  const m: Metrics = metricsFor(1080, 1920);
  const inSafe = (r: RectPx) =>
    r.x >= m.safe.left * m.w - 1 &&
    r.x + r.w <= m.w - m.safe.right * m.w + 1 &&
    r.y >= m.safe.top * m.h - 1 &&
    r.y + r.h <= m.h - m.safe.bottom * m.h + 1;

  // ---- Konsistensi transformasi koordinat ----
  {
    const cams = [
      { zoom: 1, panX: 0, panY: 0, rotateDeg: 0 },
      { zoom: 1.4, panX: 0.2, panY: -0.15, rotateDeg: 5 },
      { zoom: 0.8, panX: -0.3, panY: 0.25, rotateDeg: -8 },
    ];
    const pts = [[540, 960], [216, 576], [864, 1344]];
    let ok = true;
    for (const cam of cams) {
      for (const [px, py] of pts) {
        const s = cameraToScreen(px, py, cam, 1080, 1920);
        const back = cameraScreenToScene(s.x, s.y, cam, 1080, 1920);
        if (Math.abs(back.x - px) > 1e-6 || Math.abs(back.y - py) > 1e-6) ok = false;
      }
    }
    check("transform kamera round-trip (pan/tilt/zoom/rotasi/diagonal)", ok);
  }
  check("skala font zoom terbatas 0.85..1.18", zoomFontScale(1) === 1 && zoomFontScale(1.5) > 1 && zoomFontScale(1.5) <= 1.18 && zoomFontScale(0.7) >= 0.85 && zoomFontScale(0.7) < 1);
  {
    const g = buildSpaceGrid(makeMeta({ zoom: 1, panX: 0, panY: 0, rotateDeg: 0 }, [subj(0, 0, 0.5, 0.5)]), m);
    check("grid okupansi menandai sel subjek", g.blocked[0] === 3 && g.blocked.filter((b) => b >= 3).length === 60, String(g.blocked.filter((b) => b >= 3).length));
  }

  // ---- Kondisi 1: kamera diam, subjek di tengah ----
  {
    const t = new CaptionTracker();
    const meta = makeMeta({ zoom: 1, panX: 0, panY: 0, rotateDeg: 0 }, [subj(0.35, 0.3), faceR(0.35, 0.3)]);
    const cands: PlacementCandidate[] = candidatesForPlacement("auto", { w: 500, h: 140 }, m, null, {});
    const d = t.solve({ capId: "c1", kind: "scene", requested: "auto", box: { w: 500, h: 140 }, m, meta, localT: 0, baseCandidates: cands, occupied: [] });
    const ov = overlapArea(d.rect, rectFromNormalized(subj(0.35, 0.3), m));
    check("statis: CC tidak menutupi subjek", ov < d.rect.w * d.rect.h * 0.05, "ov=" + ov);
    check("statis: CC dalam safe area", inSafe(d.rect), JSON.stringify(d.rect));
  }

  // ---- Kondisi 2: kamera bergerak horizontal ----
  {
    const t = new CaptionTracker();
    const camA = { zoom: 1, panX: 0, panY: 0, rotateDeg: 0 };
    const camB = { zoom: 1, panX: 0.15, panY: 0, rotateDeg: 0 };
    let first: any = null;
    let last: any = null;
    let tracked = false;
    for (let i = 0; i <= 12; i++) {
      const d = t.solve({ capId: "c2", kind: "scene", requested: "bottom", box: { w: 500, h: 140 }, m, meta: makeMeta(lerpCam(camA, camB, i / 12), []), localT: i / 60, baseCandidates: [], occupied: [] });
      if (i === 0) first = centerOf(d.rect);
      last = centerOf(d.rect);
      tracked = tracked || d.tracked;
    }
    const shift = last.x - first.x;
    check("pan horizontal: CC mengikuti adegan", tracked && shift > 120 && shift < 200, "shift=" + shift.toFixed(1) + " tracked=" + tracked);
  }

  // ---- Kondisi 3: kamera bergerak vertikal ----
  {
    const t = new CaptionTracker();
    const regions = [gfx(0, 0, 1, 0.4), gfx(0, 0.6, 1, 0.4)];
    const camA = { zoom: 1, panX: 0, panY: 0, rotateDeg: 0 };
    const camB = { zoom: 1, panX: 0, panY: 0.1, rotateDeg: 0 };
    let first: any = null;
    let last: any = null;
    let tracked = false;
    for (let i = 0; i <= 12; i++) {
      const d = t.solve({ capId: "c3", kind: "scene", requested: "top", box: { w: 300, h: 120 }, m, meta: makeMeta(lerpCam(camA, camB, i / 12), regions), localT: i / 60, baseCandidates: [], occupied: [] });
      if (i === 0) first = centerOf(d.rect);
      last = centerOf(d.rect);
      tracked = tracked || d.tracked;
    }
    const shift = last.y - first.y;
    check("tilt vertikal: CC mengikuti adegan", tracked && shift > 150 && shift < 230, "shift=" + shift.toFixed(1) + " tracked=" + tracked);
  }

  // ---- Kondisi 4: kamera zoom ----
  {
    const t = new CaptionTracker();
    const regions = [gfx(0, 0, 1, 0.4), gfx(0, 0.6, 1, 0.4), gfx(0, 0.4, 0.3, 0.2), gfx(0.7, 0.4, 0.3, 0.2)];
    const camA = { zoom: 1, panX: 0, panY: 0, rotateDeg: 0 };
    const camB = { zoom: 1.3, panX: 0, panY: 0, rotateDeg: 0 };
    let first: any = null;
    let last: any = null;
    let tracked = false;
    for (let i = 0; i <= 12; i++) {
      const d = t.solve({ capId: "c4", kind: "scene", requested: "center", box: { w: 300, h: 120 }, m, meta: makeMeta(lerpCam(camA, camB, i / 12), regions), localT: i / 60, baseCandidates: [], occupied: [] });
      if (i === 0) first = centerOf(d.rect);
      last = centerOf(d.rect);
      tracked = tracked || d.tracked;
    }
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    check("zoom: CC menjauh dari pusat secara proporsional", tracked && dx < -5 && dx > -20 && dy < -15 && dy > -40, "dx=" + dx.toFixed(1) + " dy=" + dy.toFixed(1));
  }

  // ---- Kondisi 5: kamera mengikuti seseorang (diagonal) ----
  {
    const t = new CaptionTracker();
    const regions = [gfx(0, 0, 1, 0.4), gfx(0, 0.6, 1, 0.4), gfx(0, 0.4, 0.3, 0.2), gfx(0.7, 0.4, 0.3, 0.2)];
    const camA = { zoom: 1, panX: 0, panY: 0, rotateDeg: 0 };
    const camB = { zoom: 1, panX: 0.1, panY: 0.08, rotateDeg: 0 };
    let first: any = null;
    let last: any = null;
    for (let i = 0; i <= 12; i++) {
      const d = t.solve({ capId: "c5", kind: "scene", requested: "center", box: { w: 300, h: 120 }, m, meta: makeMeta(lerpCam(camA, camB, i / 12), regions), localT: i / 60, baseCandidates: [], occupied: [] });
      if (i === 0) first = centerOf(d.rect);
      last = centerOf(d.rect);
    }
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    check("gerak diagonal: CC mengikuti dua sumbu", dx > 80 && dx < 140 && dy > 120 && dy < 190, "dx=" + dx.toFixed(1) + " dy=" + dy.toFixed(1));
  }

  // ---- Kondisi 6: subjek berpindah kiri -> kanan ----
  {
    const t = new CaptionTracker();
    let cx = 0.15;
    const xs: number[] = [];
    const faceOvs: number[] = [];
    for (let i = 0; i < 9; i++) {
      const anchor: AnchorBox = { id: "subject:0", x: cx, y: 0.3, w: 0.25, h: 0.3, kind: "character", faceFraction: 0.38 };
      const meta = makeMeta({ zoom: 1, panX: 0, panY: 0, rotateDeg: 0 }, [subj(cx, 0.3, 0.25, 0.3), faceR(cx, 0.3, 0.25, 0.114)]);
      meta.anchors = [anchor];
      const cands: PlacementCandidate[] = candidatesForPlacement("above-anchor", { w: 300, h: 120 }, m, anchor, { "above-anchor": 0, "below-anchor": 0.9 });
      const d = t.solve({ capId: "c6", kind: "anchor", requested: "above-anchor", box: { w: 300, h: 120 }, m, meta, localT: i * 0.5, baseCandidates: cands, occupied: [] });
      xs.push(centerOf(d.rect).x);
      faceOvs.push(overlapArea(d.rect, rectFromNormalized(faceR(cx, 0.3, 0.25, 0.114), m)) / 36000);
      cx += 0.06;
    }
    check("subjek bergerak: CC mengikuti anchor", xs[8] > xs[0] + 150, JSON.stringify(xs.map((v) => Math.round(v))));
    check("subjek bergerak: wajah tidak tertutup", Math.max(...faceOvs) < 0.02, "max=" + Math.max(...faceOvs).toFixed(3));
  }

  // ---- Kondisi 7: footage banyak objek (preferensi sisi berlawanan) ----
  {
    const t1 = new CaptionTracker();
    const dL = t1.solve({ capId: "c7a", kind: "scene", requested: "auto", box: { w: 500, h: 140 }, m, meta: makeMeta({ zoom: 1, panX: 0, panY: 0, rotateDeg: 0 }, [subj(0.05, 0.35), gfx(0.4, 0.05, 0.2, 0.2)]), localT: 0, baseCandidates: [], occupied: [] });
    check("banyak objek: subjek kiri -> CC kanan", centerOf(dL.rect).x > 540, "x=" + centerOf(dL.rect).x.toFixed(0));
    const t2 = new CaptionTracker();
    const dR = t2.solve({ capId: "c7b", kind: "scene", requested: "auto", box: { w: 500, h: 140 }, m, meta: makeMeta({ zoom: 1, panX: 0, panY: 0, rotateDeg: 0 }, [subj(0.65, 0.35), gfx(0.4, 0.05, 0.2, 0.2)]), localT: 0, baseCandidates: [], occupied: [] });
    check("banyak objek: subjek kanan -> CC kiri", centerOf(dR.rect).x < 540, "x=" + centerOf(dR.rect).x.toFixed(0));
  }

  // ---- Kondisi 8: hampir tidak ada ruang kosong ----
  {
    const t = new CaptionTracker();
    const d = t.solve({ capId: "c8", kind: "scene", requested: "auto", box: { w: 500, h: 140 }, m, meta: makeMeta({ zoom: 1, panX: 0, panY: 0, rotateDeg: 0 }, [subj(0, 0, 1, 0.5), subj(0, 0.5, 1, 0.5)]), localT: 0, baseCandidates: [], occupied: [] });
    check("footage penuh: fallback tetap dalam safe area", !!d.rect && inSafe(d.rect), JSON.stringify(d.rect));
  }

  // ---- Kondisi 9: tracking kehilangan anchor sementara ----
  {
    const t = new CaptionTracker();
    const mk = (ax: number | null, lt: number) => {
      const meta = makeMeta({ zoom: 1, panX: 0, panY: 0, rotateDeg: 0 }, ax === null ? [] : [subj(ax, 0.3, 0.25, 0.3), faceR(ax, 0.3, 0.25, 0.114)]);
      if (ax !== null) meta.anchors = [{ id: "subject:0", x: ax, y: 0.3, w: 0.25, h: 0.3, kind: "character", faceFraction: 0.38 }];
      const anchor = ax === null ? null : meta.anchors[0];
      const cands: PlacementCandidate[] = candidatesForPlacement("above-anchor", { w: 300, h: 120 }, m, anchor, { "above-anchor": 0, "below-anchor": 0.9 });
      return t.solve({ capId: "c9", kind: "anchor", requested: "above-anchor", box: { w: 300, h: 120 }, m, meta, localT: lt, baseCandidates: cands, occupied: [] });
    };
    let prev = centerOf(mk(0.2, 0).rect);
    let maxStep = 0;
    let lt = 1 / 30;
    for (let i = 0; i < 60; i++) {
      const ax = i < 6 ? 0.2 : null;
      const d = mk(ax, lt);
      const c = centerOf(d.rect);
      maxStep = Math.max(maxStep, Math.hypot(c.x - prev.x, c.y - prev.y));
      prev = c;
      lt += 1 / 30;
    }
    check("anchor hilang: tanpa lompatan", maxStep <= 2.5 * m.h / 30 + 1, "max=" + maxStep.toFixed(1));
    check("anchor hilang: pulih ke posisi valid", prev.y > 1200 && prev.y < 1700, JSON.stringify(prev));
  }

  // ---- Stabilitas tracking (tanpa jitter) ----
  {
    const t = new CaptionTracker();
    const regions = [gfx(0, 0, 1, 0.4), gfx(0, 0.6, 1, 0.4), gfx(0, 0.4, 0.3, 0.2), gfx(0.7, 0.4, 0.3, 0.2)];
    let prev = centerOf(t.solve({ capId: "c10", kind: "scene", requested: "center", box: { w: 300, h: 120 }, m, meta: makeMeta({ zoom: 1, panX: 0, panY: 0, rotateDeg: 0 }, regions), localT: 0, baseCandidates: [], occupied: [] }).rect);
    let maxMove = 0;
    for (let i = 1; i < 40; i++) {
      const d = t.solve({ capId: "c10", kind: "scene", requested: "center", box: { w: 300, h: 120 }, m, meta: makeMeta({ zoom: 1, panX: 0, panY: 0, rotateDeg: 0 }, regions), localT: i / 60, baseCandidates: [], occupied: [] });
      const c = centerOf(d.rect);
      maxMove = Math.max(maxMove, Math.hypot(c.x - prev.x, c.y - prev.y));
      prev = c;
    }
    check("stabilitas: tanpa jitter saat statis", maxMove < 1, "max=" + maxMove.toFixed(3));
  }

  // ---- Re-anchor halus saat ruang kosong berpindah ----
  {
    const t = new CaptionTracker();
    const regions0 = [gfx(0, 0, 1, 0.4), gfx(0, 0.6, 1, 0.4), gfx(0, 0.4, 0.3, 0.2), gfx(0.7, 0.4, 0.3, 0.2)];
    const auto: PlacementCandidate[] = candidatesForPlacement("auto", { w: 300, h: 120 }, m, null, {});
    const d0 = t.solve({ capId: "c11", kind: "scene", requested: "center", box: { w: 300, h: 120 }, m, meta: makeMeta({ zoom: 1, panX: 0, panY: 0, rotateDeg: 0 }, regions0), localT: 0, baseCandidates: auto, occupied: [] });
    const regions1 = regions0.concat([subj(0.28, 0.42, 0.25, 0.2)]);
    let prev = centerOf(d0.rect);
    let maxStep = 0;
    let final = prev;
    for (let i = 1; i <= 60; i++) {
      const d = t.solve({ capId: "c11", kind: "scene", requested: "center", box: { w: 300, h: 120 }, m, meta: makeMeta({ zoom: 1, panX: 0, panY: 0, rotateDeg: 0 }, regions1), localT: i / 60, baseCandidates: auto, occupied: [] });
      const c = centerOf(d.rect);
      maxStep = Math.max(maxStep, Math.hypot(c.x - prev.x, c.y - prev.y));
      prev = c;
      final = c;
    }
    check("re-anchor: transisi tanpa lompatan", maxStep <= 2.5 * m.h / 60 + 1, "max=" + maxStep.toFixed(1));
    const subjectCenter = { x: (0.28 + 0.25 / 2) * m.w, y: (0.42 + 0.2 / 2) * m.h };
    const captionCenter = centerOf({ x: final.x - 150, y: final.y - 60, w: 300, h: 120 });
    const separation = Math.hypot(captionCenter.x - subjectCenter.x, captionCenter.y - subjectCenter.y);
    check("re-anchor: menjauh dari subjek baru", separation > 0.15 * m.h, JSON.stringify({ subjectCenter, captionCenter, separation: Math.round(separation) }));
    const ovFrac = overlapArea({ x: final.x - 150, y: final.y - 60, w: 300, h: 120 }, rectFromNormalized(subj(0.28, 0.42, 0.25, 0.2), m)) / 36000;
    check("re-anchor: tidak menutupi subjek baru", ovFrac < 0.05, "frac=" + ovFrac.toFixed(3));
  }

  // ---- Kandidat ruang kosong selalu aman ----
  {
    const meta = makeMeta({ zoom: 1, panX: 0, panY: 0, rotateDeg: 0 }, [subj(0.35, 0.3), gfx(0, 0, 1, 0.15)]);
    const cands = negativeSpaceCandidates(meta, { w: 500, h: 140 }, m);
    check("kandidat ruang kosong dalam safe area", cands.length > 0 && cands.every((c) => inSafe(c.rect)), "n=" + cands.length);
  }

  // ---- Engine end-to-end dengan kamera bergerak ----
  {
    const scene: any = {
      id: "s-track",
      title: "TES TRACKING KAMERA",
      subjects: [{ kind: "character", mood: "happy" }],
      layers: [
        { id: "n1", kind: "null", box: [0.1, 0.3, 0.8, 0.3], z: 1, enter: { type: "none" } },
        { id: "sub1", kind: "subject", subjectIndex: 0, box: [0.15, 0.32, 0.34, 0.26], z: 1.1, parent: "n1", enter: { type: "none" } },
      ],
      camera: {
        shots: [
          { at: 0, zoom: 1.1, panX: 0 },
          { at: 1.2, zoom: 1.15, panX: 0.18, panY: 0.05, ease: "easeInOutSine" },
          { at: 2.4, zoom: 1.2, panX: 0.1, panY: -0.04, ease: "easeInOutSine" },
        ],
      },
    };
    const cueText = "Kamera bergeser dan caption tetap menempel pada area adegan yang dilacak.";
    const t: any = {
      scene,
      start: 0,
      end: 3,
      duration: 3,
      cues: [{ sceneId: "s-track", index: 0, text: cueText, start: 0.3, end: 2.6, words: distributeWordTimings(cueText, 0.3, 2.6) }],
    };
    const timeline: any = { scenes: [t], cues: t.cues, sfx: [], duration: 3, frameCount: 180, fps: 60 };
    const engine = createCaptionEngine({ palette, style, fontFamily: TEST_FONT, config: { mode: "adaptive" } });
    check("engine adaptif dengan smartPlacement default", engine !== null);
    if (engine) {
      engine.loadTimeline(timeline, [scene]);
      const c = createCanvas(540, 960);
      const cc: any = c.getContext("2d");
      const kit: any = { w: 540, h: 960, scale: 0.5, animationIntensity: 1, style };
      let ok = true;
      let detail = "";
      for (let i = 7; i <= 156; i++) {
        cc.fillStyle = "#161210";
        cc.fillRect(0, 0, 540, 960);
        try {
          engine.render(cc, t, kit, i / 60);
        } catch (e: any) {
          ok = false;
          detail = "t=" + (i / 60).toFixed(3) + ": " + String(e && e.message);
          break;
        }
      }
      check("engine.render 150 frame kamera bergerak", ok, detail);
      cc.fillStyle = "#161210";
      cc.fillRect(0, 0, 540, 960);
      const before = framePixels(cc, 540, 960);
      engine.render(cc, t, kit, 1.0);
      check("CC tergambar pada scene kamera", countChanged(before, framePixels(cc, 540, 960)) > 3, "piksel=" + countChanged(before, framePixels(cc, 540, 960)));
      const legacy = createCaptionEngine({ palette, style, fontFamily: TEST_FONT, config: { mode: "adaptive", smartPlacement: false } });
      check("smartPlacement false -> engine tetap dibuat", legacy !== null);
      if (legacy) {
        legacy.loadTimeline(timeline, [scene]);
        let legacyOk = true;
        let legacyDetail = "";
        try {
          for (const time of [0.5, 1.0, 2.0]) {
            cc.fillStyle = "#161210";
            cc.fillRect(0, 0, 540, 960);
            legacy.render(cc, t, kit, time);
          }
        } catch (e: any) {
          legacyOk = false;
          legacyDetail = String(e && e.message);
        }
        check("jalur lama (legacy) tetap bekerja", legacyOk, legacyDetail);
      }
    }
  }

  console.log("");
  console.log("Total: " + passed + " lulus, " + failed + " gagal dari " + (passed + failed) + " asersi.");
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error("Kesalahan pengujian:", e);
  process.exit(1);
});
