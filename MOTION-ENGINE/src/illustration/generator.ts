/**
 * NAZE Illustrator - original, style-driven, procedural vector illustration.
 * Every scene receives illustrations generated from its own narrative content,
 * animated over time. No stock footage is used as a substitute.
 */
import { Ctx2D, blobPath, roundRectPath, halftoneDots, starPath, speedLines, roughLine } from "./shapes";
import { Palette, withAlpha, shade, mixHex } from "../color/palette";
import { StyleDef } from "../styles/types";
import { mulberry32, hashString } from "../core/easing";

export interface DrawKit {
  palette: Palette;
  style: StyleDef;
  scale: number;
  enter: number; // 0..1 entrance progress
  t: number; // scene-local time (s)
}

function lineWidthFor(kit: DrawKit, base: number): number {
  if (kit.style.stroke === "none") return 0;
  if (kit.style.stroke === "thin") return base * 0.4;
  if (kit.style.stroke === "rough") return base * 0.8;
  return base; // bold
}

function applyStroke(ctx: Ctx2D, kit: DrawKit, w: number, color?: string): void {
  if (kit.style.stroke === "none") return;
  ctx.lineWidth = w;
  ctx.strokeStyle = color ?? kit.palette.text;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

/** Style-adapted fill: flat / gradient / soft / paper. */
function fillShape(ctx: Ctx2D, kit: DrawKit, color: string, x: number, y: number, r: number): void {
  switch (kit.style.shading) {
    case "gradient": {
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.2, x, y, r * 1.2);
      g.addColorStop(0, shade(color, 0.25));
      g.addColorStop(1, shade(color, -0.15));
      ctx.fillStyle = g;
      break;
    }
    case "soft": {
      const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r * 1.15);
      g.addColorStop(0, shade(color, 0.18));
      g.addColorStop(0.75, color);
      g.addColorStop(1, shade(color, -0.1));
      ctx.fillStyle = g;
      break;
    }
    case "paper":
    case "flat":
    default:
      ctx.fillStyle = color;
      break;
  }
}

export function drawSubject(ctx: Ctx2D, subject: any, kit: DrawKit, cx: number, cy: number, size: number): void {
  const seed = hashString(JSON.stringify(subject) + kit.style.id);
  const rng = mulberry32(seed);
  const pop = 0.85 + kit.enter * 0.15;
  ctx.save();
  ctx.translate(cx, cy + (1 - kit.enter) * 40 * kit.scale);
  ctx.scale(pop, pop);
  const lw = lineWidthFor(kit, 7 * kit.scale);

  switch (subject.kind) {
    case "character":
      drawCharacter(ctx, kit, rng, size, subject.mood ?? "neutral", lw);
      break;
    case "chart":
      drawChart(ctx, kit, rng, size, subject.data ?? [30, 70, 45, 90, 60], lw);
      break;
    case "object":
      drawObject(ctx, kit, rng, size, subject.name ?? "star", lw);
      break;
    case "icon":
    default:
      drawIcon(ctx, kit, rng, size, subject.name ?? "star", lw);
      break;
  }
  ctx.restore();
}

function seedNum(rng: () => number): number {
  return Math.floor(rng() * 100000);
}

