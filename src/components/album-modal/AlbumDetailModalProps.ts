import type { Album } from "@/models";

export interface AlbumDetailModalProps {
  /** The album currently shown. `undefined` closes nothing (guarded). */
  album?: Album;
  /** Whether the modal is open. */
  open: boolean;
  /** Open/close changes (X, overlay click, Edit action). */
  onOpenChange: (open: boolean) => void;
}
