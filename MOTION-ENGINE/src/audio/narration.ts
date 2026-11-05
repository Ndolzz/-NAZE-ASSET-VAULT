/**
 * Narration engines and narration-track assembly.
 *
 * Engines:
 *   - "espeak-ng": CI demo synthesis, one audio file per CC cue, measured with
 *     ffprobe, so caption timing follows actual speech exactly.
 *   - "file": a user-supplied voice recording (per project). Cue durations are
 *     estimated from the narration text, so CC sync is approximate; the
 *     recording plays continuously in one piece.
 *
 * In both cases the final narration track is assembled at the exact timeline
 * positions of the cues, so narration, burned-in CC, and SFX stay aligned even
 * across scene boundaries (scene padding becomes silence, never drift).
 */
import * as fs from "node:fs";
import { run, probeDuration } from "../render/encoder";

export interface NarrationConfig {
  engine: "espeak-ng" | "file";
  language?: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  /** Repository-relative path to the manual voice recording (engine "file"). */
  file?: string;
}

export interface SynthesizedCue {
  wavFile: string;
  duration: number;
}

export interface SynthesisResult {
  cues: SynthesizedCue[];
}

/** One audio block placed at an absolute timeline position. */
export interface TrackSegment {
  file: string;
  /** Absolute start time on the video timeline (seconds). */
  at: number;
  /** Measured audio duration (seconds). */
  duration: number;
}

export async function synthesizeCues(
  cueTexts: string[],
  config: NarrationConfig,
  workDir: string
): Promise<SynthesisResult> {
  fs.mkdirSync(workDir, { recursive: true });
  const results: SynthesizedCue[] = [];

  if (config.engine !== "espeak-ng") {
    throw new Error(
      `Narration engine "${(config as { engine?: string }).engine}" is not supported here. Use "file" with a manual recording, or "espeak-ng" for CI demo synthesis.`
    );
  }

  for (let i = 0; i < cueTexts.length; i++) {
    const wav = `${workDir}/cue_${String(i).padStart(4, "0")}.wav`;
    const args = [
      "-v",
      config.voice ?? config.language ?? "en",
      "-s",
      String(config.speed ?? 150),
      "-p",
      String(config.pitch ?? 50),
      "-w",
      wav,
      cueTexts[i],
    ];
    const { code, stderr } = await run("espeak-ng", args);
    if (code !== 0 || !fs.existsSync(wav)) {
      throw new Error(`espeak-ng failed for cue ${i}: ${stderr.trim()}`);
    }
    const duration = await probeDuration(wav);
    results.push({ wavFile: wav, duration });
  }
  return { cues: results };
}

/**
 * Relative speech weight of one cue text (letters + constant, punctuation
 * adds a pause). Used to estimate cue durations for the manual-voice engine.
 */
export function cueWeight(text: string): number {
  const letters = text.replace(/[^\p{L}\p{N}]/gu, "").length + 2;
  const pause = /[.!?]$/.test(text.trim()) ? 6 : 0;
  return letters + pause;
}

/**
 * Concatenates audio segments into one narration track, inserting silence for
 * the gaps between segment positions so the track matches the video timeline.
 * Output: 48 kHz stereo PCM WAV.
 */
export async function assembleNarrationTrack(segments: TrackSegment[], outFile: string): Promise<string> {
  if (segments.length === 0) {
    throw new Error("No narration segments to assemble.");
  }
  const sorted = [...segments].sort((a, b) => a.at - b.at);

  const inputs: string[] = [];
  const chain: string[] = [];
  const labels: string[] = [];
  let cursor = 0;
  let inputIndex = 0;

  for (const seg of sorted) {
    const gap = seg.at - cursor;
    if (gap > 0.001) {
      inputs.push("-f", "lavfi", "-t", gap.toFixed(3), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
      chain.push(`[${inputIndex}:a]anull[a${inputIndex}]`);
      labels.push(`[a${inputIndex}]`);
      inputIndex++;
    } else if (gap < -0.001) {
      throw new Error(`Narration segments overlap at t=${seg.at.toFixed(3)}s.`);
    }
    inputs.push("-i", seg.file);
    chain.push(`[${inputIndex}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a${inputIndex}]`);
    labels.push(`[a${inputIndex}]`);
    inputIndex++;
    cursor = seg.at + seg.duration;
  }

  const filterComplex =
    chain.join(";") + ";" + labels.join("") + `concat=n=${labels.length}:v=0:a=1[aout]`;

  const { code, stderr } = await run("ffmpeg", [
    "-y",
    ...inputs,
    "-filter_complex",
    filterComplex,
    "-map",
    "[aout]",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-c:a",
    "pcm_s16le",
    outFile,
  ]);
  if (code !== 0) {
    throw new Error(`Narration track assembly failed: ${stderr.split("\n").slice(-6).join("\n")}`);
  }
  return outFile;
}
