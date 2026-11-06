/**
 * Editorial kinetic typography renderer.
 * Typography is a first-class visual element, never a plain subtitle:
 * oversized, stacked, split-word, rotating, perspective, masked, and
 * collage modes, each with independent motion, timing, and easing.
 */
import { LayerSpec, TypographyMode } from "./types";
import { Palette, withAlpha } from "../color/palette";
import { applyEasing, mulberry32, hashString } from "../core/easing";

export interface TypographyKit {
  palette: Palette;
  fontFamily: string;
  weight: string;
  letterSpacing: number;
  scale: number;
}

interface DrawOpts {
  ctx: any;
  layer: LayerSpec;
  boxW: number;
  boxH: number;
  enter: number;
  t: number;
  fill: string;
  kit: TypographyKit;
}

function setFont(ctx: any, kit: TypographyKit, px: number): void {
  ctx.font = `${kit.weight} ${Math.max(12, Math.round(px))}px "${kit.fontFamily}", sans-serif`;
  (ctx as any).letterSpacing = `${kit.letterSpacing * kit.scale}px`;
}

function fitFontPx(ctx: any, text: string, kit: TypographyKit, maxW: number, maxPx: number): number {
  setFont(ctx, kit, 100);
  const measured = ctx.measureText(text).width;
  if (measured <= 0) return maxPx;
  return Math.max(18, Math.min(maxPx, (100 * maxW) / measured));
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function drawFittedCentered(o: DrawOpts, maxW: number, maxPx: number): number {
  const { ctx, layer, kit } = o;
  const text = layer.text ?? "";
  const fontPx = fitFontPx(ctx, text, kit, maxW, maxPx);
  setFont(ctx, kit, fontPx);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = o.fill;
  ctx.fillText(text, 0, 0);
  return fontPx;
}

export function drawEditorialTypography(
  ctx: any,
  layer: LayerSpec,
  boxW: number,
  boxH: number,
  enter: number,
  t: number,
  fill: string,
  kit: TypographyKit
): void {
  const text = (layer.text ?? "").trim();
  if (!text) return;
  const mode: TypographyMode = layer.mode ?? "oversized";
  const o: DrawOpts = { ctx, layer, boxW, boxH, enter, t, fill, kit };

  switch (mode) {
    case "oversized":
      drawOversized(o);
      break;
    case "stacked":
      drawStacked(o);
      break;
    case "splitWords":
      drawSplitWords(o);
      break;
    case "rotating":
      drawRotating(o);
      break;
    case "perspective":
      drawPerspective(o);
      break;
    case "maskReveal":
      drawMaskReveal(o);
      break;
    case "collage":
      drawCollage(o);
      break;
    default:
      drawOversized(o);
      break;
  }
  (ctx as any).letterSpacing = "0px";
}

/** One word scaled until it owns the frame; optional accent underline bar. */
function drawOversized(o: DrawOpts): void {
  const { ctx, layer, boxW, boxH, kit, enter, fill } = o;
  const fontPx = fitFontPx(ctx, layer.text ?? "", kit, boxW * 0.98, boxH * 1.5);
  const appear = applyEasing("easeOutCubic", clamp01(enter * 1.4));
  ctx.save();
  ctx.globalAlpha *= appear;
  setFont(ctx, kit, fontPx);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = fill;
  ctx.fillText(layer.text ?? "", 0, (1 - appear) * boxH * 0.18);
  if (layer.underline) {
    const w = Math.min(boxW * 0.96, ctx.measureText(layer.text ?? "").width * 1.02);
    ctx.fillStyle = kit.palette.accent;
    ctx.fillRect(-w / 2, boxH * 0.34, w * appear, Math.max(6, boxH * 0.05));
  }
  ctx.restore();
}

/** Words stacked as huge independent lines, staggered rise per line. */
function drawStacked(o: DrawOpts): void {
  const { ctx, layer, boxW, boxH, kit, enter, fill } = o;
  const words = (layer.text ?? "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return;
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");
  const widthFit = fitFontPx(ctx, longest, kit, boxW * 0.96, 10000);
  const heightFit = (boxH * 1.25) / (words.length * 0.92);
  const fontPx = Math.max(18, Math.min(widthFit, heightFit));
  const lineHeight = fontPx * 0.92;
  setFont(ctx, kit, fontPx);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = fill;
  const savedAlpha = ctx.globalAlpha;
  words.forEach((word, i) => {
    const lineEnter = clamp01(enter * words.length * 1.15 - i);
    if (lineEnter <= 0) return;
    const e = applyEasing("easeOutCubic", lineEnter);
    const y = (i - (words.length - 1) / 2) * lineHeight;
    const x = ((i % 2 === 0 ? -1 : 1) * (1 - e) * boxW * 0.06) + Math.sin(o.t * 0.8 + i * 1.4) * boxW * 0.008;
    ctx.globalAlpha = savedAlpha * e;
    ctx.fillText(word, x, y + (1 - e) * lineHeight * 0.55);
  });
  ctx.globalAlpha = savedAlpha;
}

/** Every word floats and tilts with its own phase (kinetic per-word motion). */
function drawSplitWords(o: DrawOpts): void {
  const { ctx, layer, boxW, boxH, kit, enter, fill } = o;
  const text = layer.text ?? "";
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return;
  const fontPx = fitFontPx(ctx, text, kit, boxW * 0.98, boxH * 1.2);
  setFont(ctx, kit, fontPx);
  ctx.textBaseline = "middle";
  const spaceW = ctx.measureText(" ").width;
  const widths = words.map((w) => ctx.measureText(w).width);
  const total = widths.reduce((a, b) => a + b, 0) + spaceW * (words.length - 1);
  let x = -total / 2;
  const savedAlpha = ctx.globalAlpha;
  words.forEach((word, i) => {
    const wordEnter = clamp01(enter * words.length * 1.3 - i);
    if (wordEnter > 0) {
      const e = applyEasing("easeOutCubic", wordEnter);
      ctx.save();
      ctx.globalAlpha = savedAlpha * e;
      ctx.translate(x + widths[i] / 2, Math.sin((o.t + i * 0.37) * 2.2) * boxH * 0.05 + (1 - e) * boxH * 0.25);
      ctx.rotate((i - (words.length - 1) / 2) * 0.02 + Math.sin(o.t * 1.7 + i) * 0.015);
      ctx.fillStyle = fill;
      ctx.textAlign = "center";
      ctx.fillText(word, 0, 0);
      ctx.restore();
    }
    x += widths[i] + spaceW;
  });
  ctx.globalAlpha = savedAlpha;
}

/** Continuous rotation with a breathing scale pulse. */
function drawRotating(o: DrawOpts): void {
  const { ctx, boxW, boxH } = o;
  ctx.save();
  ctx.rotate(o.t * (o.layer.spinSpeed ?? 0.35));
  const pulse = 1 + Math.sin(o.t * 1.5) * 0.035;
  ctx.scale(pulse, pulse);
  drawFittedCentered(o, boxW * 0.9, boxH * 1.4);
  ctx.restore();
}

/** Fake 3D: sheared type with a mirrored ghost below (pseudo-depth). */
function drawPerspective(o: DrawOpts): void {
  const { ctx, boxW, boxH } = o;
  const fontPx = fitFontPx(ctx, o.layer.text ?? "", o.kit, boxW * 0.9, boxH * 1.1);
  const drawPass = (alphaMul: number) => {
    setFont(o.ctx, o.kit, fontPx);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = o.fill;
    ctx.globalAlpha *= alphaMul;
    ctx.fillText(o.layer.text ?? "", 0, 0);
    ctx.globalAlpha /= alphaMul;
  };
  ctx.save();
  ctx.transform(1, 0, 0.24, 1, 0, 0);
  const pulse = 1 + Math.sin(o.t * 1.6) * 0.03;
  ctx.scale(pulse, pulse);
  drawPass(1);
  ctx.restore();
  // Reflection ghost
  ctx.save();
  ctx.translate(0, fontPx * 0.6);
  ctx.scale(1, -0.42);
  ctx.transform(1, 0, 0.24, 1, 0, 0);
  drawPass(0.22);
  ctx.restore();
}

/** Text revealed through a growing circular mask with a tracking ring. */
function drawMaskReveal(o: DrawOpts): void {
  const { ctx, boxW, boxH, enter, fill } = o;
  const maxR = Math.hypot(boxW, boxH) / 2;
  const e = applyEasing("easeOutCubic", clamp01(enter));
  const r = Math.max(0.5, maxR * e);
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  drawFittedCentered(o, boxW * 0.92, boxH * 1.2);
  ctx.restore();
  ctx.strokeStyle = withAlpha(fill, 0.85);
  ctx.lineWidth = Math.max(2, 4 * o.kit.scale);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
}

/** Typography collage: scattered stamped copies plus one focal copy. */
function drawCollage(o: DrawOpts): void {
  const { ctx, layer, boxW, boxH, enter } = o;
  const seed = hashString(layer.id + (layer.text ?? ""));
  const rng = mulberry32(layer.seed ?? seed);
  const copies = 6;
  for (let i = 0; i < copies - 1; i++) {
    const copyEnter = clamp01(enter * copies * 1.1 - i);
    if (copyEnter <= 0) continue;
    const e = applyEasing("easeOutBack", copyEnter);
    ctx.save();
    ctx.translate((rng() - 0.5) * boxW * 0.8, (rng() - 0.5) * boxH * 0.75);
    ctx.rotate((rng() - 0.5) * 0.5);
    const s = (0.32 + rng() * 0.68) * (0.7 + 0.3 * e);
    ctx.scale(s, s);
    ctx.globalAlpha *= (0.18 + rng() * 0.34) * e;
    drawFittedCentered(o, boxW * 0.5, boxH * 0.9);
    ctx.restore();
  }
  const focalEnter = clamp01(enter * copies * 1.1 - (copies - 1));
  if (focalEnter > 0) {
    const e = applyEasing("easeOutCubic", focalEnter);
    ctx.save();
    ctx.scale(0.86 + 0.14 * e, 0.86 + 0.14 * e);
    ctx.globalAlpha *= e;
    drawFittedCentered(o, boxW * 0.96, boxH * 1.35);
    ctx.restore();
  }
}
