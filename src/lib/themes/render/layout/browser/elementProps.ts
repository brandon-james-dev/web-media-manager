import type { CSSProperties, ReactNode } from "react";
import type { IRNode } from "../../../ir";

/**
 * What every theme element component receives: the node it renders and the
 * placement style its parent resolved for it.
 *
 * @example
 * ```xml
 * <Grid columns="220 1*"><LibraryBrowser column="0" /><TrackList column="1" /></Grid>
 * ```
 * @example
 * ```ts
 * const props: ElementProps = { node, style: { gridColumn: "2 / span 1" } };
 * ```
 */
export interface ElementProps {
  /** The compiled node to render. */
  readonly node: IRNode;
  /** The placement and size declarations the parent resolved. */
  readonly style?: CSSProperties;
}

/**
 * The shape of one entry in the element registry.
 *
 * @example
 * ```xml
 * <Panel style="@panel/chrome" />
 * ```
 * @example
 * ```ts
 * const panel: ElementComponent = Panel;
 * ```
 */
export type ElementComponent = (props: ElementProps) => ReactNode;
