/**
 * On-screen CC renderer (burn-in).
 * Max 2 lines, mobile-readable, accent words colored, smooth animation,
 * never covering the illustration zone.
 */
import { CaptionCue, wrapCueLines, CC_MAX_LINE_LENGTH } from "./segmenter";
import { Palette, withAlpha, contrastRatio, luminance } from "../color/palette";
import { applyEasing } from "../core/easing";

export interface CcRenderKit {
  palette: Palette;
  fontFamily: string;
  bodyWeight: string;
  scale: number;
  accentWords: boolean;
}

const FADE = 0.14;
const LINE_HEIGHT_FACTOR = 1.28;

export function drawCaptionCue(
  ctx: any,
  cue: CaptionCue,
  localT: number,
  cueActiveFor: number,
  kit: CcRenderKit,
  w: number,
  h: number
): void {
  const lines = wrapCueLines(cue.text, CC_MAX_LINE_LENGTH, 2);
  if (lines.length === 0) return;

  const fontSize = Math.round(46 * kit.scale);
  const lineH = Math.round(fontSize * LINE_HEIGHT_FACTOR);
  const blockH = lines.length * lineH;
  const pad = Math.round(22 * kit.scale);
  const maxW = w * 0.88;

  ctx.font = `${kit.bodyWeight} ${fontSize}px ${kit.fontFamily}`;
  const widest = Math.max(...lines.map((l: string) => ctx.measureText(l).width));
  const boxW = Math.min(maxW, widest + pad * 2);

  // Fade/slide in and out
  const fadeIn = applyEasing("easeOutCubic", localT / FADE);
  const fadeOut = cueActiveFor > 0 ? applyEasing("easeInCubic", localT / Math.max(0.01, cueActiveFor)) : 0;
  const alpha = Math.min(fadeIn, 1 - fadeOut);
  if (alpha <= 0) return;
  const rise = (1 - fadeIn) * 14 * kit.scale;

  const boxH = blockH + pad * 1.4;
  const boxY = h - Math.round(h * 0.10) - boxH + rise;
  const boxX = (w - boxW) / 2;

  // Pill background for contrast
  const bgLum = luminance(kit.palette.background);
  const pill = bgLum > 0.4 ? withAlpha("#101010", 0.62 * alpha) : withAlpha("#FFFFFF", 0.18 * alpha);
  ctx.fillStyle = pill;
  roundRect(ctx, boxX, boxY, boxW, boxH, Math.min(28 * kit.scale, boxH / 2));
  ctx.fill();

  // Text with per-word accent coloring
  let textColor = kit.palette.text;
  if (contrastRatio(textColor, kit.palette.background) < 3.2 && bgLum > 0.4) {
    textColor = "#FFFFFF";
  }
  ctx.textBaseline = "middle";

  lines.forEach((line: string, li: number) => {
    const words = line.split(" ");
    const widths = words.map((word: string) => ctx.measureText(word + " ").width);
    const lastWidth = ctx.measureText(words[words.length - 1]).width;
    const lineWidth = widths.reduce((a: number, b: number) => a + b, 0) - widths[widths.length - 1] + lastWidth;
    let x = (w - lineWidth) / 2;
    const y = boxY + pad * 0.7 + lineH * li + lineH / 2;
    words.forEach((word: string, wi: number) => {
      const isAccent = kit.accentWords && isAccentWord(word);
      ctx.fillStyle = isAccent ? withAlpha(kit.palette.accent, alpha) : withAlpha(textColor, alpha);
      ctx.textAlign = "left";
      ctx.fillText(word, x, y);
      x += widths[wi];
    });
  });
}

/** Words in CAPS or wrapped in *asterisks* get the accent color. */
export function isAccentWord(word: string): boolean {
  const bare = word.replace(/[^\p{L}\p{N}]/gu, "");
  if (/\*[^*]+\*/.test(word)) return true;
  return bare.length >= 2 && bare === bare.toUpperCase() && /[A-Z]/.test(bare);
}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}
