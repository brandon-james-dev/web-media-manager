import { useEffect, useState } from "react";
import {
  AudioLines,
  ChevronDown,
  Clock,
  FileMusic,
  Hash,
  ListMusic,
  Loader2,
  Mic2,
  Music,
  Target,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { SplitButton } from "../split-button/SplitButton";
import { useTranslation } from "@/i18n";
import { formatLength } from "@/lib/formatLength";
import { LyricsProvider } from "@/lib/lyrics-providers/LyricsProvider";
import { rankLyricsResults } from "@/lib/lyrics-providers/rankLyricsResults";
import type { IRankedLyricsResult } from "@/lib/lyrics-providers/rankLyricsResults";
import { searchLyrics } from "@/lib/lyrics-providers/searchLyrics";
import type { LyricsSearchDialogProps } from "./LyricsSearchDialogProps";

const PROVIDER_NAME: Record<LyricsProvider, string> = {
  [LyricsProvider.LrcLib]: "LRCLIB",
};

/** Splits an LRC line into its `[mm:ss.xx]` stamp and the text after it. */
function splitLrcLine(line: string): { stamp: string; text: string } {
  const match = /^((?:\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\])+)\s?(.*)$/.exec(line);
  if (!match) return { stamp: "", text: line };
  return { stamp: match[1], text: match[2] };
}

/** Number of non-empty lyric lines a record carries. */
function countLines(result: IRankedLyricsResult): number {
  const text = result.plainLyrics ?? result.syncedLyrics;
  if (!text) return 0;
  return text.split("\n").filter((line) => line.trim() !== "").length;
}

