import type { FormFactor, PaletteSlot, ReferenceKind } from "../componentModel";
import type { ColorScheme } from "../package";

/**
 * Version of the compiled theme IR. The host recompiles a cached IR when
 * this number or the validator version changes.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const stale = cached.irVersion !== THEME_IR_VERSION;
 * ```
 */
export const THEME_IR_VERSION = 1;

/**
 * A color resolved to a literal `#rrggbbaa` value. `transparent` becomes
 * `#00000000` and `#rgb` is expanded, so every literal has eight digits.
 *
 * @example
 * ```xml
 * <Button foreground="#ffffff80" />
 * ```
 * @example
 * ```ts
 * const white: IRColorLiteral = { kind: "literal", value: "#ffffffff" };
 * ```
 */
export interface IRColorLiteral {
  /** Discriminator for a resolved literal. */
  readonly kind: "literal";
  /** Lowercase `#rrggbbaa` value. */
  readonly value: string;
}

/**
 * A color that follows the active palette scheme and the user's accent.
 *
 * @example
 * ```xml
 * <PanelStyle id="inset" background="@slot/card" />
 * ```
 * @example
 * ```ts
 * const card: IRColorSlot = { kind: "slot", slot: "card" };
 * ```
 */
export interface IRColorSlot {
  /** Discriminator for a palette slot. */
  readonly kind: "slot";
  /** The slot the renderer reads from the active palette. */
  readonly slot: PaletteSlot;
}

/**
 * A compiled color: either a literal or a palette slot. `@color/` chains are
 * resolved to literals, so a literal never points at another color.
 *
 * @example
 * ```xml
 * <ButtonStyle id="nav" foreground="@color/blue-300" background="@slot/card" />
 * ```
 * @example
 * ```ts
 * const foreground: IRColor = { kind: "slot", slot: "foreground" };
 * ```
 */
export type IRColor = IRColorLiteral | IRColorSlot;

/**
 * A compiled brush value: a color, or a reference to a brush declared in
 * `<Brushes>`.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport" background="@brush/chrome-gloss" />
 * ```
 * @example
 * ```ts
 * const background: IRBrushValue = { kind: "brush", id: "chrome-gloss" };
 * ```
 */
export type IRBrushValue =
  | { readonly kind: "color"; readonly color: IRColor }
  | { readonly kind: "brush"; readonly id: string };

/**
 * A brush that fills with one color.
 *
 * @example
 * ```xml
 * <SolidBrush id="panel" color="@slot/card" />
 * ```
 * @example
 * ```ts
 * const solid: IRBrush = {
 *   type: "solid",
 *   color: { kind: "slot", slot: "card" },
 * };
 * ```
 */
export interface IRSolidBrush {
  /** Discriminator for a solid fill. */
  readonly type: "solid";
  /** The fill color. */
  readonly color: IRColor;
}

/**
 * One stop of a linear gradient.
 *
 * @example
 * ```xml
 * <Stop offset="0.5" color="@color/blue-600" />
 * ```
 * @example
 * ```ts
 * const stop: IRGradientStop = {
 *   offset: 0.5,
 *   color: { kind: "literal", value: "#2f5fb8ff" },
 * };
 * ```
 */
export interface IRGradientStop {
  /** Position along the gradient, from 0 to 1. */
  readonly offset: number;
  /** The color at this position. */
  readonly color: IRColor;
}

/**
 * A gradient brush along an angle in the CSS convention.
 *
 * @example
 * ```xml
 * <LinearGradient id="chrome-gloss" angle="180">
 *   <Stop offset="0" color="#5f8fe0" />
 *   <Stop offset="1" color="#1c3f94" />
 * </LinearGradient>
 * ```
 * @example
 * ```ts
 * const gradient: IRBrush = {
 *   type: "linear",
 *   angle: 180,
 *   stops: [
 *     { offset: 0, color: { kind: "literal", value: "#5f8fe0ff" } },
 *     { offset: 1, color: { kind: "literal", value: "#1c3f94ff" } },
 *   ],
 * };
 * ```
 */
