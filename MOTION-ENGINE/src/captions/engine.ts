/**
 * Adaptive Caption Engine - orkestrator utama.
 *
 * Dua cara pemakaian:
 *  1. Deklaratif (pipeline produksi): loadTimeline() memetakan cue CC ke
 *     tipe/penempatan/animasi lewat aturan konteks + direktif scene.captions.
 *  2. Imperatif (API): caption.show / caption.chat / caption.annotate pada
 *     adegan aktif, menempel ke karakter/objek/lapis dengan anchor.
 *
 * Setiap frame engine menyelesaikan penempatan dengan kandidat + scoring:
 * tabrakan dengan wajah/objek/judul dan tumpukan antar caption dihindari,
 * aman terhadap safe area, dan mengikuti anchor yang bergerak.
 */
import { Timeline, SceneTiming } from "../core/timeline";
import { Palette } from "../color/palette";
import { StyleDef } from "../styles/types";
import {
  AdaptiveCaptionsConfig,
  AnchorRef,
  CaptionSpec,
  CaptionType,
  ChatMessage,
  Placement,
  SceneCaptionDirective,
  SceneMeta,
} from "./adaptive-types";
import { resolveCaptionTheme, CaptionThemeTokens } from "./theme";
import { captionAnimState, isCaptionAnimPreset } from "./anim";
import {
  Metrics,
  PlacementCandidate,
  RectPx,
  SafeArea,
  candidatesForPlacement,
  metricsFor,
  rectFromNormalized,
  solvePlacement,
} from "./layout";
import { buildSceneMeta, resolveAnchor } from "./anchors";
import { decideCueStyle, defaultAnimationFor } from "./adapt";
import { ResolvedCaption, drawCaption, estimateCaptionBox } from "./draw";
import { WordTiming, readingFloorSeconds } from "./sync";

interface EngineCaption extends ResolvedCaption {
  anchorRef?: AnchorRef;
  placementRequested: Placement;
}

export interface CaptionEngineOptions {
  palette: Palette;
  style: StyleDef;
  fontFamily: string;
  config?: AdaptiveCaptionsConfig;
}

export interface CaptionApi {
  show(spec: CaptionSpec): string;
  chat(spec: CaptionSpec & { messages: ChatMessage[] }): string;
  annotate(spec: CaptionSpec & { anchor: AnchorRef }): string;
  hide(id: string): void;
}

const TYPE_PLACEMENT: Partial<Record<CaptionType, Placement>> = {
  subtitle: "bottom",
  "top-subtitle": "top",
  "center-caption": "center",
  "floating-caption": "float",
  "left-caption": "left",
  "right-caption": "right",
  "corner-caption": "corner-bl",
  "speech-bubble": "above-anchor",
  "thought-bubble": "above-anchor",
  "dialogue-bubble": "above-anchor",
  "notification-bubble": "corner-tr",
  "character-follow": "above-anchor",
  "object-follow": "side-anchor",
  chat: "bottom",
  kinetic: "center",
  annotation: "side-anchor",
  "data-caption": "side-anchor",
  impact: "center",
  emphasis: "center",
  "fullscreen-typography": "fullscreen",
  "side-annotation": "right",
  "split-caption": "center",
  instruction: "left",
  "editorial-subtitle": "bottom",
};

const TYPE_THEME: Partial<Record<CaptionType, string>> = {
  "speech-bubble": "comic",
  "thought-bubble": "comic",
  "dialogue-bubble": "comic",
  "notification-bubble": "tech",
  chat: "chat",
  kinetic: "editorial",
  annotation: "tech",
  "data-caption": "data",
  impact: "impact",
  emphasis: "impact",
  "fullscreen-typography": "impact",
  "side-annotation": "data",
  "split-caption": "editorial",
  instruction: "instruction",
  "editorial-subtitle": "editorial",
};

function wordsFromCue(cue: { words: Array<{ text: string; start: number; end: number }> }): WordTiming[] {
  return (cue.words ?? []).map((w) => ({
    text: w.text,
    start: w.start,
    end: w.end,
    pauseAfter: /[.!?]$/.test(w.text) ? 0.2 : /[,;:]$/.test(w.text) ? 0.09 : 0,
  }));
}

