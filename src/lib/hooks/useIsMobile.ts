import { useSyncExternalStore } from "react";

/** Tailwind's `sm` breakpoint (640 px) — the point where the compact
 *  mobile layouts switch to the tablet/desktop ones. */
const MOBILE_QUERY = "(max-width: 639px)";

/** Tailwind's `sm`..`lg` band (640–1023 px) — tablets in portrait, and
 *  phones in landscape. They keep the compact (bottom-bar) chrome but have
 *  room to lay the navigation beside the playback controls.
 *
 *  The second clause extends that to touch devices wider than `lg`: an iPad
 *  in landscape is 1024–1366 px, which would otherwise fall into the desktop
 *  layout. `pointer: coarse` keeps real laptops (fine pointer) on desktop. */
const TABLET_QUERY =
  "(min-width: 640px) and (max-width: 1023px), " +
  "(pointer: coarse) and (min-width: 640px) and (max-width: 1366px)";

/** A phone turned sideways: landscape, short, touch. Tablets in landscape are
 *  taller than this and keep their normal layouts. */
const PHONE_LANDSCAPE_QUERY =
  "(orientation: landscape) and (max-height: 500px) and (pointer: coarse)";

function makeMediaHook(query: string) {
  function subscribe(callback: () => void): () => void {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  }

  function getSnapshot(): boolean {
    return window.matchMedia(query).matches;
  }

  function getServerSnapshot(): boolean {
    return typeof window === "undefined" ? false : getSnapshot();
  }

  return function useMediaQuery(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  };
}

const useMobileQuery = makeMediaHook(MOBILE_QUERY);
const useTabletQuery = makeMediaHook(TABLET_QUERY);
const usePhoneLandscapeQuery = makeMediaHook(PHONE_LANDSCAPE_QUERY);

/** Reactive "phone held in landscape" — shorter than any tablet. */
export function useIsPhoneLandscape(): boolean {
  return usePhoneLandscapeQuery();
}

/** Reactive "is a narrow (phone) viewport" — true below the `sm`
 *  breakpoint, updating live as the window resizes. */
export function useIsMobile(): boolean {
  return useMobileQuery();
}

/** Reactive "is a tablet-width viewport" — the `sm`..`lg` band. */
export function useIsTablet(): boolean {
  return useTabletQuery();
}

/** Reactive "uses the compact chrome" — phones and tablets, i.e. anything
 *  below `lg`. Views use this to pick their compact layout; the shell uses
 *  `useIsMobile`/`useIsTablet` to decide how to arrange the bottom bars. */
export function useIsCompact(): boolean {
  const isMobile = useMobileQuery();
  const isTablet = useTabletQuery();
  return isMobile || isTablet;
}
