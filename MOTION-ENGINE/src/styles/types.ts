/**
 * Style system types. Styles are declarative definitions interpreted by the
 * rendering engine, so new styles can be added without rebuilding the engine.
 */
export type IllustrationKind =
  | "2d-editorial"
  | "3d-cartoon"
  | "comic"
  | "anime"
  | "paper"
  | "doodle"
  | "clay"
  | "abstract"
  | "infographic"
  | "collage"
  | "conceptual";

export type StrokeStyle = "bold" | "rough" | "thin" | "none";
export type ShadingStyle = "flat" | "gradient" | "soft" | "paper" | "halftone";
export type TextureStyle = "none" | "grain" | "dots" | "grid" | "paper" | "halftone" | "scanlines";
export type Composition = "centered" | "grid" | "stacked" | "asymmetric" | "panels" | "collage";

export interface StyleTypography {
  /** Display font file paths relative to the repository root (with fallbacks resolved at runtime). */
  fontFiles: string[];
  fontFamily: string;
  titleCase: "upper" | "title" | "none";
  titleWeight: string;
  bodyWeight: string;
  letterSpacing: number;
  titleScale: number;
}

/**
 * Optional motion-system configuration. The Editorial Kinetic Motion art
 * direction is a permanent NAZE identity; all other styles stay on the
 * classic composition path and are unaffected by this field.
 */
export interface StyleMotion {
  /** "classic" (default) or "editorial-kinetic" layered composition. */
  system?: "classic" | "editorial-kinetic";
  /** Parallax strength for layered z-depth (0..1). */
  parallax?: number;
  /** Whether the style opts scenes into the camera rig by default. */
  camera?: boolean;
}

export interface StyleDef {
  id: string;
  name: string;
  tagline: string;
  palette: string;
  typography: StyleTypography;
  illustrationKind: IllustrationKind;
  stroke: StrokeStyle;
  shading: ShadingStyle;
  texture: TextureStyle;
  composition: Composition;
  animation: { intensity: number; signature: string[] };
  transitions: string[];
  topics: string[];
  motion?: StyleMotion;
}
