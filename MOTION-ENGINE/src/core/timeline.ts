/**
 * Timeline model: scenes, caption cues, per-scene timing at 60 FPS.
 */
import { CaptionCue, buildCuesFromDurations, splitIntoCueTexts } from "../captions/segmenter";

export interface SfxEvent {
  file: string;
  volume: number;
  /** Absolute time on the timeline. */
  at: number;
}

export type Subject =
  | { kind: "character"; mood: "happy" | "excited" | "thinking" | "shocked" | "neutral" }
  | { kind: "object"; name: string }
  | { kind: "chart"; data: number[]; label?: string }
  | { kind: "icon"; name: string };

export interface SceneDef {
  id: string;
  narration: string;
  title?: string;
  subjects: Subject[];
  sfx?: Array<{ file: string; volume: number; at: number }>;
  styleOverride?: string;
}

export interface SceneTiming {
  scene: SceneDef;
  start: number;
  end: number;
  duration: number;
  cues: CaptionCue[];
}

export interface Timeline {
  scenes: SceneTiming[];
  cues: CaptionCue[];
  sfx: SfxEvent[];
  duration: number;
  frameCount: number;
  fps: number;
}

export interface SceneCuePlan {
  sceneId: string;
  cueTexts: string[];
}

/** Plans cue texts per scene (used by the narration synthesizer). */
export function planSceneCues(scenes: SceneDef[]): SceneCuePlan[] {
  return scenes.map((scene) => ({
    sceneId: scene.id,
    cueTexts: splitIntoCueTexts(scene.narration),
  }));
}

/**
 * Assembles the final timeline from per-scene measured cue durations.
 * Adds a short tail pad per scene so scenes breathe before the transition.
 */
export function buildTimeline(
  scenes: SceneDef[],
  cueDurations: Map<string, number[]>,
  fps: number,
  tailPad = 0.35,
  leadPad = 0.2
): Timeline {
  const timings: SceneTiming[] = [];
  const allCues: CaptionCue[] = [];
  const sfx: SfxEvent[] = [];
  let cursor = 0;

  scenes.forEach((scene, sceneIndex) => {
    const plan = splitIntoCueTexts(scene.narration);
    const durations = cueDurations.get(scene.id) ?? [];
    const sceneStart = cursor;
    let sceneCues: CaptionCue[] = [];
    let sceneCueEnd = sceneStart;

    if (plan.length > 0 && durations.length === plan.length) {
      const offset = sceneStart + (sceneIndex === 0 ? leadPad : tailPad);
      sceneCues = buildCuesFromDurations(scene.id, plan, durations, offset);
      sceneCueEnd = sceneCues[sceneCues.length - 1].end;
    } else if (plan.length > 0) {
      throw new Error(
        `Scene ${scene.id}: measured cue durations (${durations.length}) do not match planned cues (${plan.length}).`
      );
    } else {
      // Scene without narration: fixed minimum duration.
      sceneCueEnd = sceneStart + tailPad;
    }

    const end = sceneCueEnd + tailPad;
    timings.push({ scene, start: sceneStart, end, duration: end - sceneStart, cues: sceneCues });
    allCues.push(...sceneCues);

    for (const event of scene.sfx ?? []) {
      sfx.push({ file: event.file, volume: event.volume, at: sceneStart + event.at });
    }
    cursor = end;
  });

  const duration = Math.max(tailPad, cursor);
  return {
    scenes: timings,
    cues: allCues,
    sfx,
    duration,
    frameCount: Math.max(1, Math.round(duration * fps)),
    fps,
  };
}

/** Finds the active scene for time t. */
export function sceneAt(timeline: Timeline, t: number): SceneTiming {
  const scenes = timeline.scenes;
  for (const s of scenes) {
    if (t >= s.start && t < s.end) return s;
  }
  return scenes[scenes.length - 1];
}

/** Finds the active CC cue for time t (null when no narration is active). */
export function cueAt(timeline: Timeline, t: number): CaptionCue | null {
  for (const c of timeline.cues) {
    if (t >= c.start && t < c.end + 0.05) return c;
  }
  return null;
}
