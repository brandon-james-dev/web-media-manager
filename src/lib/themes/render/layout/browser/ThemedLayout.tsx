import { useEffect, useMemo } from "react";
import { Settings } from "lucide-react";
import { setThemeNavigationHandler } from "@/core/themes/themeNavigation";
import { commandDispatcher, wmmBus } from "@/events";
import { useTranslation } from "@/i18n";
import type { FormFactor } from "../../../componentModel";
import type { ThemeIR } from "../../../ir";
import type { ThemeImageResolver, ThemeStylesheet } from "../../styles";
import { analyzeLayout } from "../layoutAnalysis";
import { FILL_PLACEMENT } from "../layoutStyle";
import { ThemeLayoutState } from "../themeLayoutState";
import { RenderNode } from "./renderNode";
import {
  ThemeRenderProvider,
  useThemeLayoutSnapshot,
  useThemeRender,
} from "./ThemeRenderContext";
import type { ThemeRenderContextValue } from "./ThemeRenderContext";

/**
 * What a mounted layout needs: the compiled theme, its stylesheet, the image
 * resolver, the form factor and the theme id the navigation state is keyed
 * by.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const props: ThemedLayoutProps = { ir, stylesheet, images, formFactor: "desktop", themeId: ir.themeId };
 * ```
 */
export interface ThemedLayoutProps {
  /** The compiled theme. */
  readonly ir: ThemeIR;
  /** The stylesheet built for the form factor. */
  readonly stylesheet: ThemeStylesheet;
  /** The preloaded image resolver. */
  readonly images: ThemeImageResolver;
  /** The form factor to render. */
  readonly formFactor: FormFactor;
  /** The theme id the navigation state is keyed by. */
  readonly themeId: string;
}

/**
 * Renders one form factor of a compiled theme: the Shell, the current page in
 * its `PageHost`, and an overlay page above the Shell while it is open. It
 * owns the navigation state, answers `wmm.ui.navigate`, registers
 * `wmm.ui.togglePanel`, `wmm.ui.toggleEditMode` and `wmm.ui.toggleFullscreen`,
 * opens an `openOnPlay` page when playback starts and publishes
 * `wmm.ui.viewChanged` on page changes.
 *
 * @example
 * ```xml
 * <Page id="now-playing" role="nowPlaying" presentation="overlay" openOnPlay="true" />
 * ```
 * @example
 * ```tsx
 * <ThemedLayout ir={ir} stylesheet={stylesheet} images={images} formFactor="desktop" themeId={ir.themeId} />
 * ```
 */
export function ThemedLayout({
  ir,
  stylesheet,
  images,
  formFactor,
  themeId,
}: ThemedLayoutProps) {
  const layout = ir.layouts[formFactor];
  const analysis = useMemo(
    () => (layout === undefined ? undefined : analyzeLayout(layout)),
    [layout]
  );
  const layoutState = useMemo(
    () =>
      analysis === undefined
        ? undefined
        : new ThemeLayoutState({
          themeId,
          formFactor,
          pages: analysis.pages,
          ...(analysis.defaultPageId === undefined
            ? {}
            : { defaultPageId: analysis.defaultPageId }),
        }),
    [analysis, themeId, formFactor]
  );

  useEffect(() => {
    if (analysis === undefined || layoutState === undefined) return;
    const ids = new Set(analysis.pages.map((page) => page.id));
    return setThemeNavigationHandler({
      handlesPage: (page) => ids.has(page),
      navigate: (page) => {
        layoutState.navigate(page);
      },
    });
  }, [analysis, layoutState]);

  useEffect(() => {
    if (layoutState === undefined) return;
    return commandDispatcher.register("wmm.ui.togglePanel", (payload) => {
      if (payload !== undefined) layoutState.togglePanel(payload.id);
    });
  }, [layoutState]);

  useEffect(() => {
    if (layoutState === undefined) return;
    return commandDispatcher.register("wmm.ui.toggleEditMode", () => {
      layoutState.toggleEditMode();
    });
  }, [layoutState]);

  useEffect(() => {
    return commandDispatcher.register("wmm.ui.toggleFullscreen", () => {
      if (document.fullscreenElement === null) {
        void document.documentElement.requestFullscreen().catch(() => { });
        return;
      }
      void document.exitFullscreen().catch(() => { });
    });
  }, []);

  useEffect(() => {
    if (layoutState === undefined) return;
    layoutState.setFullscreen(document.fullscreenElement !== null);
    const handleChange = (): void => {
      layoutState.setFullscreen(document.fullscreenElement !== null);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
    };
  }, [layoutState]);

  useEffect(() => {
    if (analysis === undefined || layoutState === undefined) return;
    const page = analysis.pages.find(
      (entry) => entry.overlay && entry.openOnPlay
    );
    if (page === undefined) return;
    return wmmBus.on("wmm.playback.started", () => {
      layoutState.navigate(page.id);
    });
  }, [analysis, layoutState]);

  useEffect(() => {
    if (layoutState === undefined) return;
    let last = layoutState.getSnapshot().currentPage;
    return layoutState.subscribe(() => {
      const next = layoutState.getSnapshot().currentPage;
      if (next === last) return;
      last = next;
      wmmBus.publish("wmm.ui.viewChanged", { view: next });
    });
  }, [layoutState]);

  if (analysis === undefined || layoutState === undefined) return null;

  const value: ThemeRenderContextValue = {
    ir,
    stylesheet,
    images,
    formFactor,
    layoutState,
    analysis,
  };

  return (
    <ThemeRenderProvider value={value}>
      <ThemedLayoutBody />
    </ThemeRenderProvider>
  );
}

/** The Shell, the overlay page and the host settings affordance. */
function ThemedLayoutBody() {
  const { analysis } = useThemeRender();
  const snapshot = useThemeLayoutSnapshot();
  const { get } = useTranslation();

  const overlay = analysis.pages.find((page) => page.overlay);
  const overlayOpen = snapshot.overlayOpen && overlay !== undefined;

  return (
    <div className="wmm-theme-root h-full w-full">
      <div
        className="flex h-full w-full flex-col"
        inert={overlayOpen}
        aria-hidden={overlayOpen || undefined}
      >
        <RenderNode node={analysis.shell} placement={FILL_PLACEMENT} />
      </div>
      {overlayOpen ? (
        <div className="fixed inset-0 z-overlay flex flex-col">
          <RenderNode node={overlay.node} placement={FILL_PLACEMENT} />
        </div>
      ) : null}
      {analysis.hasSettingsButton ? null : (
        <SettingsAffordance label={get("settings.title")} />
      )}
    </div>
  );
}

/**
 * The host-owned settings button, drawn in the top-end corner when the layout
 * offers no reachable way into Settings itself.
 *
 * @example
 * ```xml
 * <Shell><DockPanel><PageHost dock="fill" /></DockPanel></Shell>
 * ```
 * @example
 * ```tsx
 * <SettingsAffordance label="Settings" />
 * ```
 */
function SettingsAffordance({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="fixed inset-e-2 top-2 z-chrome inline-flex size-8 items-center justify-center rounded-md text-foreground/70 hover:text-foreground"
      title={label}
      aria-label={label}
      onClick={() => wmmBus.invoke("wmm.ui.openSettings")}
    >
      <Settings aria-hidden className="size-4" />
    </button>
  );
}
