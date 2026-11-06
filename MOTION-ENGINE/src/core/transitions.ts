/**
 * Scene transitions. Transitions are compositors: they draw the outgoing and
 * incoming scene canvases onto the main frame with a style-appropriate effect.
 * Editorial Kinetic Motion adds graphic-first transitions (textWipe,
 * rotationWhip, maskSlide, matchCut) so no production needs to repeat fades.
 */
import { Palette, withAlpha } from "../color/palette";
import { applyEasing } from "../core/easing";

export type TransitionFn = (
  ctx: any,
  fromCanvas: any,
  toCanvas: any,
  rawP: number,
  w: number,
  h: number,
  palette: Palette
) => void;

export const TRANSITION_DURATION = 0.5; // seconds

function drawCover(ctx: any, canvas: any, w: number, h: number): void {
  ctx.drawImage(canvas, 0, 0, w, h);
}

export const transitions: Record<string, TransitionFn> = {
  dissolve(ctx, from, to, p, w, h) {
    const e = applyEasing("easeInOutSine", p);
    drawCover(ctx, from, w, h);
    ctx.globalAlpha = e;
    drawCover(ctx, to, w, h);
    ctx.globalAlpha = 1;
  },
  slidePush(ctx, from, to, p, w, h) {
    const e = applyEasing("easeInOutCubic", p);
    ctx.drawImage(from, -e * w * 0.35, 0, w, h);
    ctx.drawImage(to, (1 - e) * w, 0, w, h);
  },
  wipe(ctx, from, to, p, w, h) {
    const e = applyEasing("easeInOutQuad", p);
    drawCover(ctx, from, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, e * w, h);
    ctx.clip();
    drawCover(ctx, to, w, h);
    ctx.restore();
    ctx.fillStyle = withAlpha("#FFFFFF", 0.85);
    ctx.fillRect(e * w - 4, 0, 4, h);
  },
  zoomDissolve(ctx, from, to, p, w, h) {
    const e = applyEasing("easeInOutCubic", p);
    const fromScale = 1 + e * 0.35;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(fromScale, fromScale);
    ctx.translate(-w / 2, -h / 2);
    ctx.globalAlpha = 1 - e;
    drawCover(ctx, from, w, h);
    ctx.restore();
    const toScale = 1.25 - e * 0.25;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(toScale, toScale);
    ctx.translate(-w / 2, -h / 2);
    ctx.globalAlpha = e;
    drawCover(ctx, to, w, h);
    ctx.restore();
    ctx.globalAlpha = 1;
  },
  panelSwipe(ctx, from, to, p, w, h, palette) {
    // Comic panel transition: 3 staggered bands
    const bands = 3;
    const bandH = h / bands;
    drawCover(ctx, from, w, h);
    for (let i = 0; i < bands; i++) {
      const delay = i * 0.18;
      const local = Math.min(1, Math.max(0, (p - delay) / (1 - delay)));
      const e = applyEasing("easeOutQuart", local);
      if (e <= 0) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, i * bandH, w * e, bandH);
      ctx.clip();
      ctx.drawImage(to, 0, i * bandH, w, bandH, 0, i * bandH, w, bandH);
      ctx.restore();
      ctx.fillStyle = withAlpha(palette.text, 0.9);
      ctx.fillRect(w * e - 5, i * bandH, 5, bandH);
    }
  },
  shapeWipe(ctx, from, to, p, w, h) {
    const e = applyEasing("easeInOutCubic", p);
    drawCover(ctx, from, w, h);
    const maxR = Math.sqrt(w * w + h * h) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, e * maxR, 0, Math.PI * 2);
    ctx.clip();
    drawCover(ctx, to, w, h);
    ctx.restore();
  },
  textWipe(ctx, from, to, p, w, h, palette) {
    // Editorial wipe rising from the bottom, led by a bold headline band.
    const e = applyEasing("easeInOutQuad", p);
    drawCover(ctx, from, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, h * (1 - e), w, h * e);
    ctx.clip();
    drawCover(ctx, to, w, h);
    ctx.restore();
    const bandY = h * (1 - e);
    ctx.fillStyle = palette.primary;
    ctx.fillRect(0, bandY - h * 0.012, w, h * 0.024);
    ctx.fillStyle = withAlpha(palette.text, 0.85);
    ctx.fillRect(0, bandY - h * 0.012 - 4, w, 2);
    ctx.fillRect(0, bandY + h * 0.012 + 2, w, 2);
  },
  rotationWhip(ctx, from, to, p, w, h) {
    // Both scenes counter-rotate around the center with a scale whip.
    const e = applyEasing("easeInOutCubic", p);
    const draw = (canvas: any, rot: number, sc: number, alpha: number) => {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(rot);
      ctx.scale(sc, sc);
      ctx.translate(-w / 2, -h / 2);
      ctx.globalAlpha = alpha;
      drawCover(ctx, canvas, w, h);
      ctx.restore();
      ctx.globalAlpha = 1;
    };
    draw(from, -0.3 * e, 1 - 0.22 * e, 1 - e);
    draw(to, 0.3 * (1 - e), 0.78 + 0.22 * e, e);
  },
  maskSlide(ctx, from, to, p, w, h, palette) {
    // Incoming scene revealed through a rising circular mask with a ring.
    const e = applyEasing("easeInOutCubic", p);
    drawCover(ctx, from, w, h);
    const cy = h * (1.18 - 1.36 * e);
    const rr = h * (0.16 + 0.52 * e);
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, cy, rr, 0, Math.PI * 2);
    ctx.clip();
    drawCover(ctx, to, w, h);
    ctx.restore();
    ctx.strokeStyle = withAlpha(palette.text, 0.9);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(w / 2, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
  },
  matchCut(ctx, from, to, p, w, h, palette) {
    // Hard graphic cut at the midpoint with a settle zoom and a brief flash.
    const cut = p >= 0.5;
    const settle = cut ? 1 + (p - 0.5) * 0.12 : 1.06 - p * 0.12;
    const canvas = cut ? to : from;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(settle, settle);
    ctx.translate(-w / 2, -h / 2);
    drawCover(ctx, canvas, w, h);
    ctx.restore();
    const flash = Math.abs(p - 0.5);
    if (flash < 0.06) {
      ctx.fillStyle = withAlpha(palette.primary, 0.55 * (1 - flash / 0.06));
      ctx.fillRect(0, 0, w, h);
    }
  },
};

export function getTransition(id: string): TransitionFn {
  const fn = transitions[id] ?? transitions.dissolve;
  return fn;
}
