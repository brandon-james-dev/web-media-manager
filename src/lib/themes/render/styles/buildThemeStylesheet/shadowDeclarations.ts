import type { IRBrushValue, IRValue } from "../../../ir";
import { serializeBrush, serializeShadow } from "../serializeValues";
import { referenceOf } from "./irValues";
import type { StyleContext } from "./styleContext";

/** The `box-shadow` value of a shadow reference. */
export function shadowDeclarations(
  value: IRValue | undefined,
  ctx: StyleContext
): string | undefined {
  const ref = referenceOf(value, "shadow");
  if (ref === undefined) return undefined;
  const layers = ctx.ir.shadows[ref.id];
  if (layers === undefined) return undefined;
  return serializeShadow(layers);
}

/** The CSS value of a brush, preferring its image over its color. */
export function brushString(
  value: IRBrushValue,
  ctx: StyleContext
): string | undefined {
  const declarations = serializeBrush(value, {
    brushes: ctx.ir.brushes,
    images: ctx.images,
  });
  const image = declarations["background-image"];
  if (image !== undefined && image !== "none") return image;
  const borderImage = declarations["border-image-source"];
  if (borderImage !== undefined) return borderImage;
  return declarations["background-color"];
}

/** Whether any corner of a radius is above zero. */
export function hasRadius(value: number[] | undefined): boolean {
  return value !== undefined && value.some((corner) => corner > 0);
}