export class CaptionEngine {
  private readonly palette: Palette;
  private readonly style: StyleDef;
  private readonly config: AdaptiveCaptionsConfig;
  private readonly fontFamily: string;
  private readonly byScene = new Map<string, EngineCaption[]>();
  private readonly index = new Map<string, EngineCaption>();
  private seq = 0;
  private recentTypes: CaptionType[] = [];

  constructor(opts: CaptionEngineOptions) {
    this.palette = opts.palette;
    this.style = opts.style;
    this.fontFamily = opts.fontFamily;
    this.config = opts.config ?? {};
  }

  count(): number {
    return this.index.size;
  }

  private themeFor(type: CaptionType, override?: string | Record<string, unknown>): CaptionThemeTokens {
    const themeId = override ?? TYPE_THEME[type] ?? "minimal-dark";
    return resolveCaptionTheme({
      themeId,
      palette: this.palette,
      style: this.style,
      fontFamily: this.fontFamily,
      sceneBackground: this.palette.background,
    });
  }

  /**
   * Jalur deklaratif: memetakan seluruh cue timeline menjadi caption.
   * Direktif scene.captions (kecocokan cueIndex/match) mengoverride keputusan
   * aturan konteks.
   */
  loadTimeline(timeline: Timeline, scenes: any[]): void {
    const directivesByScene = new Map<string, SceneCaptionDirective[]>();
    for (const scene of scenes) {
      const list = Array.isArray((scene as any).captions) ? (scene as any).captions : [];
      directivesByScene.set(scene.id, list);
    }
    for (const timing of timeline.scenes) {
      const scene: any = timing.scene;
      const directives = directivesByScene.get(timing.scene.id) ?? [];
      const hasCharacter = (scene?.subjects ?? []).some((s: any) => s?.kind === "character");
      const hasObject = (scene?.subjects ?? []).some((s: any) => s?.kind !== "character");
      timing.cues.forEach((cue, cueIndex) => {
        const directive = directives.find(
          (d) =>
            (typeof d.cueIndex === "number" && d.cueIndex === cueIndex) ||
            (typeof d.match === "string" && cue.text.includes(d.match))
        );
        const decision = decideCueStyle(cue.text, scene, this.recentTypes, hasCharacter, hasObject);
        this.recentTypes.push(decision.type);
        if (this.recentTypes.length > 6) this.recentTypes.shift();
        const type = (directive?.type ?? decision.type) as CaptionType;
        const placement = (directive?.position ?? decision.placement ?? TYPE_PLACEMENT[type] ?? "bottom") as Placement;
        const animation = directive?.animation ?? (isCaptionAnimPreset(decision.animation) ? decision.animation : defaultAnimationFor(type));
        const anchorRef: AnchorRef | undefined = directive?.anchor
          ? directive.anchor
          : decision.anchorSubject !== undefined
            ? { subject: decision.anchorSubject }
            : undefined;
        const cap: EngineCaption = {
          id: "cue-" + timing.scene.id + "-" + cueIndex,
          sceneId: timing.scene.id,
          text: cue.text,
          type,
          placement,
          animation,
          theme: this.themeFor(type, directive?.theme),
          emphasis: directive?.emphasis ?? [],
          variant: directive?.variant ?? decision.variant,
          style: directive?.style,
          messages: directive?.messages,
          sender: directive?.sender,
          at: cue.start - timing.start,
          duration: Math.max(0.4, cue.end - cue.start + 0.08),
          intensity: this.config.intensity ?? 1,
          words: wordsFromCue(cue),
          cueBound: true,
          maxLines: 2,
          anchorRef,
          placementRequested: placement,
        };
        this.register(cap);
      });
    }
  }

  private register(cap: EngineCaption): void {
    const list = this.byScene.get(cap.sceneId) ?? [];
    const existing = list.findIndex((c) => c.id === cap.id);
    if (existing >= 0) list.splice(existing, 1);
    list.push(cap);
    list.sort((a, b) => a.at - b.at);
    this.byScene.set(cap.sceneId, list);
    this.index.set(cap.id, cap);
  }

