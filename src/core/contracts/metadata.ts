/**
 * Online metadata lookup contracts.
 *
 * A metadata provider turns a free-text query into candidate song or album
 * records; the UI shows them and applies the one the user picks. These shapes
 * are provider-neutral, so a built-in provider and an installed plugin
 * provider return the same thing.
 *
 * The field names mirror the tag model, so a result can be applied to a song
 * without a per-provider translation table.
 */

/** A rating entry as a tag carries it. */
export interface MetadataRating {
  /** Normalized 0.0-1.0 (0 = unrated, 1.0 = five stars). */
  rating: number;
  email?: string;
  counter?: number;
}

/**
 * A cover picture on a lookup result.
 *
 * Search results carry only a thumbnail `url`; the full-size image is
 * downloaded when the result is applied, never during search.
 */
export interface MetadataPicture {
  mimeType: string;
  /** Raw image bytes. Absent when only the `url` thumbnail is known. */
  data?: Uint8Array;
  /** Thumbnail URL; the full-size image is fetched on apply. */
  url?: string;
  /** Artwork role, e.g. `"FrontCover"`. */
  type: string;
  description?: string;
}

/**
 * One song record returned by a metadata provider.
 *
 * Every tag field is optional: a provider fills what it knows and leaves the
 * rest out, and the apply step only writes the fields that are present.
 */
export interface MetadataResult {
  /** Id of the provider that produced the record. */
  source: string;

  title?: string;
  artist?: string;
  album?: string;
  comment?: string;
  genre?: string;
  year?: number;
  track?: number;
  /** Raw TRACKNUMBER, preserving zero-padding and a "/total" suffix. */
  trackNumber?: string;
  date?: string;

  albumArtist?: string;
  composer?: string;
  conductor?: string;
  copyright?: string;
  encodedBy?: string;
  isrc?: string;
  lyricist?: string;
  label?: string;
  subtitle?: string;
  producer?: string;
  originalArtist?: string;
  originalAlbum?: string;
  originalDate?: string;
  releaseType?: string;
  releaseCountry?: string;
  releaseStatus?: string;
  lyrics?: string;
  syncedLyrics?: string;

  titleSort?: string;
  artistSort?: string;
  albumSort?: string;
  albumArtistSort?: string;
  composerSort?: string;

  discNumber?: number;
  totalTracks?: number;
  totalDiscs?: number;
  bpm?: number;
  compilation?: boolean;

  acoustidFingerprint?: string;
  acoustidId?: string;
  musicbrainzTrackId?: string;
  musicbrainzReleaseId?: string;
  musicbrainzArtistId?: string;
  musicbrainzReleaseGroupId?: string;

  itunesAdvisory?: string;
  advisory?: "explicit" | "clean" | "unspecified";
  appleSoundCheck?: string;
  appleGaplessInfo?: string;

  replayGainTrackGain?: string;
  replayGainTrackPeak?: string;
  replayGainAlbumGain?: string;
  replayGainAlbumPeak?: string;
  r128TrackGain?: number;
  r128AlbumGain?: number;

  pictures?: MetadataPicture[];
  ratings?: MetadataRating[];

  /** Duration in seconds. */
  duration?: number;
}

/** One track of a looked-up album. */
export interface AlbumMetadataTrack {
  title: string;
  track?: number;
  discNumber?: number;
  duration?: number;
}

/**
 * Album-level result of an online album lookup.
 *
 * Search returns the album fields and a thumbnail only; `tracks` is filled by
 * the track lookup that runs when the result is applied.
 */
export interface AlbumMetadataResult {
  /** Id of the provider that produced the record. */
  source: string;
  /** Provider id used to fetch the track list on Apply. */
  id: string;
  title: string;
  artist?: string;
  albumArtist?: string;
  year?: number;
  genre?: string;
  trackCount?: number;
  pictures?: MetadataPicture[];
  /** Present once the track list has been fetched. */
  tracks?: AlbumMetadataTrack[];
}

/** Cancellation and progress hooks a long lookup may honour. */
export interface MetadataLookupOptions {
  isCancelled?: () => boolean;
  reportProgress?: (progress: unknown) => void;
}

/** Per-provider configuration, read from settings before a lookup. */
export interface MetadataServiceConfig {
  /** Registered application id, sent to providers that rate-limit per app. */
  applicationId?: string;
}

/**
 * The strategy every song metadata provider implements.
 *
 * `query` is the provider-shaped search string. A provider that wants
 * structured fields splits it itself, which is why the panels build the query
 * per provider rather than passing an object.
 */
export interface MetadataService {
  readonly provider: string;
  lookup(
    query: string,
    options?: MetadataLookupOptions
  ): Promise<MetadataResult[] | null>;
}

/** The strategy every album metadata provider implements. */
export interface AlbumMetadataService {
  readonly provider: string;
  searchAlbums(query: string): Promise<AlbumMetadataResult[] | null>;
  lookupAlbumTracks(
    album: AlbumMetadataResult
  ): Promise<AlbumMetadataResult | null>;
  /** Cover art only, for the album-art picker grid. */
  searchAlbumArt(query: string): Promise<MetadataPicture[] | null>;
}

/** A provider the app can search, whether built in or installed as a plugin. */
export interface MetadataProviderDescriptor {
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
  /**
   * True when the provider also answers album lookups.
   *
   * A song-only provider is still listed, but the album panels skip it.
   */
  hasAlbumLookup?: boolean;
}
