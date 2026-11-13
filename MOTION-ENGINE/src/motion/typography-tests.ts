/**
 * Pengujian mandiri mesin tipografi & pustaka preset teks (tsx + @napi-rs/canvas).
 * Mencakup: keunikan id preset, peta font vault, keberadaan berkas font,
 * registrasi GlobalFonts, smoke render 11 mode x 3 fase enter, smoke render
 * seluruh preset, aturan prioritas applyTextStyleDefaults, dan kepatuhan
 * warna (peran palet atau #hex saja). Exit 1 bila ada asersi gagal.
 */
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import * as fs from "node:fs";
import * as path from "node:path";
import { TEXT_STYLES, TEXT_STYLE_IDS, TEXT_STYLE_FONT_FILES, applyTextStyleDefaults, drawStyledTypography } from "./text-styles";
import { drawEditorialTypography, TypographyKit } from "./typography";
import { TypographyMode, LayerSpec } from "./types";
import { Palette } from "../color/palette";

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

function resolveRepoRoot(): string {
  const roots = [
    process.env.NAZE_REPO_ROOT,
    path.resolve(process.cwd(), ".."),
    process.cwd(),
    path.resolve(process.cwd(), "../.."),
  ].filter((p): p is string => typeof p === "string" && p.length > 0);
  for (const root of roots) {
    if (fs.existsSync(path.resolve(root, "FONTS/GOOGLE/SANS/plusjakartasans.ttf"))) return root;
  }
  return path.resolve(process.cwd(), "..");
}

const REPO_ROOT = resolveRepoRoot();

const palette: Palette = {
  id: "test-warm",
  name: "Test Warm",
  background: "#161210",
  primary: "#F2E9DC",
  secondary: "#E63B2E",
  accent: "#F5C518",
  text: "#F7F4EF",
  dark: true,
};

const style: any = {
  id: "test-style",
  typography: { fontFamily: "NazeJakarta", titleWeight: "800", letterSpacing: 0 },
};

function makeKit(fontFamily: string): TypographyKit {
  return { palette, fontFamily, weight: "800", letterSpacing: 0, scale: 1 };
}

function framePixels(ctx: any, w: number, h: number): Uint8ClampedArray {
  return ctx.getImageData(0, 0, w, h).data;
}
function countChanged(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < a.length; i += 40) if (Math.abs(a[i] - b[i]) > 8) n++;
  return n;
}

function freshCtx(w = 540, h = 960): any {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, w, h);
  return ctx;
}

const ALL_MODES: TypographyMode[] = [
  "oversized",
  "stacked",
  "splitWords",
  "rotating",
  "perspective",
  "maskReveal",
  "collage",
  "brutalist",
  "cinematic",
  "outline",
  "highlight",
];

const ROLES = ["text", "primary", "secondary", "accent", "background", "invert"];
function isRoleOrHex(color: string): boolean {
  return ROLES.includes(color) || /^#[0-9a-fA-F]{6}$/.test(color);
}

