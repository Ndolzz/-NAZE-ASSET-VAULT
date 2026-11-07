/**
 * Caption Animation Library - 20 preset masuk/keluar di atas keyframe engine.
 * Setiap preset dievaluasi murni dari (preset, t lokal, timing) sehingga
 * deterministik antar frame dan antar rerun, sesuai engine keyframes NAZE.
 */
import { applyEasing, clamp01, mulberry32, hashString } from "../core/easing";

export const CAPTION_ANIM_PRESETS = [
  "fade-in", "fade-up", "fade-down", "pop-in", "scale-bounce",
  "slide-left", "slide-right", "slide-up", "slide-down", "typewriter",
  "word-reveal", "character-reveal", "elastic", "overshoot", "blur-reveal",
  "mask-reveal", "split-reveal", "glitch", "shake", "smooth-floating",
] as const;

export type CaptionAnimPreset = (typeof CAPTION_ANIM_PRESETS)[number];

export interface CaptionAnimState {
  alpha: number;
  dx: number;
  dy: number;
  scale: number;
  rotate: number;
  /** Radius blur px (renderer mengabaikannya bila kanvas tak mendukung). */
  blur: number;
  /** Progres reveal 0..1 (typewriter/word/char/mask/split). */
  reveal: number;
  jitterX: number;
  jitterY: number;
  /** Kilatan putih 0..1 untuk impact/flash. */
  flash: number;
  /** Bobos kontinu (smooth-floating), dipakai draw untuk parallax halus. */
  bob: number;
}

export interface CaptionAnimTiming {
  at: number;
  duration: number;
  enter?: number;
  exit?: number;
  intensity?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
}

const DEFAULT_ENTER: Record<string, number> = {
  "fade-in": 0.3, "fade-up": 0.4, "fade-down": 0.4, "pop-in": 0.35,
  "scale-bounce": 0.55, "slide-left": 0.45, "slide-right": 0.45,
  "slide-up": 0.45, "slide-down": 0.45, typewriter: 0.9,
  "word-reveal": 0.8, "character-reveal": 1.2, elastic: 0.9,
  overshoot: 0.5, "blur-reveal": 0.45, "mask-reveal": 0.5,
  "split-reveal": 0.55, glitch: 0.32, shake: 0.4, "smooth-floating": 0.55,
};

export function isCaptionAnimPreset(name: string): name is CaptionAnimPreset {
  return (CAPTION_ANIM_PRESETS as readonly string[]).includes(name);
}

/**
 * Men evaluasi state animasi caption pada waktu scene-lokal.
 * localT sebelum "at" atau setelah durasi+exit menghasilkan alpha 0.
 */
