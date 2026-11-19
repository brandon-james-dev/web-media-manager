import type {
  IRBrush,
  IRBrushValue,
  IRColor,
  IRImageBrush,
  IRLinearBrush,
  IRRef,
  IRShadowLayer,
  IRValue,
  ThemeIR,
} from "../../ir";
import {
  PALETTE_VARIABLES,
  THEME_FONT_FALLBACKS,
  themeFontFamilyName,
} from "../../runtime";
import type { ResolvedThemeImage, ThemeImageResolver } from "./types";

/**
 * The logical side names a thickness writes, in top, right, bottom, left
 * order.
 *
 * @example
 * ```xml
 * <PanelStyle id="inset" padding="4 8" />
 * ```
 * @example
 * ```ts
 * THICKNESS_SIDES[0]; // "block-start"
 * ```
 */
const THICKNESS_SIDES = [
  "block-start",
  "inline-end",
  "block-end",
  "inline-start",
] as const;

/**
 * The logical corner names a corner radius writes, in top-left, top-right,
 * bottom-right, bottom-left order.
 *
 * @example
 * ```xml
 * <PanelStyle id="title-strip" cornerRadius="6 6 0 0" />
 * ```
 * @example
 * ```ts
 * CORNER_SIDES[0]; // "start-start"
 * ```
 */
const CORNER_SIDES = [
  "start-start",
  "start-end",
  "end-end",
  "end-start",
] as const;

/**
 * The image fits a brush may name, mapped to the keywords the serializer
 * writes. An unknown fit falls back to `stretch`.
 *
 * @example
 * ```xml
 * <ImageBrush id="frame" image="@image/chrome-frame" fit="nineSlice" />
 * ```
 * @example
 * ```ts
 * IMAGE_FITS.nineSlice; // "nineSlice"
 * ```
 */
const IMAGE_FITS: Record<string, string> = {
  stretch: "stretch",
  cover: "cover",
  contain: "contain",
  tile: "tile",
  nineSlice: "nineSlice",
};

/**
 * The text transforms a text style may name, mapped to the CSS keywords.
 *
 * @example
 * ```xml
 * <TextStyle id="pane-header" transform="uppercase" />
 * ```
 * @example
 * ```ts
 * TEXT_TRANSFORMS.uppercase; // "uppercase"
 * ```
 */
const TEXT_TRANSFORMS: Record<string, string> = {
  none: "none",
  uppercase: "uppercase",
  lowercase: "lowercase",
  capitalize: "capitalize",
};

/**
 * The text alignments a text style may name, mapped to the logical CSS
 * keywords.
 *
 * @example
 * ```xml
 * <TextStyle id="title" align="center" />
 * ```
 * @example
 * ```ts
 * TEXT_ALIGNS.center; // "center"
 * ```
 */
const TEXT_ALIGNS: Record<string, string> = {
  start: "start",
  center: "center",
  end: "end",
};

/**
 * Serializes a compiled color: a palette slot becomes a `var()` of the first
 * CSS variable the slot writes, and a literal stays its `#rrggbbaa` value.
 *
 * @example
 * ```xml
 * <PanelStyle id="inset" background="@slot/card" />
 * ```
 * @example
 * ```ts
 * serializeColor({ kind: "slot", slot: "card" }); // "var(--card)"
 * serializeColor({ kind: "literal", value: "#0b1a3aff" }); // "#0b1a3aff"
 * ```
 */
export function serializeColor(color: IRColor): string {
  if (color.kind === "slot") {
    return `var(${PALETTE_VARIABLES[color.slot][0]})`;
  }
  return color.value;
}

/**
 * Serializes a compiled length as CSS pixels. Zero stays unitless so it is
 * valid in every property.
 *
 * @example
 * ```xml
 * <ButtonStyle id="standard" iconSize="16" />
 * ```
 * @example
 * ```ts
 * serializeLength(16); // "16px"
 * serializeLength(0); // "0"
 * ```
 */
export function serializeLength(value: number): string {
  return value === 0 ? "0" : `${value}px`;
}

/**
 * Serializes a compiled thickness into logical properties, in top, right,
 * bottom, left order. `border-width` writes the four `border-<side>-width`
 * names instead of a shorthand.
 *
 * @example
 * ```xml
 * <PanelStyle id="title-strip" padding="4 10" />
 * ```
 * @example
 * ```ts
 * serializeThickness("padding", [4, 10, 4, 10]);
 * // { "padding-block-start": "4px", "padding-inline-end": "10px", ... }
 * ```
 */
export function serializeThickness(
  prefix: "padding" | "margin" | "border-width",
  value: number[]
): Record<string, string> {
  const declarations: Record<string, string> = {};
  THICKNESS_SIDES.forEach((side, index) => {
    const name =
      prefix === "border-width" ? `border-${side}-width` : `${prefix}-${side}`;
    declarations[name] = serializeLength(value[index] ?? 0);
  });
  return declarations;
}

