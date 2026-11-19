import { useEffect, useState } from "react";
import { getThemeStore } from "@/core/ports/themes";
import type { FormFactor } from "../../../componentModel";
import type { ThemeIR } from "../../../ir";
import { ThemeImageAssets } from "../../assets/browser/themeImageAssets";
import { buildThemeStylesheet } from "../../styles";
import type { ThemeImageResolver, ThemeStylesheet } from "../../styles";
import { getThemeStyleSheetHost } from "../../styles/browser/themeStyleSheetHost";

/**
 * The stylesheet and image resolver a layout renders with.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const result: ThemeStylesheetResult = { stylesheet, images };
 * ```
 */
export interface ThemeStylesheetResult {
  /** The generated stylesheet for the form factor. */
  readonly stylesheet: ThemeStylesheet;
  /** The preloaded image resolver its rules point at. */
  readonly images: ThemeImageResolver;
}

/**
 * Preloads the theme's images, builds the stylesheet for one form factor and
 * adopts it in the document. The result is `undefined` until the images have
 * loaded, and the stylesheet and its URLs are released when the theme or the
 * form factor changes.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport" background="@brush/chrome-gloss" />
 * ```
 * @example
 * ```ts
 * const result = useThemeStylesheet(ir, "desktop");
 * result?.stylesheet.defaults.button; // "wmm-t-1x9f2a"
 * ```
 */
export function useThemeStylesheet(
  ir: ThemeIR,
  formFactor: FormFactor
): ThemeStylesheetResult | undefined {
  const [result, setResult] = useState<ThemeStylesheetResult | undefined>(
    undefined
  );

  useEffect(() => {
    let cancelled = false;
    const assets = new ThemeImageAssets(readThemeFile);
    setResult(undefined);

    void assets.preload(ir).then((images) => {
      if (cancelled) return;
      const stylesheet = buildThemeStylesheet(ir, { formFactor, images });
      getThemeStyleSheetHost().apply(stylesheet.cssText);
      setResult({ stylesheet, images });
    });

    return () => {
      cancelled = true;
      getThemeStyleSheetHost().apply(undefined);
      assets.release();
    };
  }, [ir, formFactor]);

  return result;
}

/** Reads one package file of the active theme store. */
function readThemeFile(
  themeId: string,
  path: string
): Promise<Uint8Array | undefined> {
  try {
    return getThemeStore()
      .files.getFile(themeId, path)
      .then((file) => file?.bytes);
  } catch {
    return Promise.resolve(undefined);
  }
}
