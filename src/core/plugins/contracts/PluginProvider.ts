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

/** Query fields a plugin metadata provider can forward to its endpoint. */
export type PluginMetadataQueryField = "title" | "artist" | "album";

/**
 * Result field → JSON field name on a response record. `title` and `artist`
 * are required: a record without them cannot be shown or applied.
 */
export interface PluginMetadataFieldMap {
  title: string;
  artist: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  year?: string;
  date?: string;
  track?: string;
  discNumber?: string;
  totalTracks?: string;
  totalDiscs?: string;
  duration?: string;
  isrc?: string;
  label?: string;
  composer?: string;
  coverArtUrl?: string;
}

/** Result field → JSON field name on a detail record; every key is optional. */
export type PluginMetadataDetailFieldMap = Partial<
  Omit<PluginMetadataFieldMap, "title" | "artist">
>;

/**
 * A second request per search record, for fields the search omits.
 *
 * `url` is a template over dot paths in the search record, e.g.
 * `https://api.spotify.com/v1/artists/{artists.0.id}`. Fields it maps fill only
 * the gaps the search left, so a search field always wins.
 *
 * @example
 * ```json
 * {
 *   "url": "https://api.spotify.com/v1/artists/{artists.0.id}",
 *   "fields": { "genre": "genres.0" }
 * }
 * ```
 */
export interface PluginMetadataDetailDescriptor {
  /** Absolute `https://` URL, or a template over the search record's paths. */
  url: string;
  headers?: Record<string, string>;
  fields: PluginMetadataDetailFieldMap;
}

/**
 * Album result field → JSON field name on a response record.
 *
 * `title` is required: a record without it cannot be shown. `year` reads a
 * date string and keeps its leading four digits.
 */
export interface PluginAlbumFieldMap {  /** Provider id for the album, used to fetch its track list. */
  id: string;
  title: string;
  artist?: string;
  albumArtist?: string;
  year?: string;
  genre?: string;
  trackCount?: string;
  coverArtUrl?: string;
}

/** Track field → JSON field name on a track-list record. */
export interface PluginAlbumTrackFieldMap {
  title: string;
  track?: string;
  discNumber?: string;
}

/**
 * How to search albums and list their tracks.
 *
 * Separate from `search` because an album lookup is a different request with
 * different fields. `tracks.url` is a template over `{id}`, the album id the
 * search returned, so the track list is fetched only when a result is applied.
 *
 * @example
 * ```json
 * {
 *   "url": "https://api.spotify.com/v1/search",
 *   "params": { "album": "q" },
 *   "query": { "type": "album" },
 *   "resultsPath": "albums.items",
 *   "fields": { "title": "name", "artist": "artists.0.name" },
 *   "tracks": {
 *     "url": "https://api.spotify.com/v1/albums/{id}/tracks",
 *     "resultsPath": "items",
 *     "fields": { "title": "name", "track": "track_number" }
 *   }
 * }
 * ```
 */
export interface PluginAlbumSearchDescriptor {
  /** Absolute `https://` endpoint. */
  url: string;
  /** Query field → request parameter name. */
  params?: Partial<Record<PluginMetadataQueryField, string>>;
  /** Literal parameters sent on every album search. */
  query?: Record<string, string>;
  /** Request method; defaults to GET. */
  method?: "GET" | "POST";
  /** Request body, expanded from settings. */
  body?: string;
  headers?: Record<string, string>;
  /** Dot path to the record array; omit when the response is the array. */
  resultsPath?: string;
  fields: PluginAlbumFieldMap;
  /**
   * A second request per album, for fields the search response omits.
   *
   * Spotify's album search returns no genre — it lives on the artist — so a
   * single dot-path map cannot reach it. `url` placeholders are dot paths read
   * from the album record, e.g. `{artists.0.id}`.
   */
  detail?: {
    /** Absolute `https://` URL, or a template over album fields. */
    url: string;
    /** Literal parameters sent on every detail request. */
    query?: Record<string, string>;
    headers?: Record<string, string>;
    /** Dot path to the record; omit when the response is the record. */
    resultsPath?: string;
    fields: Partial<Record<keyof PluginAlbumFieldMap, string>>;
  };
  /** Track list for one album; omit when the provider cannot list tracks. */
  tracks?: {
    /** Absolute `https://` URL, or a template using `{id}`. */
    url: string;
    /** Literal parameters sent on every track request. */
    query?: Record<string, string>;
    headers?: Record<string, string>;
    resultsPath?: string;
    fields: PluginAlbumTrackFieldMap;
  };
}

