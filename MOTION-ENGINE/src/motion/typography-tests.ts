/**
 * Pengujian mesin tipografi editorial & pustaka preset teks (tsx + @napi-rs/canvas).
 * Mencakup: keunikan id preset, ketersediaan file font vault untuk setiap
 * keluarga preset, registrasi font, smoke render seluruh mode dan preset,
 * prioritas applyTextStyleDefaults, dan kepatuhan warna pada peran palet.
 * Exit 1 bila ada asersi gagal.
 */
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  TEXT_STYLES,
  TEXT_STYLE_IDS,
  TEXT_STYLE_FONT_FILES,
  applyTextStyleDefaults,
  drawStyledTypography,
} from "./text-styles";
import { drawEditorialTypography } from "./typography";
import { TypographyMode } from "./types";

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

function repoRoot(): string {
  const candidates = [
    process.env.NAZE_REPO_ROOT,
    path.resolve(process.cwd(), ".."),
    process.cwd(),
    path.resolve(process.cwd(), "../.."),
  ].filter((p): p is string => typeof p === "string" && p.length > 0);
  for (const root of candidates) {
    if (fs.existsSync(path.join(root, "FONTS"))) return root;
  }
  return candidates[0] ?? process.cwd();
}

const ROOT = repoRoot();

const palette: any = {
  id: "test-ink",
  name: "Test Ink",
  background: "#F2F0EB",
  primary: "#111111",
  secondary: "#2E2E2E",
  accent: "#E63B2E",
  text: "#0A0A0A",
  dark: false,
};

const style: any = {
  id: "editorial-kinetic",
  name: "Editorial Kinetic Motion",
  typography: {
    fontFiles: ["FONTS/GOOGLE/CONDENSED/barlowcondensed.ttf"],
    fontFamily: "NazeBarlow",
    titleCase: "upper",
    titleWeight: "900",
    bodyWeight: "700",
    letterSpacing: -1,
    titleScale: 1,
  },
};

