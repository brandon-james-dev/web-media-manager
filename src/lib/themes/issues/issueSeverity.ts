/**
 * Severity of a validation issue. Errors block install, warnings install
 * and are shown to the user, info is only shown in tools.
 *
 * @example
 * ```ts
 * const blocked = issues.some((i) => i.severity === IssueSeverity.Error);
 * ```
 */
export const IssueSeverity = {
  /** Blocks install. */
  Error: "error",
  /** Installs; shown to the user. */
  Warning: "warning",
  /** Shown only in tools. */
  Info: "info",
} as const;

/** One of the {@link IssueSeverity} values. */
export type IssueSeverity = (typeof IssueSeverity)[keyof typeof IssueSeverity];
