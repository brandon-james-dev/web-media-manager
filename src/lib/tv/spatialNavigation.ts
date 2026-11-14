import { wmmBus } from "@/events";
import { detectTv } from "./detectTv";

/**
 * Remote-control navigation for television browsers.
 *
 * A TV remote sends arrow keys, Enter and Back; there is no pointer, so the
 * app has to move focus itself. Arrow keys pick the nearest focusable element
 * in that direction (by geometry, not DOM order), Enter activates it, and Back
 * closes the open dialog or leaves the current screen.
 *
 * The installer is a no-op off a TV, so it can be called unconditionally.
 */

type Direction = "up" | "down" | "left" | "right";

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Candidate<T> {
  item: T;
  rect: Rect;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const DIALOG_SELECTOR = "[data-slot='dialog-content'], [role='dialog']";

/** Movement smaller than this is treated as "not in that direction". */
const MIN_TRAVEL = 4;

/** Candidates whose forward travel is within this many pixels of the nearest
 *  one count as the same row. */
const ROW_TOLERANCE = 24;
/** Sideways drift costs more than forward travel, so the list stays in a row. */
const DRIFT_WEIGHT = 2.2;

/** How far off the travel axis a candidate may sit, as a fraction of its span. */
const CROSS_AXIS_TOLERANCE = 0.5;

/** Seconds moved by a remote's rewind / fast-forward key. */
const SEEK_STEP = 10;

/**
 * Older television browsers report the D-pad with the pre-standard key names,
 * and some report `key: "Unidentified"` with only a legacy `keyCode`. Both are
 * normalised here so one switch handles every remote.
 */
const LEGACY_KEY_NAMES: Record<string, string> = {
  Up: "ArrowUp",
  Down: "ArrowDown",
  Left: "ArrowLeft",
  Right: "ArrowRight",
  Select: "Enter",
  GoBack: "BrowserBack",
  XF86Back: "BrowserBack",
};

/**
 * Fire TV key codes, from Amazon's "Supporting Controllers in Web Apps":
 * Select 13, D-pad 37-40, Back 4, Play/Pause 179, Rewind 227, Fast Forward
 * 228. The media keys are optional on some remotes, which is why the D-pad is
 * the only input that can be relied on.
 */
const KEY_CODES: Record<number, string> = {
  4: "BrowserBack",
  8: "Backspace",
  13: "Enter",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  179: "MediaPlayPause",
  227: "MediaRewind",
  228: "MediaFastForward",
  461: "BrowserBack",
  10009: "BrowserBack",
};

/** `KeyboardEvent.code` values a remote may report instead of `key`. */
const KNOWN_CODES = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Enter",
  "NumpadEnter",
  "Escape",
  "Backspace",
  "BrowserBack",
  "MediaPlayPause",
  "MediaRewind",
  "MediaFastForward",
]);

/**
 * Normalise a key event to the name the switch handles.
 *
 * Older television browsers report the D-pad with pre-standard key names, and
 * some report `key: "Unidentified"` with only a legacy `keyCode`; both are
 * folded into one vocabulary here. Silk on Fire TV is inconsistent about which
 * field it fills: some builds leave `keyCode` at 0 and put the code in `which`,
 * others only set `code`. All four are consulted so one switch handles every
 * remote.
 */
export function normalizeKey(event: {
  key?: string;
  code?: string;
  keyCode?: number;
  which?: number;
}): string {
  const key = event.key;
  if (key && key !== "Unidentified") {
    return LEGACY_KEY_NAMES[key] ?? key;
  }

  const code = event.code;
  if (code && KNOWN_CODES.has(code)) {
    return code === "NumpadEnter" ? "Enter" : code;
  }

  return KEY_CODES[event.keyCode || event.which || 0] ?? "";
}

function keyName(event: KeyboardEvent): string {
  return normalizeKey(event);
}

function isEditable(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  if (element.isContentEditable) {
    return true;
  }
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }
  if (element instanceof HTMLInputElement) {
    return !["button", "checkbox", "radio", "range", "submit", "reset"].includes(
      element.type
    );
  }
  return element instanceof HTMLSelectElement;
}

function isVisible(element: HTMLElement): boolean {
  if (element.closest("[inert], [aria-hidden='true']")) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) {
    return false;
  }
  const style = window.getComputedStyle(element);
  // The player chrome fades to opacity 0 with pointer-events off; those
  // controls must not take focus while hidden.
  return style.visibility !== "hidden" && style.opacity !== "0";
}

