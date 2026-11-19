import { Fragment } from "react";
import type { ReactNode } from "react";
import { cn } from "cn";
import { ExplicitBadge } from "@/components/explicit-badge";
import { FavoriteButton } from "@/components/favorite-button";
import { attrList, attrString } from "@/core/themes";
import { usePlayback } from "@/hooks";
import { useTranslation } from "@/i18n";
import type { ElementProps } from "@/lib/themes/render/browser";
import type { Song } from "@/models";
import { formatTime } from "../PlaybackTime/PlaybackTime";
import { usePlaybackClock } from "../../shared/usePlaybackClock";
import { useThemeTextClass } from "../../shared/themeText";
import { WidgetFrame } from "../../shared/WidgetFrame";

/**
 * The fields a stacked arrangement keeps on the title line, ahead of the
 * trailing fields.
 */
const TITLE_LINE_FIELDS: readonly string[] = ["title", "explicit", "favorite"];

/**
 * The title and details of the current track, in the order `fields` lists
 * them. `stacked` puts the title above the details, `inline` keeps one row;
 * both truncate with an ellipsis. `trailing` places its fields right after
 * the title line. A centered `hAlign` centers stacked text. Nothing playing
 * shows a muted note.
 *
 * @example
 * ```xml
 * <TrackInfo fields="title explicit artist favorite" />
 * <TrackInfo fields="title" trailing="elapsedAndTotal" arrangement="inline" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={trackInfo} />
 * ```
 */
export function ThemeTrackInfo({ node, style }: ElementProps) {
  const { nowPlaying } = usePlayback();
  const { t } = useTranslation();
  const titleClass = useThemeTextClass(node, "titleText");
  const detailClass = useThemeTextClass(node, "detailText");

  const fields = attrList(node, "fields") ?? ["title", "artist"];
  const trailing = attrList(node, "trailing") ?? [];
  const inline = attrString(node, "arrangement") === "inline";
  const centered = attrString(node, "hAlign") === "center";
  const rest = fields.filter(
    (field) => !TITLE_LINE_FIELDS.includes(field) && !trailing.includes(field)
  );

  return (
    <WidgetFrame node={node} style={style}>
      {nowPlaying === undefined ? (
        <div className="flex w-full min-w-0 cursor-default select-none items-center gap-1.5">
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            {t("playback.nothingPlaying")}
          </span>
          <IdleTrailingFields fields={trailing} className={detailClass} />
        </div>
      ) : inline ? (
        <div className="flex w-full min-w-0 cursor-default select-none items-center gap-1.5">
          {fields.map((field) =>
            renderField(field, nowPlaying, titleClass, detailClass)
          )}
          <TrailingFields
            fields={trailing}
            song={nowPlaying}
            titleClass={titleClass}
            detailClass={detailClass}
          />
        </div>
      ) : (
        <div
          className={cn(
            "flex min-h-0 min-w-0 cursor-default select-none flex-col justify-center",
            centered && "items-center text-center"
          )}
        >
          <div
            className={cn(
              "flex min-w-0 items-center gap-1.5",
              centered && "justify-center"
            )}
          >
            {fields
              .filter((field) => TITLE_LINE_FIELDS.includes(field))
              .map((field) =>
                renderField(field, nowPlaying, titleClass, detailClass)
              )}
            <TrailingFields
              fields={trailing}
              song={nowPlaying}
              titleClass={titleClass}
              detailClass={detailClass}
            />
          </div>
          {rest.length === 0 ? null : (
            <div
              className={cn(
                "flex min-w-0 items-center gap-1.5",
                centered && "justify-center",
                detailClass
              )}
            >
              {rest.map((field, index) => (
                <Fragment key={field}>
                  {index === 0 ? null : <span aria-hidden="true">·</span>}
                  {renderField(field, nowPlaying, titleClass, detailClass)}
                </Fragment>
              ))}
            </div>
          )}
        </div>
      )}
    </WidgetFrame>
  );
}

/**
 * The `trailing` time fields while nothing plays: the same slots, drawn as
 * `--:--` so the line keeps its width and the time never jumps in.
 *
 * @example
 * ```xml
 * <TrackInfo fields="title" trailing="elapsedAndTotal" arrangement="inline" />
 * ```
 * @example
 * ```tsx
 * <IdleTrailingFields fields={["elapsedAndTotal"]} className="" />
 * ```
 */
