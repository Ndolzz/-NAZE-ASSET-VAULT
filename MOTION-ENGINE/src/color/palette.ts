/**
 * Color palette system.
 * Blue is no longer a permanent dominant color: every project picks a topic-appropriate palette.
 */
export interface Palette {
  id: string;
  name: string;
  background: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  dark?: boolean;
}

export const palettePresets: Palette[] = [
  {
    id: "sunset-editorial",
    name: "Sunset Editorial",
    background: "#FFF4E6",
    primary: "#FF6B35",
    secondary: "#F7C548",
    accent: "#D7263D",
    text: "#1A1A1A",
  },
  {
    id: "candy-pop",
    name: "Candy Pop",
    background: "#FFF0F5",
    primary: "#FF5D8F",
    secondary: "#B983FF",
    accent: "#FFD93D",
    text: "#2D2D32",
  },
  {
    id: "emerald-gold",
    name: "Emerald & Gold",
    background: "#F5F1E8",
    primary: "#0F766E",
    secondary: "#D4A017",
    accent: "#DC2626",
    text: "#14201D",
  },
  {
    id: "clay-warm",
    name: "Clay Warm",
    background: "#F6E7DB",
    primary: "#C97B5A",
    secondary: "#8A5A44",
    accent: "#7FB069",
    text: "#3B2C24",
  },
  {
    id: "mono-luxury",
    name: "Mono Luxury",
    background: "#0E0E10",
    primary: "#E8DCC8",
    secondary: "#A67C52",
    accent: "#E0B84C",
    text: "#F5F1E8",
    dark: true,
  },
  {
    id: "memphis-party",
    name: "Memphis Party",
    background: "#FEF9E7",
    primary: "#FF6F61",
    secondary: "#6B5B95",
    accent: "#88D8B0",
    text: "#222222",
  },
  {
    id: "coral-tide",
    name: "Coral Tide",
    background: "#FFF8F0",
    primary: "#FF7F50",
    secondary: "#40E0D0",
    accent: "#F4D03F",
    text: "#00332B",
  },
  {
    id: "crimson-violet",
    name: "Crimson Violet",
    background: "#1C1017",
    primary: "#E63946",
    secondary: "#9D4EDD",
    accent: "#FF9E00",
    text: "#FFF3E6",
    dark: true,
  },
  {
    id: "editorial-ink",
    name: "Editorial Ink",
    background: "#F2F0EB",
    primary: "#111111",
    secondary: "#2E2E2E",
    accent: "#E63B2E",
    text: "#0A0A0A",
  },
];

export function getPalette(id: string): Palette {
  const preset = palettePresets.find((p) => p.id === id);
  if (preset) return preset;
  throw new Error(`Unknown palette "${id}". Available: ${palettePresets.map((p) => p.id).join(", ")}`);
}

export function resolvePalette(projectPalette: unknown): Palette {
  if (typeof projectPalette === "string") return getPalette(projectPalette);
  if (projectPalette && typeof projectPalette === "object") {
    const p = projectPalette as Record<string, string>;
    for (const key of ["background", "primary", "secondary", "accent", "text"]) {
      if (!isValidHex(p[key])) {
        throw new Error(`Custom palette is missing or has an invalid "${key}" color.`);
      }
    }
    return { id: "custom", name: "Custom", ...p } as Palette;
  }
  throw new Error("Project must define a palette (preset id or custom roles).");
}

export function isValidHex(hex: string): boolean {
  return typeof hex === "string" && /^#([0-9a-fA-F]{6})$/.test(hex);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca.r + (cb.r - ca.r) * t, ca.g + (cb.g - ca.g) * t, ca.b + (cb.b - ca.b) * t);
}

export function shade(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  return rgbToHex(r + (f - r) * p, g + (f - g) * p, b + (f - b) * p);
}

export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Auto-corrects text color to guarantee readability on the background. */
export function ensureReadableText(palette: Palette): Palette {
  if (contrastRatio(palette.text, palette.background) < 4.5) {
    palette.text = luminance(palette.background) > 0.4 ? "#141414" : "#FAFAFA";
  }
  return palette;
}

/** True when most palette colors are blue-hued - forbidden as permanent identity. */
export function isBlueDominant(palette: Palette): boolean {
  const roles = [palette.primary, palette.secondary, palette.accent];
  let blueCount = 0;
  for (const hex of roles) {
    const { r, g, b } = hexToRgb(hex);
    if (b > r + 30 && b > g + 20) blueCount++;
  }
  return blueCount >= 2;
}

interface TopicPaletteRule {
  keywords: string[];
  palette: string;
}

const topicPaletteRules: TopicPaletteRule[] = [
  { keywords: ["teknologi", "tech", "ai", "digital", "cyber", "software"], palette: "crimson-violet" },
  { keywords: ["edukasi", "belajar", "sekolah", "tutorial", "how"], palette: "emerald-gold" },
  { keywords: ["cerita", "komik", "anime", "story", "drama"], palette: "candy-pop" },
  { keywords: ["bisnis", "finansial", "ekonomi", "investasi", "business"], palette: "emerald-gold" },
  { keywords: ["mewah", "luxury", "premium", "brand", "elegan"], palette: "mono-luxury" },
  { keywords: ["anak", "kartun", "fun", "lucu", "keluarga"], palette: "clay-warm" },
  { keywords: ["seni", "desain", "kreatif", "art", "warna"], palette: "memphis-party" },
  { keywords: ["alam", "travel", "liburan", "ocean", "laut"], palette: "coral-tide" },
  { keywords: ["berita", "editorial", "opini", "sosial"], palette: "sunset-editorial" },
];

export function recommendPalette(topic: string): Palette {
  const t = (topic || "").toLowerCase();
  for (const rule of topicPaletteRules) {
    if (rule.keywords.some((k) => t.includes(k))) {
      return getPalette(rule.palette);
    }
  }
  return getPalette("sunset-editorial");
}
