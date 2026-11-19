import type { IRValue } from "../../../ir";
import {
  cssImage,
  serializeBrush,
  serializeColor,
  serializeCornerRadius,
  serializeLength,
  serializeThickness,
} from "../serializeValues";
import {
  booleanValue,
  brushValue,
  colorValue,
  numberValue,
  referenceOf,
  thicknessValue,
} from "./irValues";
import { shadowDeclarations } from "./shadowDeclarations";
import type { StyleContext } from "./styleContext";
import { textStyleDeclarations } from "./textDeclarations";

/** The declarations of a button style or one of its states. */
export function buttonDeclarations(
  props: Record<string, IRValue>,
  ctx: StyleContext,
  includeLayout: boolean
): Record<string, string> {
  const declarations: Record<string, string> = {};
  if (includeLayout) {
    declarations["display"] = "inline-flex";
    declarations["align-items"] = "center";
    declarations["justify-content"] = "center";
    declarations["gap"] = "6px";
  }

  const imageRef = referenceOf(props.image, "image");
  const image = imageRef === undefined ? undefined : ctx.images(imageRef.id);
  if (image !== undefined) {
    declarations["background"] =
      `${cssImage(image)} center / contain no-repeat`;
    declarations["background-color"] = "transparent";
    declarations["border-color"] = "transparent";
    if (image.width !== undefined) {
      declarations["inline-size"] = serializeLength(image.width);
    }
    if (image.height !== undefined) {
      declarations["block-size"] = serializeLength(image.height);
    }
  } else {
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
  }

  const foreground = colorValue(props.foreground);
  if (foreground !== undefined) {
    declarations["color"] = serializeColor(foreground);
  }

  const cornerRadius = thicknessValue(props.cornerRadius);
  if (cornerRadius !== undefined) {
    Object.assign(declarations, serializeCornerRadius(cornerRadius));
  }

  const padding = thicknessValue(props.padding);
  if (padding !== undefined) {
    Object.assign(declarations, serializeThickness("padding", padding));
  }

  const minWidth = numberValue(props.minWidth);
  if (minWidth !== undefined) {
    declarations["min-inline-size"] = serializeLength(minWidth);
  }

  const minHeight = numberValue(props.minHeight);
  if (minHeight !== undefined) {
    declarations["min-block-size"] = serializeLength(minHeight);
  }

  const iconSize = numberValue(props.iconSize);
  if (iconSize !== undefined) {
    declarations["--wmm-icon-size"] = serializeLength(iconSize);
  }

  Object.assign(declarations, textStyleDeclarations(props, ctx));

  const shadow = shadowDeclarations(props.shadow, ctx);
  if (shadow !== undefined) declarations["box-shadow"] = shadow;

  const opacity = numberValue(props.opacity);
  if (opacity !== undefined) declarations["opacity"] = String(opacity);

  const iconVisible = booleanValue(props.iconVisible);
  if (iconVisible !== undefined) {
    declarations["--wmm-icon-display"] = iconVisible ? "inline-flex" : "none";
  }

  const iconFill = booleanValue(props.iconFill);
  if (iconFill !== undefined) {
    declarations["--wmm-icon-fill"] = iconFill ? "currentColor" : "none";
  }

  const labelVisible = booleanValue(props.labelVisible);
  if (labelVisible !== undefined) {
    declarations["--wmm-label-display"] = labelVisible ? "inline" : "none";
  }

  return declarations;
}
