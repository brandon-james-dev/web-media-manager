/**
 * Adopts the theme stylesheet as one constructed stylesheet, or falls back to
 * a `<style data-wmm-theme>` element when the environment has no
 * constructable stylesheets.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const host = new ThemeStyleSheetHost(document);
 * host.apply(sheet.cssText);
 * ```
 */
export class ThemeStyleSheetHost {
  private readonly doc: Document;
  private sheet: CSSStyleSheet | undefined;
  private element: HTMLStyleElement | undefined;

  constructor(doc: Document) {
    this.doc = doc;
  }

  /**
   * Adopts a stylesheet text, replacing the previous one. Passing
   * `undefined` removes the theme stylesheet and leaves other adopted sheets
   * untouched.
   *
   * @example
   * ```xml
   * <ButtonStyle id="transport" background="@brush/chrome-gloss" />
   * ```
   * @example
   * ```ts
   * host.apply(buildThemeStylesheet(ir, options).cssText);
   * host.apply(undefined);
   * ```
   */
  apply(cssText: string | undefined): void {
    if (cssText === undefined) {
      this.remove();
      return;
    }
    if (this.supportsConstructable()) {
      this.removeElement();
      if (this.sheet === undefined) {
        this.sheet = new CSSStyleSheet();
      }
      this.sheet.replaceSync(cssText);
      const adopted = this.doc.adoptedStyleSheets;
      if (!adopted.includes(this.sheet)) {
        this.doc.adoptedStyleSheets = [...adopted, this.sheet];
      }
      return;
    }
    this.removeSheet();
    if (this.element === undefined) {
      this.element = this.doc.createElement("style");
      this.element.setAttribute("data-wmm-theme", "");
      this.doc.head.append(this.element);
    }
    this.element.textContent = cssText;
  }

  /** Whether the document can adopt a constructed stylesheet. */
  private supportsConstructable(): boolean {
    return (
      typeof CSSStyleSheet === "function" &&
      "replaceSync" in CSSStyleSheet.prototype &&
      "adoptedStyleSheets" in this.doc
    );
  }

  /** Removes the theme stylesheet from either host. */
  private remove(): void {
    this.removeSheet();
    this.removeElement();
  }

  /** Drops the constructed stylesheet from the document. */
  private removeSheet(): void {
    if (this.sheet === undefined) return;
    this.doc.adoptedStyleSheets = this.doc.adoptedStyleSheets.filter(
      (sheet) => sheet !== this.sheet
    );
    this.sheet = undefined;
  }

  /** Removes the fallback style element. */
  private removeElement(): void {
    this.element?.remove();
    this.element = undefined;
  }
}

let themeStyleSheetHost: ThemeStyleSheetHost | undefined;

/**
 * The stylesheet host bound to `document`, created on first use.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * getThemeStyleSheetHost().apply(sheet.cssText);
 * ```
 */
export function getThemeStyleSheetHost(): ThemeStyleSheetHost {
  if (themeStyleSheetHost === undefined) {
    themeStyleSheetHost = new ThemeStyleSheetHost(document);
  }
  return themeStyleSheetHost;
}
