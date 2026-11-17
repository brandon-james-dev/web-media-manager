import { PALETTE_SLOTS } from "../componentModel";
import type { PaletteSlot } from "../componentModel";
import { derivePalette } from "../ir";
import type { IRRef, IRValue, ThemeIR } from "../ir";
import type { ColorScheme } from "../package";

/**
 * The CSS generic family a theme font falls back to when none of its faces
 * load.
 *
 * @example
 * ```xml
 * <FontFamily id="ui" fallback="sansSerif">
 *   <Face src="assets/fonts/body.woff2" weight="400" />
 * </FontFamily>
 * ```
 * @example
 * ```ts
 * THEME_FONT_FALLBACKS.sansSerif; // "sans-serif"
 * ```
 */
export const THEME_FONT_FALLBACKS: Record<string, string> = {
  sansSerif: "sans-serif",
  serif: "serif",
  monospace: "monospace",
  systemUi: "system-ui",
};

/**
 * The CSS variables each palette slot writes, in kit order. Sidebar slots
 * mirror the card, primary, secondary, border and ring slots, and the
 * theme-only slots get a `--wmm-` prefix.
 *
 * @example
 * ```xml
 * <Palette scheme="dark">
 *   <Set slot="card" value="#142242" />
 * </Palette>
 * ```
 * @example
 * ```ts
 * PALETTE_VARIABLES.card; // ["--card", "--sidebar"]
 * ```
 */
export const PALETTE_VARIABLES: Record<PaletteSlot, readonly string[]> = {
  background: ["--background"],
  foreground: ["--foreground"],
  card: ["--card", "--sidebar"],
  cardForeground: ["--card-foreground", "--sidebar-foreground"],
  popover: ["--popover"],
  popoverForeground: ["--popover-foreground"],
  primary: ["--primary", "--sidebar-primary"],
  primaryForeground: ["--primary-foreground", "--sidebar-primary-foreground"],
  secondary: ["--secondary", "--sidebar-accent"],
  secondaryForeground: [
    "--secondary-foreground",
    "--sidebar-accent-foreground",
  ],
  muted: ["--muted"],
  mutedForeground: ["--muted-foreground"],
  accent: ["--accent"],
  accentForeground: ["--accent-foreground"],
  destructive: ["--destructive"],
  border: ["--border", "--sidebar-border"],
  input: ["--input"],
  ring: ["--ring", "--sidebar-ring"],
  selection: ["--wmm-selection"],
  selectionForeground: ["--wmm-selection-foreground"],
  progressTrack: ["--wmm-progress-track"],
  progressFill: ["--wmm-progress-fill"],
};

/**
 * The CSS custom properties one scheme of a theme sets, plus the root font
 * family its default text style asks for.
 *
 * @example
 * ```xml
 * <Defaults button="@button/standard" panel="@panel/content" text="@text/body" />
 * ```
 * @example
 * ```ts
 * const tokens: ThemeTokens = buildThemeTokens(ir, { scheme: "dark" });
 * tokens.variables["--background"]; // "#0b1a3aff"
 * ```
 */
export interface ThemeTokens {
  readonly scheme: ColorScheme;
  readonly variables: Record<string, string>;
  readonly fontFamily?: string;
}

/**
 * What {@link buildThemeTokens} needs: the scheme to render and the user's
 * accent, which only applies when the theme honors it.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" honorsUserAccent="true" />
 * ```
 * @example
 * ```ts
 * const options: BuildThemeTokensOptions = {
 *   scheme: "dark",
 *   userAccent: "#3b82f6",
 * };
 * ```
 */
export interface BuildThemeTokensOptions {
  readonly scheme: ColorScheme;
  readonly userAccent?: string;
}

/**
 * One loaded face of a theme font family, ready for the font loader.
 *
 * @example
 * ```xml
 * <Face src="assets/fonts/body-bold.woff2" weight="700" />
 * ```
 * @example
 * ```ts
 * const face: ThemeFontFaceEntry = {
 *   family: "wmm-t-1a2b3c4d",
 *   src: "assets/fonts/body-bold.woff2",
 *   weight: 700,
 *   style: "normal",
 * };
 * ```
 */
export interface ThemeFontFaceEntry {
  readonly family: string;
  readonly src: string;
  readonly weight: number;
  readonly style: string;
}

/** Whether a compiled text style value is a reference to a font family. */
function isFontRef(value: IRValue | undefined): value is IRRef {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "ref" in value &&
    value.ref === "font" &&
    typeof value.id === "string"
  );
}

