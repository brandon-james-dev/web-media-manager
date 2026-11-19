import type { FormFactor } from "../componentModel";
import { THEME_IR_VERSION } from "../ir";
import type { ThemeIR } from "../ir";
import type { ColorScheme } from "../package";
import { buildThemeTokens } from "./buildThemeTokens";
import type { ThemeTokens } from "./buildThemeTokens";

/**
 * The localStorage key the active theme's tokens are mirrored under, so the
 * first paint after a reload is already themed.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * storage.removeItem(THEME_MIRROR_KEY);
 * ```
 */
export const THEME_MIRROR_KEY = "wmm-theme-mirror";

/**
 * The precomputed tokens of the active theme, one entry per supported
 * scheme. It holds no author strings, only host-generated values.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0">
 *   <Palettes>...</Palettes>
 * </Theme>
 * ```
 * @example
 * ```ts
 * const mirror = createThemeMirror(ir, "#3b82f6");
 * mirror.tokens.dark?.variables["--background"]; // "#0b1a3aff"
 * ```
 */
export interface ThemeMirror {
  themeId: string;
  themeVersion: string;
  irVersion: number;
  colorSchemes: ColorScheme[];
  honorsUserAccent: boolean;
  tokens: Partial<Record<ColorScheme, ThemeTokens>>;
  /**
   * The form factors the theme has a layout for. The host keeps the built-in
   * UI hidden at startup only on these, so a tokens-only theme never shows a
   * blank screen while it loads. Older mirrors omit it.
   */
  layouts?: FormFactor[];
}

/**
 * The slice of `localStorage` the mirror needs, so tests can pass a plain
 * object.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * writeThemeMirror(window.localStorage, mirror);
 * ```
 */
export interface MirrorStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Precomputes the tokens of every scheme the theme supports.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" honorsUserAccent="false" />
 * ```
 * @example
 * ```ts
 * const mirror = createThemeMirror(ir);
 * Object.keys(mirror.tokens); // ["dark"]
 * ```
 */
export function createThemeMirror(
  ir: ThemeIR,
  userAccent?: string
): ThemeMirror {
  const tokens: Partial<Record<ColorScheme, ThemeTokens>> = {};
  for (const scheme of ir.colorSchemes) {
    tokens[scheme] = buildThemeTokens(ir, { scheme, userAccent });
  }
  return {
    themeId: ir.themeId,
    themeVersion: ir.themeVersion,
    irVersion: ir.irVersion,
    colorSchemes: ir.colorSchemes,
    honorsUserAccent: ir.honorsUserAccent,
    tokens,
    layouts: Object.keys(ir.layouts) as FormFactor[],
  };
}

/**
 * Stores the mirror, or removes it when there is no theme. Storage failures
 * are swallowed, so a blocked `localStorage` never breaks a theme switch.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * writeThemeMirror(window.localStorage, undefined);
 * ```
 */
export function writeThemeMirror(
  storage: MirrorStorage,
  mirror: ThemeMirror | undefined
): void {
  try {
    if (mirror === undefined) {
      storage.removeItem(THEME_MIRROR_KEY);
      return;
    }
    storage.setItem(THEME_MIRROR_KEY, JSON.stringify(mirror));
  } catch {
    return;
  }
}

/** Whether a parsed value is a color scheme list the host understands. */
function isSchemeList(value: unknown): value is ColorScheme[] {
  return (
    Array.isArray(value) &&
    value.every((scheme) => scheme === "light" || scheme === "dark")
  );
}

/** Whether a parsed value has the shape of a {@link ThemeMirror}. */
function isThemeMirror(value: unknown): value is ThemeMirror {
  if (typeof value !== "object" || value === null) return false;
  const mirror = value as Partial<ThemeMirror>;
  return (
    typeof mirror.themeId === "string" &&
    typeof mirror.themeVersion === "string" &&
    typeof mirror.irVersion === "number" &&
    typeof mirror.honorsUserAccent === "boolean" &&
    isSchemeList(mirror.colorSchemes) &&
    typeof mirror.tokens === "object" &&
    mirror.tokens !== null
  );
}

/**
 * Reads the mirror back, returning `undefined` for anything unusable: no
 * entry, broken JSON, a stale IR version or the wrong shape. Never throws.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const mirror = readThemeMirror(window.localStorage);
 * mirror?.themeId; // "classic-blue"
 * ```
 */
export function readThemeMirror(
  storage: MirrorStorage
): ThemeMirror | undefined {
  try {
    const raw = storage.getItem(THEME_MIRROR_KEY);
    if (raw === null) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (!isThemeMirror(parsed)) return undefined;
    if (parsed.irVersion !== THEME_IR_VERSION) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

/**
 * The mirrored tokens for the preferred scheme, or the theme's first scheme
 * when the preferred one was not mirrored.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * mirrorTokens(mirror, "light")?.scheme; // "dark"
 * ```
 */
export function mirrorTokens(
  mirror: ThemeMirror,
  preferred: ColorScheme
): ThemeTokens | undefined {
  return mirror.tokens[preferred] ?? mirror.tokens[mirror.colorSchemes[0]];
}
