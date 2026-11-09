/**
 * Named CC-style assets: 40 preset gaya closed caption reusable.
 * Setiap preset memaketkan tipe caption, pola penempatan yang berganti
 * per cue, animasi masuk, tema, dan (opsional) kekuatan kamera yang
 * mengikuti perpindahan zona CC.
 *
 * Penggunaan via project.json:
 *   "captions": { "ccStyle": "midnight-orbit" }
 * Field ini otomatis mengaktifkan Adaptive Caption Engine (mode
 * "adaptive"). Pipeline membangkitkan direktif per cue dari pola
 * penempatan preset dan menyuntikkan shot kamera pengikut pada scene
 * yang sudah punya camera rig. Direktif scene.captions yang ditulis
 * manual selalu dihormati (tidak ditimpa); id tak dikenal hanya
 * memicu peringatan log dan CC adaptif berjalan tanpa preset.
 */
import { CaptionType, Placement, SceneCaptionDirective } from "./adaptive-types";
import { CameraShot } from "../motion/types";
import { evaluateCamera } from "../motion/camera";
import { Timeline, SceneTiming } from "../core/timeline";

export interface CcStyleDef {
  id: string;
  name: string;
  /** Tipe caption utama untuk seluruh cue. */
  type: CaptionType;
  /** Pola penempatan; dirotasi deterministik per cue (indeks modulo). */
  positions: Placement[];
  /** Nama preset animasi masuk (dari 20 preset anim.ts). */
  animation: string;
  /** Id tema caption (preset theme.ts). */
  theme?: string;
  variant?: string;
  /** Kekuatan kamera pengikut CC (0..1) saat zona berpindah; 0 nonaktif. */
  cameraFollow?: number;
}

const S = (
  id: string,
  name: string,
  type: CaptionType,
  positions: Placement[],
  animation: string,
  theme: string,
  cameraFollow: number,
  variant?: string
): CcStyleDef => {
  const def: CcStyleDef = { id, name, type, positions, animation, theme, cameraFollow };
  if (variant) def.variant = variant;
  return def;
};

