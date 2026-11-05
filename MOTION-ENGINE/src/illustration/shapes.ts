/**
 * Illustration shape primitives.
 * Deterministic vector drawing helpers shared by the illustration generator.
 */
import { mulberry32 } from "../core/easing";

export type Ctx2D = {
  save(): void;
  restore(): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, start: number, end: number, ccw?: boolean): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, start: number, end: number): void;
  fill(): void;
  stroke(): void;
  clip(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  translate(x: number, y: number): void;
  rotate(a: number): void;
  scale(x: number, y: number): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
} & Record<string, any>;

/** Rounded rectangle path (portable - no reliance on ctx.roundRect). */
export function roundRectPath(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number): void {
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

/** Organic blob shape driven by a seed (consistent across frames). */
export function blobPath(
  ctx: Ctx2D,
  cx: number,
  cy: number,
  radius: number,
  seed: number,
  points = 8,
  wobble = 0.18
): void {
  const rng = mulberry32(seed);
  const offsets = Array.from({ length: points }, () => 1 - wobble / 2 + rng() * wobble);
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const idx = i % points;
    const angle = (i / points) * Math.PI * 2;
    const r = radius * offsets[idx];
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function starPath(ctx: Ctx2D, cx: number, cy: number, outer: number, inner: number, points = 5): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Halftone dot field (comic/pop-art texture). */
export function halftoneDots(
  ctx: Ctx2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  step = 26,
  maxR = 4
): void {
  ctx.save();
  ctx.fillStyle = color;
  for (let iy = y; iy < y + h; iy += step) {
    for (let ix = x; ix < x + w; ix += step) {
      const dx = (ix - (x + w / 2)) / (w / 2);
      const dy = (iy - (y + h / 2)) / (h / 2);
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const r = maxR * (1 - d * 0.7);
      if (r <= 0.3) continue;
      ctx.beginPath();
      ctx.arc(ix, iy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Rough hand-drawn line (doodle style). */
export function roughLine(ctx: Ctx2D, x1: number, y1: number, x2: number, y2: number, seed: number, jitter = 3): void {
  const rng = mulberry32(seed);
  const segments = 6;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const jx = i === segments ? 0 : (rng() - 0.5) * jitter * 2;
    const jy = i === segments ? 0 : (rng() - 0.5) * jitter * 2;
    ctx.lineTo(x1 + (x2 - x1) * t + jx, y1 + (y2 - y1) * t + jy);
  }
  ctx.stroke();
}

/** Torn paper edge (paper-cutout style). */
export function tornEdgePath(ctx: Ctx2D, x: number, y: number, w: number, h: number, seed: number): void {
  const rng = mulberry32(seed);
  const step = 18;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let ix = x; ix < x + w; ix += step) ctx.lineTo(ix, y + (rng() - 0.5) * 8);
  ctx.lineTo(x + w, y);
  for (let iy = y; iy < y + h; iy += step) ctx.lineTo(x + w + (rng() - 0.5) * 8, iy);
  ctx.lineTo(x + w, y + h);
  for (let ix = x + w; ix > x; ix -= step) ctx.lineTo(ix, y + h + (rng() - 0.5) * 8);
  ctx.lineTo(x, y + h);
  for (let iy = y + h; iy > y; iy -= step) ctx.lineTo(x + (rng() - 0.5) * 8, iy);
  ctx.closePath();
}

/** Speed lines (comic / anime). */
export function speedLines(ctx: Ctx2D, cx: number, cy: number, inner: number, outer: number, count: number, seed: number, color: string, width: number): void {
  const rng = mulberry32(seed);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const r1 = inner + rng() * (outer - inner) * 0.3;
    const r2 = inner + (outer - inner) * (0.6 + rng() * 0.4);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.restore();
}
