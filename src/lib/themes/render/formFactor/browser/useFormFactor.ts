import { useSyncExternalStore } from "react";
import { isTvOverride, isTvUserAgent } from "@/lib/tv/detectTv";
import { resolveFormFactor } from "../resolveFormFactor";
import type { FormFactor } from "../../../componentModel";

const COARSE_POINTER = "(pointer: coarse)";
const NO_POINTER = "(pointer: none)";

function matches(query: string): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(query).matches
  );
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener("resize", onChange);
  const queries = [
    window.matchMedia(COARSE_POINTER),
    window.matchMedia(NO_POINTER),
  ];
  for (const query of queries) query.addEventListener("change", onChange);

  return () => {
    window.removeEventListener("resize", onChange);
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}

function getSnapshot(): FormFactor {
  if (typeof window === "undefined") return "desktop";

  return resolveFormFactor({
    width: window.innerWidth,
    height: window.innerHeight,
    coarsePointer: matches(COARSE_POINTER),
    noPointer: matches(NO_POINTER),
    tvUserAgent: isTvUserAgent(),
    tvOverride: isTvOverride(),
  });
}

/**
 * The form factor of the current viewport, re-resolved on resize and on a
 * pointer change. The snapshot is the form-factor string itself, so
 * `useSyncExternalStore` sees a stable value between changes.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="tv" />
 * ```
 * @example
 * ```tsx
 * const formFactor = useFormFactor();
 * return <LayoutView formFactor={formFactor} />;
 * ```
 */
export function useFormFactor(): FormFactor {
  return useSyncExternalStore(subscribe, getSnapshot);
}