/**
 * How to obtain a bearer token before the search request.
 *
 * Some providers answer a search only with a token minted by a separate
 * endpoint: Spotify's client-credentials flow exchanges an id and secret for an
 * access token that expires after an hour. The host performs the token request,
 * reads the token out of the response, and sends it on the search request, so
 * the exchange stays declarative.
 *
 * @example
 * ```json
 * {
 *   "url": "https://accounts.spotify.com/api/token",
 *   "method": "POST",
 *   "headers": {
 *     "Content-Type": "application/x-www-form-urlencoded",
 *     "Authorization": "Basic {base64:credentials}"
 *   },
 *   "body": "grant_type=client_credentials",
 *   "tokenPath": "access_token"
 * }
 * ```
 */
export interface PluginMetadataAuthDescriptor {
  /** Absolute `https://` token endpoint. */
  url: string;
  /** Request method; defaults to `POST`. */
  method?: "GET" | "POST";
  /** Request headers, expanded from settings like the search headers. */
  headers?: Record<string, string>;
  /** Request body, expanded from settings. */
  body?: string;
  /** Dot path to the token in the response, e.g. `access_token`. */
  tokenPath: string;
  /** Header the token is sent in; defaults to `Authorization`. */
  header?: string;
  /** Prefix before the token; defaults to `Bearer `. */
  prefix?: string;
}

/**
 * How to search one metadata endpoint and read its response.
 *
 * `role` marks the descriptor as a metadata provider: a lyrics descriptor also
 * carries a `search` block, so the union needs an explicit discriminator.
 */
export interface PluginMetadataProviderDescriptor {
  role: "metadata";
  /** Provider id, unique across built-in and plugin providers. */
  id: string;
  /** Display name, shown in the provider picker. */
  name: string;
  description?: string;
  /** Album lookup; absent when the provider answers song searches only. */
  albumSearch?: PluginAlbumSearchDescriptor;
  search: {
    /** Absolute `https://` endpoint. */
    url: string;
    /** Query field → request parameter name. */
    params?: Partial<Record<PluginMetadataQueryField, string>>;
    /**
     * Literal query parameters sent verbatim on every search.
     *
     * Providers that require a fixed discriminator need this: Apple Music
     * rejects a search without `types`, Spotify without `type`.
     */
    query?: Record<string, string>;
    /** Request method; defaults to `GET`. */
    method?: "GET" | "POST";
    /** Request body for a `POST` search, expanded from settings. */
    body?: string;
    /** Extra request headers, e.g. a client identifier. */
    headers?: Record<string, string>;
    /** Dot path to the record array; omit when the response is the array. */
    resultsPath?: string;
    fields: PluginMetadataFieldMap;
    /**
     * A second request per record, for fields the search response omits.
     *
     * Spotify returns no genre on a track: `genres` only exists on
     * `GET /artists/{id}`. `url` is a template over dot paths in the search
     * record, so `{artists.0.id}` reads the first artist's id. Mapped fields
     * fill only the gaps the search left, so a search field always wins.
     */
    detail?: PluginMetadataDetailDescriptor;
    /**
     * Follow the response's own `next` link, up to this many pages in total.
     *
     * Spotify and Apple Music paginate: a search returns `limit` records plus a
     * `next` URL. `next` is read as a sibling of `resultsPath`, so
     * `tracks.items` looks for `tracks.next`. Defaults to 1, meaning the first
     * page only.
     */
    maxPages?: number;
  };
  /** Token exchange performed before the search request. */
  auth?: PluginMetadataAuthDescriptor;
}

export type PluginProviderDescriptor =
  | PluginLyricsProviderDescriptor
  | PluginSourceProviderDescriptor
  | PluginMetadataProviderDescriptor;

/** True when the descriptor describes a metadata provider. */
export function isPluginMetadataProvider(
  provider: PluginProviderDescriptor
): provider is PluginMetadataProviderDescriptor {
  return (provider as { role?: string }).role === "metadata";
}

/** True when the descriptor describes a lyrics provider. */
export function isPluginLyricsProvider(
  provider: PluginProviderDescriptor
): provider is PluginLyricsProviderDescriptor {
  return !isPluginMetadataProvider(provider) && "search" in provider;
}

/** True when the descriptor describes a music source. */
export function isPluginSourceProvider(
  provider: PluginProviderDescriptor
): provider is PluginSourceProviderDescriptor {
  return "library" in provider;
}
