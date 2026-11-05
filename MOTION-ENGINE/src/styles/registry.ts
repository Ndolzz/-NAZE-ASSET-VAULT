/**
 * Style registry. Supports the 17 built-in styles plus custom project styles
 * registered at runtime - adding styles never requires rebuilding the engine.
 */
import { builtinStyles } from "./library";
import { StyleDef } from "./types";

const customStyles = new Map<string, StyleDef>();

export function registerStyle(style: StyleDef): void {
  if (!style.id || !style.name) {
    throw new Error("A style definition requires id and name.");
  }
  customStyles.set(style.id, style);
}

export function registerStyles(styles: StyleDef[]): void {
  for (const s of styles) registerStyle(s);
}

export function getStyle(id: string): StyleDef {
  const builtin = builtinStyles.find((s) => s.id === id);
  if (builtin) return builtin;
  const custom = customStyles.get(id);
  if (custom) return custom;
  throw new Error(`Unknown style "${id}". Available: ${listStyles().map((s) => s.id).join(", ")}`);
}

export function listStyles(): StyleDef[] {
  return [...builtinStyles, ...customStyles.values()];
}

export function styleCount(): number {
  return listStyles().length;
}

/** Controlled style mixing: project picks a primary style plus optional accents. */
export interface StyleMix {
  primary: StyleDef;
  accents: StyleDef[];
}

export function resolveStyleMix(styleField: unknown): StyleMix {
  if (typeof styleField === "string") {
    return { primary: getStyle(styleField), accents: [] };
  }
  if (Array.isArray(styleField) && styleField.length > 0) {
    const [primaryId, ...accentIds] = styleField as string[];
    const primary = getStyle(primaryId);
    const accents = accentIds.slice(0, 2).map((id) => getStyle(id));
    return { primary, accents };
  }
  throw new Error('Project must define a "style" (id or [primaryId, ...accentIds]).');
}

/** Topic-based style recommendation (keyword scoring against style.topics). */
export function recommendStyles(topic: string, limit = 3): StyleDef[] {
  const t = (topic || "").toLowerCase();
  const words = t.split(/[^a-z0-9]+/).filter(Boolean);
  const scored = listStyles().map((style) => {
    let score = 0;
    for (const kw of style.topics) {
      if (t.includes(kw)) score += 3;
      for (const w of words) {
        if (kw.startsWith(w) || w.startsWith(kw)) score += 1;
      }
    }
    return { style, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.style);
}
