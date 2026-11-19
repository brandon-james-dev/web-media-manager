import type { ILyricsResult } from "@/lib/lyrics-providers/ILyricsService";
import type { Song } from "@/models";

export type LyricsSearchDialogProps = {
  song: Song;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: ILyricsResult) => void;
};
