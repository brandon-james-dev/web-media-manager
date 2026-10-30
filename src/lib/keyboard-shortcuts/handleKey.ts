import { dispatchShortcut, getShortcuts } from "./keyboardShortcuts";
import { usesCommandMeta } from "./usesCommandMeta";

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/**
 * True when the keystroke belongs to whatever the user is typing into:
 * inputs, textareas, selects, and contenteditable regions (including one
 * inherited from an ancestor). A bare space typed into the search box must
 * not pause playback.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  // Walk from the event target up to the document, so an element nested
  // inside a contenteditable region still counts.
  for (
    let node: Element | null = target instanceof Element ? target : null;
    node instanceof Element;
    node = node.parentElement
  ) {
    if (node instanceof HTMLTextAreaElement) {
      if (!node.readOnly && !node.disabled) return true;
      continue;
    }

    if (node instanceof HTMLInputElement) {
      if (
        !node.readOnly &&
        !node.disabled &&
        !NON_TEXT_INPUT_TYPES.has(node.type)
      ) {
        return true;
      }
      continue;
    }

    if (node instanceof HTMLSelectElement) return true;

    // Contenteditable, either reported by the DOM or spelled as an
    // attribute ("" and absent both mean "inherit from the parent").
    const editable = node.getAttribute("contenteditable");

    if (node instanceof HTMLElement && node.isContentEditable) return true;
    if (editable === "true" || editable === "") return true;

    const role = node.getAttribute("role");

    if (role === "textbox" || role === "combobox") return true;
  }

  return false;
}

function handleKey(e: KeyboardEvent) {
  const allShortcuts = Array.from(getShortcuts().values());

  for (const shortcut of allShortcuts) {
    const c = shortcut.combo;
    if (e.key !== c.key) continue;

    const requiresModifier = Boolean(c.ctrl || c.meta || c.alt || c.shift);

    // Unmodified keys (Space, "/", arrows) belong to the field the user is
    // typing in and must not trigger a global action. Modified combos stay
    // live so Ctrl/Cmd shortcuts keep working from a focused input. Escape
    // is exempted so it can still dismiss the editor and dialogs.
    if (!requiresModifier && c.key !== "Escape" && isEditableTarget(e.target)) {
      continue;
    }

    // ctrl: true means primary modifier (Ctrl on Win/Linux, Cmd on mac)
    if (c.ctrl) {
      const primaryPressed = usesCommandMeta ? e.metaKey : e.ctrlKey;
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
    dispatchShortcut(shortcut.id);
    break;
  }
}

export { handleKey };
