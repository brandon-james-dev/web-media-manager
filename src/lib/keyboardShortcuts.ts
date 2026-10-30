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

/**
 * Run the shortcut registered under `id`. Its action emits the id on
 * keyShortcut$, which is how subscribers (App, PlayerControls, Editor) learn
 * that it fired.
 *
 * Dispatch is called directly by the key handler and was previously also
 * subscribed to keyShortcut$; because actions re-emit their own id, that
 * subscription re-entered itself — emitting twice to every subscriber and
 * recursing until the stack overflowed.
 */
export function dispatchShortcut(id: string) {
  shortcuts.get(id)?.action();
}
