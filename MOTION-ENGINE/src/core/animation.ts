/**
 * Animation presets built on top of the keyframe engine.
 * Every scene receives intentional motion (no static slideshow output).
 */
import { Keyframe, sampleTrack } from "./keyframes";
import { applyEasing } from "./easing";

/** Motion intensity multiplier applied by style/project (0..1). */
export function intensityFactor(intensity: number): number {
  return Math.max(0.15, Math.min(1, intensity));
}

export function popInTrack(intensity = 1): Keyframe[] {
  const d = 0.55 / intensityFactor(intensity);
  return [
    { t: 0, value: 0 },
    { t: d, value: 1, easing: "easeOutBack" },
  ];
}

export function fadeInTrack(intensity = 1): Keyframe[] {
  const d = 0.4 / intensityFactor(intensity);
  return [
    { t: 0, value: 0 },
    { t: d, value: 1, easing: "easeOutCubic" },
  ];
}

export function slideTrack(from: number, to: number, duration: number, easing = "easeOutCubic"): Keyframe[] {
  return [
    { t: 0, value: from },
    { t: duration, value: to, easing },
  ];
}

/** Continuous idle float (sine based, frame-time deterministic). */
export function floatOffset(t: number, amplitude: number, cyclesPerSecond: number, phase = 0): number {
  return Math.sin(t * cyclesPerSecond * Math.PI * 2 + phase) * amplitude;
}

/** Slow camera push-in (Ken Burns style). */
export function cameraScale(t: number, duration: number, amount = 0.06): number {
  const p = duration <= 0 ? 1 : Math.min(1, t / duration);
  return 1 + applyEasing("easeInOutSine", p) * amount;
}

/** Per-word stagger start for kinetic typography. */
export function wordStagger(wordIndex: number, perWord = 0.09, base = 0.15): number {
  return base + wordIndex * perWord;
}

/** Subtle rotational wobble for objects. */
export function wobble(t: number, amplitudeDeg: number, cyclesPerSecond: number, phase = 0): number {
  return Math.sin(t * cyclesPerSecond * Math.PI * 2 + phase) * amplitudeDeg;
}

/** Evaluate a 0..1 "enter" value from a popIn track. */
export function enterValue(track: Keyframe[], localT: number): number {
  return sampleTrack(track, localT);
}
