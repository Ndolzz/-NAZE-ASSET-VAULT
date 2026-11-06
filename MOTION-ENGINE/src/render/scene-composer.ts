/**
 * Scene composer.
 * Composes a single scene frame in layers:
 *   1. Background fill
 *   2. Style texture
 *   3. Content: Editorial Kinetic layered composition (style motion system
 *      "editorial-kinetic" or per-scene layers/camera), otherwise the
 *      classic stack (backdrop decor, subjects, kinetic title)
 *   4. Burn-in closed captions
 *   5. Vignette (dark palettes only)
 */
import { SceneTiming } from "../core/timeline";
import { shade } from "../color/palette";
import { drawBackdropDecor, drawSubject } from "../illustration/generator";
import { halftoneDots, speedLines } from "../illustration/shapes";
import { drawCaptionCue } from "../captions/burn-in";
import { ComposerKit } from "../render/kit";
import { renderLayeredSceneContent, isEditorialKineticScene } from "../motion/layer-compositor";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function drawStyleTexture(ctx: any, kit: ComposerKit, w: number, h: number): void {
  const style = kit.style;
  const s = kit.scale;
  const alpha = 0.35;
  switch (style.texture) {
    case "halftone": {
      ctx.save();
      ctx.globalAlpha = alpha * 0.35;
      halftoneDots(ctx, 0, 0, w, h, kit.palette.text, 90 * s, 3.5 * s);
      ctx.restore();
      break;
    }
    case "dots": {
      ctx.save();
      ctx.globalAlpha = alpha * 0.45;
      halftoneDots(ctx, 0, 0, w, h, kit.palette.primary, 32 * s, 2.5 * s);
      ctx.restore();
      break;
    }
    case "grid": {
      ctx.save();
      ctx.globalAlpha = alpha * 0.3;
      ctx.strokeStyle = kit.palette.text;
      ctx.lineWidth = Math.max(1, 1.5 * s);
      const step = 120 * s;
      for (let x = step; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = step; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case "scanlines": {
      ctx.save();
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = kit.palette.text;
      for (let y = 0; y < h; y += 6 * s) {
        ctx.fillRect(0, y, w, Math.max(1, 1.2 * s));
      }
      ctx.restore();
      break;
    }
    case "paper":
    case "grain": {
      const grainCount = Math.floor(900 * s * s);
      ctx.save();
      ctx.globalAlpha = alpha * 0.25;
      for (let i = 0; i < grainCount; i++) {
        const x = (i * 9301 + 49297) % 233280 / 233280 * w;
        const y = (i * 4177 + 12345) % 233280 / 233280 * h;
        ctx.fillStyle = i % 2 === 0 ? kit.palette.text : kit.palette.background;
        ctx.fillRect(x, y, 1.6 * s, 1.6 * s);
      }
      ctx.restore();
      break;
    }
    case "none":
    default:
      break;
  }
}

function drawKineticTitle(
  ctx: any,
  timing: SceneTiming,
  kit: ComposerKit,
  localT: number,
  w: number,
  h: number
): void {
  const scene = timing.scene;
  const title = scene.title ?? "";
  if (!title) return;
  const style = kit.style;
  const palette = kit.palette;
  const s = kit.scale;

  let displayTitle = title;
  if (style.typography.titleCase === "upper") displayTitle = displayTitle.toUpperCase();
  else if (style.typography.titleCase === "title") displayTitle = displayTitle.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());

  const intensity = kit.animationIntensity * style.animation.intensity;
  const titleScale = style.typography.titleScale * kit.scale;
  const baseSize = 92 * titleScale * (0.9 + intensity * 0.1);
  const maxW = w * 0.86;
  const maxLines = 2;
  const words = displayTitle.split(/\s+/);

  let lines: string[] = [];
  let current = "";
  ctx.font = `${style.typography.titleWeight} ${Math.round(baseSize)}px "${style.typography.fontFamily}", sans-serif`;
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxW && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, "") + "…";
  }

  const lineHeight = baseSize * 1.08;
  const blockH = lineHeight * lines.length;
  const titleY = h * 0.11;
  const appearDur = 0.55;
  const appear = clamp01(localT / appearDur);
  const settle = easeOutCubic(appear);
  const drift = Math.sin(localT * 1.4) * (2.2 * s);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = palette.text;
  ctx.shadowColor = shade(palette.background, -0.35);
  ctx.shadowBlur = 12 * s * (1 - settle);
  ctx.shadowOffsetY = (1 - settle) * 14 * s;
  lines.forEach((line, i) => {
    const stagger = clamp01((localT - i * 0.09) / (appearDur * 0.7));
    const e = easeOutCubic(stagger);
    const y = titleY + i * lineHeight + (1 - e) * 18 * s;
    const alpha = stagger > 0 ? e : 0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(w / 2, y + drift * (i === 0 ? 1 : -1));
    ctx.scale(0.94 + 0.06 * e, 0.94 + 0.06 * e);
    ctx.fillText(line, 0, 0);
    ctx.restore();
  });

  if (style.stroke === "bold" && appear >= 1) {
    const ruleW = w * 0.12;
    const ruleY = titleY + blockH / 2 + 10 * s;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = palette.accent;
    ctx.fillRect(w / 2 - ruleW / 2, ruleY, ruleW * (0.6 + 0.4 * Math.abs(Math.sin(localT * 0.8))), 5 * s);
  }
  ctx.restore();
}

