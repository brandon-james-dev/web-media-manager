import type { FormFactor } from "../../componentModel";
import type { IRNode } from "../../ir";

/**
 * One package image the host has turned into a URL it owns. The URL is a
 * Blob URL the asset manager created, never an author-supplied string.
 *
 * @example
 * ```xml
 * <Image id="play-orb" src="assets/images/play-orb.png">
 *   <Variant scale="2" src="assets/images/play-orb@2x.png" />
 * </Image>
 * ```
 * @example
 * ```ts
 * const image: ResolvedThemeImage = {
 *   url: "blob:http://localhost/1a2b",
 *   set: 'image-set(url("blob:http://localhost/1a2b") 1x)',
 *   width: 56,
 *   height: 56,
 * };
 * ```
 */
export interface ResolvedThemeImage {
  /** The Blob URL of the base image. */
  readonly url: string;
  /** A complete `image-set(...)` value when the image ships variants. */
  readonly set?: string;
  /** Natural width of the base image in pixels, when it decoded. */
  readonly width?: number;
  /** Natural height of the base image in pixels, when it decoded. */
  readonly height?: number;
  /** Nine-slice insets as top, right, bottom and left, when declared. */
  readonly slice?: number[];
}

/**
 * Looks up a preloaded image by its author id. The resolver is synchronous
 * because the asset manager loads every referenced image before the
 * stylesheet is built.
 *
 * @example
 * ```xml
 * <ImageBrush id="frame" image="@image/chrome-frame" fit="nineSlice" />
 * ```
 * @example
 * ```ts
 * const resolver: ThemeImageResolver = (id) => loaded.get(id);
 * resolver("chrome-frame")?.url; // "blob:http://localhost/1a2b"
 * ```
 */
export type ThemeImageResolver = (id: string) => ResolvedThemeImage | undefined;

/**
 * The class names the style engine generated for one style table, keyed by
 * the author's style id. The ids stay in the map so the renderer can look a
 * style up; they never reach the CSS text.
 *
 * @example
 * ```xml
 * <ButtonStyles>
 *   <ButtonStyle id="transport" background="@brush/chrome-gloss" />
 * </ButtonStyles>
 * ```
 * @example
 * ```ts
 * stylesheet.classes.button.transport; // "wmm-t-1x9f2a"
 * ```
 */
export interface ThemeStyleClasses {
  /** Generated class per button style id. */
  readonly button: Record<string, string>;
  /** Generated class per panel style id. */
  readonly panel: Record<string, string>;
  /** Generated class per slider style id. */
  readonly slider: Record<string, string>;
  /** Generated class per text style id. */
  readonly text: Record<string, string>;
}

/**
 * The class an element uses when it names no style: the `<Defaults>` style's
 * class when the theme sets one, otherwise the host built-in class.
 *
 * @example
 * ```xml
 * <Defaults button="@button/standard" panel="@panel/content" text="@text/body" />
 * ```
 * @example
 * ```ts
 * stylesheet.defaults.panel; // "wmm-t-0k3m9z"
 * ```
 */
export interface ThemeStyleDefaults {
  /** Class of the default button style. */
  readonly button: string;
  /** Class of the default panel style. */
  readonly panel: string;
  /** Class of the default text style. */
  readonly text: string;
}

/**
 * Everything the layout renderer needs from the style engine: one CSS text,
 * the class per style id, the default classes, and the class of every layout
 * node that carries an inline visual override.
 *
 * @example
 * ```xml
 * <Panel style="@panel/inset" background="@slot/card" />
 * ```
 * @example
 * ```ts
 * const sheet = buildThemeStylesheet(ir, { formFactor: "desktop", images });
 * host.apply(sheet.cssText);
 * ```
 */
export interface ThemeStylesheet {
  /** The whole stylesheet as one string. */
  readonly cssText: string;
  /** Generated class names per style table. */
  readonly classes: ThemeStyleClasses;
  /** The classes elements fall back to. */
  readonly defaults: ThemeStyleDefaults;
  /** Generated class per layout node with an inline visual override. */
  readonly nodeClasses: Map<IRNode, string>;
}

/**
 * What {@link buildThemeStylesheet} needs: the layout to read inline
 * overrides from and the resolver for the images its brushes and buttons
 * paint.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const options: BuildThemeStylesheetOptions = {
 *   formFactor: "desktop",
 *   images: (id) => loaded.get(id),
 * };
 * ```
 */
export interface BuildThemeStylesheetOptions {
  /** The form factor whose layout supplies the inline overrides. */
  readonly formFactor: FormFactor;
  /** The preloaded image resolver. */
  readonly images: ThemeImageResolver;
}
