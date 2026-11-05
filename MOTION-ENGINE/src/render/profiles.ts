/**
 * Output profiles. Native render resolution - no upscaling, never below 1080p.
 */
export interface RenderProfile {
  id: string;
  width: number;
  height: number;
  fps: number;
  scale: number;
}

export const profiles: RenderProfile[] = [
  { id: "vertical-1080", width: 1080, height: 1920, fps: 60, scale: 1 },
  { id: "vertical-1440", width: 1440, height: 2560, fps: 60, scale: 1440 / 1080 },
  { id: "vertical-2160", width: 2160, height: 3840, fps: 60, scale: 2 },
];

export const DEFAULT_PROFILE = "vertical-1080";

export function getProfile(id: string): RenderProfile {
  const p = profiles.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown profile "${id}". Available: ${profiles.map((x) => x.id).join(", ")}`);
  if (p.width < 1080 || p.height < 1920) {
    throw new Error(`Profile "${id}" is below the permanent NAZE standard (1080x1920).`);
  }
  if (p.fps !== 60) {
    throw new Error(`Profile "${id}" must run at 60 FPS CFR.`);
  }
  return p;
}