export interface IRLinearBrush {
  /** Discriminator for a linear gradient. */
  readonly type: "linear";
  /** Gradient angle in degrees, 0 to 359. */
  readonly angle: number;
  /** Two to eight stops, in non-decreasing offset order. */
  readonly stops: IRGradientStop[];
}

/**
 * A brush that paints an image, optionally tinted.
 *
 * @example
 * ```xml
 * <ImageBrush id="frame" image="@image/chrome-frame" fit="nineSlice" />
 * ```
 * @example
 * ```ts
 * const brush: IRBrush = {
 *   type: "image",
 *   image: "chrome-frame",
 *   fit: "nineSlice",
 * };
 * ```
 */
export interface IRImageBrush {
  /** Discriminator for an image fill. */
  readonly type: "image";
  /** Id of the image in {@link ThemeIR.images}. */
  readonly image: string;
  /** How the image fills its box: stretch, cover, contain, tile or nineSlice. */
  readonly fit: string;
  /** Multiply-blend tint, when the brush sets one. */
  readonly tint?: IRColor;
}

/**
 * A compiled brush from `<Brushes>`.
 *
 * @example
 * ```xml
 * <Brushes>
 *   <SolidBrush id="panel" color="@slot/card" />
 * </Brushes>
 * ```
 * @example
 * ```ts
 * const brush: IRBrush = {
 *   type: "solid",
 *   color: { kind: "slot", slot: "card" },
 * };
 * ```
 */
export type IRBrush = IRSolidBrush | IRLinearBrush | IRImageBrush;

/**
 * One grid track: a pixel width, a star share, or content-sized.
 *
 * @example
 * ```xml
 * <Grid columns="220 1* auto" rows="1*" />
 * ```
 * @example
 * ```ts
 * const tracks: IRGridTrack[] = [
 *   { type: "px", value: 220 },
 *   { type: "star", share: 1 },
 *   { type: "auto" },
 * ];
 * ```
 */
export type IRGridTrack =
  | { readonly type: "px"; readonly value: number }
  | { readonly type: "star"; readonly share: number }
  | { readonly type: "auto" };

/**
 * A reference to a theme token or style that the renderer resolves by id.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport" shadow="@shadow/raised" />
 * ```
 * @example
 * ```ts
 * const shadow: IRRef = { ref: "shadow", id: "raised" };
 * ```
 */
export interface IRRef {
  /** The reference kind, such as `shadow` or `text`. */
  readonly ref: ReferenceKind;
  /** The declared id. */
  readonly id: string;
}

/**
 * One compiled attribute value. Thickness and CornerRadius expand to four
 * numbers, colors become {@link IRColor}, and brushes become
 * {@link IRBrushValue}.
 *
 * @example
 * ```xml
 * <PanelStyle id="title-strip" padding="4 10" cornerRadius="6 6 0 0" />
 * ```
 * @example
 * ```ts
 * const padding: IRValue = [4, 10, 4, 10];
 * const cornerRadius: IRValue = [6, 6, 0, 0];
 * ```
 */
export type IRValue =
  | boolean
  | number
  | string
  | string[]
  | number[]
  | IRColor
  | IRBrushValue
  | IRGridTrack[]
  | IRRef;

/**
 * One static appearance of a button, slider or panel style.
 *
 * @example
 * ```xml
 * <State name="pressed" background="@brush/chrome-gloss-down" />
 * ```
 * @example
 * ```ts
 * const state: IRStyleState = {
 *   name: "pressed",
 *   properties: { opacity: 0.4 },
 * };
 * ```
 */
export interface IRStyleState {
  /** The state name, such as `hover` or `active`. */
  readonly name: string;
  /** The command state value an `active` state matches. */
  readonly value?: string;
  /** The properties the state overrides. */
  properties: Record<string, IRValue>;
}

