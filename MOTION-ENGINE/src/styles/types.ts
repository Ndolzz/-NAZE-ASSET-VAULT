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
}