  /** API imperatif: caption.show({...}) pada adegan tertentu. */
  show(sceneId: string, spec: CaptionSpec): string {
    const id = spec.id ?? "cap-" + this.seq++;
    const type = (spec.type ?? "subtitle") as CaptionType;
    const placement = (spec.position ?? TYPE_PLACEMENT[type] ?? "auto") as Placement;
    const animation = spec.animation ?? defaultAnimationFor(type);
    const at = spec.at ?? 0;
    const floor = readingFloorSeconds(spec.text ?? "");
    const cap: EngineCaption = {
      id,
      sceneId,
      text: spec.text ?? "",
      type,
      placement,
      animation,
      theme: this.themeFor(type, typeof spec.theme === "string" ? spec.theme : undefined),
      emphasis: spec.emphasis ?? [],
      variant: spec.variant,
      style: spec.style,
      messages: spec.messages,
      sender: spec.sender,
      at,
      duration: spec.duration ?? Math.max(1.6, floor * 1.5),
      intensity: spec.intensity ?? this.config.intensity ?? 1,
      cueBound: false,
      maxLines: spec.maxLines ?? 2,
      anchorRef: spec.anchor,
      placementRequested: placement,
    };
    this.register(cap);
    return id;
  }

  /** API chat: pesan berurutan dengan gelembeng in/out + typing indicator. */
  chat(sceneId: string, spec: CaptionSpec & { messages: ChatMessage[] }): string {
    const messages = spec.messages ?? [];
    const type: CaptionType = "chat";
    const id = spec.id ?? "chat-" + this.seq++;
    const at = spec.at ?? 0;
    const per = 1.15;
    const cap: EngineCaption = {
      id,
      sceneId,
      text: messages.map((m) => m.text).join(" "),
      type,
      placement: (spec.position ?? "bottom") as Placement,
      animation: spec.animation ?? "character-reveal",
      theme: this.themeFor(type, typeof spec.theme === "string" ? spec.theme : undefined),
      emphasis: [],
      variant: spec.variant,
      messages,
      sender: spec.sender,
      at,
      duration: spec.duration ?? 0.4 + messages.length * per + 1.3,
      intensity: spec.intensity ?? this.config.intensity ?? 1,
      cueBound: false,
      maxLines: 2,
      anchorRef: spec.anchor,
      placementRequested: (spec.position ?? "bottom") as Placement,
    };
    this.register(cap);
    return id;
  }

  /** API anotasi: label melayang menempel objek/karakter. */
  annotate(sceneId: string, spec: CaptionSpec & { anchor: AnchorRef }): string {
    return this.show(sceneId, {
      ...spec,
      type: spec.type ?? "annotation",
      position: spec.position ?? "side-anchor",
      variant: spec.variant ?? "tech",
    });
  }

  hide(id: string): void {
    const cap = this.index.get(id);
    if (!cap) return;
    const list = this.byScene.get(cap.sceneId) ?? [];
    const idx = list.findIndex((c) => c.id === id);
    if (idx >= 0) list.splice(idx, 1);
    this.byScene.set(cap.sceneId, list);
    this.index.delete(id);
  }

  /** Objek API terikat pada satu adegan (caption.show(...) gaya contoh user). */
  api(sceneId: string): CaptionApi {
    return {
      show: (spec: CaptionSpec) => this.show(sceneId, spec),
      chat: (spec: CaptionSpec & { messages: ChatMessage[] }) => this.chat(sceneId, spec),
      annotate: (spec: CaptionSpec & { anchor: AnchorRef }) => this.annotate(sceneId, spec),
      hide: (id: string) => this.hide(id),
    };
  }