export function renderSceneFrame(
  ctx: any,
  timing: SceneTiming,
  kit: ComposerKit,
  globalT: number
): void {
  const w = kit.w;
  const h = kit.h;
  const s = kit.scale;
  const palette = kit.palette;
  const scene = timing.scene;
  const localT = Math.max(0, globalT - timing.start);

  // 1. Background
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, w, h);

  // 2. Style texture
  drawStyleTexture(ctx, kit, w, h);

  // 3-5. Content: layered editorial composition or classic stack
  if (isEditorialKineticScene(kit.style, scene as any)) {
    renderLayeredSceneContent(ctx, timing, kit as any, globalT);
  } else {
    const intensity = kit.animationIntensity * kit.style.animation.intensity;
    const enterDur = 0.6 + intensity * 0.2;
    const float = Math.sin(localT * 1.6);

    // 3. Backdrop decor
    drawBackdropDecor(ctx, w, h, palette, localT, kit.style, s);

    // 4. Subjects
    const subjects = scene.subjects ?? [];
    const subjectScale = subjects.length > 2 ? 0.34 : subjects.length > 1 ? 0.4 : 0.48;
    const usable = h * (0.56 - subjectScale * 0.14);
    const usableTop = h * 0.2;
    subjects.forEach((subject, i) => {
      const cols = Math.min(2, subjects.length);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const colsW = w * (subjects.length > 2 ? 0.72 : 0.86);
      const cellW = colsW / cols;
      const cx = w / 2 - colsW / 2 + cellW * (col + 0.5);
      const cy = usableTop + usable * ((row + 0.55) / Math.ceil(subjects.length / cols));
      const enter = clamp01(localT / enterDur);
      const size = Math.min(cellW, usable / Math.ceil(subjects.length / cols)) * 1.9 * (0.85 + intensity * 0.15);
      const drawKit = { palette, style: kit.style, scale: s, enter, t: localT };
      drawSubject(ctx, subject, drawKit, cx, cy + float * 6 * s, size);
    });

    // 5. Kinetic title
    drawKineticTitle(ctx, timing, kit, localT, w, h);
  }

  // 6. Burn-in closed captions
  if (kit.burnInCc) {
    const cue = scene.narration ? kit.timeline.cues.find((c) => c.sceneId === scene.id) : null;
    if (cue) {
      const localCueStart = cue.start - timing.start;
      const localCueEnd = cue.end - timing.start;
      const cueActiveFor = clamp01((localT - localCueStart) / 0.3) * clamp01((localCueEnd - localT) / 0.12);
      if (cueActiveFor > 0) {
        drawCaptionCue(ctx, cue, localT, cueActiveFor, { palette, fontFamily: kit.style.typography.fontFamily, bodyWeight: kit.style.typography.bodyWeight, scale: s, accentWords: kit.accentWords }, w, h);
      }
    }
  }

  // 7. Vignette (dark palettes only)
  if (palette.dark) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}
