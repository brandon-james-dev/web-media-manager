import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { toast } from "@/components/ui/toast";
import { themeCrashGuard } from "@/core/themes/themeCrashGuard";
import { themeTrial } from "@/core/themes/themeTrial";
import { i18n } from "@/i18n";
import { getThemeManager, reloadActiveTheme } from "../../../getThemeManager";

/**
 * What the boundary needs: the theme it guards, the layout it renders and
 * what to show while the layout is down.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```tsx
 * <ThemeRenderBoundary themeId="classic-blue" onFallback={null}>
 *   <ThemedLayout {...props} />
 * </ThemeRenderBoundary>
 * ```
 */
export interface ThemeRenderBoundaryProps {
  /** The id of the theme being rendered. */
  readonly themeId: string;
  /** The theme layout tree. */
  readonly children: ReactNode;
  /** What to render while the layout has failed. */
  readonly onFallback: ReactNode;
}

/**
 * Whether the guarded layout has failed.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const state: ThemeRenderBoundaryState = { failed: false };
 * ```
 */
interface ThemeRenderBoundaryState {
  /** Whether the layout threw while rendering. */
  readonly failed: boolean;
}

/**
 * Keeps a broken theme layout from taking the app down. The first crash
 * re-renders the layout once; a second crash of the same theme inside the
 * window turns the theme off, either by reverting a running trial or by
 * resetting to the built-in theme, and says so in a toast.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```tsx
 * <ThemeRenderBoundary themeId={themeId} onFallback={null}>
 *   <ThemedLayout ir={ir} stylesheet={stylesheet} images={images} formFactor={formFactor} themeId={themeId} />
 * </ThemeRenderBoundary>
 * ```
 */
export class ThemeRenderBoundary extends Component<
  ThemeRenderBoundaryProps,
  ThemeRenderBoundaryState
> {
  state: ThemeRenderBoundaryState = { failed: false };

  static getDerivedStateFromError(): ThemeRenderBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[themes] The theme layout failed to render:", error, info);

    if (themeCrashGuard.recordCrash(this.props.themeId)) {
      this.turnThemeOff();
      return;
    }

    this.setState({ failed: false });
  }

  render(): ReactNode {
    return this.state.failed ? this.props.onFallback : this.props.children;
  }

  /** Reverts a running trial, or resets to the built-in theme, and reports it. */
  private turnThemeOff(): void {
    if (themeTrial.getSnapshot() !== undefined) {
      void themeTrial.revert();
    } else {
      void getThemeManager()
        .resetToDefault()
        .then(() => reloadActiveTheme());
    }

    toast.add({
      type: "error",
      title: i18n.t("settings.themeCrashReverted"),
    });
  }
}
