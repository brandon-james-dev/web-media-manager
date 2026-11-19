/**
 * Issue model shared by every theme pipeline stage: archive checks, XML
 * parsing, grammar validation, semantic validation and advisory checks.
 *
 * @example
 * ```ts
 * import { IssueSeverity, type ThemeIssue } from "@/lib/themes/issues";
 *
 * const issue: ThemeIssue = {
 *   code: "E3010",
 *   severity: IssueSeverity.Error,
 *   file: "layouts/desktop.xml",
 *   message: "Unsupported spec version.",
 * };
 * ```
 *
 * @module
 */
export { IssueSeverity } from "./issueSeverity";
export type { ThemeIssue } from "./themeIssue";
