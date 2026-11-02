import { Subject } from "rxjs";

/**
 * Named keyboard shortcut activations (e.g. "playpause", "next", "edit").
 * These are INPUT primitives at the UI layer: their subscribers translate
 * them into WmmBus commands (see PlayerControls/Editor/App). Kept off the
 * domain bus intentionally — a raw key event is a gesture, not a domain
 * signal, and the commands it triggers already ride the bus.
 */
export const keyShortcut$ = new Subject<string>();