/**
 * Serializes a compiled corner radius into the four logical radius
 * properties, in top-left, top-right, bottom-right, bottom-left order.
 *
 * @example
 * ```xml
 * <PanelStyle id="title-strip" cornerRadius="6 6 0 0" />
 * ```
 * @example
 * ```ts
 * serializeCornerRadius([6, 6, 0, 0]);
 * // { "border-start-start-radius": "6px", "border-start-end-radius": "6px", ... }
 * ```
 */
export function serializeCornerRadius(value: number[]): Record<string, string> {
  const declarations: Record<string, string> = {};
  CORNER_SIDES.forEach((side, index) => {
    declarations[`border-${side}-radius`] = serializeLength(value[index] ?? 0);
  });
  return declarations;
}

/**
 * Serializes stacked shadow layers into one comma-separated `box-shadow`
 * value, layer 0 first.
 *
 * @example
 * ```xml
 * <Shadow id="raised" x="0" y="2" blur="6" spread="0" color="#00000066" />
 * ```
 * @example
 * ```ts
 * serializeShadow([
 *   { x: 0, y: 2, blur: 6, spread: 0, color: { kind: "literal", value: "#00000066" }, inset: false },
 * ]); // "0px 2px 6px 0px #00000066"
 * ```
 */
export function serializeShadow(layers: IRShadowLayer[]): string {
  return layers
    .map((layer) => {
      const prefix = layer.inset ? "inset " : "";
      const color = serializeColor(layer.color);
      return `${prefix}${layer.x}px ${layer.y}px ${layer.blur}px ${layer.spread}px ${color}`;
    })
    .join(", ");
}

/**
 * Serializes a compiled brush into background declarations. An image brush
 * whose image the resolver does not know degrades to no declarations at all.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport" background="@brush/chrome-gloss" />
 * ```
 * @example
 * ```ts
 * serializeBrush(
 *   { kind: "brush", id: "chrome-gloss" },
 *   { brushes: ir.brushes, images: () => undefined }
 * );
 * // { "background-image": "linear-gradient(180deg, #5f8fe0ff 0%, ...)" }
 * ```
 */
export function serializeBrush(
  value: IRBrushValue,
  ctx: { brushes: ThemeIR["brushes"]; images: ThemeImageResolver }
): Record<string, string> {
  if (value.kind === "color") {
    return solidDeclarations(serializeColor(value.color));
  }
  const brush: IRBrush | undefined = ctx.brushes[value.id];
  if (brush === undefined) return {};
  if (brush.type === "solid") {
    return solidDeclarations(serializeColor(brush.color));
  }
  if (brush.type === "linear") {
    return { "background-image": linearGradient(brush) };
  }
  return imageBrushDeclarations(brush, ctx.images);
}

/**
 * Serializes a compiled text style into declarations. Every attribute the
 * component model defines is handled; an unknown property is ignored.
 *
 * @example
 * ```xml
 * <TextStyle id="caption" basedOn="@text/body" size="11" color="@slot/mutedForeground" />
 * ```
 * @example
 * ```ts
 * serializeTextStyle(ir.textStyles.caption, {
 *   themeId: ir.themeId,
 *   fonts: ir.fonts,
 *   shadows: ir.shadows,
 * });
 * // { "font-size": "11px", color: "var(--muted-foreground)" }
 * ```
 */
export function serializeTextStyle(
  props: Record<string, IRValue>,
  ctx: {
    themeId: string;
    fonts: ThemeIR["fonts"];
    shadows: ThemeIR["shadows"];
  }
): Record<string, string> {
  const declarations: Record<string, string> = {};

  const font = fontRef(props.font);
  if (font !== undefined) {
    const family = ctx.fonts[font.id];
    if (family !== undefined) {
      const generic = THEME_FONT_FALLBACKS[family.fallback] ?? "sans-serif";
      declarations["font-family"] =
        family.faces.length === 0
          ? generic
          : `"${themeFontFamilyName(ctx.themeId, font.id)}", ${generic}`;
    }
  }

  const size = numberValue(props.size);
  if (size !== undefined) declarations["font-size"] = serializeLength(size);

  const weight = numberValue(props.weight);
  if (weight !== undefined) declarations["font-weight"] = String(weight);

  const italic = booleanValue(props.italic);
  if (italic !== undefined) {
    declarations["font-style"] = italic ? "italic" : "normal";
  }

  const color = colorValue(props.color);
  if (color !== undefined) declarations["color"] = serializeColor(color);

  const lineHeight = numberValue(props.lineHeight);
  if (lineHeight !== undefined) {
    declarations["line-height"] = String(lineHeight);
  }

  const letterSpacing = numberValue(props.letterSpacing);
  if (letterSpacing !== undefined) {
    declarations["letter-spacing"] = serializeLength(letterSpacing);
  }

  const transform = enumValue(props.transform, TEXT_TRANSFORMS);
  if (transform !== undefined) declarations["text-transform"] = transform;

  const align = enumValue(props.align, TEXT_ALIGNS);
  if (align !== undefined) declarations["text-align"] = align;

  const overflow = stringValue(props.overflow);
  if (overflow === "truncate") {
    declarations["white-space"] = "nowrap";
    declarations["overflow"] = "hidden";
    declarations["text-overflow"] = "ellipsis";
  } else if (overflow === "wrap") {
    declarations["white-space"] = "normal";
  }

  const maxLines = numberValue(props.maxLines);
  if (maxLines !== undefined) {
    declarations["display"] = "-webkit-box";
    declarations["-webkit-box-orient"] = "vertical";
    declarations["-webkit-line-clamp"] = String(maxLines);
    declarations["overflow"] = "hidden";
  }

  const shadow = shadowRef(props.shadow);
  if (shadow !== undefined) {
    const layer = ctx.shadows[shadow.id]?.[0];
    if (layer !== undefined) {
      declarations["text-shadow"] =
        `${layer.x}px ${layer.y}px ${layer.blur}px ${serializeColor(layer.color)}`;
    }
  }

  return declarations;
}

