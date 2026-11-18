import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import type { FormFactor } from "../../../componentModel";
import type { ThemeIR } from "../../../ir";
import type { ThemeImageResolver, ThemeStylesheet } from "../../styles";
import type { LayoutAnalysis } from "../layoutAnalysis";
import type {
  ThemeLayoutSnapshot,
  ThemeLayoutState,
} from "../themeLayoutState";

/**
 * Everything a theme element component reads while it renders: the compiled
 * theme, the generated stylesheet, the image resolver, the form factor, the
 * navigation state and the layout analysis.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const value: ThemeRenderContextValue = {
 *   ir,
 *   stylesheet,
 *   images,
 *   formFactor: "desktop",
 *   layoutState,
 *   analysis,
 * };
 * ```
 */
export interface ThemeRenderContextValue {
  /** The compiled theme. */
  readonly ir: ThemeIR;
  /** The generated stylesheet for the active form factor. */
  readonly stylesheet: ThemeStylesheet;
  /** The preloaded image resolver. */
  readonly images: ThemeImageResolver;
  /** The form factor being rendered. */
  readonly formFactor: FormFactor;
  /** The navigation state of the mounted layout. */
  readonly layoutState: ThemeLayoutState;
  /** The structure of the mounted layout. */
  readonly analysis: LayoutAnalysis;
}

const ThemeRenderContext = createContext<ThemeRenderContextValue | undefined>(
  undefined
);

/**
 * Provides the render context to a theme layout tree.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```tsx
 * <ThemeRenderProvider value={value}>
 *   <RenderNode node={analysis.shell} />
 * </ThemeRenderProvider>
 * ```
 */
export function ThemeRenderProvider({
  value,
  children,
}: {
  value: ThemeRenderContextValue;
  children: ReactNode;
}) {
  return (
    <ThemeRenderContext.Provider value={value}>
      {children}
    </ThemeRenderContext.Provider>
  );
}

/**
 * The render context of the layout being rendered. Throws outside a
 * {@link ThemeRenderProvider}, so a misplaced element fails loudly instead of
 * rendering an unstyled tree.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const { stylesheet, layoutState } = useThemeRender();
 * ```
 */
export function useThemeRender(): ThemeRenderContextValue {
  const value = useContext(ThemeRenderContext);
  if (value === undefined) {
    throw new Error("useThemeRender must be used inside ThemeRenderProvider");
  }
  return value;
}

/**
 * The current navigation snapshot of the mounted layout, re-rendering the
 * caller whenever the page, a panel or a selected tab changes.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.navigate" commandParameter="library" labelKey="navigation.library" />
 * ```
 * @example
 * ```ts
 * const snapshot = useThemeLayoutSnapshot();
 * snapshot.currentPage; // "library"
 * ```
 */
export function useThemeLayoutSnapshot(): ThemeLayoutSnapshot {
  const { layoutState } = useThemeRender();
  const subscribe = useCallback(
    (listener: () => void) => layoutState.subscribe(listener),
    [layoutState]
  );
  const getSnapshot = useCallback(
    () => layoutState.getSnapshot(),
    [layoutState]
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}