export function captionAnimState(
  preset: string,
  localT: number,
  timing: CaptionAnimTiming
): CaptionAnimState {
  const p: CaptionAnimPreset = isCaptionAnimPreset(preset) ? preset : "fade-up";
  const intensity = Math.max(0.2, Math.min(2, timing.intensity ?? 1));
  const enterDur = timing.enter ?? DEFAULT_ENTER[p] ?? 0.4;
  const exitDur = timing.exit ?? 0.24;
  const t = localT - timing.at;
  const state: CaptionAnimState = {
    alpha: 0, dx: 0, dy: 0, scale: 1, rotate: 0, blur: 0,
    reveal: 1, jitterX: 0, jitterY: 0, flash: 0, bob: 0,
  };
  if (t < 0) return state;
  if (Number.isFinite(timing.duration)) {
    const total = timing.duration + exitDur;
    if (t > total) return state;
  }
  const e = clamp01(t / enterDur);
  let enterAlpha = 1;
  let enterExtra: (s: CaptionAnimState, eased: number, raw: number) => void = () => undefined;

  switch (p) {
    case "fade-in":
      enterAlpha = applyEasing("easeOutCubic", e);
      break;
    case "fade-up":
      enterAlpha = applyEasing("easeOutCubic", e);
      enterExtra = (s, eased) => { s.dy = (1 - eased) * -26 * intensity; };
      break;
    case "fade-down":
      enterAlpha = applyEasing("easeOutCubic", e);
      enterExtra = (s, eased) => { s.dy = (1 - eased) * 26 * intensity; };
      break;
    case "pop-in":
      enterAlpha = applyEasing("easeOutCubic", e);
      enterExtra = (s, eased) => { s.scale = 0.6 + 0.4 * eased; };
      break;
    case "scale-bounce":
      enterAlpha = applyEasing("easeOutCubic", Math.min(1, e * 1.4));
      enterExtra = (s, _ed, raw) => {
        s.scale = applyEasing("easeOutElastic", clamp01(raw));
      };
      break;
    case "slide-left":
      enterAlpha = applyEasing("easeOutCubic", e);
      enterExtra = (s, eased) => { s.dx = (1 - eased) * -70 * intensity; };
      break;
    case "slide-right":
      enterAlpha = applyEasing("easeOutCubic", e);
      enterExtra = (s, eased) => { s.dx = (1 - eased) * 70 * intensity; };
      break;
    case "slide-up":
      enterAlpha = applyEasing("easeOutCubic", e);
      enterExtra = (s, eased) => { s.dy = (1 - eased) * 70 * intensity; };
      break;
    case "slide-down":
      enterAlpha = applyEasing("easeOutCubic", e);
      enterExtra = (s, eased) => { s.dy = (1 - eased) * -70 * intensity; };
      break;
    case "typewriter":
    case "word-reveal":
    case "character-reveal":
    case "mask-reveal":
    case "split-reveal":
      enterAlpha = 1;
      enterExtra = (s, eased) => { s.reveal = eased; };
      break;
    case "elastic":
      enterAlpha = applyEasing("easeOutCubic", Math.min(1, e * 1.3));
      enterExtra = (s, _ed, raw) => { s.scale = 0.4 + 0.6 * applyEasing("easeOutElastic", clamp01(raw)); };
      break;
    case "overshoot":
      enterAlpha = applyEasing("easeOutCubic", e);
      enterExtra = (s, _ed, raw) => { s.scale = 0.7 + 0.3 * applyEasing("easeOutBack", clamp01(raw)); };
      break;
    case "blur-reveal":
      enterAlpha = applyEasing("easeOutCubic", e);
      enterExtra = (s, eased) => { s.blur = (1 - eased) * 14; };
      break;
    case "glitch": {
      enterAlpha = Math.min(1, e * 2.2);
      const rng = mulberry32(hashString(p) + Math.floor(localT * 30));
      const decay = Math.max(0, 1 - e * 1.6);
      state.jitterX = (rng() - 0.5) * 26 * decay * intensity;
      state.jitterY = (rng() - 0.5) * 14 * decay * intensity;
      break;
    }
    case "shake": {
      enterAlpha = applyEasing("easeOutCubic", Math.min(1, e * 2));
      const decay = Math.max(0.12, 1 - e * 0.6);
      state.jitterX = Math.sin(t * 46) * 7 * decay * intensity;
      state.jitterY = Math.cos(t * 39) * 5 * decay * intensity;
      break;
    }
    case "smooth-floating":
      enterAlpha = applyEasing("easeInOutSine", e);
      state.bob = Math.sin(t * Math.PI * 2 * 0.7) * 6 * intensity;
      break;
  }

  const eased = e >= 1 ? 1 : e;
  enterExtra(state, applyEasing(p === "pop-in" ? "easeOutBack" : "easeOutCubic", eased), eased);
  state.alpha = enterAlpha;

  // Exit bawaan: fade + turun halus ke arah berlawanan masuknya.
  if (Number.isFinite(timing.duration)) {
    const exitStart = timing.duration;
    const x = clamp01((t - exitStart) / exitDur);
    if (x > 0) {
      const ex = applyEasing("easeInCubic", x);
      state.alpha *= 1 - ex;
      state.dy += ex * 20 * intensity;
      state.scale *= 1 - 0.06 * ex;
    }
  }
  return state;
}
