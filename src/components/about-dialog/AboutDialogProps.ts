/** Tabs of the about dialog. */
export type AboutTab = "about" | "credits" | "shortcuts";

export interface AboutDialogProps {
  open: boolean;
  onOpenChange: (openState: boolean) => void;
  /** Active tab, controlled so a shortcut can open straight to shortcuts. */
  tab: AboutTab;
  onTabChange: (tab: AboutTab) => void;
}
