/**
 * Stage 3 XML parsing for theme packages: turns `theme.xml` and layout
 * documents into {@link ThemeNode} trees and collects `3xxx` issues.
 *
 * @example
 * ```ts
 * import { parseThemeXml } from "@/lib/themes/parser";
 *
 * const { root, issues } = parseThemeXml(xml, {
 *   file: "layouts/desktop.xml",
 *   root: "Layout",
 *   spec: "1.0",
 * });
 * ```
 *
 * @module
 */
export { parseThemeXml } from "./parseThemeXml";
export { XML_LIMITS } from "./xmlLimits";
export type {
  ParseOptions,
  ParseResult,
  ThemeAttribute,
  ThemeNode,
} from "./types";
