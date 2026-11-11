/**
 * Word-level synchronization: timing kata/karakter dari cue narasi,
 * deteksi jeda, kecepatan baca, dan indeks kata aktif untuk highlight.
 * Sumber timing adalah timeline cue produksi (bisa hasil pengukuran audio
 * per-cue atau taksiran berbobot); engine tidak mengklaim analisis audio
 * per kata.
 */
export interface WordTiming {
  text: string;
  start: number;
  end: number;
  /** Jeda hening sesudah kata ini (detik, dari tanda baca). */
  pauseAfter?: number;
}

/** Distribusi waktu kata di dalam [start, end] berbobot karakter. */
export function distributeWordTimings(text: string, start: number, end: number): WordTiming[] {
  const raw = (text ?? "").split(/\s+/).filter(Boolean);
  if (raw.length === 0) return [];
  const weights = raw.map((w) => {
    const letters = w.replace(/[^\p{L}\p{N}]/gu, "").length + 2;
    const pause = /[.!?,;:]$/.test(w) ? 4 : 0;
    return letters + pause;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  const span = Math.max(0.001, end - start);
  let cursor = start;
  return raw.map((w, i) => {
    const dur = (weights[i] / total) * span;
    const word: WordTiming = {
      text: w,
      start: cursor,
      end: cursor + dur,
      pauseAfter: /[.!?]$/.test(w) ? 0.22 : /[,;:]$/.test(w) ? 0.1 : 0,
    };
    cursor += dur;
    return word;
  });
}

/** Indeks kata yang sedang diucapkan pada waktu t (-1 bila di luar cue). */
export function activeWordIndex(words: WordTiming[], t: number): number {
  for (let i = 0; i < words.length; i++) {
    if (t >= words[i].start && t < words[i].end + (words[i].pauseAfter ?? 0)) return i;
  }
  return t >= (words.length ? words[words.length - 1].end : Infinity) ? words.length - 1 : -1;
}

export interface CharTiming {
  ch: string;
  start: number;
  end: number;
}

/** Timing per karakter di dalam satu kata. */
export function charTimings(word: WordTiming): CharTiming[] {
  const chars = Array.from(word.text);
  if (chars.length === 0) return [];
  const span = Math.max(0.001, word.end - word.start);
  const per = span / chars.length;
  return chars.map((ch, i) => ({ ch, start: word.start + per * i, end: word.start + per * (i + 1) }));
}

/** Lantai durasi tampil agar nyaman dibaca (karakter per detik). */
export function readingFloorSeconds(text: string, cps = 15): number {
  const letters = (text ?? "").replace(/\s+/g, "").length;
  return Math.max(0.6, letters / cps + 0.15);
}

/**
 * Estimasi jeda narasi pada tanda baca untuk sentence-level timing:
 * memecah teks menjadi kalimat-kalimat dengan jeda ekstra.
 */
export interface SentenceSlice {
  text: string;
  pauseAfter: number;
}

export function splitSentences(text: string): SentenceSlice[] {
  const parts = (text ?? "").match(/[^.!?]+[.!?]*/g) ?? [];
  return parts.map((p) => {
    const trimmed = p.trim();
    return {
      text: trimmed,
      pauseAfter: /[.!?]$/.test(trimmed) ? 0.25 : 0.08,
    };
  });
}

export interface SentenceTiming {
  text: string;
  start: number;
  end: number;
  pauseAfter: number;
}

/**
 * Sentence-level timing: mendistribusikan rentang [start, end] ke kalimat
 * berbobot panjang + jeda tanda baca. Monoton, tanpa tumpang tindih, dan
 * selalu menutup rentang penuh (kalimat terakhir berakhir di "end").
 */
export function distributeSentenceTimings(text: string, start: number, end: number): SentenceTiming[] {
  const slices = splitSentences(text).filter((s) => s.text.length > 0);
  if (slices.length === 0) return [];
  const weights = slices.map((s) => s.text.replace(/\s+/g, "").length + s.pauseAfter * 10);
  const total = weights.reduce((a, b) => a + b, 0);
  const span = Math.max(0.001, end - start);
  let cursor = start;
  return slices.map((s, i) => {
    const isLast = i === slices.length - 1;
    const dur = isLast ? end - cursor : (weights[i] / total) * span;
    const timing: SentenceTiming = {
      text: s.text,
      start: cursor,
      end: cursor + Math.max(0, dur),
      pauseAfter: s.pauseAfter,
    };
    cursor += Math.max(0, dur);
    return timing;
  });
}

/** Highlight kata aktif pada mode kinetic: progres [0..1] per kata. */
export function wordRevealProgress(words: WordTiming[], t: number): number[] {
  return words.map((w) => Math.max(0, Math.min(1, (t - w.start) / Math.max(0.001, w.end - w.start))));
}
