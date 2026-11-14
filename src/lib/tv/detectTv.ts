/**
 * TV detection.
 *
 * A television browser is identified two ways, because neither is reliable on
 * its own:
 *
 * - the user agent, which names the platform (Fire TV's Silk, webOS, Tizen,
 *   Android TV, Roku, Apple TV, …);
 * - the absence of any pointer at all on a wide viewport, which is what a
 *   remote-only device reports even when its user agent is generic.
 *
 * The pointer query alone would also match a desktop with no mouse attached,
 * and the user agent alone misses browsers that spoof a desktop string, so a
 * match on either counts.
 */
const TV_USER_AGENT =
  /(?:AFT[A-Z0-9]{2,}|Fire\s?TV|Silk\/[\d.]+.*(?:TV|AFT)|CrKey|Web0S|webOS\.TV|NetCast|Tizen|SMART-?TV|HbbTV|BRAVIA|AppleTV|Roku|GoogleTV|Android\s?TV)/i;

/** No pointer and a viewport at least as wide as a TV's CSS size. */
const TV_QUERY = "(pointer: none) and (min-width: 960px)";

export function isTvUserAgent(userAgent?: string): boolean {
  const ua =
    userAgent ??
    (typeof navigator === "undefined" ? "" : navigator.userAgent);
  return TV_USER_AGENT.test(ua);
}

export function isTvViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(TV_QUERY).matches
  );
}

export function detectTv(): boolean {
  return isTvUserAgent() || isTvViewport();
}

export { TV_QUERY };
