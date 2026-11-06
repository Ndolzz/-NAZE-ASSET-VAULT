/**
 * Editorial graphic design elements: high-contrast panels, tilted cards,
 * cutout blocks, color blocks, editorial grids, bold geometric shapes, and
 * halftone fields. Drawn in layer-local coordinates (box centered at 0,0).
 */
import { LayerSpec } from "./types";
import { Palette, withAlpha, luminance } from "../color/palette";
import { StyleDef } from "../styles/types";
import { roundRectPath, halftoneDots } from "../illustration/shapes";
import { drawSubject, DrawKit } from "../illustration/generator";

export interface EditorialKit {
  palette: Palette;
  style: StyleDef;
  scale: number;
}

export interface LocalBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Palette-role or hex fill resolution ("invert" keeps text readable on blocks). */
export function resolveFill(name: string | undefined, palette: Palette): string {
  const fallback = palette.text;
  if (!name) return fallback;
  if (name === "text") return palette.text;
  if (name === "primary") return palette.primary;
  if (name === "secondary") return palette.secondary;
  if (name === "accent") return palette.accent;
  if (name === "background") return palette.background;
  if (name === "invert") return luminance(palette.background) > 0.4 ? "#0A0A0A" : "#F4F4F4";
  if (/^#[0-9a-fA-F]{6}$/.test(name)) return name;
  return fallback;
}

export function drawEditorialElement(
  ctx: any,
  layer: LayerSpec,
  box: LocalBox,
  enter: number,
  t: number,
  fill: string,
  kit: EditorialKit,
  sceneSubjects: any[]
): void {
  const { palette, style, scale: s } = kit;
  const strokeOn = style.stroke !== "none";

  switch (layer.kind) {
    case "panel": {
      // Hard offset shadow + solid block: bold editorial color field.
      ctx.fillStyle = withAlpha("#000000", 0.18 * enter);
      ctx.fillRect(box.x + 10 * s, box.y + 10 * s, box.w * enter, box.h);
      ctx.fillStyle = fill;
      ctx.fillRect(box.x, box.y, box.w * enter, box.h);
      if (strokeOn) {
        ctx.strokeStyle = palette.text;
        ctx.lineWidth = 3 * s;
        ctx.strokeRect(box.x, box.y, box.w * enter, box.h);
      }
      break;
    }
    case "card": {
      // Paper card with a drop shadow; children are drawn clipped to its face.
      roundRectPath(ctx, box.x + 8 * s, box.y + 12 * s, box.w * enter, box.h, 16 * s);
      ctx.fillStyle = withAlpha("#000000", 0.16 * enter);
      ctx.fill();
      roundRectPath(ctx, box.x, box.y, box.w * enter, box.h, 16 * s);
      ctx.fillStyle = luminance(palette.background) > 0.4 ? "#FFFFFF" : "#1A1A1A";
      ctx.fill();
      roundRectPath(ctx, box.x, box.y, box.w * enter, box.h, 16 * s);
      ctx.strokeStyle = withAlpha(palette.text, 0.9);
      ctx.lineWidth = 2.5 * s;
      ctx.stroke();
      break;
    }
    case "cutout": {
      // Asymmetric chamfered block: a magazine cut-out collage piece.
      const c = Math.min(box.w, box.h) * 0.34;
      const slide = (1 - enter) * box.w * 0.35;
      const drawPoly = (ox: number, oy: number) => {
        ctx.beginPath();
        ctx.moveTo(box.x + ox, box.y + oy);
        ctx.lineTo(box.x + box.w * enter - c + ox, box.y + oy);
        ctx.lineTo(box.x + box.w * enter + ox, box.y + c + oy);
        ctx.lineTo(box.x + box.w * enter + ox, box.y + box.h + oy);
        ctx.lineTo(box.x + ox, box.y + box.h + oy);
        ctx.closePath();
      };
      ctx.save();
      ctx.translate(slide + 10 * s, 10 * s);
      drawPoly(0, 0);
      ctx.fillStyle = withAlpha("#000000", 0.2 * enter);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(slide, 0);
      drawPoly(0, 0);
      ctx.fillStyle = fill;
      ctx.fill();
      if (strokeOn) {
        ctx.strokeStyle = palette.text;
        ctx.lineWidth = 3 * s;
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case "colorblock": {
      ctx.save();
      ctx.fillStyle = fill;
      ctx.globalAlpha *= enter;
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.restore();
      break;
    }
    case "grid": {
      // Editorial grid: thin rules plus one bold anchor rule.
      ctx.save();
      ctx.globalAlpha *= enter;
      ctx.strokeStyle = withAlpha(fill, 0.16);
      ctx.lineWidth = Math.max(1, 2 * s);
      const cols = 6;
      const rows = 8;
      for (let i = 1; i < cols; i++) {
        const gx = box.x + (box.w / cols) * i;
        ctx.beginPath();
        ctx.moveTo(gx, box.y);
        ctx.lineTo(gx, box.y + box.h);
        ctx.stroke();
      }
      for (let j = 1; j < rows; j++) {
        const gy = box.y + (box.h / rows) * j;
        ctx.beginPath();
        ctx.moveTo(box.x, gy);
        ctx.lineTo(box.x + box.w, gy);
        ctx.stroke();
      }
      ctx.fillStyle = withAlpha(fill, 0.5);
      ctx.fillRect(box.x, box.y + box.h * 0.62, box.w * 0.42, Math.max(2, 3 * s));
      ctx.restore();
      break;
    }
    case "shape": {
      ctx.save();
      ctx.globalAlpha *= enter;
      ctx.fillStyle = fill;
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      switch (layer.shape ?? "rect") {
        case "circle":
          ctx.beginPath();
          ctx.arc(cx, cy, Math.min(box.w, box.h) / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "ring":
          ctx.strokeStyle = fill;
          ctx.lineWidth = Math.max(2, Math.min(box.w, box.h) * 0.08);
          ctx.beginPath();
          ctx.arc(cx, cy, Math.min(box.w, box.h) / 2 - ctx.lineWidth / 2, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case "triangle":
          ctx.beginPath();
          ctx.moveTo(cx, box.y);
          ctx.lineTo(box.x + box.w, box.y + box.h);
          ctx.lineTo(box.x, box.y + box.h);
          ctx.closePath();
          ctx.fill();
          break;
        case "stripe": {
          const barH = (box.h / 5) * 2;
          ctx.fillRect(box.x, box.y, box.w, barH * 0.45);
          ctx.fillRect(box.x, box.y + barH, box.w, barH * 0.3);
          ctx.fillRect(box.x, box.y + barH * 1.8, box.w, barH * 0.2);
          break;
        }
        case "bar":
          ctx.fillRect(box.x, box.y, box.w, box.h);
          break;
        case "rect":
        default:
          roundRectPath(ctx, box.x, box.y, box.w, box.h, 8 * s);
          ctx.fill();
          break;
      }
      ctx.restore();
      break;
    }
    case "halftone": {
      ctx.save();
      ctx.globalAlpha *= enter;
      halftoneDots(ctx, box.x, box.y, box.w, box.h, withAlpha(fill, 0.6), 20 * s, 3.6 * s);
      ctx.restore();
      break;
    }
    case "subject": {
      const subjects = Array.isArray(sceneSubjects) ? sceneSubjects : [];
      if (subjects.length === 0) break;
      const index = Math.min(Math.max(0, layer.subjectIndex ?? 0), subjects.length - 1);
      const subjectKit: DrawKit = { palette, style, scale: s, enter, t };
      drawSubject(ctx, subjects[index], subjectKit, 0, 0, Math.min(box.w, box.h) * 0.98);
      break;
    }
    case "typography":
    case "null":
    default:
      break;
  }
}
