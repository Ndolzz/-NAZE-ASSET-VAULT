/**
 * Keyframe sampling engine.
 * A track is a sorted list of keyframes; values are interpolated with easing.
 */
import { applyEasing } from "./easing";

export interface Keyframe {
  t: number;
  value: number;
  /** Easing applied on the segment ENDING at this keyframe. */
  easing?: string;
}

export function sampleTrack(track: Keyframe[], t: number): number {
  if (!track || track.length === 0) return 0;
  if (track.length === 1 || t <= track[0].t) return track[0].value;
  const last = track[track.length - 1];
  if (t >= last.t) return last.value;
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i];
    const b = track[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t;
      const local = span <= 0 ? 1 : (t - a.t) / span;
      const eased = applyEasing(b.easing ?? "linear", local);
      return a.value + (b.value - a.value) * eased;
    }
  }
  return last.value;
}

export interface Vec2 {
  x: number;
  y: number;
}

export function sampleVec2(tx: Keyframe[], ty: Keyframe[], t: number): Vec2 {
  return { x: sampleTrack(tx, t), y: sampleTrack(ty, t) };
}

/** Normalised progress of t inside [start, end], eased. */
export function progress(t: number, start: number, end: number, easing = "linear"): number {
  if (end <= start) return t >= end ? 1 : 0;
  return applyEasing(easing, (t - start) / (end - start));
}
