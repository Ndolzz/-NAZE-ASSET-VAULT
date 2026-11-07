/**
 * Adaptive Caption Engine - deklaratif tipe dan kontrak modul.
 *
 * Caption bukan lagi subtitle statis di bawah frame: setiap caption punya
 * tipe visual, penempatan (placement), anchor karakter/objek, tema, dan
 * animasi. Semua koordinat layout normalized (0..1) terhadap kanvas sehingga
 * responsif terhadap 1080x1920, 1920x1080, dan 1080x1080.
 */

/** Jenis caption yang didukung engine. */
export type CaptionType =
  | "subtitle"
  | "top-subtitle"
  | "center-caption"
  | "floating-caption"
  | "left-caption"
  | "right-caption"
  | "corner-caption"
  | "character-follow"
  | "object-follow"
  | "speech-bubble"
  | "thought-bubble"
  | "dialogue-bubble"
  | "notification-bubble"
  | "chat"
  | "kinetic"
  | "annotation"
  | "data-caption"
  | "impact"
  | "fullscreen-typography"
  | "side-annotation"
  | "split-caption"
  | "instruction"
  | "editorial-subtitle"
  | "emphasis";

/** Penempatan yang dapat diminta; "auto" memicu solver adaptif. */
export type Placement =
  | "auto"
  | "bottom"
  | "top"
  | "center"
  | "left"
  | "right"
  | "corner-tl"
  | "corner-tr"
  | "corner-bl"
  | "corner-br"
  | "float"
  | "above-anchor"
  | "below-anchor"
  | "side-anchor"
  | "split-left"
  | "split-right"
  | "fullscreen";

export type BubbleStyle = "rounded" | "comic" | "minimal";
export type ChatSide = "in" | "out";

/** Referensi anchor: subject scene, layer komposisi, atau titik dinamis. */
export interface AnchorRef {
  /** Indeks ke scene.subjects (karakter atau objek). */
  subject?: number;
  /** Layer id pada scene berlapis (layered compositor). */
  layer?: string;
  /** Penyedia titik layar normalized (0..1) untuk penggunaan imperatif. */
  point?: (t: number) => { x: number; y: number };
}

/** Kotak anchor hasil resolusi per-frame, normalized. */
export interface AnchorBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "character" | "object" | "layer" | "point";
  /** Fraksi tinggi kotak yang dianggap area wajah (karakter). */
  faceFraction: number;
}

/** Wilayah visual penting yang tidak boleh ditutup caption. Normalized. */
export interface ImportantRegion {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "face" | "subject" | "title" | "graphic" | "caption";
  /** Bobot penalti tabrakan (semakin besar semakin dijauhi). */
  weight: number;
}

/** Metadata adegan per-frame untuk Caption Scene Intelligence. */
export interface SceneMeta {
  sceneId: string;
  duration: number;
  localT: number;
  anchors: AnchorBox[];
  regions: ImportantRegion[];
  camera: { zoom: number; panX: number; panY: number; rotateDeg: number };
  narration: string;
}

export interface ChatMessage {
  sender: string;
  text: string;
  /** Arah gelembung; default bergantian in/out. */
  side?: ChatSide;
  /** Jeda relatif sebelum pesan muncul (detik, sekuensial bila 0). */
  delay?: number;
}

/** Spesifikasi caption lengkap (API show/chat/annotate + direktif scene). */
export interface CaptionSpec {
  id?: string;
  text: string;
  type?: CaptionType;
  position?: Placement;
  animation?: string;
  exit?: string;
  /** Tema: id preset atau token override parsial. */
  theme?: string | Record<string, unknown>;
  /** Kata kunci yang di-highlight (kinetic/impact/subtitle). */
  emphasis?: string[];
  anchor?: AnchorRef;
  /** Waktu mulai scene-lokal (detik). Tanpa ini: menempel ke cue narasi. */
  at?: number;
  /** Durasi tampil scene-lokal (detik). */
  duration?: number;
  /** Indeks cue narasi yang dirender caption ini (mengikat sinkronisasi kata). */
  cueIndex?: number;
  /** Substring cue narasi yang ditarget (alternatif cueIndex). */
  match?: string;
  messages?: ChatMessage[];
  sender?: string;
  style?: BubbleStyle;
  /** Mode khusus per tipe, mis. gaya anotasi "label" | "data" | "tech". */
  variant?: string;
  intensity?: number;
  delay?: number;
  maxLines?: number;
}

/** Direktif caption per adegan pada project.json (scene.captions). */
export interface SceneCaptionDirective {
  /** Indeks cue (urutan kemunculan) yang diberi aturan ini. */
  cueIndex?: number;
  /** Atau substring cue narasi yang ditarget. */
  match?: string;
  type?: CaptionType;
  position?: Placement;
  animation?: string;
  theme?: string;
  emphasis?: string[];
  anchor?: AnchorRef;
  messages?: ChatMessage[];
  sender?: string;
  style?: BubbleStyle;
  variant?: string;
}

/** Konfigurasi adaptif pada project.json (project.captions). */
export interface AdaptiveCaptionsConfig {
  /** "classic" (default, perilaku lama) atau "adaptive". */
  mode?: "classic" | "adaptive";
  /** Id tema atau token override parsial. */
  theme?: string | Record<string, unknown>;
  /** Intensitas animasi 0..2 (default dari animationIntensity proyek). */
  intensity?: number;
  /** Variasi kontekstual otomatis antar cue (default true). */
  variation?: boolean;
  /** Override safe area (fraksi frame). */
  safeArea?: { top?: number; bottom?: number; side?: number };
  /** Maksimum caption aktif bersamaan (default 3). */
  maxSimultaneous?: number;
  /** Margin bawah subtitle klasik (kompatibilitas lama, fraksi tinggi). */
  bottomMargin?: number;
}
