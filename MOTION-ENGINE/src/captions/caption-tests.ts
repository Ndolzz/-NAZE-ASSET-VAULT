/**
 * Pengujian mandiri Adaptive Caption Engine (tsx + @napi-rs/canvas).
 * Tanpa ffmpeg/espeak: semua asersi berbasis modul caption murni.
 * Exit 1 bila ada asersi gagal.
 */
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import * as fs from "node:fs";
import * as path from "node:path";
import { CAPTION_ANIM_PRESETS, captionAnimState, isCaptionAnimPreset } from "./anim";
import {
  Metrics,
  PlacementCandidate,
  RectPx,
  candidatesForPlacement,
  clampToSafe,
  metricsFor,
  measureBlock,
  overlapArea,
  rectFromNormalized,
  solvePlacement,
  wrapTextToWidth,
} from "./layout";
import { buildSceneMeta, resolveAnchor } from "./anchors";
import { decideCueStyle } from "./adapt";
import { resolveCaptionTheme } from "./theme";
import { distributeWordTimings, distributeSentenceTimings, activeWordIndex, readingFloorSeconds, splitSentences, wordRevealProgress } from "./sync";
import { validateCues, buildCuesFromDurations, toSrt, toVtt, CaptionCue } from "./segmenter";
import { parseSrt, parseVtt, linesToCues } from "./parser";
import { validateAgainstPolicy } from "../core/policy";
import { drawCaption, estimateCaptionBox } from "./draw";
import { createCaptionEngine } from "./engine";
import { AdaptiveCaptionsConfig, AnchorRef, CaptionType, ImportantRegion, SceneCaptionDirective } from "./adaptive-types";

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

/**
 * Runner CI tidak memiliki glyph sistem yang dapat dirasterisasi skia untuk
 * keluarga generik "sans-serif": measureText mengembalikan metrik, tetapi
 * fillText tidak menggambar apa pun. Produksi mendaftarkan font vault lewat
 * registerFonts() (render/renderer.ts); pengujian ini wajib melakukan hal
 * yang sama sebelum menggambar teks.
 */
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
        if (GlobalFonts.registerFromPath(abs, "NazeTestSans")) {
          console.log("Font pengujian terdaftar: " + abs);
          return "NazeTestSans";
        }
      } catch {
        /* lanjut ke kandidat berikutnya */
      }
    }
  }
  console.warn("Tidak ada font vault yang terdaftar; memakai fallback generik.");
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
const style: any = { id: "test-style", typography: { fontFamily: TEST_FONT } };
const theme = (id: string) => resolveCaptionTheme({ themeId: id, palette, style, fontFamily: TEST_FONT });

