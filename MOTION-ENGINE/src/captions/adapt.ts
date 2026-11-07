/**
 * Context-Aware Caption: memilih tipe, penempatan, tema, dan animasi caption
 * dari isi teks cue dan konteks adegan. Aturan berbasis data (kata kunci,
 * tanda baca, tanda kutip, angka), bukan satu gaya untuk semua cue.
 */
import { CaptionType, Placement } from "./adaptive-types";

export interface CueDecision {
  type: CaptionType;
  placement: Placement;
  animation: string;
  theme: string;
  variant?: string;
  anchorSubject?: number;
}

const THOUGHT = /(pikir|bingung|ragu|bertanya|heran|mikir|masa|gimana kalau)/i;
const TECH = /(server|data|cookie|algoritma|sistem|kode|program|jaringan|enkripsi|cloud|cpu|api|database)/i;
const CHAT = /(chat|pesan|dm|balas|mengetik|notifikasi|terkirim)/i;
const STEP = /(langkah|pertama|kedua|ketiga|keempat|terakhir|kemudian|setelah itu)/i;
const MONOLOG = /(aku|saya|merasa|pikirkan)/i;

function isEmphasisWord(word: string): boolean {
  const bare = word.replace(/[^\p{L}\p{N}]/gu, "");
  if (/\*[^*]+\*/.test(word)) return true;
  return bare.length >= 2 && bare === bare.toUpperCase() && /[A-Z]/.test(bare);
}

/**
 * Keputusan gaya satu cue. recentTypes dipakai untuk variasi: gaya yang sama
 * tidak dipakai dua cue berturut-turut kecuali subtitle dasar.
 */
export function decideCueStyle(
  cueText: string,
  scene: any,
  recentTypes: CaptionType[],
  hasCharacter: boolean,
  hasObject: boolean
): CueDecision {
  const text = cueText ?? "";
  const hasQuote = /["'\u201C\u201D]/.test(text);
  const hasNumber = /\d/.test(text);
  const isQuestion = /\?\s*$/.test(text.trim());
  const isExclaim = /!\s*$/.test(text.trim());
  const capsEmphasis = text.split(/\s+/).some(isEmphasisWord);
  const words = text.split(/\s+/).filter(Boolean).length;
  const last = recentTypes[recentTypes.length - 1];
  const usedRecently = (t: CaptionType, n = 2) =>
    recentTypes.slice(-n).includes(t);
  const sceneDialogue: string | undefined = scene?.dialogue ?? scene?.dialogueStyle;

  // 1. Dialog dengan tanda kutip atau scene bertanda dialogue -> gelembung.
  if ((hasQuote || sceneDialogue === "speech") && hasCharacter && !usedRecently("speech-bubble")) {
    return {
      type: "speech-bubble", placement: "above-anchor", animation: "pop-in",
      theme: "comic", anchorSubject: scene?.captionSpeaker ?? 0,
    };
  }
  // 2. Percakapan digital.
  if (CHAT.test(text) && !usedRecently("chat")) {
    return { type: "chat", placement: "bottom", animation: "character-reveal", theme: "chat" };
  }
  // 3. Monolog bingung -> thought bubble.
  if (hasCharacter && THOUGHT.test(text) && !usedRecently("thought-bubble")) {
    return {
      type: "thought-bubble", placement: "above-anchor", animation: "pop-in",
      theme: "comic", anchorSubject: 0,
    };
  }
  // 4. Fakta & angka -> data caption.
  if (hasNumber && !usedRecently("data-caption")) {
    return {
      type: "data-caption", placement: hasObject ? "side-anchor" : "float",
      animation: "fade-up", theme: "data", variant: "data",
      anchorSubject: hasObject ? 0 : undefined,
    };
  }
  // 5. Penjelasan teknologi -> anotasi melayang.
  if (TECH.test(text) && hasObject && !usedRecently("annotation")) {
    return {
      type: "annotation", placement: "side-anchor", animation: "fade-up",
      theme: "tech", variant: "tech", anchorSubject: 0,
    };
  }
  // 6. Instruksi langkah demi langkah.
  if (STEP.test(text) && !usedRecently("instruction")) {
    return { type: "instruction", placement: "left", animation: "slide-right", theme: "instruction" };
  }
  // 7. Kata penting -> kinetic typography.
  if (capsEmphasis && !usedRecently("kinetic")) {
    return { type: "kinetic", placement: "center", animation: "word-reveal", theme: "editorial", variant: "word" };
  }
  // 8. Reaksi emosional / seru -> impact.
  if (isExclaim && words <= 7 && !usedRecently("impact")) {
    return { type: "impact", placement: "center", animation: "shake", theme: "impact" };
  }
  // 9. Pertanyaan -> emphasis caption.
  if (isQuestion && !usedRecently("emphasis")) {
    return { type: "emphasis", placement: "center", animation: "scale-bounce", theme: "impact", variant: "question" };
  }
  // 10. Narasi dokumenter panjang -> editorial subtitle.
  if (words > 12 && !usedRecently("editorial-subtitle")) {
    return { type: "editorial-subtitle", placement: "bottom", animation: "fade-up", theme: "editorial" };
  }
  // 11. Default: subtitle dengan variasi posisi antar cue.
  const rotation: Array<{ type: CaptionType; placement: Placement; theme: string }> = [
    { type: "subtitle", placement: "bottom", theme: "minimal-dark" },
    { type: "top-subtitle", placement: "top", theme: "minimal-dark" },
    { type: "floating-caption", placement: "float", theme: "minimal-dark" },
  ];
  let pick = rotation[recentTypes.length % rotation.length];
  if (last === pick.type && recentTypes.length > 0) {
    pick = rotation[(recentTypes.length + 1) % rotation.length];
  }
  return {
    type: pick.type,
    placement: pick.placement,
    animation: recentTypes.length % 2 === 0 ? "fade-up" : "fade-in",
    theme: pick.theme,
  };
}

/** Animasi masuk bawaan per tipe (bisa dioverride direktif). */
export function defaultAnimationFor(type: CaptionType): string {
  switch (type) {
    case "speech-bubble":
    case "thought-bubble":
    case "dialogue-bubble":
      return "pop-in";
    case "chat":
      return "character-reveal";
    case "kinetic":
      return "word-reveal";
    case "impact":
      return "shake";
    case "annotation":
    case "data-caption":
      return "fade-up";
    case "instruction":
      return "slide-right";
    case "emphasis":
      return "scale-bounce";
    case "fullscreen-typography":
      return "mask-reveal";
    default:
      return "fade-up";
  }
}
