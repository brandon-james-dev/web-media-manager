export interface VisualizerSelectorProps {
  className?: string;
  /** Merged into the compact variant's select trigger, for host styling. */
  triggerClassName?: string;
  /** `list` shows searchable cards; `compact` is a single select. */
  variant?: "list" | "compact";
  onSelect?: (pluginId: string) => void;
  /** Renders a per-plugin configure button when provided. */
  onConfigure?: (pluginId: string) => void;
}