/** The topmost open dialog, so focus stays inside it while it is up. */
function activeScope(): ParentNode {
  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR)
  ).filter(isVisible);
  return dialogs.at(-1) ?? document.body;
}

function focusables(): HTMLElement[] {
  return Array.from(
    activeScope().querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  )
    .filter(isVisible)
    // An element removed from the tab order is not a stop for the remote
    // either: a link wrapping a button would otherwise be visited twice.
    .filter((element) => element.tabIndex >= 0);
}

function center(rect: Rect): { x: number; y: number } {
  return {
    x: (rect.left + rect.right) / 2,
    y: (rect.top + rect.bottom) / 2,
  };
}

/**
 * Nearest candidate in `direction`: forward travel plus weighted sideways
 * drift. Overlapping the current element's cross-axis span is preferred, which
 * keeps a row of tabs or a grid of cards predictable.
 *
 * Pure geometry, so the navigation rules can be tested without a DOM.
 */
export function pickNearest<T>(
  from: Rect,
  candidates: readonly Candidate<T>[],
  direction: Direction
): T | null {
  const origin = center(from);
  const vertical = direction === "up" || direction === "down";
  let bestOverlap: { item: T; score: number } | null = null;
  let bestAny: { item: T; score: number } | null = null;
  // Vertically the next row wins outright, whatever its horizontal offset:
  // from a header icon the row directly below is the next thing on screen,
  // even when a control further down happens to sit closer horizontally.
  let nearestRow: Array<{ item: T; drift: number }> = [];
  let nearestRowTravel = Number.POSITIVE_INFINITY;

  for (const { item, rect } of candidates) {
    const point = center(rect);
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;

    const forward =
      direction === "left"
        ? -dx
        : direction === "right"
          ? dx
          : direction === "up"
            ? -dy
            : dy;

    if (forward < MIN_TRAVEL) {
      continue;
    }

    if (vertical) {
      if (forward < nearestRowTravel - ROW_TOLERANCE) {
        nearestRowTravel = forward;
        nearestRow = [{ item, drift: dx }];
      } else if (forward <= nearestRowTravel + ROW_TOLERANCE) {
        nearestRow.push({ item, drift: dx });
      }
    }

    const drift = direction === "left" || direction === "right" ? dy : dx;
    const overlaps =
      direction === "left" || direction === "right"
        ? rect.bottom > from.top && rect.top < from.bottom
        : rect.right > from.left && rect.left < from.right;

    // A candidate far off the travel axis is in another band of the layout —
    // right from a card must not land on the player bar below it. The
    // tolerance follows the larger of the two cross-axis sizes, so a small
    // icon can still reach a wide row.
    const crossSpan =
      direction === "left" || direction === "right"
        ? Math.max(from.bottom - from.top, rect.bottom - rect.top)
        : Math.max(from.right - from.left, rect.right - from.left);
    const withinTolerance =
      overlaps || Math.abs(drift) <= crossSpan * CROSS_AXIS_TOLERANCE;

    // Overlapping means the same band of the layout, so a sideways offset
    // inside that band must not count against the candidate: a wide card
    // whose centre sits far from a narrow control is still the right target,
    // and without this a distant but aligned button wins instead.
    const score =
      forward +
      (overlaps ? 0 : Math.abs(drift) * DRIFT_WEIGHT) -
      (overlaps ? forward * 0.25 : 0);

    if (withinTolerance && (!bestOverlap || score < bestOverlap.score)) {
      bestOverlap = { item, score };
    }
    if (!bestAny || score < bestAny.score) {
      bestAny = { item, score };
    }
  }

  if (vertical && nearestRow.length > 0) {
    // Same row: the closest horizontally wins, so a grid column is kept.
    let best = nearestRow[0];
    for (const candidate of nearestRow) {
      if (Math.abs(candidate.drift) < Math.abs(best.drift)) {
        best = candidate;
      }
    }
    return best.item;
  }

  if (bestOverlap) {
    return bestOverlap.item;
  }

  // Vertically, a band with nothing aligned above or below it would otherwise
  // be a dead end: the header icons sit far to the right of the centred page
  // content, so no candidate overlaps them and the arrow key did nothing.
  // Falling back to the nearest candidate by travel and drift keeps the page
  // reachable. Horizontal travel keeps the strict rule, which is what stops a
  // row from jumping into the player bar.
  return vertical ? (bestAny?.item ?? null) : null;
}