/** ---------------- Character (all illustration styles) ---------------- */
function drawCharacter(ctx: Ctx2D, kit: DrawKit, rng: () => number, size: number, mood: string, lw: number): void {
  const { palette } = kit;
  const r = size * 0.30;
  const bodyR = size * 0.24;

  // Body (blob)
  blobPath(ctx, 0, r * 1.55, bodyR, rng() * 1000, 9, 0.14);
  fillShape(ctx, kit, palette.secondary, 0, r * 1.55, bodyR);
  ctx.fill();
  applyStroke(ctx, kit, lw);

  // Head
  blobPath(ctx, 0, 0, r, seedNum(rng), 10, 0.08);
  fillShape(ctx, kit, palette.primary, 0, 0, r);
  ctx.fill();
  applyStroke(ctx, kit, lw);

  // Eyes
  const eyeY = -r * 0.1;
  const eyeDX = r * 0.36;
  const eyeR = mood === "shocked" ? r * 0.16 : mood === "thinking" ? r * 0.07 : r * 0.10;
  const blink = Math.sin(kit.t * 1.7 + rng() * 6) > 0.92 ? 0.15 : 1;
  if (mood === "happy" || mood === "excited") {
    ctx.strokeStyle = kit.palette.text;
    ctx.lineWidth = lw * 0.9;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * eyeDX, eyeY, r * 0.14, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = kit.palette.text;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * eyeDX, eyeY, eyeR, eyeR * blink, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (mood === "thinking") {
      ctx.strokeStyle = kit.palette.text;
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.moveTo(-eyeDX * 1.4, eyeY - r * 0.32);
      ctx.lineTo(-eyeDX * 0.5, eyeY - r * 0.42);
      ctx.stroke();
    }
  }

  // Mouth by mood
  ctx.strokeStyle = kit.palette.text;
  ctx.lineWidth = lw * 0.9;
  ctx.beginPath();
  if (mood === "excited" || mood === "shocked") {
    ctx.ellipse(0, r * 0.45, r * 0.22, r * (mood === "shocked" ? 0.26 : 0.16), 0, 0, Math.PI * 2);
    ctx.fillStyle = kit.palette.text;
    ctx.fill();
  } else if (mood === "thinking") {
    ctx.moveTo(-r * 0.18, r * 0.45);
    ctx.quadraticCurveTo(0, r * 0.55, r * 0.2, r * 0.42);
    ctx.stroke();
  } else {
    ctx.arc(0, r * 0.28, r * 0.34, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
  }

  // Arms (expressive arcs)
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = lw * 1.4;
  const armWave = Math.sin(kit.t * 2.2) * 0.25;
  ctx.beginPath();
  ctx.moveTo(-bodyR * 0.8, r * 1.3);
  ctx.quadraticCurveTo(-bodyR * 1.7, r * 1.0 + armWave * r, -bodyR * 1.5, r * 0.6 + armWave * r);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bodyR * 0.8, r * 1.3);
  ctx.quadraticCurveTo(bodyR * 1.7, r * 1.0 - armWave * r, bodyR * 1.5, r * 0.6 - armWave * r);
  ctx.stroke();

  // Style decorations
  if (kit.style.shading === "halftone") {
    halftoneDots(ctx, -r, r * 0.1, r * 2, r * 0.9, withAlpha(kit.palette.accent, 0.7), 16 * kit.scale, 3 * kit.scale);
  }
  if (kit.style.illustrationKind === "comic" || kit.style.illustrationKind === "anime") {
    speedLines(ctx, 0, 0, size * 0.55, size * 0.78, 14, seedNum(rng), withAlpha(kit.palette.text, 0.35), 3 * kit.scale);
  }
  if (mood === "excited" || mood === "happy") {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + kit.t;
      starPath(ctx, Math.cos(a) * size * 0.52, -size * 0.18 + Math.sin(a) * size * 0.2, 7 * kit.scale, 3 * kit.scale, 4);
      ctx.fillStyle = withAlpha(kit.palette.accent, 0.85);
      ctx.fill();
    }
  }
}

