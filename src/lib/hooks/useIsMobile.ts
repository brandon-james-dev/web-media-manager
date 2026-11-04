import { useSyncExternalStore } from "react";

/** Tailwind's `sm` breakpoint (640 px) — the point where the compact
 *  mobile layouts switch to the tablet/desktop ones. */
const MOBILE_QUERY = "(max-width: 639px)";

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return typeof window === "undefined" ? false : getSnapshot();
}

/** Reactive "is a narrow (phone) viewport" — true below the `sm`
 *  breakpoint, updating live as the window resizes. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