function makeCap(over: Record<string, unknown>): any {
  return {
    id: "cap",
    sceneId: "s1",
    text: "Caption uji engine.",
    type: "subtitle",
    placement: "bottom",
    animation: "fade-up",
    theme: theme("minimal-dark"),
    emphasis: [],
    at: 0,
    duration: 2,
    intensity: 1,
    cueBound: false,
    maxLines: 2,
    ...over,
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
  // ---- Font pengujian: glyph harus benar-benar tergambar di kanvas ----
  {
    const probeCanvas = createCanvas(160, 120);
    const probeCtx = probeCanvas.getContext("2d");
    probeCtx.fillStyle = "#000000";
    probeCtx.fillRect(0, 0, 160, 120);
    probeCtx.fillStyle = "#FFFFFF";
    probeCtx.font = "800 64px " + TEST_FONT;
    probeCtx.textBaseline = "middle";
    probeCtx.fillText("XA", 12, 60);
    const probeData = probeCtx.getImageData(0, 0, 160, 120).data;
    let litPixels = 0;
    for (let i = 0; i < probeData.length; i += 4) if (probeData[i] > 100) litPixels++;
    check("font pengujian menggambar glyph", litPixels > 30, "font=" + TEST_FONT + " lit=" + litPixels);
  }

  const canvas = createCanvas(1080, 1920);
  const ctx = canvas.getContext("2d");
  const m: Metrics = metricsFor(1080, 1920);

  // ---- Text wrapping & bubble sizing ----
  ctx.font = "600 54px " + TEST_FONT;
  const longText = "Kalimat uji yang cukup panjang untuk memaksa pembungkusan teks caption menjadi beberapa baris pada lebar terbatas.";
  const lines = wrapTextToWidth(ctx, longText, 800, 2);
  check("wrapping max 2 baris", lines.length <= 2, "baris=" + lines.length);
  const block = measureBlock(ctx, "Teks pendek", { maxWidth: 800, maxLines: 2, lineHeightFactor: 1.3 });
  check("measureBlock > 0", block.blockW > 0 && block.blockH > 0, JSON.stringify(block));
  const estBubble = estimateCaptionBox(ctx, m, makeCap({ type: "speech-bubble", text: "Halo, apa kabar?" }));
  check("estimasi bubble > 0", estBubble.w > 0 && estBubble.h > 0, JSON.stringify(estBubble));
  const estChat = estimateCaptionBox(ctx, m, makeCap({ type: "chat", messages: [{ sender: "A", text: "Halo" }, { sender: "B", text: "Hai" }] }));
  check("estimasi chat proporsional", estChat.h > estBubble.h * 0.5, JSON.stringify(estChat));

  // ---- Responsif 3 resolusi + safe area ----
  const mV = metricsFor(1080, 1920);
  const mH = metricsFor(1920, 1080);
  const mS = metricsFor(1080, 1080);
  check("unit vertikal", Math.abs(mV.unit - 1) < 0.01, "unit=" + mV.unit);
  check("format landscape", (mH as any).format === "16x9", JSON.stringify((mH as any).format));
  check("format persegi", (mS as any).format === "1x1", JSON.stringify((mS as any).format));
  check("safe area bawah TikTok/Reels", mV.safe.bottom >= 0.11, "bottom=" + mV.safe.bottom);
  const clamped = clampToSafe({ x: -50, y: mV.h - 20, w: 900, h: 200 }, mV);
  check("clampToSafe menjaga tepi", clamped.x >= 0 && clamped.y + clamped.h <= mV.h * (1 - 0.10) + 2, JSON.stringify(clamped));

  // ---- Collision detection & solver ----
  const anchor = { id: "a", x: 0.1, y: 0.30, w: 0.3, h: 0.3, kind: "character" as const, faceFraction: 0.38 };
  const box = { w: 700, h: 130 };
  const cands: PlacementCandidate[] = candidatesForPlacement("above-anchor", box, m, anchor, {});
  check("kandidat above-anchor + alternatif", cands.length >= 2, "n=" + cands.length);
  // Wilayah wajah diletakkan tepat pada kandidat above-anchor (indeks pertama):
  // solver wajib memilih kandidat lain (below/side) yang bebas konflik.
  const aboveRect = cands[0].rect;
  const face: ImportantRegion = {
    id: "face",
    x: aboveRect.x / m.w,
    y: aboveRect.y / m.h,
    w: aboveRect.w / m.w,
    h: aboveRect.h / m.h,
    kind: "face",
    weight: 10,
  };
  const solved = solvePlacement(cands, [], [face], m);
  check("solver mengembalikan penempatan", !!solved, "null");
  if (solved) {
    const facePx = rectFromNormalized(face, m);
    const ov = overlapArea(solved.rect, facePx);
    check("tidak menutupi wajah", ov < solved.rect.w * solved.rect.h * 0.3, "overlap=" + ov);
    check("memilih alternatif otomatis", (solved as any).placement !== "above-anchor", "placement=" + (solved as any).placement);
    const alt = solvePlacement(candidatesForPlacement("bottom", box, m, anchor, {}), [solved.rect], [], m);
    check("alternatif posisi lain tersedia", !!alt, "null");
    if (alt) {
      check("anti-tumpukan antar caption", overlapArea(solved.rect, alt.rect) < solved.rect.w * solved.rect.h * 0.25, "ov=" + overlapArea(solved.rect, alt.rect));
    }
  }
  const noRegion = solvePlacement(candidatesForPlacement("bottom", box, m, null, {}), [], [], m);
  check("solver jatuh ke bawah bila bebas", !!noRegion && noRegion.rect.y > m.h * 0.7, JSON.stringify(noRegion && noRegion.rect));

  // ---- Anchor jalur klasik & layer ----
  const timing: any = {
    scene: {
      id: "s1",
      title: "TES ANCHOR",
      subjects: [
        { kind: "character", mood: "thinking" },
        { kind: "object", name: "globe" },
      ],
    },
    start: 0,
    end: 5,
    duration: 5,
    cues: [],
  };
  const meta = buildSceneMeta(timing, { w: 1080, h: 1920, scale: 1, animationIntensity: 1, style: { id: "x" } }, 1);
  check("anchor klasik subjek", resolveAnchor({ subject: 0 } as AnchorRef, meta, 1) !== null, "null");
  check("anchor klasik objek", resolveAnchor({ subject: 1 } as AnchorRef, meta, 1) !== null, "null");
  check("region wajah karakter", meta.regions.some((r) => r.kind === "face"), "tidak ada region wajah");
  const layeredScene: any = {
    id: "s2",
    layers: [
      { id: "n1", kind: "null", box: [0.1, 0.3, 0.8, 0.3], z: 1, transform: { y: [{ t: 0, value: 0 }, { t: 3, value: -20 }] }, enter: { type: "none" } },
      { id: "sub1", kind: "subject", subjectIndex: 0, box: [0.12, 0.32, 0.35, 0.26], z: 1.1, enter: { type: "pop", at: 0.3 }, parent: "n1" },
    ],
    subjects: [{ kind: "character", mood: "happy" }],
  };
  const timing2: any = { scene: layeredScene, start: 0, end: 5, duration: 5, cues: [] };
  const meta2 = buildSceneMeta(timing2, { w: 1080, h: 1920, scale: 1, animationIntensity: 1, style: { id: "x", motion: { system: "editorial-kinetic" } } }, 1);
  const layerAnchor = resolveAnchor({ layer: "sub1" } as AnchorRef, meta2, 1);
  check("anchor layer compositor", layerAnchor !== null, "null");

  // ---- 20 preset animasi ----
  check("tepat 20 preset", CAPTION_ANIM_PRESETS.length === 20, "n=" + CAPTION_ANIM_PRESETS.length);
  let presetOk = true;
  for (const p of CAPTION_ANIM_PRESETS) {
    if (!isCaptionAnimPreset(p)) presetOk = false;
    const before = captionAnimState(p, 0.4, { at: 0.5, duration: 2 });
    const mid = captionAnimState(p, 1.5, { at: 0.5, duration: 2 });
    const after = captionAnimState(p, 3.0, { at: 0.5, duration: 2 });
    if (before.alpha > 0.01) presetOk = false;
    if (mid.alpha < 0.9) presetOk = false;
    if (after.alpha > 0.01) presetOk = false;
  }
  check("20 preset: masuk-penuh-keluar", presetOk, "ada preset melanggar fase alpha");

  // ---- Sinkronisasi kata ----
  const words = distributeWordTimings("Kata demi kata tersinkronisasi rapi.", 0.5, 3.2);
  check("timing kata monoton", words.every((w, i) => (i === 0 || w.start >= words[i - 1].start) && w.end > w.start), JSON.stringify(words.map((w) => w.start)));
  check("kata aktif terdeteksi", activeWordIndex(words, 0.55) === 0, "idx=" + activeWordIndex(words, 0.55));
  check("sebelum mulai -> -1", activeWordIndex(words, 0.2) === -1, "idx=" + activeWordIndex(words, 0.2));
  check("akhir -> kata terakhir", activeWordIndex(words, 3.0) === words.length - 1, "idx=" + activeWordIndex(words, 3.0));
  const prog = wordRevealProgress(words, 1.0);
  check("reveal progress valid", prog.every((v) => v >= 0 && v <= 1) && prog.every((v, i) => i === 0 || v <= prog[i - 1]), JSON.stringify(prog));
  check("kalimat terpisah", splitSentences("Satu. Dua! Tiga?").length === 3, "n=" + splitSentences("Satu. Dua! Tiga?").length);
  check("reading floor > 0", readingFloorSeconds("Teks uji kecepatan baca.") > 0.2, "0");

  // ---- Sentence-level timing ----
  {
    const st = distributeSentenceTimings("Satu. Dua! Tiga?", 0, 3);
    const monoton = st.length === 3 && st.every((s, i) => i === 0 || s.start >= st[i - 1].end - 0.001) && st.every((s) => s.end > s.start);
    check("timing kalimat monoton", monoton, JSON.stringify(st));
    check("timing kalimat menutup rentang", st.length === 3 && Math.abs(st[st.length - 1].end - 3) < 0.001, JSON.stringify(st));
  }

  // ---- Caption parser (SRT/VTT) ----
  {
    const cues: CaptionCue[] = [
      { sceneId: "s1", index: 0, text: "Halo dunia.", start: 0.5, end: 1.75, words: distributeWordTimings("Halo dunia.", 0.5, 1.75) },
      { sceneId: "s1", index: 1, text: "Baris kedua!", start: 2.0, end: 3.25, words: distributeWordTimings("Baris kedua!", 2.0, 3.25) },
    ];
    const srtBack = parseSrt(toSrt(cues));
    check(
      "parser SRT round-trip",
      srtBack.length === 2 && srtBack[0].text === "Halo dunia." && Math.abs(srtBack[0].start - 0.5) < 0.002 && Math.abs(srtBack[1].end - 3.25) < 0.002,
      JSON.stringify(srtBack)
    );
    const vttBack = parseVtt(toVtt(cues));
    check(
      "parser VTT round-trip",
      vttBack.length === 2 && vttBack[0].text === "Halo dunia." && Math.abs(vttBack[1].end - 3.25) < 0.002,
      JSON.stringify(vttBack)
    );
    let threwMissing = false;
    try {
      parseSrt("1\n00:00:01,000 --> \nTeks tanpa akhir\n");
    } catch {
      threwMissing = true;
    }
    check("parser menolak timestamp hilang", threwMissing);
    let threwInvalid = false;
    try {
      parseSrt("1\nbukan-waktu --> 00:00:02,000\nTeks\n");
    } catch {
      threwInvalid = true;
    }
    check("parser menolak timestamp invalid", threwInvalid);
    const withEmpty = parseSrt("1\n00:00:00,000 --> 00:00:01,000\n\n\n2\n00:00:01,000 --> 00:00:02,000\nTeks hidup\n");
    check("parser melewati blok kosong", withEmpty.length === 1 && withEmpty[0].text === "Teks hidup", JSON.stringify(withEmpty));
    const vttSettings = parseVtt("WEBVTT\n\n1\n00:00.000 --> 00:01.000 line:0 position:50%\nDengan settings\n");
    check(
      "parser VTT cue settings diabaikan",
      vttSettings.length === 1 && vttSettings[0].text === "Dengan settings" && Math.abs(vttSettings[0].end - 1) < 0.002,
      JSON.stringify(vttSettings)
    );
    const overlapping = linesToCues(
      [
        { index: 0, text: "Pertama.", start: 0, end: 2 },
        { index: 1, text: "Kedua.", start: 1, end: 3 },
      ],
      { sceneId: "s1" }
    );
    check("parser menormalisasi tumpang tindih", overlapping[1].start >= overlapping[0].end - 0.001, JSON.stringify(overlapping));
  }

  // ---- Validasi integritas cue ----
  {
    const clean: CaptionCue[] = [
      { sceneId: "s", index: 0, text: "Satu dua.", start: 0, end: 1, words: distributeWordTimings("Satu dua.", 0, 1) },
      { sceneId: "s", index: 1, text: "Tiga empat.", start: 1, end: 2, words: distributeWordTimings("Tiga empat.", 1, 2) },
    ];
    check("validateCues cue sehat", validateCues(clean).length === 0, JSON.stringify(validateCues(clean)));
    const overlapIssues = validateCues([
      { sceneId: "s", index: 0, text: "A.", start: 0, end: 2, words: [] },
      { sceneId: "s", index: 1, text: "B.", start: 1, end: 3, words: [] },
    ]);
    check("validateCues deteksi tumpang tindih", overlapIssues.some((i) => i.includes("tumpang tindih")), JSON.stringify(overlapIssues));
    check(
      "validateCues deteksi teks kosong",
      validateCues([{ sceneId: "s", index: 0, text: "  ", start: 0, end: 1, words: [] }]).some((i) => i.includes("kosong"))
    );
    check(
      "validateCues deteksi waktu terbalik",
      validateCues([{ sceneId: "s", index: 0, text: "A.", start: 2, end: 1, words: [] }]).some((i) => i.includes("< start"))
    );
    check(
      "validateCues deteksi waktu non-finite",
      validateCues([{ sceneId: "s", index: 0, text: "A.", start: NaN, end: 1, words: [] }]).some((i) => i.includes("finite"))
    );
    let threwNeg = false;
    try {
      buildCuesFromDurations("s", ["A."], [-0.5], 0);
    } catch {
      threwNeg = true;
    }
    check("buildCuesFromDurations menolak durasi negatif", threwNeg);
  }

  // ---- Penegakan kebijakan dominasi biru ----
  {
    const policyStub = {
      policyVersion: "test",
      standards: {
        resolution: { width: 1080, height: 1920, aspectRatio: "9:16" },
        frameRate: { value: 60, mode: "CFR" },
        video: { codec: "h264", pixelFormat: "yuv420p", container: "mp4" },
        audio: { codec: "aac", narrationDominant: true, backgroundMusic: "none" },
        captions: { required: true, maxLines: 2, syncRequired: true },
        illustrations: { required: true, everyScene: true },
        styles: { minCount: 17 },
        color: { blueDominanceForbidden: true },
        validation: { required: true, failOnViolation: true },
        quality: { motionRequired: true },
      },
      overrides: { allowed: true, onlyByExplicitUserInstruction: true, cliFlag: "--explicit-override", requiresReason: true },
    };
    const baseInput = {
      resolution: { width: 1080, height: 1920 },
      fps: 60,
      profileId: "vertical-1080",
      hasCaptions: true,
      hasIllustrationsPerScene: true,
      backgroundMusicExplicit: false,
      styleCount: 17,
    };
    const ok = validateAgainstPolicy(policyStub as any, { ...baseInput, blueDominant: false });
    check("palet non-biru lolos", ok.violations.length === 0, JSON.stringify(ok.violations));
    const blue = validateAgainstPolicy(policyStub as any, { ...baseInput, blueDominant: true });
    check("dominasi biru -> pelanggaran", blue.violations.some((v) => v.rule === "color.blueDominance"), JSON.stringify(blue.violations));
    const overridden = validateAgainstPolicy(policyStub as any, { ...baseInput, blueDominant: true }, { flag: "--explicit-override", reason: "Permintaan eksplisit pengguna untuk palet biru." });
    check(
      "override eksplisit menembus dominasi biru",
      overridden.violations.length === 0 && overridden.overriddenRules.includes("color.blueDominance"),
      JSON.stringify(overridden)
    );
  }

  // ---- Context-aware rules ----
  const recent: CaptionType[] = [];
  check("kutipan -> speech-bubble", decideCueStyle('"Halo, apa kabar?"', { subjects: [{ kind: "character" }] }, recent, true, false).type === "speech-bubble");
  check("CHAT -> chat", decideCueStyle("Pesan baru masuk di chat.", {}, recent, false, false).type === "chat");
  check("bingung -> thought-bubble", decideCueStyle("Aku bingung harus mulai dari mana.", { subjects: [{ kind: "character" }] }, recent, true, false).type === "thought-bubble");
  check("angka -> data-caption", decideCueStyle("Server mencatat 128 titik.", {}, recent, false, true).type === "data-caption");
  check("teknologi -> annotation", decideCueStyle("Sistem ini memindai data pengguna.", {}, recent, false, true).type === "annotation");
  check("langkah -> instruction", decideCueStyle("Langkah pertama, buka aplikasi.", {}, recent, false, false).type === "instruction");
  check("caps -> kinetic", decideCueStyle("KATA PENTING tampil besar.", {}, recent, false, false).type === "kinetic");
  check("seru pendek -> impact", decideCueStyle("Hati-hati!", {}, recent, false, false).type === "impact");
  check("pertanyaan -> emphasis", decideCueStyle("Sudah kamu lihat hasilnya?", {}, recent, false, false).type === "emphasis");
  const longCue = "Narasi dokumenter yang panjang menjelaskan latar belakang topik ini secara mendalam kepada seluruh pemirsa di mana pun mereka berada saat ini.";
  check("panjang -> editorial", decideCueStyle(longCue, {}, recent, false, false).type === "editorial-subtitle");
  check("default -> subtitle varian", ["subtitle", "top-subtitle", "floating-caption"].includes(decideCueStyle("Narasi biasa saja.", {}, recent, false, false).type));

  // ---- Render smoke per tipe ----
  const types: Array<[CaptionType, string]> = [
    ["subtitle", "fade-up"],
    ["top-subtitle", "fade-down"],
    ["speech-bubble", "pop-in"],
    ["thought-bubble", "pop-in"],
    ["dialogue-bubble", "pop-in"],
    ["notification-bubble", "slide-down"],
    ["chat", "character-reveal"],
    ["kinetic", "word-reveal"],
    ["annotation", "fade-up"],
    ["data-caption", "fade-up"],
    ["impact", "shake"],
    ["emphasis", "scale-bounce"],
    ["instruction", "slide-right"],
    ["editorial-subtitle", "fade-up"],
    ["side-annotation", "slide-left"],
    ["split-caption", "split-reveal"],
    ["fullscreen-typography", "mask-reveal"],
  ];
  let smokeOk = true;
  let smokeDetail = "";
  for (const [type, anim] of types) {
    const c = createCanvas(540, 960);
    const cc = c.getContext("2d");
    const mm = metricsFor(540, 960);
    cc.fillStyle = "#161210";
    cc.fillRect(0, 0, 540, 960);
    const beforePx = new Uint8ClampedArray(framePixels(cc, 540, 960));
    const cap = makeCap({
      type,
      animation: anim,
      text: type === "split-caption" ? "KIRI | KANAN" : "Teks uji tipe " + type + ".",
      theme: theme(type === "speech-bubble" || type === "thought-bubble" ? "comic" : type === "chat" ? "chat" : type === "impact" || type === "emphasis" ? "impact" : type === "instruction" ? "instruction" : "minimal-dark"),
      messages: type === "chat" ? [{ sender: "A", text: "Halo" }, { sender: "B", text: "Hai juga" }] : undefined,
      sender: type === "dialogue-bubble" ? "NAZE" : undefined,
    });
    const est = estimateCaptionBox(cc, mm, cap);
    const rect: RectPx = { x: (540 - est.w) / 2, y: 960 * 0.3, w: est.w, h: est.h };
    const animState = captionAnimState(anim, 1.2, { at: 0.2, duration: 3 });
    try {
      drawCaption({ ctx: cc, m: mm, cap, anim: animState, rect, anchorPx: { x: 100, y: 300, w: 120, h: 160 }, localT: 1.2, tAbs: 1.2 });
    } catch (e: any) {
      smokeOk = false;
      smokeDetail = type + ": " + String(e && e.message);
      break;
    }
    const changed = countChanged(beforePx, framePixels(cc, 540, 960));
    if (changed < 5) {
      // Diagnostik: apakah ini masalah fase reveal atau masalah penggambaran?
      const animLate = captionAnimState(anim, 3.0, { at: 0.2, duration: 4 });
      const est2 = estimateCaptionBox(cc, mm, cap);
      try {
        drawCaption({ ctx: cc, m: mm, cap, anim: animLate, rect: { x: (540 - est2.w) / 2, y: 960 * 0.55, w: est2.w, h: est2.h }, anchorPx: null, localT: 3.0, tAbs: 3.0 });
      } catch (e: any) {
        smokeDetail = type + ": retry throw " + String(e && e.message);
        smokeOk = false;
        break;
      }
      const changedLate = countChanged(beforePx, framePixels(cc, 540, 960));
      smokeOk = false;
      smokeDetail =
        type + ": piksel=" + changed + " retryT3=" + changedLate +
        " anim=" + JSON.stringify(animState) +
        " est=" + JSON.stringify(est) +
        " rect=" + JSON.stringify(rect) +
        " font=" + cc.font;
      break;
    }
  }
  check("render smoke 17 tipe", smokeOk, smokeDetail);

  // ---- Kinetic varian baru: tracking / rotate / blur / mask ----
  {
    let variantOk = true;
    let variantDetail = "";
    for (const v of ["tracking", "rotate", "blur", "mask"]) {
      const c = createCanvas(540, 960);
      const cc = c.getContext("2d");
      const mm = metricsFor(540, 960);
      cc.fillStyle = "#161210";
      cc.fillRect(0, 0, 540, 960);
      const beforePx = new Uint8ClampedArray(framePixels(cc, 540, 960));
      const cap = makeCap({ type: "kinetic", variant: v, text: "KATA BERGERAK BESAR.", theme: theme("editorial") });
      const est = estimateCaptionBox(cc, mm, cap);
      const animState = captionAnimState("word-reveal", 1.0, { at: 0.2, duration: 3 });
      try {
        drawCaption({
          ctx: cc, m: mm, cap, anim: animState,
          rect: { x: (540 - est.w) / 2, y: 300, w: est.w, h: est.h },
          anchorPx: null, localT: 1.0, tAbs: 1.0,
        });
      } catch (e: any) {
        variantOk = false;
        variantDetail = v + ": " + String(e && e.message);
        break;
      }
      const changed = countChanged(beforePx, framePixels(cc, 540, 960));
      if (changed < 5) {
        variantOk = false;
        variantDetail = v + ": piksel berubah=" + changed;
        break;
      }
    }
    check("kinetic varian tracking/rotate/blur/mask", variantOk, variantDetail);
  }

  // ---- Determinisme ----
  {
    const c1 = createCanvas(540, 960);
    const c2 = createCanvas(540, 960);
    const drawTwice = (cc: any) => {
      const mm = metricsFor(540, 960);
      cc.fillStyle = "#161210";
      cc.fillRect(0, 0, 540, 960);
      const cap = makeCap({ type: "speech-bubble", animation: "pop-in", theme: theme("comic"), text: "Deterministik?" });
      const est = estimateCaptionBox(cc, mm, cap);
      drawCaption({ ctx: cc, m: mm, cap, anim: captionAnimState("pop-in", 1.2, { at: 0.2, duration: 3 }), rect: { x: 60, y: 200, w: est.w, h: est.h }, anchorPx: null, localT: 1.2, tAbs: 1.2 });
    };
    drawTwice(c1.getContext("2d"));
    drawTwice(c2.getContext("2d"));
    const p1 = framePixels(c1.getContext("2d"), 540, 960);
    const p2 = framePixels(c2.getContext("2d"), 540, 960);
    let same = true;
    for (let i = 0; i < p1.length; i += 97) if (p1[i] !== p2[i]) { same = false; break; }
    check("render deterministik", same);
  }

  // ---- Engine end-to-end ----
  check("mode klasik -> null", createCaptionEngine({ palette, style, fontFamily: TEST_FONT, config: {} as AdaptiveCaptionsConfig }) === null);
  const engine = createCaptionEngine({ palette, style, fontFamily: TEST_FONT, config: { mode: "adaptive" } });
  check("mode adaptive -> engine", engine !== null);
  if (engine) {
    const cueText = "Caption mengikuti adegan secara otomatis.";
    const cueWords = distributeWordTimings(cueText, 0.3, 2.4);
    const t: any = {
      scene: {
        id: "s1",
        title: "TES ENGINE",
        subjects: [{ kind: "character", mood: "thinking" }, { kind: "object", name: "globe" }],
        captions: [{ cueIndex: 0, type: "impact", animation: "shake" } as SceneCaptionDirective],
      },
      start: 0,
      end: 6,
      duration: 6,
      cues: [{ sceneId: "s1", index: 0, text: cueText, start: 0.3, end: 2.4, words: cueWords }],
    };
    const timeline: any = { scenes: [t], cues: t.cues, sfx: [], duration: 6, frameCount: 360, fps: 60 };
    engine.loadTimeline(timeline, [t.scene]);
    check("loadTimeline memetakan cue", engine.count() === 1, "n=" + engine.count());
    const id1 = engine.show("s1", { text: "Anotasi imperatif.", type: "annotation", anchor: { subject: 1 }, at: 0.4, duration: 1.6 });
    const id2 = engine.chat("s1", { messages: [{ sender: "A", text: "Sudah lihat?" }, { sender: "B", text: "Belum." }], at: 2.6, duration: 2 });
    check("API show/chat terdaftar", engine.count() === 3, "n=" + engine.count());
    const api = engine.api("s1");
    const id3 = api.annotate({ text: "OBJEK: globe", anchor: { subject: 1 }, at: 3, duration: 1.5 });
    check("API annotate bekerja", engine.count() === 4);
    const c = createCanvas(540, 960);
    const cc = c.getContext("2d");
    const kit: any = { w: 540, h: 960, scale: 0.5, animationIntensity: 1, style: { id: "x" } };
    let renderOk = true;
    let renderDetail = "";
    for (const time of [0.8, 1.6, 3.0, 4.2, 5.5]) {
      cc.fillStyle = "#161210";
      cc.fillRect(0, 0, 540, 960);
      const beforePx = new Uint8ClampedArray(framePixels(cc, 540, 960));
      try {
        engine.render(cc, t, kit, time);
      } catch (e: any) {
        renderOk = false;
        renderDetail = "t=" + time + ": " + String(e && e.message);
        break;
      }
      if (time < 5.2 && countChanged(beforePx, framePixels(cc, 540, 960)) < 3) {
        renderOk = false;
        renderDetail = "t=" + time + " frame tidak berubah";
        break;
      }
    }
    check("engine.render per-frame", renderOk, renderDetail);
    engine.hide(id1);
    engine.hide(id2);
    engine.hide(id3);
    check("hide imperatif", engine.count() === 1, "n=" + engine.count());
  }

  console.log("");
  console.log("Total: " + passed + " lulus, " + failed + " gagal dari " + (passed + failed) + " asersi.");
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error("Kesalahan pengujian:", e);
  process.exit(1);
});
