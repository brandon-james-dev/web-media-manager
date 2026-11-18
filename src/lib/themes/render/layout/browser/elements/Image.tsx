import { useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "@/i18n";
import type { WmmResourceKey } from "@/i18n";
import { attrBool, attrRef, attrString } from "../../attributes";
import type { ElementProps } from "../elementProps";
import { useThemeRender } from "../ThemeRenderContext";

/**
 * The `object-fit` value of each `fit` keyword. `nineSlice` is drawn with a
 * border image instead, so it has no entry.
 *
 * @example
 * ```xml
 * <Image source="@image/logo" fit="contain" decorative="true" />
 * ```
 * @example
 * ```ts
 * OBJECT_FIT.cover; // "cover"
 * ```
 */
const OBJECT_FIT: Record<string, CSSProperties["objectFit"]> = {
  none: "none",
  stretch: "fill",
  cover: "cover",
  contain: "contain",
};

/**
 * Shows a theme image. A decorative image is hidden from assistive
 * technology; any other image takes its alternative text from `altKey`. A
 * sliced image draws as a border image, and an image that fails to load
 * disappears instead of leaving a broken box.
 *
 * @example
 * ```xml
 * <Image source="@image/logo" fit="contain" decorative="true" />
 * <Image source="@image/badge" altKey="app.title" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={image} />
 * ```
 */
export function Image({ node, style }: ElementProps) {
  const { images } = useThemeRender();
  const { get } = useTranslation();
  const [failed, setFailed] = useState(false);

  const source = attrRef(node, "source", "image");
  const image = source === undefined ? undefined : images(source);
  if (image === undefined || failed) return null;

  const decorative = attrBool(node, "decorative") === true;
  const altKey = attrString(node, "altKey");
  const alt =
    decorative || altKey === undefined ? "" : get(altKey as WmmResourceKey);

  if (image.slice !== undefined) {
    const [top, right, bottom, left] = image.slice;
    return (
      <div
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative || undefined}
        style={{
          ...style,
          borderStyle: "solid",
          borderWidth: `${top}px ${right}px ${bottom}px ${left}px`,
          borderImageSource: `url("${image.url}")`,
          borderImageSlice: `${top} ${right} ${bottom} ${left} fill`,
          borderImageRepeat: "stretch",
        }}
      />
    );
  }

  return (
    <img
      src={image.url}
      srcSet={image.set}
      alt={alt}
      aria-hidden={decorative || undefined}
      onError={() => setFailed(true)}
      style={{
        ...style,
        objectFit: OBJECT_FIT[attrString(node, "fit") ?? ""],
      }}
    />
  );
}
