/**
 * Provider descriptors a declarative plugin can carry.
 *
 * A plugin that is not executable (no runtime, no entry file) declares what it
 * contributes instead. The host reads the descriptor and drives the provider
 * itself, so an installed plugin never runs third-party code to answer a
 * lookup. Today only lyrics providers are described here; the metadata and
 * source seams add their own shapes to the union as their hosts land.
 */

/** Query fields a plugin lyrics provider can forward to its endpoint. */
export type PluginLyricsQueryField = "title" | "artist" | "album" | "duration";

/**
 * Result field → JSON field name on a response record. `title` and `artist`
 * are required: a record without them cannot be shown or ranked.
 */
export interface PluginLyricsFieldMap {
  id?: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  plainLyrics?: string;
  syncedLyrics?: string;
  hasWordSync?: string;
  instrumental?: string;
}

/** How to search one lyrics endpoint and read its response. */
export interface PluginLyricsProviderDescriptor {
  /** Provider id, unique across built-in and plugin providers. */
  id: string;
  /** Display name, shown in the provider picker. */
  name: string;
  search: {
    /** Absolute `https://` endpoint. */
    url: string;
    /** Query field → request parameter name. */
    params?: Partial<Record<PluginLyricsQueryField, string>>;
    /** Extra request headers, e.g. a client identifier. */
    headers?: Record<string, string>;
    /** Dot path to the record array; omit when the response is the array. */
    resultsPath?: string;
    fields: PluginLyricsFieldMap;
  };
}

export type PluginProviderDescriptor = PluginLyricsProviderDescriptor;
