/**
 * Camera rig for Editorial Kinetic Motion.
 * Zoom, pan, roll, dolly, and target tracking with smooth interpolation
 * between keyframed shots. Falls back to a gentle push-in when a scene has
 * no camera spec (styles with motion.camera enabled).
 */
import { CameraSpec, CameraShot } from "./types";
import { applyEasing } from "../core/easing";

export interface CameraState {
  zoom: number;
  panX: number;
  panY: number;
  rotateDeg: number;
  dolly: number;
  trackId: string | null;
}

interface NormalizedShot {
  at: number;
  zoom: number;
  panX: number;
  panY: number;
  rotate: number;
  dolly: number;
  track: string | null;
  ease: string;
}

function normalizeShot(shot: CameraShot): NormalizedShot {
  return {
    at: shot.at,
    zoom: shot.zoom ?? 1,
    panX: shot.panX ?? 0,
    panY: shot.panY ?? 0,
    rotate: shot.rotate ?? 0,
    dolly: shot.dolly ?? 0,
    track: shot.track ?? null,
    ease: shot.ease ?? "easeInOutSine",
  };
}

const NUMERIC_FIELDS = ["zoom", "panX", "panY", "rotate", "dolly"] as const;

function lerpShot(a: NormalizedShot, b: NormalizedShot, e: number): NormalizedShot {
  const out: NormalizedShot = {
    at: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    rotate: 0,
    dolly: 0,
    track: e >= 0.5 ? b.track : a.track,
    ease: b.ease,
  };
  for (const field of NUMERIC_FIELDS) {
    const av = a[field];
    const bv = b[field];
    (out as any)[field] = av + (bv - av) * e;
  }
  return out;
}

/**
 * Evaluates the camera at scene-local time t.
 * `layerCenters` maps layer ids to normalized centers, used by tracking.
 */
export function evaluateCamera(
  spec: CameraSpec | null | undefined,
  localT: number,
  sceneDuration: number,
  layerCenters: Map<string, { x: number; y: number }>
): CameraState {
  const shots: NormalizedShot[] = (spec && Array.isArray(spec.shots)
    ? spec.shots.filter((s) => s && typeof s.at === "number")
    : []
  ).map(normalizeShot).sort((a, b) => a.at - b.at);

  let cur: NormalizedShot;
  if (shots.length === 0) {
    // Default rig: gentle push-in with a slight upward drift.
    const p = sceneDuration <= 0 ? 1 : Math.min(1, localT / sceneDuration);
    const e = applyEasing("easeInOutSine", p);
    cur = { at: 0, zoom: 1 + e * 0.06, panX: 0, panY: -0.015 * e, rotate: 0, dolly: 0, track: null, ease: "linear" };
  } else if (localT <= shots[0].at) {
    cur = shots[0];
  } else {
    let b = shots[shots.length - 1];
    let a = b;
    for (let i = 0; i < shots.length - 1; i++) {
      if (localT >= shots[i].at && localT <= shots[i + 1].at) {
        a = shots[i];
        b = shots[i + 1];
        break;
      }
    }
    const span = b.at - a.at;
    const local = span <= 0 ? 1 : (localT - a.at) / span;
    cur = lerpShot(a, b, applyEasing(b.ease, local));
  }

  let state: CameraState = {
    zoom: cur.zoom,
    panX: cur.panX,
    panY: cur.panY,
    rotateDeg: cur.rotate,
    dolly: cur.dolly,
    trackId: cur.track,
  };

  // Tracking: steer the camera toward the followed layer's center.
  if (state.trackId && state.dolly > 0) {
    const center = layerCenters.get(state.trackId);
    if (center) {
      state.panX += (center.x - 0.5) * state.dolly;
      state.panY += (center.y - 0.5) * state.dolly;
      state.zoom += state.dolly * 0.22;
    }
  }

  // Safety clamps keep the frame composited inside the canvas.
  state.zoom = Math.max(0.6, Math.min(2.4, state.zoom));
  state.panX = Math.max(-0.4, Math.min(0.4, state.panX));
  state.panY = Math.max(-0.4, Math.min(0.4, state.panY));
  state.rotateDeg = Math.max(-12, Math.min(12, state.rotateDeg));
  return state;
}
