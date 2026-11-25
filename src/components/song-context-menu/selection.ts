import { wmmBus } from "@/events";

/**
 * Last-published song selection, held at module scope. Row components mount
 * and unmount as the table re-renders, so a context menu cannot rely on its
 * own event history — a freshly mounted menu would otherwise see an empty
 * selection. The module snapshot survives remounts.
 */
let currentSelection: string[] = [];

export function setCurrentSelection(songIds: string[]): void {
  currentSelection = songIds;
}

export function getCurrentSelection(): string[] {
  return currentSelection;
}

/**
 * Track every selection change here, at module scope, rather than inside a
 * menu surface.
 *
 * The surface mounts lazily on first open, so a subscription living there
 * missed every selection made before that — the snapshot stayed empty and the
 * first multi-select right-click acted on one song. Subscribing on import
 * keeps the snapshot current no matter which surface is mounted.
 */
wmmBus.on("wmm.ui.selectionChanged", (payload) => {
  setCurrentSelection(payload?.songIds ?? []);
});