async function run(): Promise<void> {
  // ---- Katalog preset ----
  check("tepat 66 preset", TEXT_STYLES.length === 66, "n=" + TEXT_STYLES.length);
  const ids = new Set(TEXT_STYLE_IDS);
  check("id preset unik", ids.size === TEXT_STYLES.length, "unik=" + ids.size);

  // ---- Peta font preset -> vault ----
  const families = new Set(TEXT_STYLES.map((s) => s.fontFamily));
  const unmapped = [...families].filter((f) => !(f in TEXT_STYLE_FONT_FILES));
  check("semua keluarga preset terpetakan", unmapped.length === 0, JSON.stringify(unmapped));
  check("peta font tepat 28 keluarga", Object.keys(TEXT_STYLE_FONT_FILES).length === 28, "n=" + Object.keys(TEXT_STYLE_FONT_FILES).length);

  // ---- Berkas font ada di vault ----
  const missing = Object.entries(TEXT_STYLE_FONT_FILES)
    .filter(([, rel]) => !fs.existsSync(path.resolve(REPO_ROOT, rel)))
    .map(([f, rel]) => f + "=" + rel);
  check("semua berkas font ada di vault", missing.length === 0, JSON.stringify(missing));

  // ---- Registrasi GlobalFonts ----
  let registeredOk = true;
  let regDetail = "";
  for (const [family, rel] of Object.entries(TEXT_STYLE_FONT_FILES)) {
    const abs = path.resolve(REPO_ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    let ok = false;
    try {
      ok = GlobalFonts.registerFromPath(abs, family) === true;
    } catch (e: any) {
      regDetail = family + ": " + String(e && e.message);
    }
    if (!ok) {
      registeredOk = false;
      if (!regDetail) regDetail = family + " gagal registrasi";
    }
  }
  check("registrasi GlobalFonts sukses", registeredOk, regDetail);

  // ---- Smoke render 11 mode x 3 fase enter ----
  const enters = [0, 0.5, 1];
  let modeOk = true;
  let modeDetail = "";
  for (const mode of ALL_MODES) {
    for (const enter of enters) {
      const ctx = freshCtx();
      const before = framePixels(ctx, 540, 960);
      const layer: LayerSpec = {
        id: "mode-" + mode,
        kind: "typography",
        text: "ANCAMAN DIGITAL",
        mode,
        box: [0.05, 0.3, 0.9, 0.3],
      };
      try {
        drawEditorialTypography(ctx, layer, 540 * 0.9, 960 * 0.3, enter, 1.0, palette.text, makeKit("NazeJakarta"));
      } catch (e: any) {
        modeOk = false;
        modeDetail = mode + " enter=" + enter + ": " + String(e && e.message);
        break;
      }
      if (enter > 0 && countChanged(before, framePixels(ctx, 540, 960)) < 5) {
        modeOk = false;
        modeDetail = mode + " enter=" + enter + ": tidak menggambar piksel";
        break;
      }
    }
    if (!modeOk) break;
  }
  check("smoke render 11 mode x 3 enter", modeOk, modeDetail);

  // ---- Smoke render seluruh 66 preset ----
  let presetOk = true;
  let presetDetail = "";
  for (const def of TEXT_STYLES) {
    const ctx = freshCtx();
    const before = framePixels(ctx, 540, 960);
    const layer: LayerSpec = {
      id: "preset-" + def.id,
      kind: "typography",
      text: "ANCAMAN DIGITAL",
      textStyle: def.id,
      box: [0.05, 0.3, 0.9, 0.3],
    };
    try {
      drawStyledTypography(ctx, layer, { palette, style, fontFamily: "NazeJakarta", scale: 1 }, palette.text, 540 * 0.9, 960 * 0.3, 1, 1.0);
    } catch (e: any) {
      presetOk = false;
      presetDetail = def.id + ": " + String(e && e.message);
      break;
    }
    if (countChanged(before, framePixels(ctx, 540, 960)) < 5) {
      presetOk = false;
      presetDetail = def.id + ": tidak menggambar piksel";
      break;
    }
  }
  check("smoke render 66 preset", presetOk, presetDetail);

  // ---- Prioritas applyTextStyleDefaults ----
  {
    const base: LayerSpec = { id: "l1", kind: "typography", text: "UJI", textStyle: "ink-slam" };
    const filled = applyTextStyleDefaults(base);
    check("preset mengisi mode", filled.mode === "oversized", "mode=" + filled.mode);
    check("preset mengisi enter", filled.enter !== undefined && filled.enter.type === "pop", JSON.stringify(filled.enter));
    check("preset mengisi underline", filled.underline === undefined, "underline=" + filled.underline);

    const explicit: LayerSpec = {
      id: "l2",
      kind: "typography",
      text: "UJI",
      textStyle: "ink-slam",
      mode: "stacked",
      enter: { type: "wipe" },
      underline: true,
    };
    const kept = applyTextStyleDefaults(explicit);
    check("nilai eksplisit layer menang (mode)", kept.mode === "stacked", "mode=" + kept.mode);
    check("nilai eksplisit layer menang (enter)", kept.enter !== undefined && kept.enter.type === "wipe", JSON.stringify(kept.enter));
    check("nilai eksplisit layer menang (underline)", kept.underline === true, "underline=" + kept.underline);

    const unknown: LayerSpec = { id: "l3", kind: "typography", text: "UJI", textStyle: "id-tak-ada" };
    const untouched = applyTextStyleDefaults(unknown);
    check("id tak dikenal aman", untouched.mode === undefined && untouched.enter === undefined, JSON.stringify(untouched));

    const nonTypo: LayerSpec = { id: "l4", kind: "panel" };
    check("layer non-typografi diabaikan", applyTextStyleDefaults(nonTypo) === nonTypo);
  }

  // ---- Kepatuhan warna: peran palet atau #hex saja ----
  {
    const bad: string[] = [];
    for (const def of TEXT_STYLES) {
      if (def.fill !== undefined && !isRoleOrHex(def.fill)) bad.push(def.id + ".fill=" + def.fill);
      if (def.gradient) {
        for (const g of def.gradient) {
          if (!isRoleOrHex(g)) bad.push(def.id + ".gradient=" + g);
        }
      }
      if (def.shadow && !isRoleOrHex(def.shadow.color)) bad.push(def.id + ".shadow=" + def.shadow.color);
    }
    check("warna preset memakai peran palet atau #hex", bad.length === 0, JSON.stringify(bad.slice(0, 5)));
  }

  // ---- Mode baru benar-benar berbeda secara visual ----
  {
    const draw = (mode: TypographyMode): Uint8ClampedArray => {
      const ctx = freshCtx();
      const layer: LayerSpec = {
        id: "diff-" + mode,
        kind: "typography",
        text: "ANCAMAN DIGITAL",
        mode,
        box: [0.05, 0.3, 0.9, 0.3],
      };
      drawEditorialTypography(ctx, layer, 540 * 0.9, 960 * 0.3, 1, 1.0, palette.text, makeKit("NazeJakarta"));
      return framePixels(ctx, 540, 960);
    };
    const pairs: Array<[TypographyMode, TypographyMode]> = [
      ["brutalist", "stacked"],
      ["cinematic", "oversized"],
      ["outline", "oversized"],
      ["highlight", "stacked"],
    ];
    let diffOk = true;
    let diffDetail = "";
    for (const [a, b] of pairs) {
      const changed = countChanged(draw(a), draw(b));
      if (changed < 5) {
        diffOk = false;
        diffDetail = a + " vs " + b + ": piksel berubah=" + changed;
        break;
      }
    }
    check("mode baru berbeda dari mode lama", diffOk, diffDetail);
  }

  console.log("");
  console.log("Total: " + passed + " lulus, " + failed + " gagal dari " + (passed + failed) + " asersi.");
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error("Kesalahan pengujian:", e);
  process.exit(1);
});
