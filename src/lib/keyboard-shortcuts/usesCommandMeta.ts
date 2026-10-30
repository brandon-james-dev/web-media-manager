/**
 * Whether the primary command modifier on the current platform is the
 * Meta (⌘) key rather than Ctrl. Drives both the shortcut modifier check
 * (metaKey vs ctrlKey) and the rendered accelerator glyph (⌘ vs Ctrl).
 *
 * Detection is intentionally minimal today: a browser-only guess, deferring
 * the richer hook to the Tauri (Rust os.platform) and server
 * (process.platform) phases, where the same boolean is injected per binding.
 */
export const usesCommandMeta =
  typeof window !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform);
