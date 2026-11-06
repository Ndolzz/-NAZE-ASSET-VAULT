/**
 * Scene composer: draws one frame of one scene into a 2D context.
 * Background, style texture, backdrop decor, illustrated subjects,
 * kinetic typography and burned-in CC all live here.
 * Editorial Kinetic Motion: scenes that opt in (style motion system
 * "editorial-kinetic", or explicit layers/camera) render through the layered
 * compositor instead of the classic stack; the classic path is unchanged.
 */
import { SKRSContext2D } from "@napi-rs/canvas";
import { Palette } from "../color/palette";
import { StyleDef } from "../styles/types";
import { Timeline, SceneTiming } from "../core/timeline";
import { popInTrack, enterValue, floatOffset, wordStagger, intensityFactor } from "../core/animation";
import { progress, sampleTrack, Keyframe } from "../core/keyframes";
import { hashString, mulberry32, applyEasing } from "../core/easing";
import { drawBackdropDecor, drawSubject, DrawKit } from "../illustration/generator";
import { drawCaptionCue, CcRenderKit } from "../captions/renderer";
import { cueAt } from "../core/timeline";
import { renderLayeredSceneContent, isEditorialKineticScene } from "../motion/layer-compositor";

export interface ComposerKit {
  palette: Palette;
  style: StyleDef;
  fontFamily: string;
  scale: number;
  animationIntensity: number;
  burnInCc: boolean;
  accentWords: boolean;
  w: number;
  h: number;
  timeline: Timeline;
}

function drawStyleTexture(ctx: SKRSContext2D, kit: ComposerKit, t: number): void {
  const { w, h, palette, style, scale } = kit;
  switch (style.texture) {
    case "grain": {
      const rng = mulberry32(hashString(style.id) >>> 0);
      ctx.save();
      ctx.globalAlpha = 0.05;
      for (let i = 0; i < 700; i++) {
        const x = rng() * w;
        const y = rng() * w * (h / w) + ((t * 12 * (i % 3)) % h);
        ctx.fillStyle = i % 2 === 0 ? "#000000" : "#FFFFFF";
        ctx.fillRect(x, y % h, 2 * scale, 2 * scale);
      }
      ctx.restore();
      break;
    }
    case "dots": {
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = palette.text;
      const step = 36 * scale;
      for (let y = step / 2; y < h; y += step) {
        for (let x = step / 2; x < w; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, 3 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      break;
    }
    case "halftone": {
      ctx.save();
      ctx.globalAlpha = 0.09;
      ctx.fillStyle = palette.text;
      const step = 42 * scale;
      for (let y = step / 2; y < h; y += step) {
        for (let x = step / 2; x < w; x += step) {
          const r = (2 + ((x + y) / step) % 3) * scale;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      break;
    }
    case "scanlines": {
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = palette.text;
      for (let y = 0; y < h; y += 8 * scale) ctx.fillRect(0, y, w, 3 * scale);
      ctx.restore();
      break;
    }
    case "paper": {
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = palette.text;
      for (let i = 0; i < 24; i++) {
        ctx.fillRect(0, ((i * 137 + hashString(style.id + i)) % h) | 0, w, scale);
      }
      ctx.restore();
      break;
    }
    case "grid": {
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = palette.text;
      ctx.lineWidth = Math.max(1, scale);
      const step = 96 * scale;
      for (let x = 0; x <= w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    default:
      break;
  }
}

function titleText(raw: string, titleCase: string): string {
  if (titleCase === "upper") return raw.toUpperCase();
  return raw;
}

export function renderSceneFrame(
  ctx: SKRSContext2D,
  timing: SceneTiming,
  kit: ComposerKit,
  globalT: number
): void {
  const { w, h, palette, style } = kit;
  const scale = kit.scale;
  const localT = Math.max(0, globalT - timing.start);
  const scene = timing.scene;
  const intensity = intensityFactor(kit.animationIntensity);

  // 1. Background
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, w, h);

  // 2. Style texture
  drawStyleTexture(ctx, kit, globalT);

  // 3-5. Content: layered editorial composition, or the classic stack
  if (isEditorialKineticScene(style as any, scene as any)) {
    renderLayeredSceneContent(ctx as any, timing, kit as any, globalT);
  } else {
    // 3. Backdrop decoration (style-driven shapes behind the subject)
    const backdropKit: DrawKit = {
      palette,
      style,
      scale,
      enter: 1,
      t: localT,
    };
    drawBackdropDecor(ctx, backdropKit, w, h, hashString(style.id + scene.id));

    // 4. Illustrated subjects - the main storytelling layer
    const illoY = h * 0.44;
    const slots = Math.max(1, scene.subjects.length);
    const popTrack: Keyframe[] = popInTrack(intensity);
    scene.subjects.forEach((subject, i) => {
      const enter = enterValue(popTrack, localT - i * 0.12);
      if (enter <= 0.01) return;
      const bob = floatOffset(localT, 7 * scale * intensity, 0.7 + i * 0.13, i * 1.7);
      const slotWidth = w / slots;
      const cx = slots === 1 ? w / 2 : slotWidth * (i + 0.5);
      const subjectKit: DrawKit = { palette, style, scale, enter, t: localT };
      drawSubject(ctx, subject, subjectKit, cx, illoY + bob, w * (slots === 1 ? 0.30 : 0.26));
    });

    // 5. Kinetic typography: title with per-word stagger
    if (scene.title) {
      const typo = style.typography;
      const words = titleText(scene.title, typo.titleCase).split(/\s+/).filter(Boolean);
      const fontSize = Math.round(84 * scale * typo.titleScale);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${typo.titleWeight} ${fontSize}px "${kit.fontFamily}", sans-serif`;
      if (typo.letterSpacing) {
        (ctx as any).letterSpacing = `${typo.letterSpacing * scale}px`;
      }
      const spaceW = ctx.measureText(" ").width;
      const widths = words.map((wd) => ctx.measureText(wd).width);
      const total = widths.reduce((a, b) => a + b, 0) + spaceW * (words.length - 1);
      let x = w / 2 - total / 2;
      const y = h * 0.145;
      words.forEach((wd, i) => {
        const start = wordStagger(i, 0.14 / intensity, 0.12);
        const a = progress(localT, start, start + 0.5, "easeOutBack");
        if (a > 0) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, a * 1.15);
          const rise = (1 - applyEasing("easeOutCubic", Math.min(1, a))) * 26 * scale;
          ctx.fillStyle = palette.text;
          ctx.textAlign = "left";
          ctx.fillText(wd, x, y + rise);
          if (i === 1) {
            ctx.fillStyle = palette.accent;
            ctx.fillRect(x, y + fontSize * 0.62 + rise, Math.max(8 * scale, widths[i] - 4 * scale), 7 * scale);
          }
          ctx.restore();
        }
        x += widths[i] + spaceW;
      });
      (ctx as any).letterSpacing = "0px";
    }
  }

  // 6. Burned-in CC (max 2 lines, mobile readable, safe area at the bottom)
  if (kit.burnInCc) {
    const cue = cueAt(kit.timeline, globalT);
    if (cue) {
      const localCueT = globalT - cue.start;
      const ccKit: CcRenderKit = {
        palette,
        fontFamily: kit.fontFamily,
        bodyWeight: style.typography.bodyWeight,
        scale,
        accentWords: kit.accentWords,
      };
      drawCaptionCue(ctx, cue, localCueT, cue.end - cue.start, ccKit, w, h);
    }
  }

  // 7. Vignette for dark palettes
  if (palette.dark) {
    const grd = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.72);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  }
}
