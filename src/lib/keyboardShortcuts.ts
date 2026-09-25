import { keyShortcut$ } from "@/events/keyboard-events";

export type Shortcut = {
  id: string;
  description: string;
  combo: {
    key: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
  action: () => void;
};

const shortcuts: Map<string, Shortcut> = new Map<string, Shortcut>();

export function registerShortcut(shortcut: Shortcut) {
  shortcuts.set(shortcut.id, shortcut);
}

export function getShortcuts() {
  return shortcuts;
}

keyShortcut$.subscribe((id) => {
  const shortcut = shortcuts.get(id);
  if (shortcut) shortcut.action();
});
