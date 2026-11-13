export interface VisualizationHostProps {
  /** Render a specific plugin instead of the app-wide active one. */
  pluginId?: string;
  className?: string;
  /** Show the fullscreen toggle when the browser supports it. */
  showFullscreenControl?: boolean;
  onError?: (error: Error) => void;
}
