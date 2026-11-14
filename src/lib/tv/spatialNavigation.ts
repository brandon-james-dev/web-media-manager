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
/** Sideways drift costs more than forward travel, so the list stays in a row. */
const DRIFT_WEIGHT = 2.2;

/** Seconds moved by a remote's rewind / fast-forward key. */
const SEEK_STEP = 10;

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
  ).filter(isVisible);
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
  let best: { item: T; score: number } | null = null;

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

    const drift = direction === "left" || direction === "right" ? dy : dx;
    const overlaps =
      direction === "left" || direction === "right"
        ? rect.bottom > from.top && rect.top < from.bottom
        : rect.right > from.left && rect.left < from.right;

    const score =
      forward + Math.abs(drift) * DRIFT_WEIGHT - (overlaps ? forward * 0.25 : 0);

    if (!best || score < best.score) {
      best = { item, score };
    }
  }

  return best?.item ?? null;
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

/** Back: close the open dialog, then the now-playing overlay, then leave the
 *  screen. */
function goBack(): void {
  if (activeScope() !== document.body) {
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

  // A focused text field owns the arrow keys (caret movement) and Backspace.
  if (isEditable(target)) {
    return;
  }

  switch (event.key) {
    case "ArrowUp":
    case "ArrowDown":
    case "ArrowLeft":
    case "ArrowRight": {
      // Left/right on a slider adjust its value; up/down still navigate away.
      const onRange =
        target instanceof HTMLInputElement && target.type === "range";
      if (onRange && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        return;
      }

      const direction = event.key.slice(5).toLowerCase() as Direction;
      if (moveFocus(direction)) {
        event.preventDefault();
      }
      return;
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
        event.preventDefault();
      }
      return;
    }

    case "Backspace":
    case "BrowserBack": {
      event.preventDefault();
      goBack();
      return;
    }

    case "MediaPlayPause":
      event.preventDefault();
      wmmBus.invoke("wmm.playback.playpause");
      return;

    case "MediaTrackNext":
      event.preventDefault();
      wmmBus.invoke("wmm.playback.next");
      return;

    case "MediaTrackPrevious":
      event.preventDefault();
      wmmBus.invoke("wmm.playback.prev");
      return;

    // Remotes label these rewind and fast forward; both seek within the track
    // rather than changing it.
    case "MediaRewind":
    case "MediaSkipBackward":
      event.preventDefault();
      wmmBus.invoke("wmm.playback.seekBy", { deltaSeconds: -SEEK_STEP });
      return;

    case "MediaFastForward":
    case "MediaSkipForward":
      event.preventDefault();
      wmmBus.invoke("wmm.playback.seekBy", { deltaSeconds: SEEK_STEP });
      return;

    default:
      return;
  }
}

/** Focus the first control so the first arrow press has somewhere to start. */
function focusInitial(): void {
  if (document.activeElement && document.activeElement !== document.body) {
    return;
  }
  const [first] = focusables();
  if (first) {
    focusElement(first);
  }
}

export function installTvNavigation(): () => void {
  if (!detectTv()) {
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
