import { keyShortcut$ } from "@/events/keyboard-events";
import { getShortcuts } from "./keyboardShortcuts";
import { isMac } from "./os";

function handleKey(e: KeyboardEvent) {
  const allShortcuts = Array.from(getShortcuts().values());

  for (const shortcut of allShortcuts) {
    const c = shortcut.combo;
    if (e.key !== c.key) continue;

    if (e.metaKey || e.altKey) {
      e.preventDefault();
    }

    // ctrl: true means primary modifier (Ctrl on Win/Linux, Cmd on mac)
    if (c.ctrl) {
      const primaryPressed = isMac ? e.metaKey : e.ctrlKey;
      if (!primaryPressed) continue;
    }

    if (c.meta) {
      if (!e.metaKey) continue;
    }

    if (c.shift) {
      if (!e.shiftKey) continue;
    }

    if (c.alt) {
      if (!e.altKey) continue;
    }

    e.preventDefault();
    keyShortcut$.next(shortcut.id);
    break;
  }
}

export { handleKey };
