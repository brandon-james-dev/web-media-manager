import { keyShortcut$ } from "@/events/keyboard-events";
import { registerShortcut } from "./keyboardShortcuts";

export function registerDefaultShortcuts() {
  registerShortcut({
    id: "openShortcuts",
    description: "Open keyboard shortcuts",
    combo: { key: "/", ctrl: true },
    action: () => keyShortcut$.next("openShortcuts"),
  });

  registerShortcut({
    id: "next",
    description: "Next song / next album",
    combo: { key: "ArrowRight", ctrl: true },
    action: () => keyShortcut$.next("next"),
  });

  registerShortcut({
    id: "prev",
    description: "Previous song / previous album",
    combo: { key: "ArrowLeft", ctrl: true },
    action: () => keyShortcut$.next("prev"),
  });

  registerShortcut({
    id: "playpause",
    description: "Play / Pause",
    combo: { key: " ", ctrl: false },
    action: () => keyShortcut$.next("playpause"),
  });

  registerShortcut({
    id: "queue",
    description: "Queue selected song",
    combo: { key: "q" },
    action: () => keyShortcut$.next("queue"),
  });

  registerShortcut({
    id: "edit",
    description: "Open advanced edit",
    combo: { key: "e" },
    action: () => keyShortcut$.next("edit"),
  });

  registerShortcut({
    id: "close",
    description: "Close editor",
    combo: { key: "Escape" },
    action: () => keyShortcut$.next("close"),
  });
}
