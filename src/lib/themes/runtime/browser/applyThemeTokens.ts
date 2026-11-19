import type { ColorScheme } from "../../package";
import type { ThemeTokens } from "../buildThemeTokens";

/**
 * Writes a theme's tokens onto one element's inline style and removes the
 * ones it set last time, so switching themes leaves no stale variables.
 *
 * @example
 * ```xml
 * <Palette scheme="dark">
 *   <Set slot="background" value="#0b1a3a" />
 * </Palette>
 * ```
 * @example
 * ```ts
 * const applier = new ThemeTokenApplier(document.documentElement);
 * applier.apply(tokens);
 * applier.hasTokens; // true
 * ```
 */
export class ThemeTokenApplier {
  private readonly root: HTMLElement;
  private readonly names = new Set<string>();
  private fontFamily: string | undefined;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  /**
   * Whether the element currently carries theme tokens.
   *
   * @example
   * ```xml
   * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
   * ```
   * @example
   * ```ts
   * if (applier.hasTokens) return;
   * ```
   */
  get hasTokens(): boolean {
    return this.names.size > 0 || this.fontFamily !== undefined;
  }

  /**
   * Applies one scheme's tokens, removing every variable the previous call
   * set and this one does not.
   *
   * @example
   * ```xml
   * <Palette scheme="light">
   *   <Set slot="foreground" value="#111827" />
   * </Palette>
   * ```
   * @example
   * ```ts
   * applier.apply(buildThemeTokens(ir, { scheme: "light" }));
   * ```
   */
  apply(tokens: ThemeTokens | undefined): void {
    const next = new Set<string>();
    if (tokens !== undefined) {
      for (const [name, value] of Object.entries(tokens.variables)) {
        this.root.style.setProperty(name, value);
        next.add(name);
      }
    }

    for (const name of this.names) {
      if (!next.has(name)) this.root.style.removeProperty(name);
    }

    this.names.clear();
    for (const name of next) this.names.add(name);
    this.setFontFamily(tokens?.fontFamily);
  }

  /**
   * Removes every token the applier set, returning the element to the kit's
   * own variables.
   *
   * @example
   * ```xml
   * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
   * ```
   * @example
   * ```ts
   * applier.clear();
   * applier.hasTokens; // false
   * ```
   */
  clear(): void {
    for (const name of this.names) this.root.style.removeProperty(name);
    this.names.clear();
    this.setFontFamily(undefined);
  }

  /** Sets or removes the inline root font family. */
  private setFontFamily(fontFamily: string | undefined): void {
    this.fontFamily = fontFamily;
    if (fontFamily === undefined) {
      this.root.style.removeProperty("font-family");
      return;
    }
    this.root.style.setProperty("font-family", fontFamily);
  }
}

/**
 * Puts the `light` or `dark` class on an element, removing the other one.
 *
 * @example
 * ```json
 * { "colorSchemes": ["dark"] }
 * ```
 * @example
 * ```ts
 * applyColorSchemeClass(document.documentElement, "dark");
 * ```
 */
export function applyColorSchemeClass(
  root: HTMLElement,
  scheme: ColorScheme
): void {
  root.classList.remove("light", "dark");
  root.classList.add(scheme);
}

let rootApplier: ThemeTokenApplier | undefined;

/**
 * The applier bound to `document.documentElement`, created on first use.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * getRootTokenApplier().apply(tokens);
 * ```
 */
export function getRootTokenApplier(): ThemeTokenApplier {
  if (rootApplier === undefined) {
    rootApplier = new ThemeTokenApplier(document.documentElement);
  }
  return rootApplier;
}
