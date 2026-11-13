import { createContext, useContext } from "react";

export interface VisualizerContextValue {
  /** The plugin the app renders; null when nothing is installed/selected. */
  activePluginId: string | null;
  setActivePluginId: (pluginId: string | null) => void;
  managerOpen: boolean;
  setManagerOpen: (open: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

const VisualizerContext = createContext<VisualizerContextValue | null>(null);

function useVisualizer(): VisualizerContextValue {
  const context = useContext(VisualizerContext);
  if (!context) {
    throw new Error("useVisualizer must be used inside VisualizerProvider");
  }
  return context;
}

export { VisualizerContext, useVisualizer };
