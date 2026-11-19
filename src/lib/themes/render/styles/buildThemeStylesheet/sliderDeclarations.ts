import type { IRValue } from "../../../ir";
import { cssImage, serializeColor, serializeLength } from "../serializeValues";
import {
  brushValue,
  colorValue,
  enumValue,
  numberValue,
  referenceOf,
  thicknessValue,
} from "./irValues";
import { brushString } from "./shadowDeclarations";
import type { StyleContext } from "./styleContext";

/**
 * The slider attributes and the custom property each one writes.
 *
 * @example
 * ```xml
 * <SliderStyle id="seek" thickness="4" track="@slot/progressTrack" />
 * ```
 * @example
 * ```ts
 * SLIDER_VARIABLES.thickness; // "--wmm-slider-thickness"
 * ```
 */
export const SLIDER_VARIABLES: Record<string, string> = {
  thickness: "--wmm-slider-thickness",
  cornerRadius: "--wmm-slider-radius",
  track: "--wmm-slider-track",
  fill: "--wmm-slider-fill",
  buffer: "--wmm-slider-buffer",
  border: "--wmm-slider-border",
  thumb: "--wmm-slider-thumb",
  thumbImage: "--wmm-slider-thumb-image",
  thumbSize: "--wmm-slider-thumb-size",
  opacity: "--wmm-slider-opacity",
};

/**
 * The slider thumb kinds, mapped to the keywords the serializer writes.
 *
 * @example
 * ```xml
 * <SliderStyle id="seek" thumb="round" />
 * ```
 * @example
 * ```ts
 * SLIDER_THUMBS.round; // "round"
 * ```
 */
export const SLIDER_THUMBS: Record<string, string> = {
  none: "none",
  round: "round",
  image: "image",
};

/** The custom properties of a slider style or one of its states. */
export function sliderDeclarations(
  props: Record<string, IRValue>,
  ctx: StyleContext
): Record<string, string> {
  const declarations: Record<string, string> = {};

  const thickness = numberValue(props.thickness);
  if (thickness !== undefined) {
    declarations[SLIDER_VARIABLES.thickness] = serializeLength(thickness);
  }

  const cornerRadius = thicknessValue(props.cornerRadius);
  if (cornerRadius !== undefined) {
    declarations[SLIDER_VARIABLES.cornerRadius] = cornerRadius
      .map(serializeLength)
      .join(" ");
  }

  for (const name of ["track", "fill", "buffer"] as const) {
    const brush = brushValue(props[name]);
    if (brush === undefined) continue;
    const value = brushString(brush, ctx);
    if (value !== undefined) declarations[SLIDER_VARIABLES[name]] = value;
  }

  const border = colorValue(props.border);
  if (border !== undefined) {
    declarations[SLIDER_VARIABLES.border] = serializeColor(border);
  }

  const thumb = enumValue(props.thumb, SLIDER_THUMBS);
  if (thumb !== undefined) {
    declarations[SLIDER_VARIABLES.thumb] = thumb;
  }

  const thumbImage = referenceOf(props.thumbImage, "image");
  if (thumbImage !== undefined) {
    const image = ctx.images(thumbImage.id);
    if (image !== undefined) {
      declarations[SLIDER_VARIABLES.thumbImage] = cssImage(image);
    }
  }

  const thumbSize = numberValue(props.thumbSize);
  if (thumbSize !== undefined) {
    declarations[SLIDER_VARIABLES.thumbSize] = serializeLength(thumbSize);
  }

  const opacity = numberValue(props.opacity);
  if (opacity !== undefined) {
    declarations[SLIDER_VARIABLES.opacity] = String(opacity);
  }

  return declarations;
}
