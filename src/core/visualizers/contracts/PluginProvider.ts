/**
 * Provider descriptors a declarative plugin can carry.
 *
 * A plugin that is not executable (no runtime, no entry file) declares what it
 * contributes instead. The host reads the descriptor and drives the provider
 * itself, so an installed plugin never runs third-party code to answer a
 * lookup or read a library. Lyrics providers and music sources are described
 * here; the metadata seam adds its own shape to the union as its host lands.
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

/**
 * Library record field → JSON field name. `id`, `title` and `artist` are
 * required: a record without them cannot become a song.
 */
export interface PluginSourceFieldMap {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumArtist?: string;
  duration?: string;
  track?: string;
  discNumber?: string;
  genre?: string;
  year?: string;
  bitrate?: string;
  fileSize?: string;
  path?: string;
  streamUrl?: string;
  coverArtUrl?: string;
}

/** One value the add form collects before the source is created. */
export interface PluginSourceConfigField {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  /**
   * Render as a password input and keep the value out of the source record:
   * the host stores it in the platform secret store, keyed by source id.
   */
  secret?: boolean;
}

/**
 * How to read one music source's library and stream its songs.
 *
 * `url` templates may reference `{baseUrl}` (the configured base URL) and, for
 * `stream`, `{id}` and `{path}` from the record being played.
 */
export interface PluginSourceProviderDescriptor {
  /** Provider id, unique across built-in and plugin source kinds. */
  id: string;
  /** Display name, shown on the add-source card. */
  name: string;
  description?: string;
  /** Values the add form collects; each becomes a config entry. */
  config?: PluginSourceConfigField[];
  library: {
    /** Absolute `https://` endpoint, or a template using `{baseUrl}`. */
    url: string;
    /** Request method; defaults to GET. WebDAV listings use PROPFIND. */
    method?: "GET" | "PROPFIND";
    /** Request body sent with the listing request, e.g. a WebDAV propfind. */
    body?: string;
    headers?: Record<string, string>;
    /** Dot path to the record array; omit when the response is the array. */
    resultsPath?: string;
    /**
     * XML record element name. When set, the response is parsed as XML and
     * each element with this tag becomes a record; field mappings then name
     * child element local names instead of JSON paths.
     */
    recordTag?: string;
    fields: PluginSourceFieldMap;
  };
  stream?: {
    /** Absolute `https://` URL, or a template using `{baseUrl}`/`{id}`/`{path}`. */
    url: string;
    headers?: Record<string, string>;
  };
}

export type PluginProviderDescriptor =
  | PluginLyricsProviderDescriptor
  | PluginSourceProviderDescriptor;

/** True when the descriptor describes a lyrics provider. */
export function isPluginLyricsProvider(
  provider: PluginProviderDescriptor
): provider is PluginLyricsProviderDescriptor {
  return "search" in provider;
}

/** True when the descriptor describes a music source. */
export function isPluginSourceProvider(
  provider: PluginProviderDescriptor
): provider is PluginSourceProviderDescriptor {
  return "library" in provider;
}
