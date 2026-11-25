import type { PluginKind } from "@/core/plugins";

export interface PluginManagerDialogProps {
  /** Controlled open state; defaults to the visualizer context. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** Which plugin kind the dialog lists and installs. Defaults to visualizer. */
  kind?: PluginKind;
}
