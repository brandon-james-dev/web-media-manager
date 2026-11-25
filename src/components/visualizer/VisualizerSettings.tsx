import { PluginSettingsDialog } from "@/components/plugin-settings";
import { useVisualizer } from "@/hooks";
import type { VisualizerSettingsProps } from "./VisualizerSettingsProps";

/**
 * Settings for the active visualizer plugin.
 *
 * The dialog itself is kind-agnostic; this wrapper only supplies the open
 * state and the active plugin from the visualizer context.
 */
export function VisualizerSettings({
  pluginId,
  className,
}: VisualizerSettingsProps) {
  const { settingsOpen, setSettingsOpen, activePluginId } = useVisualizer();

  return (
    <PluginSettingsDialog
      pluginId={pluginId ?? activePluginId ?? null}
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
      className={className}
    />
  );
}
