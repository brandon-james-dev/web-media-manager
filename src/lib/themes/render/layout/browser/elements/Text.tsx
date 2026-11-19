import { cn } from "cn";
import { useTranslation } from "@/i18n";
import type { WmmResourceKey } from "@/i18n";
import { attrRef, attrString } from "../../attributes";
import type { ElementProps } from "../elementProps";
import { useThemeRender } from "../ThemeRenderContext";

/**
 * Static text: a translated resource key, or the literal a brand mark uses.
 * The text style class comes from the theme's `@text/...` table, with the
 * node's inline overrides on top.
 *
 * @example
 * ```xml
 * <Text resourceKey="app.title" style="@text/logo" />
 * <Text literal="CLASSIC" style="@text/logo" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={text} />
 * ```
 */
export function Text({ node, style }: ElementProps) {
  const { stylesheet } = useThemeRender();
  const { get } = useTranslation();

  const resourceKey = attrString(node, "resourceKey");
  const literal = attrString(node, "literal");
  const text =
    resourceKey === undefined
      ? (literal ?? "")
      : get(resourceKey as WmmResourceKey);

  const styleId = attrRef(node, "style", "text");
  const textClass =
    styleId === undefined
      ? stylesheet.defaults.text
      : (stylesheet.classes.text[styleId] ?? stylesheet.defaults.text);

  return (
    <span
      className={cn(textClass, stylesheet.nodeClasses.get(node))}
      style={style}
    >
      {text}
    </span>
  );
}