export function LyricsSearchDialog(props: LyricsSearchDialogProps) {
  const { song, open, onOpenChange, onSelect, onLoadTimed, embedded } = props;
  const { t } = useTranslation();
  //#region State
  const [titleQuery, setTitleQuery] = useState(song.title ?? "");
  const [artistQuery, setArtistQuery] = useState(song.artist ?? "");
  const [albumQuery, setAlbumQuery] = useState(song.album ?? "");
  const [selectedProvider, setSelectedProvider] = useState<LyricsProvider>(
    LyricsProvider.LrcLib
  );
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<IRankedLyricsResult[] | null>(null);
  const [selected, setSelected] = useState<IRankedLyricsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  //#endregion

  // Reopening the dialog starts from the song being edited, not from the
  // previous song's search.
  useEffect(() => {
    if (!open) return;
    setTitleQuery(song.title ?? "");
    setArtistQuery(song.artist ?? "");
    setAlbumQuery(song.album ?? "");
    setResults(null);
    setSelected(null);
    setError(null);
  }, [open, song.title, song.artist, song.album]);

  //#region Interactivity handlers
  async function handleSearch(provider: LyricsProvider) {
    setLoading(true);
    setError(null);

    const query = {
      title: titleQuery,
      artist: artistQuery,
      album: albumQuery || undefined,
      duration: song.duration,
    };

    try {
      const res = await searchLyrics(provider, query);
      const ranked = res ? rankLyricsResults(res, query) : null;

      setResults(ranked);
      setSelected(ranked?.[0] ?? null);
    } catch (e) {
      setResults(null);
      setSelected(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!selected) return;
    onSelect(selected);
    onOpenChange(false);
  }
  //#endregion

  const content = (
    <>
      {!embedded && (
        <DialogHeader className="relative -mx-4 -mt-4 overflow-hidden rounded-t-xl border-b bg-accent/10 px-4 py-2.5">
          {/* Decorative watermark: lyrics glyphs behind the header content,
              echoing the sync device header. */}
          <div
            className="pointer-events-none absolute inset-0 select-none text-accent/10"
            aria-hidden="true"
          >
            <FileMusic className="absolute -left-2 -top-3 size-16 rotate-12" />

            <Mic2 className="absolute left-1/4 -bottom-3 size-12 -rotate-12" />

            <AudioLines className="absolute left-1/2 -top-4 size-14 rotate-6" />

            <ListMusic className="absolute right-1/3 -bottom-4 size-12 -rotate-6" />

            <Music className="absolute -top-2 right-12 size-10 rotate-12" />

            <Clock className="absolute -right-3 bottom-0 size-16 -rotate-12" />
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
                  {t("metadata.lyricsSearchTitle")}
                </DialogTitle>

                <DialogDescription>
                  {t("metadata.lyricsSearchDescription")}
                </DialogDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="gap-1 text-foreground">
                <FileMusic className="size-3" />
                {PROVIDER_NAME[selectedProvider]}
              </Badge>
            </div>
          </div>
        </DialogHeader>
      )}

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3 pb-3">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSearch(selectedProvider);
          }}
        >
          <Input
            value={titleQuery}
            autoComplete="off"
            onChange={(e) => setTitleQuery(e.target.value)}
            placeholder={t("search.titlePlaceholder")}
            className="flex-1 min-w-40"
          />
          <Input
            value={artistQuery}
            autoComplete="off"
            onChange={(e) => setArtistQuery(e.target.value)}
            placeholder={t("search.artistPlaceholder")}
            className="flex-1 min-w-40"
          />
          <Input
            value={albumQuery}
            autoComplete="off"
            onChange={(e) => setAlbumQuery(e.target.value)}
            placeholder={t("search.albumPlaceholder")}
            className="flex-1 min-w-40"
          />
          <SplitButton
            label={t("search.label")}
            dropdownSide="left"
            buttonVariant="secondary"
            // The form's onSubmit already searches, so the button must not also
            // submit: a submit button fires onClick and onSubmit, which ran the
            // provider request twice per click. Enter still submits the form.
            buttonType="button"
            onPrimaryClick={() => void handleSearch(selectedProvider)}
            menuItems={(
              Object.values(LyricsProvider) as LyricsProvider[]
            ).map((provider) => ({
              label: (
                <div className="flex items-center gap-2">
                  <FileMusic className="h-4 w-4" />
                  {PROVIDER_NAME[provider]}
                </div>
              ),
              onClick: () => setSelectedProvider(provider),
            }))}
            dropdownTriggerContent={
              <>
                <FileMusic className="h-4 w-4" />
                <ChevronDown />
              </>
            }
          />
        </form>

        {loading && (
          <div className="text-center space-y-2">
            <Loader2 className="inline-block animate-spin" />{" "}
            {t("search.searching")}
          </div>
        )}

        {error && (
          <div
            className="p-3 border border-destructive/40 rounded-md bg-destructive/10 text-destructive text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        {!loading && !error && results === null && (
          <p className="text-muted-foreground">
            {t("metadata.lyricsSearchPrompt")}
          </p>
        )}

        {!loading && !error && results !== null && results.length === 0 && (
          <p className="text-muted-foreground">
            {t("metadata.lyricsNoResults")}
          </p>
        )}

        {results && results.length > 0 && (
          <div className="grid sm:grid-cols-2 grid-cols-1 gap-4 min-h-0 flex-1">
            <div className="flex min-h-0 flex-col overflow-hidden rounded-md border">
              <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-2 p-2">
                {results.map((result, idx) => {
                  const lines = countLines(result);
                  return (
                    <button
                      key={result.id ?? idx}
                      type="button"
                      className={`text-left p-3 border rounded-md hover:bg-accent/30 hover:border-accent/50 ${
                        selected === result
                          ? "bg-accent/10 border-accent/30"
                          : ""
                      }`}
                      onClick={() => setSelected(result)}
                    >
                      <div className="font-medium">{result.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {result.artist}
                        {result.album ? ` — ${result.album}` : ""}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="gap-1 tabular-nums text-accent"
                        >
                          <Target className="size-3" />
                          {t("metadata.lyricsMatchScore", [
                            String(Math.round(result.matchScore * 100)),
                          ])}
                        </Badge>

                        {result.instrumental ? (
                          <Badge
                            variant="secondary"
                            className="gap-1 text-foreground"
                          >
                            <Music className="size-3" />
                            {t("metadata.lyricsInstrumental")}
                          </Badge>
                        ) : result.syncedLyrics ? (
                          <Badge
                            variant="secondary"
                            className="gap-1 text-accent"
                          >
                            <Clock className="size-3" />
                            {t("metadata.lyricsSyncedTiming", [
                              formatLength(result.duration),
                            ])}
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="gap-1 text-foreground"
                          >
                            <FileMusic className="size-3" />
                            {t("metadata.lyricsPlain")}
                          </Badge>
                        )}

                        {result.hasWordSync && (
                          <Badge
                            variant="secondary"
                            className="gap-1 text-foreground"
                          >
                            <Mic2 className="size-3" />
                            {t("metadata.lyricsWordSync")}
                          </Badge>
                        )}

                        {result.id !== undefined && (
                          <Badge
                            variant="outline"
                            className="gap-1 tabular-nums"
                          >
                            <Hash className="size-3" />
                            {t("metadata.lyricsRecordId", [String(result.id)])}
                          </Badge>
                        )}

                        {lines > 0 && (
                          <Badge
                            variant="outline"
                            className="gap-1 tabular-nums"
                          >
                            <ListMusic className="size-3" />
                            {t("metadata.lyricsLineCount", [String(lines)])}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
                </div>
              </ScrollArea>

              <div className="flex items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {t("metadata.lyricsResultsCount", [String(results.length)])}
                </span>
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1 border rounded-md">
              <div className="p-3">
                {!selected && (
                  <div className="text-muted-foreground">
                    {t("search.selectResult")}
                  </div>
                )}
                {selected?.instrumental && (
                  <div className="text-muted-foreground">
                    {t("metadata.lyricsInstrumental")}
                  </div>
                )}
                {selected && !selected.instrumental && selected.syncedLyrics && (
                  <div className="flex flex-col gap-0.5 text-sm">
                    {selected.syncedLyrics
                      .split("\n")
                      .filter((line) => line.trim() !== "")
                      .map((line, idx) => {
                        const { stamp, text } = splitLrcLine(line);
                        return (
                          <div key={idx} className="flex gap-2">
                            <span className="shrink-0 tabular-nums text-accent">
                              {stamp}
                            </span>
                            <span className="whitespace-pre-wrap">{text}</span>
                          </div>
                        );
                      })}
                  </div>
                )}
                {selected &&
                  !selected.instrumental &&
                  !selected.syncedLyrics &&
                  selected.plainLyrics && (
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {selected.plainLyrics}
                    </pre>
                  )}
                {selected &&
                  !selected.instrumental &&
                  !selected.syncedLyrics &&
                  !selected.plainLyrics && (
                    <div className="text-muted-foreground">
                      {t("metadata.lyricsNoResults")}
                    </div>
                  )}
              </div>
            </ScrollArea>
          </div>
        )}

        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 rounded-b-xl">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => selected && onLoadTimed?.(selected)}
            disabled={!selected?.syncedLyrics}
          >
            {t("metadata.lyricsLoadTimed")}
          </Button>
          <Button type="button" onClick={handleApply} disabled={!selected}>
            {t("metadata.lyricsApply")}
          </Button>
        </DialogFooter>
    </>
  );

  if (embedded) return content;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-4xl"
        overlayClassName="bg-black/40 backdrop-blur-sm"
      >
        {content}
      </DialogContent>
    </Dialog>
  );
}
