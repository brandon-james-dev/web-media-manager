import type { IPicture } from "@/lib/contracts/IPicture";

export interface MetadataRating {
  /** Normalized 0.0-1.0 (0 = unrated, 1.0 = five stars). */
  rating: number;
  email?: string;
  counter?: number;
}

/**
 * Base shape of everything the tags and audio stream of a file describe. It
 * mirrors taglib-wasm's `ExtendedTag` and `AudioProperties`, so a field has
 * the same name here as in the library. Differences: multi-valued text fields
 * are flattened to their first value, `lyrics` is the unsynced text, and the
 * raw escape hatches (`id3v2Frames`, `chapters`, `bext`, `ixml`) are left out.
 *
 * It carries only what the file itself says. What the application knows about
 * the file (where it came from, when it was imported or changed) belongs on
 * the types that extend it, such as `Song`.
 *
 * Declared as a class so subclasses can inherit the fields, but it is never
 * instantiated: songs stay plain objects so they survive structured cloning
 * between the worker, the main thread and IndexedDB.
 */
export class Metadata {
  title?: string;
  artist?: string;
  album?: string;
  comment?: string;
  genre?: string;
  year?: number;
  track?: number;
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
  lyrics?: string;

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

  pictures?: IPicture[];
  ratings?: MetadataRating[];

  /** Duration in seconds. */
  duration?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  codec?: string;
  containerFormat?: string;
  isLossless?: boolean;
  bitrateMode?: string;
  mpegVersion?: number;
  mpegLayer?: number;
  isEncrypted?: boolean;
  formatVersion?: number;
  outputGainDb?: number;
}

export const AUDIO_PROPERTY_KEYS = [
  "duration",
  "bitrate",
  "sampleRate",
  "channels",
  "bitsPerSample",
  "codec",
  "containerFormat",
  "isLossless",
  "bitrateMode",
  "mpegVersion",
  "mpegLayer",
  "isEncrypted",
  "formatVersion",
  "outputGainDb",
] as const;
