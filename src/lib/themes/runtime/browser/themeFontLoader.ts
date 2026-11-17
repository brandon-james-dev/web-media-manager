import type { ThemeIR } from "../../ir";
import { themeFontFaces } from "../buildThemeTokens";

/**
 * Loads a theme's font faces into a `FontFaceSet` and drops the previous
 * theme's faces. A generation counter discards a load that a newer theme
 * superseded, and a face that fails to load is skipped.
 *
 * @example
 * ```xml
 * <FontFamily id="ui" fallback="sansSerif">
 *   <Face src="assets/fonts/body.woff2" weight="400" />
 * </FontFamily>
 * ```
 * @example
 * ```ts
 * const loader = new ThemeFontLoader(document.fonts, (id, path) =>
 *   getThemeStore().files.getFile(id, path).then((file) => file?.bytes)
 * );
 * await loader.load("classic-blue", ir);
 * ```
 */
export class ThemeFontLoader {
  private readonly fonts: FontFaceSet;
  private readonly readFile: (
    themeId: string,
    path: string
  ) => Promise<Uint8Array | undefined>;
  private added: FontFace[] = [];
  private generation = 0;

  constructor(
    fonts: FontFaceSet,
    readFile: (themeId: string, path: string) => Promise<Uint8Array | undefined>
  ) {
    this.fonts = fonts;
    this.readFile = readFile;
  }

  /**
   * Replaces the loaded faces with the ones of `ir`. Passing `undefined`
   * only removes the previous theme's faces.
   *
   * @example
   * ```xml
   * <Face src="assets/fonts/body-bold.woff2" weight="700" />
   * ```
   * @example
   * ```ts
   * await loader.load("classic-blue", undefined);
   * ```
   */
  async load(themeId: string, ir: ThemeIR | undefined): Promise<void> {
    const generation = this.generation + 1;
    this.generation = generation;
    this.removeAdded();
    if (ir === undefined) return;

    for (const face of themeFontFaces(ir)) {
      const bytes = await this.readFile(themeId, face.src);
      if (generation !== this.generation) return;
      if (bytes === undefined) continue;
      try {
        const fontFace = new FontFace(face.family, bytes as BufferSource, {
          weight: String(face.weight),
          style: face.style,
        });
        await fontFace.load();
        if (generation !== this.generation) return;
        this.fonts.add(fontFace);
        this.added.push(fontFace);
      } catch (error) {
        console.warn(`[themes] Could not load the font ${face.src}:`, error);
      }
    }
  }

  /** Removes every face this loader added. */
  private removeAdded(): void {
    for (const face of this.added) this.fonts.delete(face);
    this.added = [];
  }
}
