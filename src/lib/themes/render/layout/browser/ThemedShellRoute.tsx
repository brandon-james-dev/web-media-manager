import { useThemeStylesheet } from "./useThemeStylesheet";
import { ThemeRenderBoundary } from "./ThemeRenderBoundary";
import { ThemedLayout } from "./ThemedLayout";
import type { ThemedLayoutSelection } from "../selectThemedLayout";

/**
 * Mounts the selected theme layout for the whole main area, once its images
 * and stylesheet are ready.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```tsx
 * <Route path="*" element={<ThemedShellRoute selection={selection} />} />
 * ```
 */
export function ThemedShellRoute({
  selection,
}: {
  selection: ThemedLayoutSelection;
}) {
  const result = useThemeStylesheet(selection.ir, selection.formFactor);

  if (result === undefined) return <div className="h-full w-full" />;

  return (
    <ThemeRenderBoundary
      key={`${selection.themeId}:${selection.formFactor}`}
      themeId={selection.themeId}
      onFallback={null}
    >
      <ThemedLayout
        ir={selection.ir}
        stylesheet={result.stylesheet}
        images={result.images}
        formFactor={selection.formFactor}
        themeId={selection.themeId}
      />
    </ThemeRenderBoundary>
  );
}