/** ---------------- Objects vocabulary ---------------- */
function drawObject(ctx: Ctx2D, kit: DrawKit, rng: () => number, size: number, name: string, lw: number): void {
  const { palette } = kit;
  const s = size * 0.5;
  switch (name) {
    case "rocket": {
      ctx.save();
      ctx.rotate(-0.5 + Math.sin(kit.t) * 0.05);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.9);
      ctx.quadraticCurveTo(s * 0.55, -s * 0.2, s * 0.4, s * 0.6);
      ctx.lineTo(-s * 0.4, s * 0.6);
      ctx.quadraticCurveTo(-s * 0.55, -s * 0.2, 0, -s * 0.9);
      ctx.closePath();
      fillShape(ctx, kit, palette.primary, 0, 0, s);
      ctx.fill();
      applyStroke(ctx, kit, lw);
      ctx.beginPath();
      ctx.arc(0, -s * 0.25, s * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = palette.background;
      ctx.fill();
      applyStroke(ctx, kit, lw * 0.8);
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * s * 0.4, s * 0.25);
        ctx.lineTo(sx * s * 0.75, s * 0.75);
        ctx.lineTo(sx * s * 0.4, s * 0.6);
        ctx.closePath();
        ctx.fillStyle = palette.accent;
        ctx.fill();
        applyStroke(ctx, kit, lw * 0.8);
      }
      const flick = 0.7 + Math.sin(kit.t * 9) * 0.3;
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, s * 0.6);
      ctx.quadraticCurveTo(0, s * (1.2 + flick * 0.4), s * 0.22, s * 0.6);
      ctx.closePath();
      ctx.fillStyle = palette.secondary;
      ctx.fill();
      ctx.restore();
      break;
    }
    case "brain": {
      blobPath(ctx, 0, 0, s * 0.85, seedNum(rng), 12, 0.22);
      fillShape(ctx, kit, palette.primary, 0, 0, s * 0.85);
      ctx.fill();
      applyStroke(ctx, kit, lw);
      ctx.strokeStyle = withAlpha(palette.text, 0.5);
      ctx.lineWidth = lw * 0.7;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        roughLine(ctx, Math.cos(a) * s * 0.2, Math.sin(a) * s * 0.2, Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.62, seedNum(rng), 4 * kit.scale);
      }
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + kit.t * 0.7;
        const d = s * (0.95 + Math.sin(kit.t * 3 + i) * 0.08);
        starPath(ctx, Math.cos(a) * d, Math.sin(a) * d, 6 * kit.scale, 2.5 * kit.scale, 4);
        ctx.fillStyle = palette.accent;
        ctx.fill();
      }
      break;
    }
    case "lightbulb": {
      const glow = 0.6 + Math.sin(kit.t * 2.4) * 0.25;
      const g = ctx.createRadialGradient(0, -s * 0.15, 5, 0, -s * 0.15, s * 1.1);
      g.addColorStop(0, withAlpha(palette.secondary, 0.55 * glow + 0.25));
      g.addColorStop(1, withAlpha(palette.secondary, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -s * 0.15, s * 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -s * 0.1, s * 0.6, Math.PI * 0.95, Math.PI * 0.05);
      ctx.closePath();
      fillShape(ctx, kit, palette.secondary, 0, -s * 0.1, s * 0.6);
      ctx.fill();
      applyStroke(ctx, kit, lw);
      roundRectPath(ctx, -s * 0.3, s * 0.45, s * 0.6, s * 0.3, 4 * kit.scale);
      ctx.fillStyle = palette.text;
      ctx.fill();
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = lw;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r1 = s * (0.85 + Math.sin(kit.t * 3 + i) * 0.05);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r1, -s * 0.1 + Math.sin(a) * r1);
        ctx.lineTo(Math.cos(a) * r1 * 1.25, -s * 0.1 + Math.sin(a) * r1 * 1.25);
        ctx.stroke();
      }
      break;
    }
    case "phone": {
      roundRectPath(ctx, -s * 0.42, -s * 0.85, s * 0.84, s * 1.7, 18 * kit.scale);
      fillShape(ctx, kit, palette.text, 0, 0, s);
      ctx.fill();
      applyStroke(ctx, kit, lw);
      roundRectPath(ctx, -s * 0.36, -s * 0.76, s * 0.72, s * 1.52, 10 * kit.scale);
      ctx.fillStyle = palette.background;
      ctx.fill();
      const rows = 3;
      for (let i = 0; i < rows; i++) {
        const bp = Math.min(1, Math.max(0, kit.t * 1.4 - i * 0.35));
        const barW = (i === 1 ? 0.72 : 0.5) * s * bp;
        roundRectPath(ctx, -s * 0.3, -s * 0.5 + i * s * 0.42, barW, s * 0.22, 8 * kit.scale);
        ctx.fillStyle = i === 1 ? withAlpha(palette.accent, 0.9) : withAlpha(palette.primary, 0.9);
        ctx.fill();
      }
      break;
    }
    case "palette-swatch": {
      const colors = [palette.primary, palette.secondary, palette.accent, palette.text];
      for (let i = 0; i < colors.length; i++) {
        const drop = Math.min(1, Math.max(0, kit.enter * 1.6 - i * 0.18));
        const y = (i - (colors.length - 1) / 2) * s * 0.62 * drop;
        blobPath(ctx, 0, y, s * 0.26, seedNum(rng) + i, 10, 0.3);
        fillShape(ctx, kit, colors[i], 0, y, s * 0.26);
        ctx.fill();
        applyStroke(ctx, kit, lw * 0.9);
      }
      break;
    }
    case "gauge": {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.9, Math.PI * 0.75, Math.PI * 2.25);
      ctx.strokeStyle = withAlpha(palette.text, 0.25);
      ctx.lineWidth = s * 0.16;
      ctx.lineCap = "round";
      ctx.stroke();
      const needleP = Math.min(1, kit.t / 1.2);
      const a = Math.PI * 0.75 + needleP * Math.PI * 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.9, Math.PI * 0.75, a);
      ctx.strokeStyle = palette.primary;
      ctx.lineWidth = s * 0.16;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.62);
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = lw * 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = palette.text;
      ctx.fill();
      ctx.font = `800 ${Math.round(34 * kit.scale)}px sans-serif`;
      ctx.fillStyle = palette.text;
      ctx.textAlign = "center";
      ctx.fillText("60 FPS", 0, s * 1.25);
      break;
    }
    case "globe": {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
      fillShape(ctx, kit, palette.secondary, 0, 0, s * 0.8);
      ctx.fill();
      applyStroke(ctx, kit, lw);
      ctx.strokeStyle = withAlpha(palette.text, 0.45);
      ctx.lineWidth = lw * 0.6;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.8 * (i / 4), s * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.35, s * 0.8, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "shield": {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.85);
      ctx.lineTo(s * 0.65, -s * 0.45);
      ctx.quadraticCurveTo(s * 0.6, s * 0.35, 0, s * 0.9);
      ctx.quadraticCurveTo(-s * 0.6, s * 0.35, -s * 0.65, -s * 0.45);
      ctx.closePath();
      fillShape(ctx, kit, palette.primary, 0, 0, s);
      ctx.fill();
      applyStroke(ctx, kit, lw);
      ctx.strokeStyle = palette.background;
      ctx.lineWidth = lw * 1.4;
      ctx.beginPath();
      ctx.moveTo(-s * 0.25, 0);
      ctx.lineTo(-s * 0.05, s * 0.25);
      ctx.lineTo(s * 0.3, -s * 0.25);
      ctx.stroke();
      break;
    }
    default: {
      drawIcon(ctx, kit, rng, size, name, lw);
      break;
    }
  }
}