function findNext(
  current: HTMLElement,
  items: HTMLElement[],
  direction: Direction
): HTMLElement | null {
  const from = current.getBoundingClientRect();
  const candidates = items
    .filter(
      (item) =>
        item !== current &&
        !current.contains(item) &&
        !item.contains(current)
    )
    .map((item) => ({ item, rect: item.getBoundingClientRect() }));

  return pickNearest(from, candidates, direction);
}

function focusElement(element: HTMLElement): void {
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function moveFocus(direction: Direction): boolean {
  const items = focusables();
  if (items.length === 0) {
    return false;
  }

  const current =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  if (!current || current === document.body || !items.includes(current)) {
    focusElement(items[0]);
    return true;
  }

  const next = findNext(current, items, direction);
  if (!next) {
    return false;
  }

  focusElement(next);
  return true;
}

/** Move focus from an arbitrary rectangle, e.g. a text field that is about to
 *  be blurred and so has no focusable element to start from. */
function moveFocusFrom(from: Rect, direction: Direction): boolean {
  const candidates = focusables().map((item) => ({
    item,
    rect: item.getBoundingClientRect(),
  }));
  const next = pickNearest(from, candidates, direction);
  if (!next) {
    return false;
  }
  focusElement(next);
  return true;
}

/** Scroll an element, falling back to assigning the offset when the
 *  options form of `scrollBy` is unavailable (older Silk builds). */
function scrollElement(
  node: HTMLElement,
  top: number,
  left: number
): void {
  if (typeof node.scrollBy === "function") {
    node.scrollBy({ top, left, behavior: "smooth" });
    return;
  }
  node.scrollTop += top;
  node.scrollLeft += left;
}

/** Whether an element can still move in `direction`. */
function canScrollToward(node: HTMLElement, direction: Direction): boolean {
  const vertical = direction === "up" || direction === "down";
  if (vertical) {
    const max = node.scrollHeight - node.clientHeight;
    if (max <= 1) return false;
    return direction === "down"
      ? node.scrollTop < max - 1
      : node.scrollTop > 1;
  }
  const max = node.scrollWidth - node.clientWidth;
  if (max <= 1) return false;
  return direction === "right" ? node.scrollLeft < max - 1 : node.scrollLeft > 1;
}

/**
 * The app's main scroll container, found without walking up from the focused
 * element.
 *
 * Focus can sit in the header, which is a sibling of the content area rather
 * than an ancestor, so the ancestor walk finds nothing to scroll. The content
 * area is still the thing the user means, so it is located directly.
 */
function fallbackScroller(): HTMLElement | null {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(
      'main, main [class*="overflow-y-auto"], main [class*="overflow-auto"], [data-scroll-container]'
    )
  ).filter((node) => {
    const style = window.getComputedStyle(node);
    return (
      /(auto|scroll)/.test(style.overflowY) &&
      node.scrollHeight > node.clientHeight + 1
    );
  });

  const area = (node: HTMLElement) => node.clientWidth * node.clientHeight;
  nodes.sort((a, b) => area(b) - area(a));
  return nodes[0] ?? null;
}

/** Scroll the nearest scrollable ancestor when there is nothing to focus in
 *  that direction, so a long page still reaches its lower rows. */
function scrollByDirection(direction: Direction): void {
  const step = 0.6;
  let node: HTMLElement | null =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const scrollable =
      /(auto|scroll)/.test(style.overflowY) ||
      /(auto|scroll)/.test(style.overflowX);
    if (scrollable && canScrollToward(node, direction)) {
      const vertical = direction === "up" || direction === "down";
      const amount = vertical
        ? node.clientHeight * step
        : node.clientWidth * step;
      const sign = direction === "up" || direction === "left" ? -1 : 1;
      scrollElement(
        node,
        vertical ? amount * sign : 0,
        vertical ? 0 : amount * sign
      );
      return;
    }
    node = node.parentElement;
  }

  const fallback = fallbackScroller();
  if (fallback) {
    const vertical = direction === "up" || direction === "down";
    const amount = vertical
      ? fallback.clientHeight * step
      : fallback.clientWidth * step;
    const sign = direction === "up" || direction === "left" ? -1 : 1;
    scrollElement(
      fallback,
      vertical ? amount * sign : 0,
      vertical ? 0 : amount * sign
    );
    return;
  }

  const root = document.scrollingElement;
  if (!root) return;
  const vertical = direction === "up" || direction === "down";
  const amount = (vertical ? root.clientHeight : root.clientWidth) * step;
  const sign = direction === "up" || direction === "left" ? -1 : 1;
  root.scrollBy({
    top: vertical ? amount * sign : 0,
    left: vertical ? 0 : amount * sign,
    behavior: "smooth",
  });
}

