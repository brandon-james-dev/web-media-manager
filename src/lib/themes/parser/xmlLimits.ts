/**
 * Stage 3 limits from `05-validation.md`.
 *
 * @example
 * ```ts
 * if (depth > XML_LIMITS.maxDepth) report("E3005");
 * ```
 */
export const XML_LIMITS = {
  /** Deepest allowed element nesting. */
  maxDepth: 64,
  /** Most elements allowed in one file. */
  maxElements: 5000,
  /** Longest allowed attribute value, in characters. */
  maxAttributeLength: 1024,
} as const;
