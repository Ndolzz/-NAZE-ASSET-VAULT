/**
 * Audio mixer: narration stays dominant; SFX support the visuals;
 * background music is NEVER added automatically (explicit request only).
 */
import * as fs from "node:fs";
import { run } from "../render/encoder";
import { SfxEvent } from "../core/timeline";

export interface MixOptions {
  narrationFile: string;
  sfx: SfxEvent[];
  outFile: string;
  /** Only set when the user explicitly requested background music. */
  musicFile?: string | null;
  musicVolume?: number;
}

export async function mixAudio(opts: MixOptions): Promise<string> {
  const inputs: string[] = ["-i", opts.narrationFile];
  const filters: string[] = [];

  // Narration chain (dominant, normalized, limited)
  filters.push("[0:a]aresample=48000,volume=1.0,alimiter=limit=0.95[narr]");

  const mixLabels = ["[narr]"];
  let inputIndex = 1;

  for (const sfx of opts.sfx) {
    if (!fs.existsSync(sfx.file)) {
      console.warn(`[AUDIO] SFX not found, skipping: ${sfx.file}`);
      continue;
    }
    inputs.push("-i", sfx.file);
    const delayMs = Math.max(0, Math.round(sfx.at * 1000));
    filters.push(
      `[${inputIndex}:a]aresample=48000,volume=${sfx.volume.toFixed(2)},adelay=delays=${delayMs}|${delayMs}[sfx${inputIndex}]`
    );
    mixLabels.push(`[sfx${inputIndex}]`);
    inputIndex++;
  }

  if (opts.musicFile) {
    if (!fs.existsSync(opts.musicFile)) {
      throw new Error(`Explicit background music file not found: ${opts.musicFile}`);
    }
    inputs.push("-stream_loop", "-1", "-i", opts.musicFile);
    filters.push(`[${inputIndex}:a]aresample=48000,volume=${(opts.musicVolume ?? 0.18).toFixed(2)}[music]`);
    mixLabels.push("[music]");
    inputIndex++;
  }

  const n = mixLabels.length;
  const fc = [
    ...filters,
    `${mixLabels.join("")}amix=inputs=${n}:duration=first:normalize=0,alimiter=limit=0.95[aout]`,
  ].join(";");

  const args = [
    "-y",
    ...inputs,
    "-filter_complex",
    fc,
    "-map",
    "[aout]",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-c:a",
    "pcm_s16le",
    opts.outFile,
  ];
  const { code, stderr } = await run("ffmpeg", args);
  if (code !== 0) {
    throw new Error(`Audio mixing failed: ${stderr.split("\n").slice(-5).join("\n")}`);
  }
  return opts.outFile;
}
