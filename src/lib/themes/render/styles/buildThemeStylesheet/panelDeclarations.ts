import type { IRValue } from "../../../ir";
import {
  serializeBrush,
  serializeColor,
  serializeCornerRadius,
  serializeThickness,
} from "../serializeValues";
import {
  booleanValue,
  brushValue,
  colorValue,
  thicknessValue,
} from "./irValues";
import { hasRadius, shadowDeclarations } from "./shadowDeclarations";
import type { StyleContext } from "./styleContext";
import { textStyleDeclarations } from "./textDeclarations";

/** The declarations of a panel style or one of its states. */
export function panelDeclarations(
  props: Record<string, IRValue>,
  ctx: StyleContext
): Record<string, string> {
  const declarations: Record<string, string> = {};

  const background = brushValue(props.background);
  if (background !== undefined) {
    Object.assign(
      declarations,
      serializeBrush(background, {
        brushes: ctx.ir.brushes,
        images: ctx.images,
      })
    );
  }

  const border = colorValue(props.border);
  if (border !== undefined) {
    declarations["border-color"] = serializeColor(border);
  }

  const borderWidth = thicknessValue(props.borderWidth);
  if (borderWidth !== undefined) {
    declarations["border-style"] = "solid";
    Object.assign(
      declarations,
      serializeThickness("border-width", borderWidth)
    );
  }

  const cornerRadius = thicknessValue(props.cornerRadius);
  if (cornerRadius !== undefined) {
    Object.assign(declarations, serializeCornerRadius(cornerRadius));
  }

  const padding = thicknessValue(props.padding);
  if (padding !== undefined) {
    Object.assign(declarations, serializeThickness("padding", padding));
  }

  const shadow = shadowDeclarations(props.shadow, ctx);
  if (shadow !== undefined) declarations["box-shadow"] = shadow;

  const clip = booleanValue(props.clip);
  if (clip === true) {
    declarations["overflow"] = "hidden";
  } else if (clip === undefined && hasRadius(cornerRadius)) {
    declarations["overflow"] = "hidden";
  }

  Object.assign(declarations, textStyleDeclarations(props, ctx));

  return declarations;
}