/**
 * The CSS image value of a resolved image: the resolver's `image-set(...)`
 * when it ships variants, otherwise a `url()` of the Blob URL.
 *
 * @example
 * ```xml
 * <Image id="play-orb" src="assets/images/play-orb.png">
 *   <Variant scale="2" src="assets/images/play-orb@2x.png" />
 * </Image>
 * ```
 * @example
 * ```ts
 * cssImage({ url: "blob:http://localhost/1a2b" });
 * // 'url("blob:http://localhost/1a2b")'
 * ```
 */
export function cssImage(image: ResolvedThemeImage): string {
  if (image.set !== undefined) return image.set;
  return `url("${escapeUrl(image.url)}")`;
}

/**
 * Escapes the characters that would end a CSS string, so a URL can never
 * break out of its `url("...")`.
 *
 * @example
 * ```xml
 * <Image id="logo" src="assets/images/logo.svg" />
 * ```
 * @example
 * ```ts
 * escapeUrl('a"b\\c'); // 'a\\"b\\\\c'
 * ```
 */
export function escapeUrl(url: string): string {
  return url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Solid background declarations. */
function solidDeclarations(color: string): Record<string, string> {
  return { "background-color": color, "background-image": "none" };
}

/** One `linear-gradient(...)` value from a compiled gradient brush. */
function linearGradient(brush: IRLinearBrush): string {
  const stops = brush.stops
    .map((stop) => `${serializeColor(stop.color)} ${percent(stop.offset)}`)
    .join(", ");
  return `linear-gradient(${brush.angle}deg, ${stops})`;
}

/** A gradient offset as a percentage with at most two decimals. */
function percent(offset: number): string {
  return `${Math.round(offset * 10000) / 100}%`;
}

/** Background or border-image declarations for an image brush. */
function imageBrushDeclarations(
  brush: IRImageBrush,
  images: ThemeImageResolver
): Record<string, string> {
  const image = images(brush.image);
  if (image === undefined) return {};
  const fit = IMAGE_FITS[brush.fit] ?? "stretch";
  const source = cssImage(image);
  const slice = image.slice;

  if (fit === "nineSlice" && slice !== undefined && slice.length === 4) {
    return {
      "border-image-source": source,
      "border-image-slice": `${slice[0]} ${slice[1]} ${slice[2]} ${slice[3]} fill`,
      "border-image-width": `${slice[0]}px ${slice[1]}px ${slice[2]}px ${slice[3]}px`,
      "border-image-repeat": "stretch",
      "border-image-outset": "0",
      "border-style": "solid",
    };
  }

  const declarations: Record<string, string> = { "background-image": source };
  if (fit === "cover" || fit === "contain") {
    declarations["background-size"] = fit;
    declarations["background-repeat"] = "no-repeat";
    declarations["background-position"] = "center";
  } else if (fit === "tile") {
    declarations["background-repeat"] = "repeat";
    declarations["background-size"] = "auto";
  } else {
    declarations["background-size"] = "100% 100%";
    declarations["background-repeat"] = "no-repeat";
  }

  if (brush.tint !== undefined) {
    declarations["background-color"] = serializeColor(brush.tint);
    declarations["background-blend-mode"] = "multiply";
  }

  return declarations;
}

/** Whether a compiled value is a reference of the given kind. */
function referenceOf(
  value: IRValue | undefined,
  ref: string
): IRRef | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  if (!("ref" in value) || value.ref !== ref) return undefined;
  return typeof value.id === "string" ? value : undefined;
}

/** The font reference of a text style. */
function fontRef(value: IRValue | undefined): IRRef | undefined {
  return referenceOf(value, "font");
}

/** The shadow reference of a text style. */
function shadowRef(value: IRValue | undefined): IRRef | undefined {
  return referenceOf(value, "shadow");
}

/** A compiled number value. */
function numberValue(value: IRValue | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

/** A compiled boolean value. */
function booleanValue(value: IRValue | undefined): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

/** A compiled string value. */
function stringValue(value: IRValue | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** A compiled color value. */
function colorValue(value: IRValue | undefined): IRColor | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return "kind" in value && (value.kind === "literal" || value.kind === "slot")
    ? value
    : undefined;
}

/** A compiled enum value mapped through a host whitelist. */
function enumValue(
  value: IRValue | undefined,
  table: Record<string, string>
): string | undefined {
  const keyword = stringValue(value);
  if (keyword === undefined) return undefined;
  return table[keyword];
}
