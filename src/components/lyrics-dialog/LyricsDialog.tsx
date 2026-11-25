import { Clock, FileMusic } from "lucide-react";
import { useTranslation } from "@/i18n";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { LyricsSearchDialog } from "../lyrics-search-dialog/LyricsSearchDialog";
import { SyncedLyricsEditorDialog } from "../synced-lyrics-editor/SyncedLyricsEditorDialog";
import type { ILyricsResult } from "@/lib/lyrics-providers/ILyricsService";
import type { ISyncedLyricsResult } from "../synced-lyrics-editor/SyncedLyricsEditorDialogProps";
import type { Song } from "@/models";

/** Which lyrics action the dialog is showing. */
export type LyricsDialogTab = "fetch" | "timed";

export type LyricsDialogProps = {
  song: Song;
  /** Live static lyrics from the form, including unsaved edits. */
  lyrics?: string;
  /** Live LRC text from the form, including unsaved placements. */
  syncedLyrics?: string;
  open: boolean;
  tab: LyricsDialogTab;
  onOpenChange: (open: boolean) => void;
  onTabChange: (tab: LyricsDialogTab) => void;
  onSelect: (result: ILyricsResult) => void;
  /** Loads a fetch result's timed lyrics into the timed tab. */
  onLoadTimed: (result: ILyricsResult) => void;
  onSaveSynced: (result: ISyncedLyricsResult) => void;
};

/**
 * One dialog for both lyrics actions. The tab strip switches which panel is
 * visible inside the same dialog, so neither panel remounts the overlay and
 * the dialog keeps its size and position.
 */
export function LyricsDialog(props: LyricsDialogProps) {
  const {
    song,
    lyrics,
    syncedLyrics,
    open,
    tab,
    onOpenChange,
    onTabChange,
    onSelect,
    onLoadTimed,
    onSaveSynced,
  } = props;
  const { t } = useTranslation();

  const tabClass = (active: boolean) =>
    `flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors ${
      active
        ? "bg-accent/20 text-accent"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[min(46rem,calc(100vh-2rem))] max-h-[calc(100vh-2rem)] gap-0 overflow-hidden p-0 flex! flex-col sm:max-w-5xl"
        overlayClassName="bg-black/40 backdrop-blur-sm"
      >
        <DialogHeader className="relative shrink-0 overflow-hidden rounded-t-xl border-b bg-popover px-4 py-2.5">
          <div
            className="pointer-events-none absolute inset-0 select-none bg-accent/10 text-accent/10"
            aria-hidden="true"
          >
            <FileMusic className="absolute -left-2 -top-3 size-16 rotate-12" />
            <Clock className="absolute -right-3 -top-2 size-16 -rotate-12" />
          </div>

          <div className="relative flex flex-col gap-3 @xl/card-header:flex-row @xl/card-header:items-start @xl/card-header:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20"
                aria-hidden="true"
              >
                <FileMusic className="size-4" />
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <DialogTitle className="leading-snug">
                  {t("metadata.lyricsDialogTitle")}
                </DialogTitle>
                <DialogDescription>
                  {tab === "timed"
                    ? t("metadata.syncedLyricsEditorDescription")
                    : t("metadata.lyricsSearchDescription")}
                </DialogDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="gap-1 text-foreground">
                <FileMusic className="size-3" />
                {song.title || song.filename}
              </Badge>
            </div>
          </div>

          <div
            className="relative flex h-8 items-center gap-1 rounded-md bg-background/60 p-0.5"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "fetch"}
              className={tabClass(tab === "fetch")}
              onClick={() => onTabChange("fetch")}
            >
              <FileMusic className="size-3.5" />
              {t("metadata.lyricsTabFetch")}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === "timed"}
              className={tabClass(tab === "timed")}
              onClick={() => onTabChange("timed")}
            >
              <Clock className="size-3.5" />
              {t("metadata.lyricsTabTimed")}
            </button>
          </div>
        </DialogHeader>

        {/* Both panels stay mounted and are only hidden, so switching tabs
            keeps the search results and the in-progress timings. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={
              tab === "timed"
                ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                : "hidden"
            }
          >
            <SyncedLyricsEditorDialog
              key={`${song.id}-${open ? "open" : "closed"}`}
              song={song}
              lyrics={lyrics}
              syncedLyrics={syncedLyrics}
              open={open}
              onOpenChange={onOpenChange}
              onSave={onSaveSynced}
              embedded
            />
          </div>

          <div
            className={
              tab === "fetch"
                ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                : "hidden"
            }
          >
            <LyricsSearchDialog
              song={song}
              open={open}
              onOpenChange={onOpenChange}
              onSelect={onSelect}
              onLoadTimed={onLoadTimed}
              embedded
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