export const CC_STYLES: CcStyleDef[] = [
  S("midnight-orbit", "Orbit Malam", "editorial-subtitle", ["bottom", "top", "float"], "fade-up", "minimal-dark", 0.5),
  S("ink-slide", "Geser Tinta", "subtitle", ["bottom", "top"], "slide-up", "editorial", 0.45),
  S("signal-bounce", "Pantulan Sinyal", "emphasis", ["center", "bottom"], "scale-bounce", "impact", 0.5),
  S("alert-shake", "Guncangan Waspada", "impact", ["center", "top"], "shake", "impact", 0.6),
  S("glitch-scan", "Pindai Glitch", "kinetic", ["center", "top"], "glitch", "tech", 0.55),
  S("terminal-type", "Ketikan Terminal", "instruction", ["left", "right"], "typewriter", "tech", 0.4),
  S("headline-word", "Kata Headline", "kinetic", ["center"], "word-reveal", "editorial", 0),
  S("ticker-top", "Ticker Atas", "top-subtitle", ["top", "bottom"], "slide-down", "documentary", 0.5),
  S("drift-float", "Apung Tenang", "floating-caption", ["float", "center"], "smooth-floating", "minimal-dark", 0.35),
  S("corner-patrol", "Patroli Sudut", "corner-caption", ["corner-bl", "corner-tr", "corner-tl", "corner-br"], "pop-in", "minimal-dark", 0.55),
  S("notify-stream", "Aliran Notifikasi", "notification-bubble", ["corner-tr", "corner-tl"], "slide-right", "tech", 0.5),
  S("side-story", "Cerita Samping", "side-annotation", ["right", "left"], "fade-in", "data", 0.45),
  S("split-focus", "Fokus Belah", "split-caption", ["center", "top"], "split-reveal", "editorial", 0.5),
  S("center-stage", "Panggung Tengah", "center-caption", ["center"], "fade-in", "minimal-dark", 0),
  S("banner-bottom", "Spanduk Bawah", "subtitle", ["bottom"], "slide-up", "minimal-dark", 0),
  S("top-lamp", "Lampu Atas", "top-subtitle", ["top"], "fade-down", "minimal-dark", 0.3),
  S("elastic-pop", "Pop Elastis", "emphasis", ["center", "top"], "elastic", "impact", 0.5),
  S("soft-reveal", "Ungkap Lembut", "subtitle", ["bottom", "float"], "mask-reveal", "documentary", 0.4),
  S("blur-focus", "Fokus Kabur", "center-caption", ["center", "bottom"], "blur-reveal", "minimal-dark", 0.45),
  S("char-stream", "Aliran Karakter", "instruction", ["left", "bottom"], "character-reveal", "tech", 0),
  S("comic-punch", "Pukulan Komik", "impact", ["center", "top"], "overshoot", "comic", 0.5),
  S("gold-instruction", "Instruksi Emas", "instruction", ["left", "bottom"], "fade-up", "instruction", 0.4),
  S("docu-note", "Catatan Dokumenter", "subtitle", ["bottom", "top"], "fade-in", "documentary", 0.5),
  S("neon-pop", "Pop Neon", "emphasis", ["center", "float"], "pop-in", "tech", 0.45),
  S("wide-stack", "Tumpukan Lebar", "editorial-subtitle", ["bottom", "top", "center"], "slide-left", "editorial", 0.55),
  S("jump-cut", "Lompatan Potret", "floating-caption", ["float", "bottom", "top"], "pop-in", "minimal-dark", 0.6),
  S("wave-slide", "Gelombang Geser", "subtitle", ["bottom", "top"], "slide-right", "minimal-dark", 0.5),
  S("ping-pong", "Bolak-Balik", "top-subtitle", ["top", "bottom"], "slide-up", "data", 0.55),
  S("spotlight-center", "Sorotan Tengah", "impact", ["center"], "fade-up", "impact", 0),
  S("zoom-word", "Kata Zoom", "kinetic", ["center", "float"], "scale-bounce", "editorial", 0.45),
  S("left-diary", "Buku Harian Kiri", "left-caption", ["left", "bottom"], "fade-up", "editorial", 0.4),
  S("right-memo", "Memo Kanan", "right-caption", ["right", "top"], "fade-in", "data", 0.4),
  S("full-bleed", "Penuh Layar", "fullscreen-typography", ["fullscreen"], "word-reveal", "impact", 0),
  S("shadow-rise", "Naik Bayangan", "subtitle", ["bottom", "float", "top"], "fade-up", "minimal-dark", 0.5),
  S("accent-frame", "Bingkai Aksen", "center-caption", ["center", "bottom"], "pop-in", "minimal-dark", 0.45),
  S("retro-scan", "Pindai Retro", "top-subtitle", ["top", "float"], "typewriter", "tech", 0.45),
  S("soft-bounce", "Pantul Lembut", "emphasis", ["float", "center"], "scale-bounce", "minimal-dark", 0.4),
  S("dual-zone", "Zona Ganda", "split-caption", ["center", "bottom"], "split-reveal", "minimal-dark", 0.5),
  S("hard-cut", "Potongan Keras", "impact", ["top", "center", "bottom"], "fade-in", "impact", 0.65),
  S("orbit-mega", "Orbit Besar", "kinetic", ["center", "top", "bottom"], "mask-reveal", "editorial", 0.6),
];

export const CC_STYLE_IDS: string[] = CC_STYLES.map((s) => s.id);

export function ccStyleById(id: string): CcStyleDef | undefined {
  return CC_STYLES.find((s) => s.id === id);
}

/** Zona vertikal wakil tiap penempatan (0..1) untuk arah kamera pengikut. */
export function placementZoneY(placement: Placement): number {
  switch (placement) {
    case "top":
      return 0.15;
    case "corner-tl":
    case "corner-tr":
      return 0.12;
    case "float":
      return 0.35;
    case "above-anchor":
      return 0.32;
    case "center":
    case "left":
    case "right":
    case "side-anchor":
    case "split-left":
    case "split-right":
    case "fullscreen":
      return 0.5;
    case "below-anchor":
      return 0.68;
    case "corner-bl":
    case "corner-br":
      return 0.88;
    case "bottom":
      return 0.85;
    default:
      return 0.82;
  }
}

