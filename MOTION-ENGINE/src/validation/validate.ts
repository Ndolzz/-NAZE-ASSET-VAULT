/**
 * Automatic output validation. All 12 mandatory checks must pass before a
 * render can be reported as successful. Project configuration cannot disable
 * these checks; only an explicit user override documented in the render
 * report may bypass them.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { run } from "../render/encoder";
import { RenderProfile } from "../render/profiles";

export interface CheckResult {
  id: string;
  name: string;
  pass: boolean;
  detail: string;
}

export interface ValidationReport {
  pass: boolean;
  checks: CheckResult[];
}

export interface ValidateOptions {
  outFile: string;
  profile: RenderProfile;
  hasNarration: boolean;
  srtFile: string;
  vttFile: string;
  cueCoverageOk: boolean;
  illustrationCount: number;
  failedScenes: string[];
  narrationDuration: number;
}

interface ProbeStream {
  codec_type?: string;
  codec_name?: string;
  pix_fmt?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  duration?: string;
}

interface ProbeResult {
  streams?: ProbeStream[];
  format?: { duration?: string; size?: string };
}

function parseRate(rate?: string): number {
  if (!rate) return 0;
  const [num, den] = rate.split("/").map(Number);
  if (!den) return 0;
  return num / den;
}

export async function validateOutput(opts: ValidateOptions): Promise<ValidationReport> {
  const checks: CheckResult[] = [];
  const add = (id: string, name: string, pass: boolean, detail: string) =>
    checks.push({ id, name, pass, detail });

  const exists = fs.existsSync(opts.outFile);
  add("file-exists", "File MP4 ada", exists, exists ? opts.outFile : "File output tidak ditemukan.");
  if (!exists) return { pass: false, checks };

  const { code, stdout, stderr } = await run("ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    opts.outFile,
  ]);
  if (code !== 0) {
    add("ffprobe", "FFprobe dapat membaca file", false, stderr.trim());
    return { pass: false, checks };
  }
  add("ffprobe", "FFprobe dapat membaca file", true, "Metadata terbaca.");
  const probe: ProbeResult = JSON.parse(stdout);
  const video = (probe.streams ?? []).find((s) => s.codec_type === "video");
  const audio = (probe.streams ?? []).find((s) => s.codec_type === "audio");
  const fmtDuration = parseFloat(probe.format?.duration ?? "0");

  // 1. Resolution
  const resOk = video?.width === opts.profile.width && video?.height === opts.profile.height;
  add(
    "resolution",
    `Resolusi ${opts.profile.width}x${opts.profile.height}`,
    resOk,
    `Terdeteksi ${video?.width}x${video?.height}.`
  );

  // 2. Frame rate 60 CFR
  const r = parseRate(video?.r_frame_rate);
  const ar = parseRate(video?.avg_frame_rate);
  const fpsOk = Math.abs(r - 60) < 0.01 && Math.abs(ar - 60) < 0.01;
  add(
    "fps-cfr",
    "Frame rate 60 FPS CFR",
    fpsOk,
    `r_frame_rate=${video?.r_frame_rate}, avg_frame_rate=${video?.avg_frame_rate}.`
  );

  // 3. Aspect 9:16
  const ratio = (video?.width ?? 0) / (video?.height ?? 1);
  const ratioOk = Math.abs(ratio - 9 / 16) < 0.01;
  add("aspect", "Rasio 9:16", ratioOk, `Rasio terdeteksi ${ratio.toFixed(4)}.`);

  // 4. Video codec
  const h264Ok = video?.codec_name === "h264";
  add("video-codec", "Codec video H.264", h264Ok, `Codec: ${video?.codec_name}.`);

  // 4b. Pixel format
  const pixOk = video?.pix_fmt === "yuv420p";
  add("pix-fmt", "Pixel format yuv420p", pixOk, `Pix_fmt: ${video?.pix_fmt}.`);

  // 5. Audio codec
  const aacOk = audio?.codec_name === "aac";
  add("audio-codec", "Codec audio AAC", aacOk, `Codec: ${audio?.codec_name}.`);

  // 6. Narration audio present
  const narrOk = !!audio && audio.channels! > 0;
  add("narration", "Audio narasi tersedia", narrOk, audio ? `Stream audio: ${audio.channels} channel.` : "Tidak ada stream audio.");

  // 7. CC present + synced
  const srtOk = fs.existsSync(opts.srtFile);
  const vttOk = fs.existsSync(opts.vttFile);
  const ccOk = srtOk && vttOk && opts.cueCoverageOk;
  add(
    "cc",
    "CC tersedia dan tersinkronisasi",
    ccOk,
    `SRT: ${srtOk}, VTT: ${vttOk}, coverage: ${opts.cueCoverageOk}.`
  );

  // 8. Illustrations present
  const illoOk = opts.illustrationCount > 0;
  add(
    "illustrations",
    "Ilustrasi tersedia dalam komposisi",
    illoOk,
    `${opts.illustrationCount} ilustrasi orisinal dirender ke dalam komposisi video.`
  );

  // 9. No failed scenes
  const sceneOk = opts.failedScenes.length === 0;
  add(
    "scenes",
    "Tidak ada scene gagal dirender",
    sceneOk,
    sceneOk ? "Semua scene berhasil." : `Gagal: ${opts.failedScenes.join(", ")}.`
  );

  // 10. File decodable
  const decode = await run("ffmpeg", ["-v", "error", "-i", opts.outFile, "-f", "null", "-"]);
  add("decode", "File MP4 dapat diputar", decode.code === 0, decode.code === 0 ? "Decode penuh tanpa error." : decode.stderr.trim().slice(0, 300));

  // 11. A/V duration match (video may pad tails beyond raw narration by design)
  const videoDur = parseFloat(video?.duration ?? "0") || fmtDuration;
  const audioDur = parseFloat(audio?.duration ?? "0");
  const durOk =
    audioDur > 0 &&
    Math.abs(fmtDuration - videoDur) < 0.5 &&
    Math.abs(videoDur - audioDur) < 0.5 &&
    videoDur + 0.25 >= opts.narrationDuration;
  add(
    "duration",
    "Durasi audio dan video sesuai",
    durOk,
    `Video ${fmtDuration.toFixed(2)}s, audio ${audioDur.toFixed(2)}s, narasi ${opts.narrationDuration.toFixed(2)}s.`
  );

  // 12. Non-empty / non-corrupt
  const size = fs.statSync(opts.outFile).size;
  const sizeOk = size > 1000;
  add("integrity", "File tidak kosong atau rusak", sizeOk, `Ukuran file: ${size} byte.`);

  return { pass: checks.every((c) => c.pass), checks };
}

export function formatReport(report: ValidationReport): string {
  const lines: string[] = [];
  lines.push(report.pass ? "SEMUA VALIDASI LOLOS" : "VALIDASI GAGAL");
  for (const c of report.checks) {
    lines.push(`${c.pass ? "[PASS]" : "[FAIL]"} ${c.name} - ${c.detail}`);
  }
  return lines.join("\n");
}
