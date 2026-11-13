export interface VisualizerSelectorProps {
  className?: string;
  /** `list` shows searchable cards; `compact` is a single select. */
  variant?: "list" | "compact";
  onSelect?: (pluginId: string) => void;
}