/**
 * A compiled button, slider or panel style. `basedOn` is flattened into
 * `base`, ancestor first, and states are merged by name and value.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport-touch" basedOn="@button/transport"
 *   minWidth="44" minHeight="44" />
 * ```
 * @example
 * ```ts
 * const style: IRStyle = {
 *   base: { minWidth: 44, minHeight: 44 },
 *   states: [],
 * };
 * ```
 */
export interface IRStyle {
  /** The style's own properties with every ancestor applied. */
  readonly base: Record<string, IRValue>;
  /** The states of the style and its ancestors, child last. */
  readonly states: IRStyleState[];
}

/**
 * One compiled element of a layout tree.
 *
 * @example
 * ```xml
 * <Shell><PageHost /></Shell>
 * ```
 * @example
 * ```ts
 * const shell: IRNode = { element: "Shell", attributes: {}, children: [] };
 * ```
 */
export interface IRNode {
  /** The element's local name. */
  readonly element: string;
  /** The element's attributes, keyed by local name. */
  readonly attributes: Record<string, IRValue>;
  /** The element's children, in document order. */
  readonly children: IRNode[];
}

/**
 * One font file of a family.
 *
 * @example
 * ```xml
 * <Face src="assets/fonts/classic-sans-bold.woff2" weight="700" />
 * ```
 * @example
 * ```ts
 * const face: IRFontFace = {
 *   src: "assets/fonts/classic-sans-bold.woff2",
 *   weight: 700,
 *   style: "normal",
 * };
 * ```
 */
export interface IRFontFace {
  /** Package path of the font file. */
  readonly src: string;
  /** Weight from 100 to 900. */
  readonly weight: number;
  /** `normal` or `italic`. */
  readonly style: string;
}

/**
 * A compiled font family.
 *
 * @example
 * ```xml
 * <FontFamily id="ui" fallback="sansSerif" />
 * ```
 * @example
 * ```ts
 * const font: IRFont = { fallback: "sansSerif", faces: [] };
 * ```
 */
export interface IRFont {
  /** The generic stack used when no face loads. */
  readonly fallback: string;
  /** The family's faces, in document order. */
  readonly faces: IRFontFace[];
}

/**
 * A higher-density copy of an image.
 *
 * @example
 * ```xml
 * <Variant scale="2" src="assets/images/frame@2x.png" />
 * ```
 * @example
 * ```ts
 * const variant: IRImageVariant = {
 *   scale: 2,
 *   src: "assets/images/frame@2x.png",
 * };
 * ```
 */
export interface IRImageVariant {
  /** Density multiplier, 2 or 3. */
  readonly scale: number;
  /** Package path of the variant file. */
  readonly src: string;
}

/**
 * A compiled image asset.
 *
 * @example
 * ```xml
 * <Image id="chrome-frame" src="assets/images/frame.png" slice="12 12 12 12" />
 * ```
 * @example
 * ```ts
 * const image: IRImage = {
 *   src: "assets/images/frame.png",
 *   slice: [12, 12, 12, 12],
 *   variants: [],
 * };
 * ```
 */
export interface IRImage {
  /** Package path of the base image. */
  readonly src: string;
  /** Nine-slice insets as top, right, bottom and left. */
  readonly slice?: number[];
  /** The high-density variants, in document order. */
  readonly variants: IRImageVariant[];
}

/**
 * One layer of a shadow. Layer 0 is the `<Shadow>`'s own attributes.
 *
 * @example
 * ```xml
 * <Shadow id="raised" x="0" y="2" blur="6" spread="0" color="#00000066" />
 * ```
 * @example
 * ```ts
 * const layer: IRShadowLayer = {
 *   x: 0,
 *   y: 2,
 *   blur: 6,
 *   spread: 0,
 *   color: { kind: "literal", value: "#00000066" },
 *   inset: false,
 * };
 * ```
 */
