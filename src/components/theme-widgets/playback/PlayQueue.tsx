import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "cn";
import { AlbumArtImage } from "@/components/album-art-image";
import { ExplicitBadge } from "@/components/explicit-badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getStore } from "@/core/system";
import { wmmBus } from "@/events";
import { usePlayback } from "@/hooks";
import { RepeatState, ShuffleState } from "@/hooks/usePlayback";
import { useTranslation } from "@/i18n";
import { ThumbnailSize } from "@/lib";
import {
  attrBool,
  attrRef,
  attrString,
  THEME_ICONS,
} from "@/lib/themes/render";
import type { ElementProps } from "@/lib/themes/render/browser";
import { useThemeRender } from "@/lib/themes/render/browser";
import type { Song } from "@/models";
import { useThemeTextClass } from "../shared/themeText";
import { WidgetFrame } from "../shared/WidgetFrame";

/**
 * The play queue: the current song and the ones after it. `inline` lists the
 * rows inside the widget, `popover` puts them behind a themed button. Rows
 * play a song on click and carry a remove action; `upNext` shows the next
 * song of the current collection while the queue is empty.
 *
 * @example
 * ```xml
 * <PlayQueue presentation="popover" artwork="true" clearButton="true" />
 * <PlayQueue column="1" artwork="true" upNext="true" headerText="@text/pane-header" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={playQueue} />
 * ```
 */
export function ThemePlayQueue({ node, style }: ElementProps) {
  const { stylesheet } = useThemeRender();
  const { playlist, nowPlayingIndex } = usePlayback();
  const { t } = useTranslation();
  const rowClass = useThemeTextClass(node, "rowText");
  const detailClass = useThemeTextClass(node, "detailText");
  const headerClass = useThemeTextClass(node, "headerText");

  const showArtwork = attrBool(node, "artwork") ?? false;
  const showClear = attrBool(node, "clearButton") ?? false;
  const upNext = useUpNextSong(attrBool(node, "upNext") ?? false);

  const buttonId = attrRef(node, "button", "button");
  const buttonClass =
    buttonId === undefined
      ? stylesheet.defaults.button
      : (stylesheet.classes.button[buttonId] ?? stylesheet.defaults.button);

  const rows =
    nowPlayingIndex === undefined || nowPlayingIndex < 0
      ? playlist
      : playlist.slice(nowPlayingIndex);
  const list = (
    <QueueList
      rows={rows}
      currentId={rows[0]?.id}
      showArtwork={showArtwork}
      rowClass={rowClass}
      detailClass={detailClass}
    />
  );

  if (attrString(node, "presentation") === "popover") {
    const QueueIcon = THEME_ICONS.queue;
    return (
      <WidgetFrame node={node} style={style}>
        <Popover>
          <PopoverTrigger
            disabled={playlist.length === 0}
            render={
              <button
                type="button"
                className={cn(buttonClass, "shrink-0")}
                aria-label={t("playback.queue")}
                disabled={playlist.length === 0}
              >
                <QueueIcon
                  aria-hidden
                  style={{
                    width: "var(--wmm-icon-size, 1em)",
                    height: "var(--wmm-icon-size, 1em)",
                  }}
                />
              </button>
            }
          />
          <PopoverContent align="end" className="w-80 select-none">
            <div className="flex h-80 flex-col gap-2">
              <QueueHeader
                count={playlist.length}
                showClear={showClear}
                headerClass={headerClass}
              />
              {list}
            </div>
          </PopoverContent>
        </Popover>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame node={node} style={style}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        <QueueHeader
          count={playlist.length}
          showClear={showClear}
          headerClass={headerClass}
        />
        {rows.length === 0 && upNext !== undefined ? (
          <div className="flex min-h-0 min-w-0 flex-col gap-1">
            <span className={cn(headerClass, "truncate")}>
              {t("playback.upNext")}
            </span>
            <QueueList
              rows={[upNext]}
              currentId={undefined}
              showArtwork={showArtwork}
              rowClass={rowClass}
              detailClass={detailClass}
            />
          </div>
        ) : (
          list
        )}
      </div>
    </WidgetFrame>
  );
}

/** The queue's heading row: the song count and the optional Clear action. */
function QueueHeader({
  count,
  showClear,
  headerClass,
}: {
  readonly count: number;
  readonly showClear: boolean;
  readonly headerClass: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex shrink-0 items-center justify-between gap-2">
      <span className={cn(headerClass, "truncate")}>
        {t("playback.queueHeading", [count])}
      </span>
      {showClear ? (
        <button
          type="button"
          className="shrink-0 rounded-md px-2 py-1 text-xs hover:bg-accent/15"
          onClick={() => wmmBus.invoke("wmm.playback.clearQueue")}
        >
          {t("common.clear")}
        </button>
      ) : null}
    </div>
  );
}

/** The scrollable rows of the queue. */
function QueueList({
  rows,
  currentId,
  showArtwork,
  rowClass,
  detailClass,
}: {
  readonly rows: readonly Song[];
  readonly currentId: string | undefined;
  readonly showArtwork: boolean;
  readonly rowClass: string;
  readonly detailClass: string;
}) {
  const { t } = useTranslation();
  return (
    <ol className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
      {rows.map((song, index) => (
        <li key={song.id}>
          <div
            className={cn(
              "group flex min-w-0 items-center gap-2 rounded-md px-1 py-1",
              song.id === currentId && "bg-accent/15"
            )}
            data-current={song.id === currentId ? "" : undefined}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() =>
                wmmBus.invoke("wmm.playback.playSong", { songId: song.id })
              }
            >
              {showArtwork ? (
                <AlbumArtImage
                  songId={song.id}
                  thumbSize={ThumbnailSize.thumb64}
                  className="size-8 shrink-0 rounded"
                  fallback={
                    <span className="block size-8 shrink-0 rounded bg-muted" />
                  }
                />
              ) : (
                <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={cn(
                    rowClass,
                    "flex min-w-0 items-center gap-1.5 truncate"
                  )}
                >
                  <span className="truncate">{song.title}</span>
                  <ExplicitBadge song={song} />
                </span>
                <span className={cn(detailClass, "block truncate")}>
                  {song.artist}
                </span>
              </span>
            </button>
            <button
              type="button"
              className="shrink-0 rounded-md p-1 opacity-0 group-hover:opacity-100 hover:bg-accent/15 [@media(hover:none)]:opacity-100"
              aria-label={t("common.remove")}
              onClick={() =>
                wmmBus.invoke("wmm.playback.removeFromQueue", {
                  songId: song.id,
                })
              }
            >
              <X className="size-3.5" />
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** The next song of the current collection, while the queue is empty. */
function useUpNextSong(enabled: boolean): Song | undefined {
  const { playlist, nowPlaying, shuffle, repeat, getCollectionIds } =
    usePlayback();
  const [song, setSong] = useState<Song | undefined>(undefined);

  const nextId = (() => {
    if (!enabled || playlist.length > 0 || nowPlaying === undefined) {
      return undefined;
    }
    if (shuffle === ShuffleState.On) return undefined;
    const ids = getCollectionIds();
    const index = ids.indexOf(nowPlaying.id);
    if (index === -1) return undefined;
    if (index + 1 < ids.length) return ids[index + 1];
    return repeat === RepeatState.All ? ids[0] : undefined;
  })();

  useEffect(() => {
    if (nextId === undefined) {
      setSong(undefined);
      return;
    }
    let cancelled = false;
    void getStore()
      .get(nextId)
      .then((found) => {
        if (!cancelled) setSong(found ?? undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [nextId]);

  return song;
}
