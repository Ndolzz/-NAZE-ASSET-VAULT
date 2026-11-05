/**
 * Narration synthesis.
 * Supports CI demo synthesis via espeak-ng: each CC cue is synthesized
 * separately and measured, so caption timing follows actual speech exactly.
 * Production TTS audio can replace this stage (see docs/PIPELINE.md).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { run, probeDuration } from "../render/encoder";

export interface NarrationConfig {
  engine: "espeak-ng" | "file";
  language?: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  file?: string;
}

export interface SynthesizedCue {
  wavFile: string;
  duration: number;
}

export interface SynthesisResult {
  cues: SynthesizedCue[];
}

export async function synthesizeCues(
  cueTexts: string[],
  config: NarrationConfig,
  workDir: string
): Promise<SynthesisResult> {
  fs.mkdirSync(workDir, { recursive: true });
  const results: SynthesizedCue[] = [];

  if (config.engine !== "espeak-ng") {
    throw new Error(`Narration engine "${(config as any).engine}" is not supported. Use "espeak-ng" (CI demo) or provide narration audio files named cue_0000.wav in the scene workdir.`);
  }

  for (let i = 0; i < cueTexts.length; i++) {
    const wav = path.join(workDir, `cue_${String(i).padStart(4, "0")}.wav`);
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

/** Concatenates cue wav files into narration.wav (48 kHz stereo). */
export async function concatenateCues(cues: SynthesizedCue[], outFile: string): Promise<number> {
  const listFile = outFile + ".concat.txt";
  const lines = cues.map((c) => `file '${c.wavFile.replace(/'/g, "'\\''")}'`).join("\n");
  fs.writeFileSync(listFile, lines, "utf-8");
  const { code, stderr } = await run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listFile,
    "-ar",
    "48000",
    "-ac",
    "2",
    "-c:a",
    "pcm_s16le",
    outFile,
  ]);
  if (code !== 0) throw new Error(`Cue concatenation failed: ${stderr.trim()}`);
  return probeDuration(outFile);
}