/** FNV-1a, 32-bit, as eight lowercase hex digits. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * The host-generated family name of a theme font. It hashes the theme id and
 * the author's font id, so an author id never reaches CSS and two themes
 * cannot collide.
 *
 * @example
 * ```xml
 * <FontFamily id="ui" fallback="sansSerif" />
 * ```
 * @example
 * ```ts
 * themeFontFamilyName("classic-blue", "ui"); // "wmm-t-3f9c1a04"
 * ```
 */
export function themeFontFamilyName(themeId: string, fontId: string): string {
  return `wmm-t-${fnv1a(`${themeId}\u0000${fontId}`)}`;
}

/**
 * The scheme to render: the preferred one when the theme supports it,
 * otherwise the theme's first scheme.
 *
 * @example
 * ```json
 * { "colorSchemes": ["dark"] }
 * ```
 * @example
 * ```ts
 * resolveColorScheme(ir, "light"); // "dark"
 * ```
 */
export function resolveColorScheme(
  ir: ThemeIR,
  preferred: ColorScheme
): ColorScheme {
  return ir.colorSchemes.includes(preferred) ? preferred : ir.colorSchemes[0];
}

/**
 * The root font stack of a theme: the host family name of the default text
 * style's font plus its generic fallback, or just the fallback when the
 * family ships no faces.
 *
 * @example
 * ```xml
 * <TextStyle id="body" font="@font/ui" size="13" />
 * ```
 * @example
 * ```ts
 * rootFontFamily(ir); // '"wmm-t-3f9c1a04", sans-serif'
 * ```
 */
function rootFontFamily(ir: ThemeIR): string | undefined {
  const textId = ir.defaults.text;
  if (textId === undefined) return undefined;
  const style = ir.textStyles[textId];
  if (style === undefined) return undefined;
  const font = style.font;
  if (!isFontRef(font)) return undefined;
  const family = ir.fonts[font.id];
  if (family === undefined) return undefined;
  const generic = THEME_FONT_FALLBACKS[family.fallback] ?? "sans-serif";
  if (family.faces.length === 0) return generic;
  return `"${themeFontFamilyName(ir.themeId, font.id)}", ${generic}`;
}

/**
 * Builds the CSS custom properties of one scheme: every palette slot derived
 * to a literal `#rrggbbaa` value, the user accent applied only when the theme
 * honors it, and the root font family of the default text style.
 *
 * @example
 * ```xml
 * <Palette scheme="dark">
 *   <Set slot="background" value="#0b1a3a" />
 *   <Set slot="accent" value="#3d7bea" />
 * </Palette>
 * ```
 * @example
 * ```ts
 * const tokens = buildThemeTokens(ir, {
 *   scheme: "dark",
 *   userAccent: "#3b82f6",
 * });
 * tokens.variables["--accent"]; // "#3b82f6ff"
 * ```
 */
export function buildThemeTokens(
  ir: ThemeIR,
  options: BuildThemeTokensOptions
): ThemeTokens {
  const scheme = resolveColorScheme(ir, options.scheme);
  const palette = derivePalette(
    ir.palettes[scheme] ?? {},
    ir.honorsUserAccent ? options.userAccent : undefined
  );

  const variables: Record<string, string> = {};
  for (const slot of PALETTE_SLOTS) {
    for (const name of PALETTE_VARIABLES[slot]) {
      variables[name] = palette[slot];
    }
  }

  const fontFamily = rootFontFamily(ir);
  return {
    scheme,
    variables,
    ...(fontFamily === undefined ? {} : { fontFamily }),
  };
}

/**
 * Every face of every font family in the theme, with its host family name.
 *
 * @example
 * ```xml
 * <FontFamily id="ui" fallback="sansSerif">
 *   <Face src="assets/fonts/body.woff2" weight="400" />
 * </FontFamily>
 * ```
 * @example
 * ```ts
 * themeFontFaces(ir).map((face) => face.src);
 * // ["assets/fonts/body.woff2"]
 * ```
 */
export function themeFontFaces(ir: ThemeIR | undefined): ThemeFontFaceEntry[] {
  if (ir === undefined) return [];
  const faces: ThemeFontFaceEntry[] = [];
  for (const [id, font] of Object.entries(ir.fonts)) {
    const family = themeFontFamilyName(ir.themeId, id);
    for (const face of font.faces) {
      faces.push({
        family,
        src: face.src,
        weight: face.weight,
        style: face.style,
      });
    }
  }
  return faces;
}
