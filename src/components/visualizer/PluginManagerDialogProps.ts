export interface PluginManagerDialogProps {
  /** Controlled open state; defaults to the visualizer context. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}
