/**
 * FFmpeg encoder command builder.
 * Permanent standard: H.264, yuv420p, 60 FPS CFR, AAC audio, MP4 container.
 */
import { spawn } from "node:child_process";

export interface EncodeOptions {
  width: number;
  height: number;
  fps: number;
  duration: number;
  mixedAudioFile: string;
  outFile: string;
  title: string;
  preset?: string;
  crf?: number;
}

export function buildEncodeArgs(opts: EncodeOptions): string[] {
  return [
    "-y",
    "-f",
    "rawvideo",
    "-pixel_format",
    "rgba",
    "-video_size",
    `${opts.width}x${opts.height}`,
    "-framerate",
    String(opts.fps),
    "-i",
    "pipe:0",
    "-i",
    opts.mixedAudioFile,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-preset",
    opts.preset ?? "veryfast",
    "-crf",
    String(opts.crf ?? 18),
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(opts.fps),
    "-fps_mode",
    "cfr",
    "-c:a",
    "aac",
    "-af",
    "apad",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "-movflags",
    "+faststart",
    "-t",
    opts.duration.toFixed(3),
    "-metadata",
    `title=${opts.title}`,
    "-metadata",
    "artist=NAZE",
    opts.outFile,
  ];
}

export function spawnFfmpeg(args: string[]): any {
  const child = spawn("ffmpeg", ["-hide_banner", "-loglevel", "warning", "-stats", ...args], {
    stdio: ["pipe", "inherit", "inherit"],
  });
  return child;
}

/** Runs a command, resolves with { code, stdout, stderr }. */
export function run(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.on("error", (err) => resolve({ code: 1, stdout, stderr: String(err) }));
  });
}

/** Measures a media file duration in seconds via ffprobe. */
export async function probeDuration(file: string): Promise<number> {
  const { code, stdout, stderr } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  if (code !== 0) throw new Error(`ffprobe failed for ${file}: ${stderr.trim()}`);
  const d = parseFloat(stdout.trim());
  if (!isFinite(d) || d <= 0) throw new Error(`Invalid duration reported for ${file}: "${stdout.trim()}"`);
  return d;
}