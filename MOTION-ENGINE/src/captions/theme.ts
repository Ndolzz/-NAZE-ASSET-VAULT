/**
 * Caption Design System: token visual yang dapat dikonfigurasi per tema.
 * Tidak ada warna dominan permanen: tema dipilih dari konteks adegan dan
 * palet proyek, dengan penegakan kontras keterbacaan otomatis.
 */
import {
  Palette,
  luminance,
  contrastRatio,
  withAlpha,
  shade,
} from "../color/palette";
import { StyleDef } from "../styles/types";

/** Semua ukuran px dinyatakan pada unit = min(w, h)/1080, lalu diskalakan. */
export interface CaptionThemeTokens {
  fontFamily: string;
  displayWeight: string;
  bodyWeight: string;
  /** Skalar ukuran font dasar (1 = normal, 2+ untuk impact). */
  fontScale: number;
  textColor: string;
  accentColor: string;
  backgroundColor: string;
  backgroundAlpha: number;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
  shadowBlur: number;
  shadowOffsetY: number;
  outlineWidth: number;
  outlineColor: string;
  letterSpacing: number;
  lineHeight: number;
  textAlign: "left" | "center" | "right";
  /** Fraksi lebar frame untuk lebar maksimum blok caption. */
  maxWidth: number;
  maxLines: number;
  /** Warna pill terpisah untuk kontras di atas latar sibuk. */
  scrim: string;
  scrimAlpha: number;
}

const BASE: CaptionThemeTokens = {
  fontFamily: "sans-serif",
  displayWeight: "800",
  bodyWeight: "600",
  fontScale: 1,
  textColor: "#FFFFFF",
  accentColor: "#E63B2E",
  backgroundColor: "#0A0A0A",
  backgroundAlpha: 0.82,
  borderColor: "#000000",
  borderWidth: 0,
  borderRadius: 24,
  paddingX: 26,
  paddingY: 18,
  shadowBlur: 16,
  shadowOffsetY: 4,
  outlineWidth: 0,
  outlineColor: "#000000",
  letterSpacing: 0,
  lineHeight: 1.32,
  textAlign: "center",
  maxWidth: 0.88,
  maxLines: 2,
  scrim: "#0A0A0A",
  scrimAlpha: 0.78,
};

export interface CaptionThemePreset {
  id: string;
  tokens: Partial<CaptionThemeTokens>;
}

/** Preset tema kontekstual - tidak ada yang biru dominan permanen. */
export const captionThemePresets: CaptionThemePreset[] = [
  {
    id: "editorial",
    tokens: {
      backgroundAlpha: 0,
      textColor: "#111111",
      accentColor: "#E63B2E",
      displayWeight: "900",
      letterSpacing: 0.5,
      textAlign: "left",
      scrim: "#000000",
      scrimAlpha: 0.35,
      fontScale: 1.05,
    },
  },
  {
    id: "minimal-dark",
    tokens: {
      backgroundAlpha: 0.82,
      textColor: "#FFFFFF",
      borderRadius: 24,
      borderWidth: 0,
    },
  },
  {
    id: "comic",
    tokens: {
      backgroundAlpha: 0.96,
      backgroundColor: "#FFFFFF",
      textColor: "#111111",
      borderColor: "#111111",
      borderWidth: 3,
      borderRadius: 30,
      displayWeight: "800",
      bodyWeight: "700",
      shadowOffsetY: 6,
    },
  },
  {
    id: "tech",
    tokens: {
      backgroundColor: "#0B1016",
      backgroundAlpha: 0.88,
      textColor: "#D9E8F2",
      borderColor: "#22D3EE",
      borderWidth: 1.5,
      borderRadius: 10,
      letterSpacing: 1,
      bodyWeight: "600",
      shadowBlur: 20,
    },
  },
  {
    id: "chat",
    tokens: {
      backgroundColor: "#FFFFFF",
      backgroundAlpha: 0.96,
      textColor: "#16181C",
      borderRadius: 26,
      borderWidth: 0,
      paddingX: 22,
      paddingY: 14,
      fontScale: 0.92,
    },
  },
  {
    id: "impact",
    tokens: {
      backgroundAlpha: 0,
      textColor: "#FFFFFF",
      displayWeight: "900",
      fontScale: 2.2,
      outlineWidth: 6,
      outlineColor: "#0A0A0A",
      letterSpacing: 1,
      lineHeight: 1.05,
      shadowBlur: 30,
      shadowOffsetY: 10,
    },
  },
  {
    id: "data",
    tokens: {
      backgroundColor: "#101418",
      backgroundAlpha: 0.9,
      textColor: "#F2F5F7",
      borderRadius: 8,
      borderWidth: 0,
      paddingX: 20,
      paddingY: 12,
      fontScale: 0.9,
      letterSpacing: 0.5,
      textAlign: "left",
    },
  },
  {
    id: "documentary",
    tokens: {
      backgroundColor: "#000000",
      backgroundAlpha: 0.5,
      textColor: "#FFFFFF",
      borderRadius: 6,
      borderWidth: 0,
      fontScale: 0.96,
      letterSpacing: 0.4,
      textAlign: "left",
    },
  },
  {
    id: "instruction",
    tokens: {
      backgroundColor: "#F5C518",
      backgroundAlpha: 0.96,
      textColor: "#141414",
      borderRadius: 14,
      borderWidth: 0,
      paddingX: 24,
      paddingY: 16,
      bodyWeight: "700",
      textAlign: "left",
    },
  },
];

