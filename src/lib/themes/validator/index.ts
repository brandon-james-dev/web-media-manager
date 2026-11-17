/**
 * Theme package validation: stage 4 grammar checks over parsed
 * {@link ThemeNode} trees, collecting `4xxx` issues.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
 *   <Shell>
 *     <Button command="wmm.playback.next" labelKey="playback.next" />
 *   </Shell>
 * </Layout>
 * ```
 * @example
 * ```ts
 * import { parseThemeXml } from "@/lib/themes/parser";
 * import { walkElements } from "@/lib/themes/validator";
 *
 * const file = "layouts/desktop.xml";
 * const { root } = parseThemeXml(xml, { file, root: "Layout", spec: "1.0" });
 * const issues = root ? walkElements(root, file) : [];
 * ```
 *
 * @module
 */
export { checkLayout } from "./checkLayout";
export { checkTheme } from "./checkTheme";
export type { ThemeLayout } from "./checkTheme";
export { checkValue } from "./checkValue";
export type { ValueProblem } from "./checkValue";
export {
  RESERVED_ANIMATION_ELEMENTS,
  RESERVED_BINDING_ELEMENTS,
  walkElements,
} from "./walkElements";
