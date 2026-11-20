import type { Song } from "@/models";

/** What the editor hands back when the user saves. */
export interface ISyncedLyricsResult {
  /** Static (unsynced) lyrics text. */
  lyrics: string;
  /** LRC text with one `[mm:ss.xx]` placement per timed line. */
  syncedLyrics: string;
}

export type SyncedLyricsEditorDialogProps = {
  song: Song;
  /**
   * Current static lyrics, including edits the form has not saved yet. Falls
   * back to `song.lyrics` when omitted.
   */
  lyrics?: string;
  /**
   * Current LRC text, including placements the form has not saved yet. Falls
   * back to `song.syncedLyrics` when omitted.
   */
  syncedLyrics?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (result: ISyncedLyricsResult) => void;
  /** Render the body only, for the combined lyrics dialog. */
  embedded?: boolean;
};
