import type { ILyricsResult } from "@/lib/lyrics-providers/ILyricsService";
import type { Song } from "@/models";

export type LyricsSearchDialogProps = {
  song: Song;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: ILyricsResult) => void;
  /** Loads a result's timed lyrics into the timed editor. */
  onLoadTimed?: (result: ILyricsResult) => void;
  /** Render the body only, for the combined lyrics dialog. */
  embedded?: boolean;
};