function IdleTrailingFields({
  fields,
  className,
}: {
  fields: readonly string[];
  className: string;
}) {
  const texts = fields
    .map((field) => idleTimeText(field))
    .filter((text): text is string => text !== undefined);
  if (texts.length === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
      {texts.map((text, index) => (
        <span
          key={`${index}-${text}`}
          className={cn("shrink-0 tabular-nums", className)}
        >
          {text}
        </span>
      ))}
    </span>
  );
}

/**
 * The placeholder one time field shows while nothing plays, or undefined for
 * a field that is not a time.
 *
 * @example
 * ```xml
 * <TrackInfo fields="title" trailing="elapsedAndTotal" />
 * ```
 * @example
 * ```ts
 * idleTimeText("elapsedAndTotal"); // "--:-- / --:--"
 * idleTimeText("artist"); // undefined
 * ```
 */
function idleTimeText(field: string): string | undefined {
  switch (field) {
    case "elapsed":
    case "total":
    case "remaining":
      return "--:--";
    case "elapsedAndTotal":
      return "--:-- / --:--";
    default:
      return undefined;
  }
}

/**
 * The `trailing` fields, drawn right after the title.
 *
 * @example
 * ```xml
 * <TrackInfo fields="title" trailing="elapsedAndTotal" arrangement="inline" />
 * ```
 * @example
 * ```tsx
 * <TrailingFields fields={["elapsedAndTotal"]} song={song} titleClass="" detailClass="" />
 * ```
 */
function TrailingFields({
  fields,
  song,
  titleClass,
  detailClass,
}: {
  fields: readonly string[];
  song: Song;
  titleClass: string;
  detailClass: string;
}) {
  if (fields.length === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
      {fields.map((field) => renderField(field, song, titleClass, detailClass))}
    </span>
  );
}

/**
 * One time field of a `TrackInfo`, polled from the playback clock.
 *
 * @example
 * ```xml
 * <TrackInfo fields="title" trailing="remaining" />
 * ```
 * @example
 * ```tsx
 * <TrackInfoTime format="elapsedAndTotal" className="" />
 * ```
 */
function TrackInfoTime({
  format,
  className,
}: {
  format: string;
  className: string;
}) {
  const { nowPlaying, getDuration } = usePlayback();
  const elapsed = usePlaybackClock(1000);
  const duration = getDuration() || nowPlaying?.duration || 0;

  return (
    <span
      className={cn(
        "shrink-0 cursor-default select-none tabular-nums",
        className
      )}
    >
      {formatTime(format, elapsed, duration)}
    </span>
  );
}

/**
 * One entry of the `fields` or `trailing` list, drawn with the class its kind
 * uses.
 *
 * @example
 * ```xml
 * <TrackInfo fields="title genre year bitrate" />
 * ```
 * @example
 * ```tsx
 * renderField("year", song, titleClass, detailClass);
 * ```
 */
function renderField(
  field: string,
  song: Song,
  titleClass: string,
  detailClass: string
): ReactNode {
  switch (field) {
    case "title":
      return (
        <span key="title" className={cn(titleClass, "min-w-0 truncate")}>
          {song.title}
        </span>
      );
    case "explicit":
      return <ExplicitBadge key="explicit" song={song} />;
    case "favorite":
      return <FavoriteButton key="favorite" songId={song.id} />;
    case "artist":
      return textField("artist", song.artist, detailClass);
    case "album":
      return textField("album", song.album, detailClass);
    case "albumArtist":
      return textField("albumArtist", song.albumArtist, detailClass);
    case "genre":
      return textField("genre", song.genre, detailClass);
    case "year":
      return textField("year", song.year, detailClass);
    case "track":
      return textField("track", song.track, detailClass);
    case "disc":
      return textField("disc", song.discNumber, detailClass);
    case "bitrate":
      return textField(
        "bitrate",
        song.bitrate === undefined ? undefined : `${song.bitrate} kbps`,
        detailClass
      );
    case "elapsed":
    case "total":
    case "remaining":
    case "elapsedAndTotal":
      return (
        <TrackInfoTime key={field} format={field} className={detailClass} />
      );
    default:
      return null;
  }
}

/**
 * One text field, or nothing when the song has no value for it.
 *
 * @example
 * ```xml
 * <TrackInfo fields="albumArtist genre year" />
 * ```
 * @example
 * ```tsx
 * textField("genre", song.genre, detailClass);
 * ```
 */
function textField(
  key: string,
  value: string | number | undefined,
  className: string
): ReactNode {
  if (value === undefined || value === "") return null;
  return (
    <span key={key} className={cn(className, "truncate")}>
      {value}
    </span>
  );
}
