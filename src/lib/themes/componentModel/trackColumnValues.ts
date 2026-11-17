/**
 * The song columns a `table` TrackList can show. These are the allowed values
 * of its `columns` attribute (an ordered, space-separated subset; default
 * `title album artist track genre year duration bitrate offline`) and of
 * `sortBy`, which must also appear in `columns`. A `sortBy` outside
 * `columns` is `E6203`; a column listed twice is `E4004`.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="track title artist album duration offline" sortBy="track" />
 * ```
 * @example
 * ```ts
 * const columns = attribute.split(" ");
 * const sortable = columns.includes(sortBy);
 * ```
 */
export const TRACK_COLUMN_VALUES = [
  "title",
  "album",
  "artist",
  "albumArtist",
  "track",
  "disc",
  "genre",
  "year",
  "duration",
  "bitrate",
  "offline",
  "source",
] as const;