export interface IRShadowLayer {
  /** Horizontal offset in pixels. */
  readonly x: number;
  /** Vertical offset in pixels. */
  readonly y: number;
  /** Blur radius in pixels. */
  readonly blur: number;
  /** Spread in pixels. */
  readonly spread: number;
  /** The layer color. */
  readonly color: IRColor;
  /** Whether the shadow draws inside its box. */
  readonly inset: boolean;
}

/**
 * The styles the host falls back to when an element names none.
 *
 * @example
 * ```xml
 * <Defaults button="@button/standard" panel="@panel/content" text="@text/body" />
 * ```
 * @example
 * ```ts
 * const defaults: IRDefaults = {
 *   button: "standard",
 *   panel: "content",
 *   text: "body",
 * };
 * ```
 */
export interface IRDefaults {
  /** Id of the default button style. */
  button?: string;
  /** Id of the default panel style. */
  panel?: string;
  /** Id of the default text style. */
  text?: string;
}

/**
 * The compiled form of a validated theme package. Every reference resolves,
 * every value is in range, and palettes hold only explicitly set slots as
 * `#rrggbbaa` literals.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0">
 *   <Palettes>...</Palettes>
 *   <Defaults text="@text/body" />
 * </Theme>
 * ```
 * @example
 * ```ts
 * const { ir } = compileTheme({ manifest, theme, layouts });
 * const background = ir?.palettes.dark?.background;
 * ```
 */
export interface ThemeIR {
  /** Version of the IR shape. */
  readonly irVersion: typeof THEME_IR_VERSION;
  /** The manifest spec the theme was compiled against. */
  readonly spec: string;
  /** The manifest id. */
  readonly themeId: string;
  /** The manifest version. */
  readonly themeVersion: string;
  /** The manifest name. */
  readonly name: string;
  /** The schemes the manifest lists. */
  readonly colorSchemes: ColorScheme[];
  /** Whether the user's accent replaces the theme's accent. */
  readonly honorsUserAccent: boolean;
  /** The form factors the manifest lists. */
  readonly formFactors: FormFactor[];
  /** Explicitly set slots per scheme, as `#rrggbbaa` literals. */
  readonly palettes: Partial<
    Record<ColorScheme, Partial<Record<PaletteSlot, string>>>
  >;
  /** Font families keyed by id. */
  readonly fonts: Record<string, IRFont>;
  /** Text styles keyed by id, with `basedOn` flattened. */
  readonly textStyles: Record<string, Record<string, IRValue>>;
  /** Image assets keyed by id. */
  readonly images: Record<string, IRImage>;
  /** Brushes keyed by id. */
  readonly brushes: Record<string, IRBrush>;
  /** Shadows keyed by id, layer 0 first. */
  readonly shadows: Record<string, IRShadowLayer[]>;
  /** Button styles keyed by id. */
  readonly buttonStyles: Record<string, IRStyle>;
  /** Slider styles keyed by id. */
  readonly sliderStyles: Record<string, IRStyle>;
  /** Panel styles keyed by id. */
  readonly panelStyles: Record<string, IRStyle>;
  /** The fallback style ids from `<Defaults>`. */
  readonly defaults: IRDefaults;
  /** The layout tree per form factor. */
  readonly layouts: Partial<Record<FormFactor, IRNode>>;
}

/**
 * Normalizes a color to lowercase `#rrggbbaa`: `transparent` becomes
 * `#00000000`, `#rgb` is expanded, and `#rrggbb` gains an opaque alpha.
 *
 * @example
 * ```xml
 * <Button foreground="#FFF" background="transparent" />
 * ```
 * @example
 * ```ts
 * normalizeHexColor("#FFF"); // "#ffffffff"
 * normalizeHexColor("transparent"); // "#00000000"
 * ```
 */
export function normalizeHexColor(value: string): string {
  if (value === "transparent") return "#00000000";
  const hex = value.slice(1).toLowerCase();
  if (hex.length === 3) {
    const expanded = [...hex].map((digit) => digit + digit).join("");
    return `#${expanded}ff`;
  }
  return hex.length === 6 ? `#${hex}ff` : `#${hex}`;
}
