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

/**
 * Manual override: `?tv=1` forces the television layout and remote
 * navigation. Some TV browsers report a fine pointer and a desktop user
 * agent, which leaves no automatic signal to detect.
 *
 * The flag is remembered, because a television has no address bar: the user
 * cannot re-add `?tv=1` after the first navigation, and a reload would
 * otherwise drop back to the desktop layout.
 */
const TV_OVERRIDE_KEY = "wmm.tv-override";

/** Read `?tv=` once at startup and persist it. Call before rendering. */
export function syncTvOverrideFromUrl(): void {
  if (typeof window === "undefined") {
    return;
  }
  const value = new URLSearchParams(window.location.search).get("tv");
  try {
    if (value === "1") {
      window.localStorage.setItem(TV_OVERRIDE_KEY, "1");
    } else if (value === "0") {
      window.localStorage.removeItem(TV_OVERRIDE_KEY);
    }
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the query
    // parameter still applies for this load.
  }
}

/** A device that reports a precise pointer is a computer, not a television. */
function hasFinePointer(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: fine)").matches
  );
}

export function isTvOverride(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  // An explicit `?tv=1` always applies to this load.
  if (new URLSearchParams(window.location.search).get("tv") === "1") {
    return true;
  }
  let stored = false;
  try {
    stored = window.localStorage.getItem(TV_OVERRIDE_KEY) === "1";
  } catch {
    return false;
  }
  // The remembered flag must not follow the user to a computer: a laptop with
  // a mouse and a TV user agent absent is never a television, whatever was
  // stored earlier.
  return stored && (!hasFinePointer() || isTvUserAgent());
}

export function detectTv(): boolean {
  return isTvOverride() || isTvUserAgent() || isTvViewport();
}

export { TV_QUERY };
