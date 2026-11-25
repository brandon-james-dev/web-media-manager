export interface PluginSettingsDialogProps {
  /** Installed plugin whose manifest declares the settings. */
  pluginId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}
