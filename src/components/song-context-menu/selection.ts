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
