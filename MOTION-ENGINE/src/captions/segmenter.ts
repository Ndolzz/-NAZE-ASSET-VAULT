/**
 * Caption segmentation and timing.
 * Produces CC cues of at most 2 lines, readable on mobile, synced to narration.
 * Pure module - no Node APIs - so it is fully unit-testable.
 */

export interface CaptionWord {
  text: string;
  start: number;
  end: number;
}

export interface CaptionCue {
  sceneId: string;
  index: number;
  text: string;
  start: number;
  end: number;
  words: CaptionWord[];
}

export const CC_MAX_LINE_LENGTH = 32;
export const CC_MAX_LINES = 2;

/** Breaks raw narration text into cue texts (each <= 2 lines of <= 32 chars). */
export function splitIntoCueTexts(
  text: string,
  maxLineLen = CC_MAX_LINE_LENGTH,
  maxLines = CC_MAX_LINES
): string[] {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const maxChars = maxLineLen * maxLines;

  // Titik desimal di dalam angka (mis. "350.600") bukan akhir kalimat:
  // lindungi sementara agar pemenggalan cue tidak memotong angka.
  const guarded = clean.replace(/(\d)\.(?=\d)/g, "$1\u0000");
  const sentences = (guarded.match(/[^.!?]+[.!?]*/g) ?? [guarded]).map((s) =>
    s.replace(/\u0000/g, ".")
  );

  const cues: string[] = [];
  for (const sentence of sentences) {
    let rest = sentence.trim();
    while (rest.length > 0) {
      if (rest.length <= maxChars) {
        cues.push(rest);
        break;
      }
      const words = rest.split(" ");
      let chunk = "";
      let i = 0;
      for (; i < words.length; i++) {
        const candidate = chunk ? chunk + " " + words[i] : words[i];
        if (candidate.length > maxChars) break;
        chunk = candidate;
      }
      if (chunk) {
        cues.push(chunk);
        rest = rest.slice(chunk.length).trim();
      } else {
        // single word longer than maxChars: hard-break it
        cues.push(words[0].slice(0, maxChars));
        rest = rest.slice(words[0].length).trim();
      }
    }
  }
  return cues;
}

/** Wraps one cue text into at most 2 display lines, balanced by length. */
export function wrapCueLines(text: string, maxLineLen = CC_MAX_LINE_LENGTH, maxLines = CC_MAX_LINES): string[] {
  const words = (text || "").split(" ").filter(Boolean);
  if (words.length === 0) return [""];
  if (maxLines === 1) {
    return [words.join(" ").slice(0, maxLineLen)];
  }
  let best: string[] = [text];
  let bestScore = Infinity;
  for (let i = 1; i < words.length; i++) {
    const l1 = words.slice(0, i).join(" ");
    const l2 = words.slice(i).join(" ");
    if (l1.length > maxLineLen || l2.length > maxLineLen) continue;
    const score = Math.abs(l1.length - l2.length);
    if (score < bestScore) {
      bestScore = score;
      best = [l1, l2];
    }
  }
  if (bestScore === Infinity) {
    // does not fit two lines: hard split at maxLineLen boundary
    const mid = text.slice(0, maxLineLen).lastIndexOf(" ");
    const cut = mid > 0 ? mid : maxLineLen;
    return [text.slice(0, cut).trim(), text.slice(cut).trim().slice(0, maxLineLen)].filter(Boolean);
  }
  return best;
}

/**
 * Distributes word timings inside a cue.
 * Weight per word ~ characters + small constant; punctuation adds a short pause.
 */
export function distributeWords(cueText: string, start: number, end: number): CaptionWord[] {
  const rawWords = (cueText || "").split(" ").filter(Boolean);
  if (rawWords.length === 0) return [];
  const weights = rawWords.map((w) => {
    const base = w.replace(/[^\p{L}\p{N}]/gu, "").length + 2;
    const pause = /[.!?,:;]$/.test(w) ? 4 : 0;
    return base + pause;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const duration = Math.max(0, end - start);
  let cursor = start;
  return rawWords.map((w, i) => {
    const wDur = (weights[i] / totalWeight) * duration;
    const wStart = cursor;
    cursor += wDur;
    return { text: w, start: wStart, end: cursor };
  });
}

/** Builds cues from per-cue measured audio durations (exact speech sync). */
export function buildCuesFromDurations(
  sceneId: string,
  cueTexts: string[],
  durations: number[],
  offset: number
): CaptionCue[] {
  if (cueTexts.length !== durations.length) {
    throw new Error(`Cue/duration mismatch for scene ${sceneId}: ${cueTexts.length} vs ${durations.length}`);
  }
  const cues: CaptionCue[] = [];
  let cursor = offset;
  cueTexts.forEach((text, i) => {
    const start = cursor;
    const end = cursor + durations[i];
    cues.push({ sceneId, index: i, text, start, end, words: distributeWords(text, start, end) });
    cursor = end;
  });
  return cues;
}

/** Coverage check: every narration word is inside some cue (validation requirement). */
export function cueCoverageOk(fullNarration: string, cues: CaptionCue[]): boolean {
  const expected = (fullNarration || "").split(/\s+/).filter(Boolean).length;
  const covered = cues.reduce((n, c) => n + c.words.length, 0);
  return expected > 0 && covered === expected;
}

/** Serialises cues to SRT. */
export function toSrt(cues: CaptionCue[]): string {
  return cues
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`)
    .join("\n");
}

/** Serialises cues to WebVTT. */
export function toVtt(cues: CaptionCue[]): string {
  const body = cues
    .map((c, i) => `${i + 1}\n${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text}\n`)
    .join("\n");
  return `WEBVTT\n\n${body}`;
}

function pad(n: number, size: number): string {
  return String(Math.floor(n)).padStart(size, "0");
}

export function srtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
}

export function vttTime(seconds: number): string {
  return srtTime(seconds).replace(",", ".");
}
