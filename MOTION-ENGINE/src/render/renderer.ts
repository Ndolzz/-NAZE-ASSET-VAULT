/**
 * Main renderer: draws every frame at native profile resolution and pipes
 * raw RGBA data into ffmpeg stdin. No silent downscaling or upscaling.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { Timeline, sceneAt } from "../core/timeline";
import { Palette } from "../color/palette";
import { StyleDef } from "../styles/types";
import { RenderProfile } from "./profiles";
import { buildEncodeArgs, spawnFfmpeg } from "./encoder";
import { ComposerKit, renderSceneFrame } from "./scene-composer";
import { getTransition, TRANSITION_DURATION } from "../core/transitions";

/**
 * Registers the style's font files (vault paths, repository-relative) under
 * the style's family alias, with a generic sans-serif fallback.
 */
export function registerFonts(repoRoot: string, style: StyleDef): { fontFamily: string; registered: number } {
  let registered = 0;
  for (const rel of style.typography.fontFiles) {
    const abs = path.join(repoRoot, rel);
    if (!fs.existsSync(abs)) continue;
    if (GlobalFonts.registerFromPath(abs, style.typography.fontFamily)) registered++;
  }
  if (registered === 0) {
    console.warn(`[RENDER] No vault fonts registered for style "${style.id}"; using system fallback.`);
    return { fontFamily: "sans-serif", registered: 0 };
  }
  return { fontFamily: style.typography.fontFamily, registered };
}

export interface RenderVideoOptions {
  profile: RenderProfile;
  timeline: Timeline;
  palette: Palette;
  style: StyleDef;
  repoRoot: string;
  outFile: string;
  mixedAudioFile: string;
  title: string;
  animationIntensity: number;
  burnInCc: boolean;
  accentWords: boolean;
}

export async function renderVideo(opts: RenderVideoOptions): Promise<{ frames: number; duration: number }> {
  const { profile, timeline, style } = opts;
  const fps = timeline.fps;
  const duration = timeline.duration;
  const totalFrames = Math.max(1, timeline.frameCount);
  const { w, h } = profile;

  const kit: ComposerKit = {
    palette: opts.palette,
    style,
    fontFamily: registerFonts(opts.repoRoot, style).fontFamily,
    scale: profile.scale,
    animationIntensity: opts.animationIntensity * style.animation.intensity,
    burnInCc: opts.burnInCc,
    accentWords: opts.accentWords,
    w,
    h,
    timeline,
  };

  const args = buildEncodeArgs({
    width: w,
    height: h,
    fps,
    duration,
    mixedAudioFile: opts.mixedAudioFile,
    outFile: opts.outFile,
    title: opts.title,
  });

  fs.mkdirSync(path.dirname(opts.outFile), { recursive: true });
  const ffmpeg = spawnFfmpeg(args);
  ffmpeg.stdin.on("error", () => undefined); // survive EPIPE on failure

  // Two reusable canvases for transition compositing.
  const canvasA = createCanvas(w, h);
  const canvasB = createCanvas(w, h);
  const ctxA = canvasA.getContext("2d");
  const ctxB = canvasB.getContext("2d");

  const t0 = Date.now();
  const logEvery = Math.max(1, Math.floor(totalFrames / 20));
  const transitionFns = style.transitions.map((id) => getTransition(id));

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / fps;
    const timing = sceneAt(timeline, t);
    const localT = t - timing.start;
    const sceneIndex = timeline.scenes.indexOf(timing);

    if (sceneIndex > 0 && localT < TRANSITION_DURATION && transitionFns.length > 0) {
      const prevTiming = timeline.scenes[sceneIndex - 1];
      renderSceneFrame(ctxA, prevTiming, kit, prevTiming.end - 0.001);
      renderSceneFrame(ctxB, timing, kit, t);
      const p = Math.min(1, localT / TRANSITION_DURATION);
      const fn = transitionFns[(sceneIndex - 1) % transitionFns.length];
      // Fresh main canvas: the transition composites both scenes onto it.
      const main = createCanvas(w, h);
      const ctx = main.getContext("2d");
      fn(ctx, canvasA, canvasB, p, w, h, opts.palette);
      await writeFrame(ffmpeg, ctx, w, h);
    } else {
      renderSceneFrame(ctxA, timing, kit, t);
      await writeFrame(ffmpeg, ctxA, w, h);
    }

    if (frame % logEvery === 0) {
      const pct = ((frame / totalFrames) * 100).toFixed(1);
      const fpsNow = (frame + 1) / Math.max(0.001, (Date.now() - t0) / 1000);
      console.log(`[RENDER] Frame ${frame + 1}/${totalFrames} (${pct}%) - ${fpsNow.toFixed(1)} fps`);
    }
  }
  ffmpeg.stdin.end();
  await new Promise<void>((resolve, reject) => {
    ffmpeg.on("close", (code: number | null) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}.`));
    });
    ffmpeg.on("error", reject);
  });
  console.log(`[RENDER] Encoded ${totalFrames} frames (${duration.toFixed(2)}s) -> ${opts.outFile}`);
  return { frames: totalFrames, duration };
}

function writeFrame(ffmpeg: any, ctx: any, w: number, h: number): Promise<void> {
  const pixels = ctx.getImageData(0, 0, w, h).data;
  const view = Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength);
  if ((ffmpeg.stdin as any).write(view)) return Promise.resolve();
  // Backpressure: wait until the encoder has drained its stdin buffer.
  return new Promise<void>((resolve) => {
    (ffmpeg.stdin as any).once("drain", () => resolve());
  });
}
