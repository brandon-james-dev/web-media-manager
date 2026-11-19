import type { IRValue } from "./IRValue";

/**
 * One compiled element of a layout tree.
 *
 * @example
 * ```xml
 * <Shell><PageHost /></Shell>
 * ```
 * @example
 * ```ts
 * const shell: IRNode = { element: "Shell", attributes: {}, children: [] };
 * ```
 */
export interface IRNode {
  /** The element's local name. */
  readonly element: string;
  /** The element's attributes, keyed by local name. */
  readonly attributes: Record<string, IRValue>;
  /** The element's children, in document order. */
  readonly children: IRNode[];
}
