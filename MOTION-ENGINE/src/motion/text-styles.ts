/**
 * Named text-style assets: 66 reusable typography presets (font, warna,
 * bayangan, mode, keyframe enter dan idle) untuk layer tipografi jalur
 * editorial-kinetic.
 *
 * Penggunaan via project.json:
 *   { "id": "s1-title", "kind": "typography", "text": "ANCAMAN",
 *     "textStyle": "ink-slam" }
 * Preset hanya mengisi nilai yang tidak ditetapkan layer; nilai eksplisit
 * layer (mode, fill, enter, underline, spinSpeed) selalu menang. Warna
 * memakai peran palet sehingga gaya beradaptasi dengan tema proyek; font
 * memakai keluarga font yang terdaftar di engine. Id tak dikenal aman:
 * tipografi jatuh ke perilaku default.
 */
import { LayerSpec, TypographyMode, EnterSpec } from "./types";
import { TypographyKit, drawEditorialTypography } from "./typography";
import { resolveFill } from "./editorial";
import { Palette, withAlpha } from "../color/palette";
import { StyleDef } from "../styles/types";

export interface TextStyleShadow {
  /** Peran palet ("text"|"primary"|"secondary"|"accent"|"background"|"invert") atau #hex. */
  color: string;
  alpha?: number;
  blur?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface TextStyleIdle {
  /** Amplitudo sinus horizontal (px pada scale 1). */
  floatX?: number;
  /** Amplitudo sinus vertikal (px pada scale 1). */
  floatY?: number;
  /** Kecepatan sinus (rad/s, default 1.2). */
  speed?: number;
  /** Kemiringan statis (derajat). */
  rotate?: number;
  /** Rotasi kontinu (derajat per detik). */
  rotateSpeed?: number;
  /** Osilasi goyangan (derajat). */
  sway?: number;
  /** Denyut skala (0..1). */
  pulse?: number;
}

export interface TextStyleDef {
  id: string;
  name: string;
  fontFamily: string;
  weight: string;
  letterSpacing: number;
  case?: "upper" | "lower";
  fill?: string;
  gradient?: [string, string];
  shadow?: TextStyleShadow;
  mode?: TypographyMode;
  underline?: boolean;
  spinSpeed?: number;
  enter?: EnterSpec;
  idle?: TextStyleIdle;
}

const T = (
  id: string,
  name: string,
  fontFamily: string,
  weight: string,
  letterSpacing: number,
  opts: Partial<TextStyleDef> = {}
): TextStyleDef => ({ id, name, fontFamily, weight, letterSpacing, ...opts });

export const TEXT_STYLES: TextStyleDef[] = [
  T("ink-slam", "Slam Tinta", "NazeBarlow", "900", -2, {"case":"upper","shadow":{"color":"primary","offsetX":6,"offsetY":6,"alpha":0.9},"mode":"oversized","enter":{"type":"pop","dur":0.5}}),
  T("signal-flash", "Kilat Sinyal", "NazeBarlow", "900", -1, {"case":"upper","fill":"accent","shadow":{"color":"accent","blur":38,"alpha":0.9},"mode":"oversized","enter":{"type":"pop","dur":0.45},"idle":{"pulse":0.025}}),
  T("stencil-track", "Stencil Rapat", "NazeBarlow", "700", 6, {"case":"upper","mode":"oversized","enter":{"type":"wipe"}}),
  T("ticker-scroll", "Ticker Berjalan", "NazeBarlow", "800", 1, {"case":"upper","mode":"splitWords","enter":{"type":"slideL"},"idle":{"floatX":6}}),
  T("stacked-press", "Tumpukan Cetak", "NazeJakarta", "800", -1, {"case":"upper","mode":"stacked","enter":{"type":"rise"}}),
  T("mega-hero", "Hero Raksasa", "NazeJakarta", "900", -2, {"case":"upper","mode":"oversized","enter":{"type":"pop"},"idle":{"pulse":0.015}}),
  T("soft-corporate", "Korporat Lembut", "NazeDMSans", "600", 0, {"mode":"stacked","enter":{"type":"rise"}}),
  T("luxury-tracked", "Luxury Berjarak", "NazeDMSans", "500", 10, {"case":"upper","mode":"oversized","enter":{"type":"wipe","dur":1}}),
  T("gold-sheen", "Kilau Emas", "NazeDMSans", "700", 4, {"case":"upper","gradient":["accent","primary"],"shadow":{"color":"background","blur":18,"alpha":0.8},"mode":"maskReveal"}),
  T("data-counter", "Data Presisi", "NazeDMSans", "700", 1, {"case":"upper","mode":"stacked","enter":{"type":"rise"},"idle":{"floatY":4}}),
  T("neon-pulse", "Neon Berdenyut", "NazeUrbanist", "800", 3, {"case":"upper","fill":"accent","shadow":{"color":"accent","blur":45,"alpha":0.9},"mode":"oversized","enter":{"type":"pop"},"idle":{"pulse":0.03}}),
  T("retro-chrome", "Chrome Retro", "NazeUrbanist", "900", 2, {"case":"upper","gradient":["text","secondary"],"shadow":{"color":"background","blur":16,"offsetY":6,"alpha":0.8},"mode":"perspective"}),
  T("scan-tech", "Teknologi Pindai", "NazeUrbanist", "700", 4, {"case":"upper","fill":"secondary","shadow":{"color":"text","blur":12,"alpha":0.6},"mode":"stacked","enter":{"type":"slideR"}}),
  T("holo-flick", "Hologram", "NazeUrbanist", "800", 2, {"case":"upper","gradient":["accent","text"],"mode":"perspective","enter":{"type":"pop"},"idle":{"pulse":0.02}}),
  T("pop-slam", "Pop Stamp", "NazeOutfit", "900", -1, {"case":"upper","mode":"collage","enter":{"type":"pop"}}),
  T("bubble-fun", "Gelembung Fun", "NazeOutfit", "800", 1, {"case":"upper","fill":"primary","mode":"splitWords","enter":{"type":"pop"},"idle":{"floatY":8,"speed":1.2}}),
  T("comic-burst", "Ledakan Komik", "NazeBarlow", "900", 0.5, {"case":"upper","shadow":{"color":"primary","offsetX":-6,"offsetY":8,"alpha":0.9},"mode":"oversized","enter":{"type":"spin"}}),
  T("sticker-pop", "Stiker Pop", "NazePoppins", "800", 0, {"case":"upper","shadow":{"color":"primary","offsetX":5,"offsetY":5,"alpha":0.9},"mode":"collage","enter":{"type":"pop"},"idle":{"sway":1}}),
  T("dreamy-float", "Mimpi Mengambang", "NazePoppins", "700", 1, {"fill":"secondary","shadow":{"color":"background","blur":20,"alpha":0.7},"mode":"splitWords","enter":{"type":"rise"},"idle":{"floatY":10}}),
  T("bold-statement", "Pernyataan Berani", "NazePoppins", "900", -1.5, {"case":"upper","mode":"oversized","enter":{"type":"rise"}}),
  T("hand-note", "Catatan Tangan", "NazeFigtree", "700", 0, {"mode":"stacked","enter":{"type":"rise"},"idle":{"sway":0.8}}),
  T("sketch-wiggle", "Sketsa Goyang", "NazeFigtree", "800", 0, {"case":"upper","mode":"splitWords","enter":{"type":"pop"},"idle":{"floatX":5,"sway":1.2}}),
  T("paper-layer", "Lapisan Kertas", "NazeMulish", "800", 0, {"case":"upper","shadow":{"color":"background","blur":16,"offsetY":6,"alpha":0.7},"mode":"stacked","enter":{"type":"rise"},"idle":{"floatY":5}}),
  T("craft-soft", "Craft Lembut", "NazeMulish", "700", 1, {"fill":"primary","mode":"oversized","enter":{"type":"rise"},"idle":{"pulse":0.012}}),
  T("clay-chunky", "Clay Tebal", "NazeNunito", "900", 0, {"case":"upper","shadow":{"color":"primary","offsetX":4,"offsetY":4,"alpha":0.85},"mode":"oversized","enter":{"type":"pop"},"idle":{"pulse":0.02}}),
  T("friendly-round", "Ramah Bulat", "NazeNunito", "800", 1, {"fill":"primary","shadow":{"color":"background","blur":14,"alpha":0.7},"mode":"splitWords","enter":{"type":"rise"}}),
  T("swiss-grid", "Swiss Grid", "NazeInter", "700", 0, {"case":"upper","mode":"oversized","enter":{"type":"wipe"}}),
  T("mono-caption", "Mono Keterangan", "NazeInter", "600", 2, {"case":"upper","fill":"secondary","mode":"stacked","enter":{"type":"slideL"},"idle":{"floatY":3}}),
  T("terminal-code", "Kode Terminal", "NazeInter", "600", 3, {"case":"upper","fill":"accent","shadow":{"color":"accent","blur":15,"alpha":0.85},"mode":"stacked","enter":{"type":"slideL"}}),
  T("binary-glitch", "Glitch Biner", "NazeInter", "800", 1, {"case":"upper","shadow":{"color":"accent","offsetX":-4,"offsetY":4,"alpha":0.8},"mode":"splitWords","enter":{"type":"spin"},"idle":{"sway":1.5}}),
  T("editorial-press", "Editorial Tekan", "NazeJakarta", "900", -2, {"case":"upper","underline":true,"mode":"oversized","enter":{"type":"rise"}}),
  T("headline-break", "Headline Patah", "NazeBarlow", "900", -1, {"case":"upper","mode":"stacked","enter":{"type":"wipe"}}),
  T("quote-italic", "Kutipan Miring", "NazeFigtree", "italic 600", 0, {"mode":"maskReveal","enter":{"type":"rise"}}),
  T("whisper-low", "Bisikan Rendah", "NazeFigtree", "500", 2, {"case":"lower","fill":"secondary","mode":"oversized","enter":{"type":"wipe"},"idle":{"floatY":3}}),
  T("shout-upper", "Teriakan Besar", "NazeJakarta", "900", -2, {"case":"upper","shadow":{"color":"primary","offsetX":6,"offsetY":6,"alpha":0.9},"mode":"stacked","enter":{"type":"pop"}}),
  T("accent-strike", "Aksen Coretan", "NazeRubik", "800", 0, {"case":"upper","underline":true,"mode":"oversized","enter":{"type":"wipe"}}),
  T("rubber-stamp", "Stempel Karet", "NazeRubik", "900", 2, {"case":"upper","fill":"accent","mode":"collage","enter":{"type":"pop"},"idle":{"sway":1}}),
  T("tape-label", "Label Kertas", "NazeMulish", "700", 3, {"case":"upper","shadow":{"color":"background","blur":10,"offsetY":4,"alpha":0.7},"mode":"stacked","enter":{"type":"slideR"}}),
  T("dash-split", "Belah Kabin", "NazePoppins", "800", 1, {"case":"upper","mode":"splitWords","enter":{"type":"slideL"},"idle":{"floatX":4}}),
  T("focus-spot", "Sorot Fokus", "NazeDMSans", "800", 0, {"case":"upper","mode":"maskReveal","enter":{"type":"wipe"}}),
  T("rise-mist", "Naik Kabut", "NazeUrbanist", "600", 2, {"fill":"secondary","shadow":{"color":"background","blur":25,"alpha":0.7},"mode":"stacked","enter":{"type":"rise"},"idle":{"floatY":7}}),
  T("stamp-red", "Stempel Merah", "NazeBarlow", "900", 3, {"case":"upper","fill":"accent","mode":"oversized","enter":{"type":"pop"},"idle":{"sway":1}}),
  T("mirror-depth", "Cermin Kedalaman", "NazePoppins", "900", -1, {"case":"upper","mode":"perspective","enter":{"type":"rise"},"idle":{"pulse":0.015}}),
  T("orbit-spin", "Orbit Berputar", "NazeOutfit", "800", 2, {"case":"upper","mode":"rotating","spinSpeed":0.5,"enter":{"type":"pop"}}),
  T("loop-dizzy", "Putar Pusing", "NazeJakarta", "800", 1, {"case":"upper","mode":"rotating","spinSpeed":-0.35,"enter":{"type":"spin"}}),
  T("iris-open", "Iris Terbuka", "NazeNunito", "800", 0, {"case":"upper","mode":"maskReveal","enter":{"type":"pop"},"idle":{"pulse":0.01}}),
  T("split-jump", "Lompat Terpisah", "NazeOutfit", "900", 0, {"case":"upper","mode":"splitWords","enter":{"type":"pop"},"idle":{"floatY":12,"speed":1.4}}),
  T("chill-drift", "Drift Tenang", "NazeMulish", "600", 1.5, {"case":"lower","fill":"primary","mode":"oversized","enter":{"type":"rise","dur":1},"idle":{"floatX":8,"floatY":5}}),
  T("double-tone", "Nada Ganda", "NazeRubik", "800", 1, {"case":"upper","gradient":["text","accent"],"mode":"stacked","enter":{"type":"wipe"}}),
  T("final-cut", "Potongan Final", "NazeBarlow", "900", -2, {"case":"upper","shadow":{"color":"accent","offsetX":5,"offsetY":5,"alpha":0.9},"underline":true,"mode":"oversized","enter":{"type":"rise"},"idle":{"pulse":0.01}}),

  // Arah visual: editorial brutalism (tipe solid, tanpa bayangan/glow).
  T("brutal-stack", "Tumpukan Brutal", "NazeArchivo", "900", -3, {"case":"upper","mode":"brutalist","enter":{"type":"pop","dur":0.45}}),
  T("brutal-invert", "Invert Brutal", "NazeAnton", "800", 0, {"case":"upper","mode":"brutalist","enter":{"type":"rise"}}),
  T("press-condensed", "Cetak Rapat", "NazeBarlowCond", "700", 2, {"case":"upper","mode":"stacked","enter":{"type":"wipe"}}),
  T("tall-poster", "Poster Tinggi", "NazeTeko", "700", 1, {"case":"upper","mode":"stacked","enter":{"type":"rise"},"idle":{"floatY":3}}),
  T("bebas-poster", "Poster Bebas", "NazeBebas", "800", 3, {"case":"upper","mode":"stacked","enter":{"type":"wipe"}}),
  T("state-poster", "Poster Negara", "NazeStaatliches", "800", 2, {"case":"upper","mode":"oversized","underline":true,"enter":{"type":"wipe","dur":0.9}}),

  // Arah visual: cinematic typography (tracking lebar, rule tipis, depth padat).
  T("cine-letterbox", "Sinema Letterbox", "NazeManrope", "600", 8, {"case":"upper","mode":"cinematic","enter":{"type":"wipe","dur":1.1}}),
  T("cine-epic", "Sinema Epik", "NazeCinzel", "700", 6, {"case":"upper","mode":"cinematic","enter":{"type":"wipe","dur":1.2}}),

  // Arah visual: modern technology documentary (mono, techno, outline).
  T("docu-mono", "Dokumenter Mono", "NazePlexMono", "600", 1, {"fill":"secondary","mode":"stacked","enter":{"type":"slideL"},"idle":{"floatY":2}}),
  T("docu-terminal", "Terminal Dokumenter", "NazeShareTechMono", "700", 2, {"case":"upper","mode":"stacked","enter":{"type":"slideL"}}),
  T("tech-outline", "Kerangka Tekno", "NazeChakra", "700", 3, {"case":"upper","mode":"outline","enter":{"type":"pop"}}),
  T("orbit-outline", "Orbit Garis", "NazeOrbitron", "700", 4, {"case":"upper","mode":"outline","enter":{"type":"wipe"}}),
  T("michroma-wide", "Michroma Lebar", "NazeMichroma", "800", 6, {"case":"upper","mode":"oversized","enter":{"type":"wipe","dur":1.2},"idle":{"pulse":0.008}}),
  T("rajdhani-stamp", "Stempel Rajdhani", "NazeRajdhani", "700", 4, {"case":"upper","mode":"outline","enter":{"type":"spin"}}),

  // Arah visual: eksperimental (highlight marker, karakter font kuat).
  T("hero-highlight", "Sorot Hero", "NazeLeagueSpartan", "800", 0, {"case":"upper","mode":"highlight","enter":{"type":"pop"}}),
  T("grotesk-highlight", "Sorot Grotesk", "NazeSpaceGrotesk", "700", 1, {"case":"upper","mode":"highlight","enter":{"type":"rise"}}),
];

export const TEXT_STYLE_IDS: string[] = TEXT_STYLES.map((s) => s.id);

/**
 * Peta keluarga font preset -> file TTF vault (relatif terhadap root repo).
 * registerFonts (render/renderer.ts) mendaftarkan setiap keluarga ini di bawah
 * aliasnya sendiri sehingga preset selalu dirender dengan face aslinya, apa
 * pun style proyek. Keluarga yang sama dengan fontFamily style dilewati agar
 * perilaku style yang sudah berjalan tidak berubah.
 */
export const TEXT_STYLE_FONT_FILES: Record<string, string> = {
  NazeJakarta: "FONTS/GOOGLE/SANS/plusjakartasans.ttf",
  NazeOutfit: "FONTS/GOOGLE/SANS/outfit.ttf",
  NazePoppins: "FONTS/GOOGLE/SANS/poppins.ttf",
  NazeFigtree: "FONTS/GOOGLE/SANS/figtree.ttf",
  NazeDMSans: "FONTS/GOOGLE/SANS/dmsans.ttf",
  NazeUrbanist: "FONTS/GOOGLE/SANS/urbanist.ttf",
  NazeMulish: "FONTS/GOOGLE/SANS/mulish.ttf",
  NazeRubik: "FONTS/GOOGLE/SANS/rubik.ttf",
  NazeNunito: "FONTS/GOOGLE/SANS/nunito.ttf",
  NazeBarlow: "FONTS/GOOGLE/SANS/barlow.ttf",
  NazeInter: "FONTS/GOOGLE/SANS/inter.ttf",
  NazeManrope: "FONTS/GOOGLE/SANS/manrope.ttf",
  NazeBarlowCond: "FONTS/GOOGLE/CONDENSED/barlowcondensed.ttf",
  NazeArchivo: "FONTS/GOOGLE/DISPLAY/archivoblack.ttf",
  NazeAnton: "FONTS/GOOGLE/DISPLAY/anton.ttf",
  NazeBebas: "FONTS/GOOGLE/DISPLAY/bebasneue.ttf",
  NazeOswald: "FONTS/GOOGLE/DISPLAY/oswald.ttf",
  NazeTeko: "FONTS/GOOGLE/DISPLAY/teko.ttf",
  NazeStaatliches: "FONTS/GOOGLE/DISPLAY/staatliches.ttf",
  NazeLeagueSpartan: "FONTS/GOOGLE/DISPLAY/leaguespartan.ttf",
  NazeCinzel: "FONTS/GOOGLE/DISPLAY/cinzel.ttf",
  NazeSpaceGrotesk: "FONTS/GOOGLE/TECHNO/spacegrotesk.ttf",
  NazeChakra: "FONTS/GOOGLE/TECHNO/chakrapetch.ttf",
  NazeOrbitron: "FONTS/GOOGLE/TECHNO/orbitron.ttf",
  NazeMichroma: "FONTS/GOOGLE/TECHNO/michroma.ttf",
  NazeRajdhani: "FONTS/GOOGLE/TECHNO/rajdhani.ttf",
  NazeShareTechMono: "FONTS/GOOGLE/TECHNO/sharetechmono.ttf",
  NazePlexMono: "FONTS/MONOSPACE/ibmplexmono/IBMPlexMono-Regular.ttf",
};

export function textStyleById(id: string): TextStyleDef | undefined {
  return TEXT_STYLES.find((s) => s.id === id);
}

/** Isi default preset ke salinan layer; nilai eksplisit layer selalu menang. */
export function applyTextStyleDefaults(layer: LayerSpec): LayerSpec {
  if (layer.kind !== "typography" || !layer.textStyle) return layer;
  const def = textStyleById(layer.textStyle);
  if (!def) return layer;
  const out: LayerSpec = { ...layer };
  if (out.mode === undefined && def.mode !== undefined) out.mode = def.mode;
  if (out.underline === undefined && def.underline !== undefined) out.underline = def.underline;
  if (out.spinSpeed === undefined && def.spinSpeed !== undefined) out.spinSpeed = def.spinSpeed;
  if (out.enter === undefined && def.enter !== undefined) out.enter = def.enter;
  return out;
}

/**
 * Menggambar layer tipografi dengan atau tanpa preset textStyle. Tanpa
 * textStyle (atau id tak dikenal), perilaku identik dengan jalur lama.
 */
export function drawStyledTypography(
  ctx: any,
  layer: LayerSpec,
  base: { palette: Palette; style: StyleDef; fontFamily: string; scale: number },
  fill: string,
  boxW: number,
  boxH: number,
  enter: number,
  t: number
): void {
  const def = layer.textStyle ? textStyleById(layer.textStyle) : undefined;
  if (!def) {
    const typoKit: TypographyKit = {
      palette: base.palette,
      fontFamily: base.fontFamily,
      weight: base.style.typography.titleWeight,
      letterSpacing: base.style.typography.letterSpacing,
      scale: base.scale,
    };
    drawEditorialTypography(ctx, layer, boxW, boxH, enter, t, fill, typoKit);
    return;
  }
  const typoKit: TypographyKit = {
    palette: base.palette,
    fontFamily: def.fontFamily,
    weight: def.weight,
    letterSpacing: def.letterSpacing,
    scale: base.scale,
  };
  let drawFill: any = fill;
  if (layer.fill === undefined) {
    if (def.gradient) {
      const g = ctx.createLinearGradient(0, -boxH / 2, 0, boxH / 2);
      g.addColorStop(0, resolveFill(def.gradient[0], base.palette));
      g.addColorStop(1, resolveFill(def.gradient[1], base.palette));
      drawFill = g;
    } else if (def.fill) {
      drawFill = resolveFill(def.fill, base.palette);
    }
  }
  let text = layer.text ?? "";
  if (def.case === "upper") text = text.toUpperCase();
  else if (def.case === "lower") text = text.toLowerCase();
  const styledLayer: LayerSpec = { ...layer, text };
  ctx.save();
  if (def.shadow) {
    ctx.shadowColor = withAlpha(resolveFill(def.shadow.color, base.palette), def.shadow.alpha ?? 0.85);
    ctx.shadowBlur = (def.shadow.blur ?? 0) * base.scale;
    ctx.shadowOffsetX = (def.shadow.offsetX ?? 0) * base.scale;
    ctx.shadowOffsetY = (def.shadow.offsetY ?? 0) * base.scale;
  }
  if (def.idle) {
    const a = def.idle;
    const sp = a.speed ?? 1.2;
    if (a.floatX !== undefined || a.floatY !== undefined) {
      ctx.translate(
        Math.sin(t * sp) * (a.floatX ?? 0) * base.scale,
        Math.cos(t * sp * 0.8) * (a.floatY ?? 0) * base.scale
      );
    }
    if (a.rotateSpeed !== undefined) ctx.rotate((t * a.rotateSpeed * Math.PI) / 180);
    if (a.sway !== undefined) ctx.rotate((Math.sin(t * (a.speed ?? 1.5)) * a.sway * Math.PI) / 180);
    if (a.rotate !== undefined) ctx.rotate((a.rotate * Math.PI) / 180);
    if (a.pulse !== undefined) {
      const p = 1 + Math.sin(t * 1.3) * a.pulse;
      ctx.scale(p, p);
    }
  }
  drawEditorialTypography(ctx, styledLayer, boxW, boxH, enter, t, drawFill, typoKit);
  ctx.restore();
}
