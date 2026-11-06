/**
 * On-screen CC renderer (burn-in).
 * Max 2 lines, mobile-readable, accent words colored, smooth animation,
 * never covering the illustration zone.
 *
 * Readability guarantees (applies to every project):
 *   - high-contrast dark pill with light text on any palette/background;
 *   - large font with automatic shrink-to-fit (text is never clipped);
 *   - soft drop shadow separating the pill from busy illustrations.
 */
import { CaptionCue, wrapCueLines, CC_MAX_LINE_LENGTH } from "./segmenter";
import { Palette, withAlpha, luminance } from "../color/palette";
import { applyEasing } from "../core/easing";

export interface CcRenderKit {
  palette: Palette;
  fontFamily: string;
  bodyWeight: string;
  scale: number;
  accentWords: boolean;
  /** Bottom margin of the pill as a fraction of frame height (default 0.10). */
  bottomMargin?: number;
}

const FADE = 0.14;
const LINE_HEIGHT_FACTOR = 1.32;
const CC_BASE_FONT = 54;
const CC_MIN_FONT = 34;

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

  const maxW = w * 0.88;

  // Fade/slide in and out
  const fadeIn = applyEasing("easeOutCubic", localT / FADE);
  const fadeOut = cueActiveFor > 0 ? applyEasing("easeInCubic", localT / Math.max(0.01, cueActiveFor)) : 0;
  const alpha = Math.min(fadeIn, 1 - fadeOut);
  if (alpha <= 0) return;
  const rise = (1 - fadeIn) * 14 * kit.scale;

  // Large font with automatic shrink-to-fit so text is never clipped.
  const pad = Math.round(24 * kit.scale);
  const available = maxW - pad * 2;
  const measureWidest = (size: number): number => {
    ctx.font = `${kit.bodyWeight} ${size}px ${kit.fontFamily}`;
    return Math.max(...lines.map((l: string) => ctx.measureText(l).width));
  };
  let fontSize = Math.round(CC_BASE_FONT * kit.scale);
  let widest = measureWidest(fontSize);
  if (widest > available && widest > 0) {
    fontSize = Math.max(Math.round(CC_MIN_FONT * kit.scale), Math.floor(fontSize * (available / widest)));
    widest = measureWidest(fontSize);
  }

  const lineH = Math.round(fontSize * LINE_HEIGHT_FACTOR);
  const blockH = lines.length * lineH;
  const boxW = Math.min(maxW, widest + pad * 2);
  const boxH = blockH + pad * 1.4;
  const ccMargin = Math.min(0.4, Math.max(0.04, kit.bottomMargin ?? 0.10));
  const boxY = h - Math.round(h * ccMargin) - boxH + rise;
  const boxX = (w - boxW) / 2;

  // High-contrast dark pill (light text on near-black) on any palette.
  ctx.save();
  ctx.shadowColor = withAlpha("#000000", 0.45 * alpha);
  ctx.shadowBlur = Math.round(16 * kit.scale);
  ctx.shadowOffsetY = Math.round(4 * kit.scale);
  ctx.fillStyle = withAlpha("#0A0A0A", 0.78 * alpha);
  roundRect(ctx, boxX, boxY, boxW, boxH, Math.min(28 * kit.scale, boxH / 2));
  ctx.fill();
  ctx.restore();

  // Light text: fall back to white whenever the palette text is dark.
  let textColor = kit.palette.text;
  if (luminance(textColor) < 0.55) textColor = "#FFFFFF";
  // Accent words keep the accent color only when bright enough for the dark pill.
  const accentUsable = luminance(kit.palette.accent) >= 0.25;

  ctx.textBaseline = "middle";
  ctx.font = `${kit.bodyWeight} ${fontSize}px ${kit.fontFamily}`;

  lines.forEach((line: string, li: number) => {
    const words = line.split(" ");
    const widths = words.map((word: string) => ctx.measureText(word + " ").width);
    const lastWidth = ctx.measureText(words[words.length - 1]).width;
    const lineWidth = widths.reduce((a: number, b: number) => a + b, 0) - widths[widths.length - 1] + lastWidth;
    let x = (w - lineWidth) / 2;
    const y = boxY + pad * 0.7 + lineH * li + lineH / 2;
    words.forEach((word: string, wi: number) => {
      const isAccent = kit.accentWords && accentUsable && isAccentWord(word);
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
