import type { ElementProps } from "../elementProps";
import { RenderNode } from "../renderNode";
import { useThemeLayoutSnapshot, useThemeRender } from "../ThemeRenderContext";

/**
 * The slot where the current page renders. An overlay page never appears
 * here, because it covers the Shell instead.
 *
 * @example
 * ```xml
 * <DockPanel><PageHost dock="fill" /></DockPanel>
 * ```
 * @example
 * ```tsx
 * <RenderNode node={pageHost} />
 * ```
 */
export function PageHost({ style }: ElementProps) {
  const { analysis } = useThemeRender();
  const snapshot = useThemeLayoutSnapshot();

  const page = analysis.pages.find(
    (entry) => entry.id === snapshot.currentPage && !entry.overlay
  );
  if (page === undefined) return null;
  return <RenderNode key={page.id} node={page.node} placement={style} />;
}
