/**
 * Editorial Kinetic Motion - declarative types.
 *
 * Scenes may define a `layers` array and a `camera` rig. Layers are drawn by
 * the layer compositor (parent-child transforms, null objects, anchor points,
 * masks, z-depth parallax); the camera rig adds zoom / pan / rotation /
 * dolly / tracking on top, in the spirit of Alight Motion workflows.
 *
 * All coordinates are normalized (0..1) against the canvas unless stated
 * otherwise; transform track values are pixels at scale 1 (rotations are
 * degrees, alpha 0..1, blur pixels).
 */
export type TrackSpec = Array<{ t: number; value: number; easing?: string }>;
export type BoxSpec = [number, number, number, number];
export type AnchorSpec = [number, number];

export type TypographyMode =
  | "oversized"
  | "stacked"
  | "splitWords"
  | "rotating"
  | "perspective"
  | "maskReveal"
  | "collage";

export type LayerKind =
  | "typography"
  | "panel"
  | "card"
  | "cutout"
  | "colorblock"
  | "grid"
  | "shape"
  | "halftone"
  | "subject"
  | "null";

export type MaskShape = "rect" | "circle" | "band";

export interface MaskSpec {
  shape: MaskShape;
  /** Inward inset of the mask, fraction of the box (default 0). */
  inset?: number;
}

export type EnterType = "slideL" | "slideR" | "rise" | "pop" | "spin" | "wipe" | "none";

export interface EnterSpec {
  type?: EnterType;
  /** Scene-local start time (seconds). Auto-staggered by layer index when omitted. */
  at?: number;
  dur?: number;
  ease?: string;
}

export interface TransformSpec {
  x?: TrackSpec;
  y?: TrackSpec;
  rotate?: TrackSpec;
  scale?: TrackSpec;
  alpha?: TrackSpec;
  /** Y-axis shear in degrees (fake perspective). */
  skew?: TrackSpec;
  /** Per-layer blur radius in pixels at scale 1. */
  blur?: TrackSpec;
}

export interface LayerSpec {
  id: string;
  kind: LayerKind;
  /** Display text (kind "typography"). */
  text?: string;
  mode?: TypographyMode;
  /** Parent layer id; children inherit the parent transform (null objects). */
  parent?: string;
  /** Anchor point as fractions of the box (default [0.5, 0.5]). */
  anchor?: AnchorSpec;
  box?: BoxSpec;
  /** Depth: 1 neutral, >1 closer (stronger camera parallax), <1 farther. */
  z?: number;
  /** Palette role ("text"|"primary"|"secondary"|"accent"|"background"|"invert") or #hex. */
  fill?: string;
  /** Rotate speed in radians/second for mode "rotating". */
  spinSpeed?: number;
  /** Static tilt in degrees (cards, cutouts). */
  rotate?: number;
  mask?: MaskSpec;
  /** Index into scene.subjects for kind "subject". */
  subjectIndex?: number;
  shape?: "rect" | "circle" | "triangle" | "bar" | "ring" | "stripe";
  /** Accent underline bar under oversized typography. */
  underline?: boolean;
  seed?: number;
  transform?: TransformSpec;
  enter?: EnterSpec;
}

export interface CameraShot {
  /** Scene-local time (seconds). */
  at: number;
  zoom?: number;
  /** Pan in normalized canvas units (-1..1). */
  panX?: number;
  panY?: number;
  /** Roll in degrees. */
  rotate?: number;
  /** 0..1 pull toward the tracked layer. */
  dolly?: number;
  /** Layer id the camera should follow. */
  track?: string | null;
  /** Easing used from the previous shot into this one. */
  ease?: string;
}

export interface CameraSpec {
  shots: CameraShot[];
}
