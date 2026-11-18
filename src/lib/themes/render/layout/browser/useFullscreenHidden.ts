/**
 * The `hideInFullscreen` step-aside sequence: an element stays visible for a
 * moment after full screen begins, fades out, and is then left out. Pointer or
 * key activity brings it back, and it hides again after the delay.
 *
 * @example
 * ```xml
 * <Panel dock="top" hideInFullscreen="true" style="@panel/tab-strip" />
 * ```
 * @example
 * ```ts
 * const state = useFullscreenHidden(true, snapshot.fullscreen);
 * ```
 *
 * @module
 */
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

/** How long a `hideInFullscreen` element stays visible after full screen begins. */
export const FULLSCREEN_HIDE_DELAY_MS = 3000;

/** How long the fade-out of a `hideInFullscreen` element takes. */
export const FULLSCREEN_FADE_MS = 300;

/** The opacity transition applied while a `hideInFullscreen` element fades. */
export const FULLSCREEN_FADE_STYLE: CSSProperties = {
  opacity: 0,
  transition: `opacity ${FULLSCREEN_FADE_MS}ms ease`,
};

/** Where a `hideInFullscreen` element is in its step-aside sequence. */
export type FullscreenHiddenState = "shown" | "fading" | "hidden";

/**
 * Drives the step-aside sequence with timers. `update` restarts the delay, so
 * re-entering full screen shows the element again and waits once more.
 *
 * @example
 * ```ts
 * const timer = createFullscreenHideTimer(setState);
 * timer.update(true, true);
 * ```
 */
export function createFullscreenHideTimer(
  onChange: (state: FullscreenHiddenState) => void
): {
  update: (enabled: boolean, fullscreen: boolean) => void;
  dispose: () => void;
} {
  let delay: ReturnType<typeof setTimeout> | undefined;
  let fade: ReturnType<typeof setTimeout> | undefined;

  function clear(): void {
    if (delay !== undefined) clearTimeout(delay);
    if (fade !== undefined) clearTimeout(fade);
    delay = undefined;
    fade = undefined;
  }

  return {
    update(enabled: boolean, fullscreen: boolean): void {
      clear();
      onChange("shown");
      if (!enabled || !fullscreen) return;
      delay = setTimeout(() => {
        delay = undefined;
        onChange("fading");
        fade = setTimeout(() => {
          fade = undefined;
          onChange("hidden");
        }, FULLSCREEN_FADE_MS);
      }, FULLSCREEN_HIDE_DELAY_MS);
    },
    dispose(): void {
      clear();
    },
  };
}

/**
 * Steps an element aside while the document is in full screen: it stays
 * visible for `FULLSCREEN_HIDE_DELAY_MS`, fades out over `FULLSCREEN_FADE_MS`,
 * and is then `hidden`. Leaving full screen shows it again at once, and
 * re-entering restarts the delay. While the element is stepping aside, pointer
 * or key activity on the document brings it back and it hides again after the
 * delay.
 *
 * @example
 * ```xml
 * <Panel dock="top" hideInFullscreen="true" style="@panel/tab-strip" />
 * ```
 * @example
 * ```tsx
 * const state = useFullscreenHidden(true, snapshot.fullscreen);
 * if (state === "hidden") return null;
 * ```
 */
export function useFullscreenHidden(
  enabled: boolean,
  fullscreen: boolean
): FullscreenHiddenState {
  const [state, setState] = useState<FullscreenHiddenState>("shown");

  useEffect(() => {
    const timer = createFullscreenHideTimer(setState);
    timer.update(enabled, fullscreen);
    if (!enabled || !fullscreen) return () => timer.dispose();

    const wake = (): void => timer.update(enabled, fullscreen);
    const passive: AddEventListenerOptions = { passive: true };
    document.addEventListener("pointermove", wake, passive);
    document.addEventListener("pointerdown", wake, passive);
    document.addEventListener("keydown", wake);
    document.addEventListener("wheel", wake, passive);
    return () => {
      document.removeEventListener("pointermove", wake);
      document.removeEventListener("pointerdown", wake);
      document.removeEventListener("keydown", wake);
      document.removeEventListener("wheel", wake);
      timer.dispose();
    };
  }, [enabled, fullscreen]);

  return state;
}