  private typeBias(type: CaptionType, placement: Placement): Partial<Record<Placement, number>> {
    switch (type) {
      case "speech-bubble":
      case "thought-bubble":
      case "dialogue-bubble":
      case "character-follow":
        return { "above-anchor": 0, "below-anchor": 0.9, "side-anchor": 1.15, bottom: 1.6, top: 1.8 };
      case "object-follow":
      case "annotation":
      case "data-caption":
        return { "side-anchor": 0, "above-anchor": 0.7, "below-anchor": 0.7, float: 1.1, bottom: 1.5 };
      case "chat":
        return { bottom: 0, top: 1.6, center: 1.8, left: 2, right: 2 };
      case "kinetic":
      case "impact":
      case "emphasis":
        return { center: 0, top: 1.1, bottom: 1.3, float: 1.5 };
      case "subtitle":
      case "editorial-subtitle":
        return { bottom: 0, top: 0.7, center: 1.4, float: 1.6 };
      case "top-subtitle":
        return { top: 0, bottom: 0.8, center: 1.4 };
      case "left-caption":
        return { left: 0, center: 1, right: 1.2 };
      case "right-caption":
      case "side-annotation":
        return { right: 0, center: 1, left: 1.2 };
      case "corner-caption":
        return { "corner-bl": 0, "corner-br": 0.3, "corner-tl": 0.6, "corner-tr": 0.6 };
      case "notification-bubble":
        return { "corner-tr": 0, "corner-tl": 0.7, top: 1, float: 1.3 };
      default:
        return placement === "auto" ? {} : { [placement]: 0 };
    }
  }

  /** Render per-frame: dipanggil scene-composer pada langkah CC. */
  render(ctx: any, timing: SceneTiming, kit: any, globalT: number): void {
    const sceneId = timing.scene.id;
    const caps = this.byScene.get(sceneId);
    if (!caps || caps.length === 0) return;
    const w: number = kit.w ?? 1080;
    const h: number = kit.h ?? 1920;
    const localT = Math.max(0, globalT - timing.start);
    const meta: SceneMeta = buildSceneMeta(timing, { w, h, scale: kit.scale ?? 1, animationIntensity: kit.animationIntensity ?? 1, style: kit.style }, localT);
    const m: Metrics = metricsFor(w, h, this.config.safeArea as Partial<SafeArea> | undefined);
    const maxSim = Math.max(1, this.config.maxSimultaneous ?? 3);

    const active = caps.filter(
      (c) => localT >= c.at - 0.05 && localT <= c.at + c.duration + 0.35
    );
    // CC cue-bound selalu diutamakan; dekoratif menyusul bila masih ada slot.
    active.sort((a, b) => (a.cueBound === b.cueBound ? a.at - b.at : a.cueBound ? -1 : 1));

    const occupied: RectPx[] = [];
    let drawn = 0;
    for (const cap of active) {
      if (!cap.cueBound && drawn >= maxSim) break;
      const anim = captionAnimState(cap.animation, localT, {
        at: cap.at,
        duration: cap.duration,
        intensity: cap.intensity,
      });
      if (anim.alpha <= 0.01) continue;
      const anchorBox = resolveAnchor(cap.anchorRef, meta, localT);
      const anchorPx = anchorBox ? rectFromNormalized(anchorBox, m) : null;
      const box = estimateCaptionBox(ctx, m, cap);
      const candidates: PlacementCandidate[] = candidatesForPlacement(
        cap.placement === "auto" ? (TYPE_PLACEMENT[cap.type] ?? "bottom") : cap.placement,
        box,
        m,
        anchorBox,
        this.typeBias(cap.type, cap.placement as Placement)
      );
      const solved = solvePlacement(candidates, occupied, meta.regions, m);
      const rect: RectPx = solved
        ? solved.rect
        : { x: (w - box.w) / 2, y: h * 0.82 - box.h, w: box.w, h: box.h };
      const used = drawCaption({
        ctx,
        m,
        cap,
        anim,
        rect,
        anchorPx,
        localT,
        tAbs: globalT,
      });
      occupied.push(used);
      drawn++;
    }
  }
}

export interface CreateCaptionEngineOptions extends CaptionEngineOptions {}

/** Factory: null berarti proyek memakai jalur CC klasik (perilaku lama). */
export function createCaptionEngine(opts: CreateCaptionEngineOptions): CaptionEngine | null {
  const config = opts.config ?? {};
  if ((config.mode ?? "classic") !== "adaptive") return null;
  return new CaptionEngine(opts);
}
