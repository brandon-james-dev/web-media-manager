import type { VisualizerPalette } from "@/core/visualizers";

/**
 * The artwork palette shared between the now-playing backdrop and visualizer
 * plugins.
 *
 * The now-playing view already samples the artwork for its backdrop; publishing
 * that result here means a plugin can match the screen's colors without
 * decoding the artwork a second time. Plugins read it per frame through
 * `api.getPalette()`, so no subscription is needed.
 */
let current: VisualizerPalette | null = null;
const listeners = new Set<(palette: VisualizerPalette | null) => void>();

export function setVisualizerPalette(
  palette: VisualizerPalette | null
): void {
  current = palette;
  for (const listener of listeners) {
    listener(palette);
  }
}

export function getVisualizerPalette(): VisualizerPalette | null {
  return current;
}

export function subscribeVisualizerPalette(
  listener: (palette: VisualizerPalette | null) => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