function main(): void {
  // 1. Id preset unik.
  check(
    "id preset textStyle unik",
    new Set(TEXT_STYLE_IDS).size === TEXT_STYLES.length,
    "ids=" + TEXT_STYLES.length + " unik=" + new Set(TEXT_STYLE_IDS).size
  );
  check("jumlah preset minimal 66", TEXT_STYLES.length >= 66, "n=" + TEXT_STYLES.length);

  // 2. Setiap keluarga font preset terdaftar di peta file vault.
  const missingMap = TEXT_STYLES.filter((s) => !TEXT_STYLE_FONT_FILES[s.fontFamily]);
  check(
    "setiap preset punya pemetaan file font vault",
    missingMap.length === 0,
    missingMap.map((s) => s.id + ":" + s.fontFamily).join(", ")
  );

  // 3. File font vault benar-benar ada.
  const missingFiles = Object.entries(TEXT_STYLE_FONT_FILES).filter(
    ([, rel]) => !fs.existsSync(path.join(ROOT, rel))
  );
  check(
    "semua file font vault ada",
    missingFiles.length === 0,
    missingFiles.map(([fam, rel]) => fam + ":" + rel).join(", ")
  );

  // 4. Registrasi GlobalFonts berhasil untuk semua keluarga preset.
  let registered = 0;
  const regFails: string[] = [];
  for (const [family, rel] of Object.entries(TEXT_STYLE_FONT_FILES)) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    try {
      if (GlobalFonts.registerFromPath(abs, family)) registered++;
      else regFails.push(family);
    } catch (e: any) {
      regFails.push(family + ":" + String(e && e.message));
    }
  }
  check(
    "registrasi GlobalFonts sukses",
    registered === Object.keys(TEXT_STYLE_FONT_FILES).length && regFails.length === 0,
    "terdaftar=" + registered + " gagal=" + regFails.join(", ")
  );

  // 5. Smoke render seluruh mode tipografi (termasuk mode baru).
  const modes: TypographyMode[] = [
    "oversized", "stacked", "splitWords", "rotating", "perspective",
    "maskReveal", "collage", "brutalist", "cinematic", "outline", "highlight",
  ];
  const canvas = createCanvas(540, 960);
  const ctx: any = canvas.getContext("2d");
  const kit = { palette, fontFamily: "NazeBarlow", weight: "900", letterSpacing: -1, scale: 0.5 };
  let modeOk = true;
  let modeDetail = "";
  for (const mode of modes) {
    for (const enter of [0, 0.5, 1]) {
      try {
        ctx.fillStyle = palette.background;
        ctx.fillRect(0, 0, 540, 960);
        drawEditorialTypography(
          ctx,
          { id: "t-" + mode, kind: "typography", mode, text: "NAZE TES 2026" } as any,
          460,
          300,
          enter,
          1.0,
          palette.text,
          kit
        );
      } catch (e: any) {
        modeOk = false;
        modeDetail = mode + " enter=" + enter + ": " + String(e && e.message);
        break;
      }
    }
    if (!modeOk) break;
  }
  check("smoke render 11 mode tipografi", modeOk, modeDetail);

  // 6. Smoke render seluruh preset textStyle (bayangan, gradien, idle, case).
  let presetOk = true;
  let presetDetail = "";
  for (const def of TEXT_STYLES) {
    try {
      ctx.fillStyle = palette.background;
      ctx.fillRect(0, 0, 540, 960);
      drawStyledTypography(
        ctx,
        { id: "p-" + def.id, kind: "typography", text: "Sinyal Digital", textStyle: def.id } as any,
        { palette, style, fontFamily: "NazeBarlow", scale: 0.5 },
        palette.text,
        460,
        300,
        0.6,
        1.3
      );
    } catch (e: any) {
      presetOk = false;
      presetDetail = def.id + ": " + String(e && e.message);
      break;
    }
  }
  check("smoke render " + TEXT_STYLES.length + " preset textStyle", presetOk, presetDetail);

  // 7. Prioritas applyTextStyleDefaults.
  const explicit = applyTextStyleDefaults({
    id: "l1", kind: "typography", text: "X", textStyle: "ink-slam", mode: "stacked", enter: { type: "spin" },
  } as any);
  check("mode eksplisit layer menang", explicit.mode === "stacked", "mode=" + explicit.mode);
  check("enter eksplisit layer menang", explicit.enter?.type === "spin", "enter=" + JSON.stringify(explicit.enter));
  const empty = applyTextStyleDefaults({ id: "l2", kind: "typography", text: "Y", textStyle: "ink-slam" } as any);
  check("preset mengisi mode kosong", empty.mode === "oversized", "mode=" + empty.mode);
  const noStyle = applyTextStyleDefaults({ id: "l3", kind: "typography", text: "Z" } as any);
  check("layer tanpa textStyle tidak berubah", noStyle.mode === undefined && (noStyle as any).enter === undefined);
  const unknown = applyTextStyleDefaults({ id: "l4", kind: "typography", text: "W", textStyle: "id-palsu" } as any);
  check("id tak dikenal aman (layer utuh)", unknown.id === "l4" && (unknown as any).mode === undefined);

  // 8. Kepatuhan warna: fill/shadow hanya peran palet atau #hex (tanpa warna keras di luar palet).
  const roles = new Set(["text", "primary", "secondary", "accent", "background", "invert"]);
  const badColors: string[] = [];
  for (const def of TEXT_STYLES) {
    if (def.fill !== undefined && !roles.has(def.fill) && !/^#[0-9a-fA-F]{6}$/.test(def.fill)) {
      badColors.push(def.id + ".fill=" + def.fill);
    }
    if (def.shadow && !roles.has(def.shadow.color) && !/^#[0-9a-fA-F]{6}$/.test(def.shadow.color)) {
      badColors.push(def.id + ".shadow=" + def.shadow.color);
    }
    if (def.gradient) {
      for (const g of def.gradient) {
        if (!roles.has(g) && !/^#[0-9a-fA-F]{6}$/.test(g)) badColors.push(def.id + ".gradient=" + g);
      }
    }
  }
  check("warna preset hanya peran palet atau #hex", badColors.length === 0, badColors.join(", "));

  console.log("");
  console.log("Total: " + passed + " lulus, " + failed + " gagal dari " + (passed + failed) + " asersi.");
  if (failed > 0) process.exit(1);
}

main();