export function getCaptionThemePreset(id: string): CaptionThemePreset | null {
  return captionThemePresets.find((t) => t.id === id) ?? null;
}

export interface ResolveThemeInput {
  themeId?: string | Record<string, unknown>;
  palette: Palette;
  style: StyleDef;
  fontFamily: string;
  /** Kontras ditegakkan terhadap latar belakang adegan. */
  sceneBackground?: string;
}

function readableOn(text: string, background: string): string {
  if (contrastRatio(text, background) >= 4.5) return text;
  return luminance(background) > 0.35 ? shade(text, -0.85) : shade(text, 0.85);
}

/**
 * Meresolusi tema final: preset (atau minimal-dark default) + token override
 * + warna aksen dari palet proyek + penegakan kontras teks.
 */
export function resolveCaptionTheme(input: ResolveThemeInput): CaptionThemeTokens {
  let tokens: CaptionThemeTokens = { ...BASE };
  const id =
    typeof input.themeId === "string" ? input.themeId
      : input.themeId && typeof input.themeId === "object"
        ? (input.themeId as Record<string, unknown>).preset as string | undefined
        : undefined;
  const preset = getCaptionThemePreset(id ?? "minimal-dark");
  if (preset) tokens = { ...tokens, ...preset.tokens };
  tokens.fontFamily = input.fontFamily || tokens.fontFamily;
  if (input.style?.typography?.bodyWeight) tokens.bodyWeight = input.style.typography.bodyWeight;

  // Aksen mengikuti palet proyek selama cukup terang untuk keterbacaan.
  if (input.palette?.accent && luminance(input.palette.accent) >= 0.18) {
    tokens.accentColor = input.palette.accent;
  }
  if (input.palette?.text) {
    const sceneBg = input.sceneBackground ?? input.palette.background ?? "#FFFFFF";
    if (tokens.backgroundAlpha < 0.2) {
      tokens.textColor = readableOn(input.palette.text, sceneBg);
    } else {
      tokens.textColor = luminance(tokens.backgroundColor) > 0.4
        ? readableOn(input.palette.text, tokens.backgroundColor)
        : "#FFFFFF";
    }
  }
  if (
    input.themeId &&
    typeof input.themeId === "object" &&
    typeof (input.themeId as Record<string, unknown>).accentColor === "string"
  ) {
    tokens.accentColor = (input.themeId as Record<string, string>).accentColor;
  }
  // Kontras aksen terhadap teks utama pada gaya tanpa latar.
  if (tokens.backgroundAlpha < 0.2 && contrastRatio(tokens.accentColor, tokens.textColor) < 2.4) {
    tokens.accentColor = shade(tokens.accentColor, luminance(tokens.textColor) > 0.4 ? -0.5 : 0.6);
  }
  return tokens;
}

/** Warna dengan alpha siap pakai untuk ctx (toleran hex/rgba). */
export function themeAlpha(hex: string, alpha: number): string {
  if (hex.startsWith("rgba")) return hex;
  return withAlpha(hex, alpha);
}
