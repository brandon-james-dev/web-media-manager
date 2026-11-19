import type { IssueSeverity } from "./issueSeverity";

/**
 * A validation issue, in the shape defined by `05-validation.md`.
 *
 * @example
 * ```ts
 * const issue: ThemeIssue = {
 *   code: "E3010",
 *   severity: IssueSeverity.Error,
 *   file: "layouts/desktop.xml",
 *   line: 1,
 *   column: 1,
 *   path: "/Layout/@spec",
 *   message: 'spec "1.1" does not match the manifest spec "1.0".',
 * };
 * ```
 */
export interface ThemeIssue {
  code: string;
  severity: IssueSeverity;
  file: string;
  line?: number;
  column?: number;
  path?: string;
  message: string;
  hint?: string;
  specRef?: string;
}