/** ---------------- Icons ---------------- */
function drawIcon(ctx: Ctx2D, kit: DrawKit, rng: () => number, size: number, name: string, lw: number): void {
  const { palette } = kit;
  const s = size * 0.42;
  const spin = kit.style.illustrationKind === "abstract" ? kit.t * 0.6 : 0;
  ctx.save();
  ctx.rotate(spin);
  starPath(ctx, 0, 0, s, s * 0.45, 5);
  fillShape(ctx, kit, palette.accent, 0, 0, s);
  ctx.fill();
  applyStroke(ctx, kit, lw);
  ctx.restore();
}

/** ---------------- Animated chart (infographic) ---------------- */
function drawChart(ctx: Ctx2D, kit: DrawKit, rng: () => number, size: number, data: number[], lw: number): void {
  const { palette } = kit;
  const w = size * 1.1;
  const h = size * 0.75;
  const barW = (w / data.length) * 0.6;
  const gap = w / data.length;
  ctx.save();
  ctx.translate(-w / 2, h / 2);
  for (let i = 0; i < data.length; i++) {
    const target = h * (data[i] / 100);
    const grow = Math.min(1, Math.max(0, kit.t * 1.6 - i * 0.22));
    const barH = target * grow;
    const x = i * gap + (gap - barW) / 2;
    roundRectPath(ctx, x, -barH, barW, barH, 6 * kit.scale);
    ctx.fillStyle = i % 2 === 0 ? palette.primary : palette.secondary;
    ctx.fill();
    applyStroke(ctx, kit, lw * 0.7);
  }
  ctx.strokeStyle = withAlpha(palette.text, 0.5);
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.stroke();
  ctx.restore();
}

