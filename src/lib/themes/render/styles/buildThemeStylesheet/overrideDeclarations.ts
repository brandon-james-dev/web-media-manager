import type { IRValue } from "../../../ir";
import {
  serializeBrush,
  serializeColor,
  serializeCornerRadius,
  serializeThickness,
} from "../serializeValues";
import {
  brushValue,
  colorValue,
  numberValue,
  thicknessValue,
} from "./irValues";
import { shadowDeclarations } from "./shadowDeclarations";
import type { StyleContext } from "./styleContext";
import { textStyleDeclarations } from "./textDeclarations";

/**
 * The inline visual overrides a layout node may carry. Layout-only attributes
 * such as `width`, `dock` or `grow` are left to the renderer.
 *
 * @example
 * ```xml
 * <Panel style="@panel/inset" padding="8" cornerRadius="4" />
 * ```
 * @example
 * ```ts
 * OVERRIDE_ATTRIBUTES.includes("padding"); // true
 * ```
 */
export const OVERRIDE_ATTRIBUTES = [
  "background",
  "border",
  "borderWidth",
  "cornerRadius",
  "padding",
  "shadow",
  "foreground",
  "opacity",
  "textStyle",
] as const;

/** The declarations of a layout node's inline visual overrides. */
export function overrideDeclarations(
  attributes: Record<string, IRValue>,
  ctx: StyleContext
): Record<string, string> {
  const declarations: Record<string, string> = {};
  if (!OVERRIDE_ATTRIBUTES.some((name) => attributes[name] !== undefined)) {
    return declarations;
  }

  const background = brushValue(attributes.background);
  if (background !== undefined) {
    Object.assign(
      declarations,
      serializeBrush(background, {
        brushes: ctx.ir.brushes,
        images: ctx.images,
      })
    );
  }

  const border = colorValue(attributes.border);
  if (border !== undefined) {
    declarations["border-color"] = serializeColor(border);
  }

  const borderWidth = thicknessValue(attributes.borderWidth);
  if (borderWidth !== undefined) {
    declarations["border-style"] = "solid";
    Object.assign(
      declarations,
      serializeThickness("border-width", borderWidth)
    );
  }

  const cornerRadius = thicknessValue(attributes.cornerRadius);
  if (cornerRadius !== undefined) {
    Object.assign(declarations, serializeCornerRadius(cornerRadius));
  }

  const padding = thicknessValue(attributes.padding);
  if (padding !== undefined) {
    Object.assign(declarations, serializeThickness("padding", padding));
  }

  const shadow = shadowDeclarations(attributes.shadow, ctx);
  if (shadow !== undefined) declarations["box-shadow"] = shadow;

  const foreground = colorValue(attributes.foreground);
  if (foreground !== undefined) {
    declarations["color"] = serializeColor(foreground);
  }

  const opacity = numberValue(attributes.opacity);
  if (opacity !== undefined) declarations["opacity"] = String(opacity);

  Object.assign(declarations, textStyleDeclarations(attributes, ctx));

  return declarations;
}