/** Back: close the open dialog, then the now-playing overlay, then leave the
 *  screen. */
function goBack(): void {
  if (activeScope() !== document.body) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    return;
  }

  // An open popover (notifications) is a layer of its own: Back dismisses it
  // before it closes the now-playing view or leaves the page.
  if (document.querySelector("[data-slot='popover-content']")) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    return;
  }

  if (document.querySelector("[data-now-playing='true']")) {
    wmmBus.invoke("wmm.ui.closeNowPlaying");
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  const target = event.target instanceof Element ? event.target : null;
  const key = keyName(event);

  if (handleKey(key, target)) {
    // Stop here: the browser would otherwise scroll the page, and a focused
    // listbox or tab strip would move focus a second time.
    event.preventDefault();
    event.stopPropagation();
  }
}

/** Returns true when the key was consumed. */
function handleKey(key: string, target: Element | null): boolean {
  // A focused text field owns the caret keys and Backspace. Up and down still
  // leave the field, because a remote has no Tab key and focus must never be
  // trapped in a search box.
  if (isEditable(target)) {
    if (key === "ArrowUp" || key === "ArrowDown") {
      const rect = (target as HTMLElement).getBoundingClientRect();
      const moved = moveFocusFrom(
        rect,
        key === "ArrowUp" ? "up" : "down"
      );
      if (moved) {
        (target as HTMLElement).blur();
      }
      return moved;
    }
    return false;
  }

  switch (key) {
    case "ArrowUp":
    case "ArrowDown":
    case "ArrowLeft":
    case "ArrowRight": {
      // Left/right on a slider adjust its value; up/down still navigate away.
      const onRange =
        target instanceof HTMLInputElement && target.type === "range";
      if (onRange && (key === "ArrowLeft" || key === "ArrowRight")) {
        return false;
      }

      const direction = key.slice(5).toLowerCase() as Direction;
      // Consume the press either way: a TV browser's default is to move the
      // on-screen cursor or scroll, which fights focus movement. With nowhere
      // to focus, scroll the page instead.
      if (!moveFocus(direction)) {
        scrollByDirection(direction);
      }
      return true;
    }

    case "Enter": {
      const active = document.activeElement;
      const native =
        active instanceof HTMLButtonElement ||
        active instanceof HTMLAnchorElement ||
        active instanceof HTMLInputElement ||
        active instanceof HTMLSelectElement ||
        active instanceof HTMLTextAreaElement;
      if (!native && active instanceof HTMLElement) {
        active.click();
        return true;
      }
      return false;
    }

    case "Backspace":
    case "BrowserBack":
      goBack();
      return true;

    case "MediaPlayPause":
      wmmBus.invoke("wmm.playback.playpause");
      return true;

    case "MediaTrackNext":
      wmmBus.invoke("wmm.playback.next");
      return true;

    case "MediaTrackPrevious":
      wmmBus.invoke("wmm.playback.prev");
      return true;

    // Remotes label these rewind and fast forward; both seek within the track
    // rather than changing it.
    case "MediaRewind":
    case "MediaSkipBackward":
      wmmBus.invoke("wmm.playback.seekBy", { deltaSeconds: -SEEK_STEP });
      return true;

    case "MediaFastForward":
    case "MediaSkipForward":
      wmmBus.invoke("wmm.playback.seekBy", { deltaSeconds: SEEK_STEP });
      return true;

    default:
      return false;
  }
}

/** Focus the first control so the first arrow press has somewhere to start.
 *  Views that render their content late (a list that loads, a route that
 *  mounts after the first paint) get a few retries before giving up. */
function focusInitial(attempt = 0): void {
  if (document.activeElement && document.activeElement !== document.body) {
    return;
  }
  const [first] = focusables();
  if (first) {
    focusElement(first);
    return;
  }
  if (attempt < 6) {
    window.setTimeout(() => focusInitial(attempt + 1), 250);
  }
}

export function installTvNavigation(options?: { force?: boolean }): () => void {
  if (!options?.force && !detectTv()) {
    return () => {};
  }

  document.documentElement.dataset.tv = "true";
  window.addEventListener("keydown", onKeyDown, true);
  const timer = window.setTimeout(focusInitial, 400);

  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("keydown", onKeyDown, true);
    delete document.documentElement.dataset.tv;
  };
}