/** Decorative background shapes per style (behind the illustration). */
export function drawBackdropDecor(ctx: Ctx2D, kit: DrawKit, w: number, h: number, seed: number): void {
  const { palette, style } = kit;
  const t = kit.t;
  const cx = w / 2;
  const illoY = h * 0.45;

  if (style.composition === "panels" || style.illustrationKind === "comic") {
    speedLines(ctx, cx, illoY, h * 0.24, h * 0.36, 22, seed, withAlpha(palette.text, 0.12), 4 * kit.scale);
  }
  if (style.id === "memphis-design" || style.id === "pop-art") {
    for (let i = 0; i < 6; i++) {
      const a = t * 0.35 + (i / 6) * Math.PI * 2;
      const x = cx + Math.cos(a) * (w * 0.38);
      const y = illoY + Math.sin(a * 1.3) * (h * 0.16);
      const kind = i % 3;
      ctx.fillStyle = withAlpha([palette.primary, palette.secondary, palette.accent][i % 3], 0.18);
      if (kind === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 16 * kit.scale * (1 + Math.sin(t + i) * 0.2), 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 1) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t + i);
        roundRectPath(ctx, -12 * kit.scale, -12 * kit.scale, 24 * kit.scale, 24 * kit.scale, 5 * kit.scale);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-t * 0.7 + i);
        ctx.beginPath();
        ctx.moveTo(0, -16 * kit.scale);
        ctx.lineTo(14 * kit.scale, 12 * kit.scale);
        ctx.lineTo(-14 * kit.scale, 12 * kit.scale);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }
  if (style.texture === "halftone") {
    halftoneDots(ctx, 0, h * 0.62, w, h * 0.16, withAlpha(palette.secondary, 0.35), 22 * kit.scale, 3.5 * kit.scale);
  }
  if (style.composition === "grid" || style.texture === "grid") {
    ctx.strokeStyle = withAlpha(palette.text, 0.07);
    ctx.lineWidth = 2 * kit.scale;
    for (let i = 1; i < 4; i++) {
      const x = (w / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let i = 1; i < 8; i++) {
      const y = (h / 8) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }
  if (style.illustrationKind === "abstract" || style.id === "surreal-3d") {
    for (let i = 0; i < 3; i++) {
      const rr = h * (0.12 + i * 0.05) * (1 + Math.sin(t * 0.8 + i * 2) * 0.08);
      ctx.strokeStyle = withAlpha([palette.primary, palette.secondary, palette.accent][i], 0.22);
      ctx.lineWidth = 5 * kit.scale;
      ctx.beginPath();
      ctx.ellipse(cx, illoY, w * (0.3 + i * 0.08), rr, Math.sin(t * 0.3 + i) * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

export const OBJECT_VOCABULARY = [
  "rocket",
  "brain",
  "lightbulb",
  "phone",
  "palette-swatch",
  "gauge",
  "globe",
  "shield",
  "chart",
  "star",
];

export function drawPaletteBlend(from: string, to: string, t: number): string {
  return mixHex(from, to, t);
}
