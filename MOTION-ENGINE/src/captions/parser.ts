/**
 * Caption Parser: mengimpor berkas SRT dan WebVTT menjadi cue engine.
 *
 * Perilaku parsing:
 *  - Blok tanpa timestamp atau dengan format waktu tidak valid melempar
 *    error yang menyebut nomor blok (tidak ada timestamp palsu).
 *  - Blok dengan teks kosong dilewati.
 *  - Header WebVTT, baris NOTE, dan cue settings setelah timestamp diabaikan.
 *  - Segment yang tumpang tindih dinormalisasi saat konversi ke cue: start
 *    di-clamp ke akhir cue sebelumnya (dokumentasi lihat docs/ADAPTIVE-CAPTIONS.md).
 */
import { CaptionCue, CaptionWord, distributeWords } from "./segmenter";

export interface ParsedCaptionLine {
  index: number;
  text: string;
  start: number;
  end: number;
}

const TIME_RE = /^(\d{1,2}):(\d{1,2}):(\d{1,2})[.,](\d{1,3})$/;
const TIME_RE_SHORT = /^(\d{1,2}):(\d{1,2})[.,](\d{1,3})$/;

/** Mengubah string timestamp SRT/VTT menjadi detik; melempar error bila invalid. */
export function parseTimestamp(raw: string, context: string): number {
  const s = (raw ?? "").trim();
  const m = TIME_RE.exec(s) ?? TIME_RE_SHORT.exec(s);
  if (!m) {
    throw new Error(`Timestamp tidak valid (${context}): "${s}".`);
  }
  const parts = m.slice(1).map(Number);
  let h = 0;
  let min: number;
  let sec: number;
  let ms: number;
  if (m.length === 5) {
    h = parts[0];
    min = parts[1];
    sec = parts[2];
    ms = parts[3];
  } else {
    min = parts[0];
    sec = parts[1];
    ms = parts[2];
  }
  if (min > 59 || sec > 59) {
    throw new Error(`Timestamp tidak valid (${context}): "${s}".`);
  }
  const padMs = String(ms).padStart(3, "0");
  return h * 3600 + min * 60 + sec + Number(padMs) / 1000;
}

interface RawBlock {
  lineNo: number;
  timing: string;
  text: string;
}

function splitBlocks(content: string): RawBlock[] {
  const lines = (content ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: RawBlock[] = [];
  let current: RawBlock | null = null;
  const flush = () => {
    if (current !== null && current.text.trim().length > 0) blocks.push(current);
    current = null;
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      flush();
      continue;
    }
    if (trimmed.includes("-->")) {
      // Baris timestamp: mulai blok baru (blok sebelumnya diselesaikan).
      flush();
      current = { lineNo: blocks.length + 1, timing: trimmed, text: "" };
      continue;
    }
    if (/^(WEBVTT|NOTE\b)/.test(trimmed)) continue;
    if (current !== null) {
      current.text += (current.text.length > 0 ? "\n" : "") + trimmed;
    }
    // Baris lain di luar blok (nomor urut, teks liar) diabaikan.
  }
  flush();
  return blocks;
}

function parseBlockTiming(timing: string, lineNo: number): { start: number; end: number } {
  const parts = timing.split("-->");
  if (parts.length !== 2) {
    throw new Error(`Blok #${lineNo}: baris timestamp tidak valid: "${timing}".`);
  }
  // Cue settings WebVTT setelah timestamp akhir diabaikan.
  const startRaw = parts[0].trim().split(/\s+/)[0];
  const endRaw = parts[1].trim().split(/\s+/)[0];
  return {
    start: parseTimestamp(startRaw, `blok #${lineNo}, mulai`),
    end: parseTimestamp(endRaw, `blok #${lineNo}, akhir`),
  };
}

/** Mem-parsing konten SRT menjadi baris caption tervalidasi. */
export function parseSrt(content: string): ParsedCaptionLine[] {
  return parseBlocksToLines(splitBlocks(content));
}

/** Mem-parsing konten WebVTT menjadi baris caption tervalidasi. */
export function parseVtt(content: string): ParsedCaptionLine[] {
  return parseBlocksToLines(splitBlocks(content));
}

function parseBlocksToLines(blocks: RawBlock[]): ParsedCaptionLine[] {
  const out: ParsedCaptionLine[] = [];
  for (const block of blocks) {
    const timing = parseBlockTiming(block.timing, block.lineNo || out.length + 1);
    const text = block.text.replace(/<[^>]+>/g, "").trim();
    if (!text) continue;
    out.push({ index: out.length, text, start: timing.start, end: timing.end });
  }
  return out;
}

export interface LinesToCuesOptions {
  sceneId: string;
  /** Distribusi timing kata di dalam tiap cue (default true). */
  withWords?: boolean;
}

/**
 * Mengubah baris hasil parsing menjadi CaptionCue engine. Segment yang
 * tumpang tindih dinormalisasi (start di-clamp ke end cue sebelumnya); cue
 * berdurasi nol atau negatif tetap diberikan words kosong agar dapat
 * divalidasi lebih lanjut oleh validateCues().
 */
export function linesToCues(lines: ParsedCaptionLine[], opts: LinesToCuesOptions): CaptionCue[] {
  const withWords = opts.withWords ?? true;
  const cues: CaptionCue[] = [];
  let prevEnd = -1;
  for (const line of lines) {
    const start = Math.max(line.start, prevEnd);
    const end = Math.max(line.end, start);
    const words: CaptionWord[] = withWords && end > start
      ? distributeWords(line.text, start, end)
      : [];
    cues.push({ sceneId: opts.sceneId, index: cues.length, text: line.text, start, end, words });
    prevEnd = end;
  }
  return cues;
}

/** Deteksi format dari ekstensi berkas; dipakai utilitas impor. */
export function formatOfPath(filePath: string): "srt" | "vtt" | null {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".srt")) return "srt";
  if (lower.endsWith(".vtt")) return "vtt";
  return null;
}
