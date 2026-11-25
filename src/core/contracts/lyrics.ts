/**
 * Lyrics lookup contracts.
 *
 * A lyrics provider turns what the caller knows about a track into candidate
 * lyrics records; the UI ranks them and applies the one the user picks. These
 * shapes are provider-neutral, so a built-in provider and an installed plugin
 * provider return the same thing.
 */

/** What the caller knows about the track it wants lyrics for. */
export interface LyricsQuery {
  title: string;
  artist: string;
  album?: string;
  /** Track length in seconds. */
  duration?: number;
}

/** One lyrics record returned by a provider. */
export interface LyricsResult {
  /** Id of the provider that produced the record. */
  source: string;
  /** Provider-assigned record id, when the provider has one. */
  id?: number | string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  /** Plain text, one line per lyric line. */
  plainLyrics?: string;
  /** LRC text with `[mm:ss.xx]` timestamps, when the provider has it. */
  syncedLyrics?: string;
  /** True when the timestamps are per word rather than per line. */
  hasWordSync?: boolean;
  instrumental?: boolean;
}

/** Per-provider configuration, read from settings before a lookup. */
export interface LyricsServiceConfig {
  /** Registered application id, sent to providers that rate-limit per app. */
  applicationId?: string;
}

export interface LyricsLookupOptions {
  isCancelled?: () => boolean;
  reportProgress?: (progress: unknown) => void;
}

/**
 * The strategy every lyrics provider implements. A provider turns a track
 * query into candidate lyrics records; the UI decides which one to apply.
 */
export interface LyricsService {
  readonly provider: string;
  search(
    query: LyricsQuery,
    options?: LyricsLookupOptions
  ): Promise<LyricsResult[] | null>;
}

/** A provider the app can search, whether built in or installed as a plugin. */
export interface LyricsProviderDescriptor {
  /** Stable provider id, unique across built-in and plugin providers. */
  id: string;
  /** Display name, shown in the provider picker. */
  name: string;
  /** Resource key for the display name, when the provider ships one. */
  labelKey?: string;
  /** Resource key for a one-line description, when the provider ships one. */
  descriptionKey?: string;
  origin: "builtin" | "plugin";
  /** Installed plugin id, when `origin` is `"plugin"`. */
  pluginId?: string;
  /** True when the provider has settings the user can edit. */
  hasSettings?: boolean;
}
