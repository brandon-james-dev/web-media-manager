import type { AudioProperties, ExtendedTag } from "taglib-wasm/simple";

import type { IAudioProperties, ITagData } from "@/lib/contracts";
import { splitTimedLyrics } from "@/lib/lyrics";

function first(value: string[] | string | undefined): string | undefined {
  return Array.isArray(value) ? value.at(0) : value;
}

export function mapTags(
  tags: ExtendedTag | undefined,
  filename: string
): ITagData {
  // Timed lyrics live in the ordinary lyrics tag as LRC, so the tag is split
  // into its plain and timed halves here rather than downstream.
  const lyrics = splitTimedLyrics(tags?.lyrics?.at(0)?.text);

  return {
    title: first(tags?.title) ?? filename,
    artist: first(tags?.artist),
    album: first(tags?.album),
    comment: first(tags?.comment),
    genre: first(tags?.genre),
    year: tags?.year,
    track: tags?.track,
    trackNumber: first(tags?.trackNumber),
    date: first(tags?.date),

    albumArtist: first(tags?.albumArtist),
    composer: first(tags?.composer),
    conductor: first(tags?.conductor),
    copyright: first(tags?.copyright),
    encodedBy: first(tags?.encodedBy),
    isrc: first(tags?.isrc),
    lyricist: first(tags?.lyricist),
    label: first(tags?.label),
    subtitle: first(tags?.subtitle),
    producer: first(tags?.producer),
    originalArtist: first(tags?.originalArtist),
    originalAlbum: first(tags?.originalAlbum),
    originalDate: first(tags?.originalDate),
    releaseType: first(tags?.releaseType),
    releaseCountry: first(tags?.releaseCountry),
    releaseStatus: first(tags?.releaseStatus),
    lyrics: lyrics.lyrics,
    syncedLyrics: lyrics.syncedLyrics,

    titleSort: first(tags?.titleSort),
    artistSort: first(tags?.artistSort),
    albumSort: first(tags?.albumSort),
    albumArtistSort: first(tags?.albumArtistSort),
    composerSort: first(tags?.composerSort),

    discNumber: tags?.discNumber,
    totalTracks: tags?.totalTracks,
    totalDiscs: tags?.totalDiscs,
    bpm: tags?.bpm,
    compilation: tags?.compilation,

    acoustidFingerprint: first(tags?.acoustidFingerprint),
    acoustidId: first(tags?.acoustidId),
    musicbrainzTrackId: first(tags?.musicbrainzTrackId),
    musicbrainzReleaseId: first(tags?.musicbrainzReleaseId),
    musicbrainzArtistId: first(tags?.musicbrainzArtistId),
    musicbrainzReleaseGroupId: first(tags?.musicbrainzReleaseGroupId),

    itunesAdvisory: first(tags?.itunesAdvisory),
    advisory: tags?.advisory,
    appleSoundCheck: first(tags?.appleSoundCheck),
    appleGaplessInfo: first(tags?.appleGaplessInfo),

    replayGainTrackGain: first(tags?.replayGainTrackGain),
    replayGainTrackPeak: first(tags?.replayGainTrackPeak),
    replayGainAlbumGain: first(tags?.replayGainAlbumGain),
    replayGainAlbumPeak: first(tags?.replayGainAlbumPeak),
    r128TrackGain: tags?.r128TrackGain,
    r128AlbumGain: tags?.r128AlbumGain,

    pictures: tags?.pictures,
    ratings: tags?.ratings,
  };
}

export function mapProperties(props: AudioProperties): IAudioProperties {
  return {
    duration: props.duration,
    durationMs: props.durationMs,
    bitrate: props.bitrate,
    sampleRate: props.sampleRate,
    channels: props.channels,
    bitsPerSample: props.bitsPerSample,
    codec: props.codec,
    containerFormat: props.containerFormat,
    isLossless: props.isLossless,
    bitrateMode: props.bitrateMode,
    mpegVersion: props.mpegVersion,
    mpegLayer: props.mpegLayer,
    isEncrypted: props.isEncrypted,
    formatVersion: props.formatVersion,
    outputGainDb: props.outputGainDb,
  };
}