/** Direktif per cue dari pola preset; dipakai bila scene tanpa direktif manual. */
export function buildCcDirectives(style: CcStyleDef, cueCount: number): SceneCaptionDirective[] {
  const out: SceneCaptionDirective[] = [];
  for (let i = 0; i < cueCount; i++) {
    const d: SceneCaptionDirective = {
      cueIndex: i,
      type: style.type,
      position: style.positions[i % style.positions.length],
      animation: style.animation,
    };
    if (style.theme) d.theme = style.theme;
    if (style.variant) d.variant = style.variant;
    out.push(d);
  }
  return out;
}

/**
 * Shot kamera pengikut: disuntikkan hanya pada perpindahan zona CC,
 * membawa state kamera karya asli (hasil evaluasi shot author) plus
 * offset panY menuju zona CC baru dan dorongan zoom kecil, sehingga
 * jalur kamera author berlanjut mulus setelah cue selesai.
 */
function injectCameraFollow(style: CcStyleDef, timing: SceneTiming, scene: any): number {
  const follow = style.cameraFollow ?? 0;
  if (follow <= 0) return 0;
  const camera = scene?.camera;
  if (!camera || !Array.isArray(camera.shots) || camera.shots.length === 0) return 0;
  const authored: CameraShot[] = camera.shots.filter((s: any) => !(s as any).__ccFollow);
  const cues = timing.cues ?? [];
  if (cues.length === 0) return 0;
  const trackingActiveAt = (t: number): boolean => {
    let active = false;
    for (const s of authored) {
      if ((s.at ?? 0) <= t) active = !!(s.track && (s.dolly ?? 0) > 0);
      else break;
    }
    return active;
  };
  const minSpacing = 2.0;
  const maxShots = 4;
  const added: CameraShot[] = [];
  let lastAt = -10;
  for (let i = 1; i < cues.length; i++) {
    const zone = placementZoneY(style.positions[i % style.positions.length]);
    const prev = placementZoneY(style.positions[(i - 1) % style.positions.length]);
    if (Math.abs(zone - prev) < 0.12) continue;
    const at = cues[i].start - timing.start + 0.1;
    if (at >= timing.duration - 0.3) continue;
    if (at - lastAt < minSpacing) continue;
    if (authored.some((s) => Math.abs((s.at ?? 0) - at) < 0.5)) continue;
    if (trackingActiveAt(at)) continue;
    const base = evaluateCamera({ shots: authored }, at, timing.duration, new Map<string, { x: number; y: number }>());
    const panY = Math.max(-0.38, Math.min(0.38, base.panY + (0.5 - zone) * follow));
    const shot: CameraShot = {
      at,
      zoom: base.zoom + 0.02,
      panX: base.panX,
      panY,
      rotate: base.rotateDeg,
      dolly: base.dolly,
      track: base.trackId,
      ease: "easeInOutSine",
    };
    (shot as any).__ccFollow = true;
    added.push(shot);
    lastAt = at;
    if (added.length >= maxShots) break;
  }
  if (added.length === 0) return 0;
  camera.shots = [...authored, ...added].sort((a: any, b: any) => (a.at ?? 0) - (b.at ?? 0));
  return added.length;
}

/**
 * Menerapkan preset gaya CC ke seluruh scene: membangkitkan direktif per
 * cue (bila scene belum punya direktif manual) dan menyuntikkan shot
 * kamera pengikut CC (bila scene sudah punya camera rig). Mutasi hanya
 * di memori; project.json di disk tidak diubah.
 */
export function applyCcStyle(
  style: CcStyleDef,
  timeline: Timeline,
  scenes: any[]
): { directives: number; shots: number } {
  let directives = 0;
  let shots = 0;
  const byId = new Map(scenes.map((s) => [s.id, s]));
  for (const timing of timeline.scenes) {
    const scene: any = byId.get(timing.scene.id) ?? timing.scene;
    if (!Array.isArray(scene.captions) || scene.captions.length === 0) {
      const list = buildCcDirectives(style, (timing.cues ?? []).length);
      if (list.length > 0) {
        scene.captions = list;
        directives += list.length;
      }
    }
    shots += injectCameraFollow(style, timing, scene);
  }
  return { directives, shots };
}
