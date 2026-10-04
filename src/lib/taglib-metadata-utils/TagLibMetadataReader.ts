import {
  readTags as taglibReadTags,
  readProperties as taglibReadProps,
  readMetadata as taglibReadMetadata,
  isValidAudioFile,
  type ExtendedTag,
  type AudioProperties,
} from "taglib-wasm/simple";

import type {
  IMetadataReader,
  ITagData,
  IAudioProperties,
  IMetadata,
} from "@/lib/metadata-utils";

export class TagLibMetadataReader implements IMetadataReader {
  async validate(file: File): Promise<boolean> {
    try {
      return await isValidAudioFile(file);
    } catch {
      return false;
    }
  }

  async readTags(file: File): Promise<ITagData | null> {
    try {
      const tags: ExtendedTag = await taglibReadTags(file);

      return {
        title: tags?.title?.at(0) ?? file.name,
        artist: tags?.artist?.at(0),
        album: tags?.album?.at(0),
        albumArtist: tags?.albumArtist?.at(0),
        genre: tags?.genre?.at(0),
        comment: tags?.comment?.at(0),
        composer: tags?.composer?.at(0),
        year: tags?.year,
        track: tags?.track,
        disc: tags?.discNumber,
        copyright: tags?.copyright?.at(0),
        encodedBy: tags?.encodedBy?.at(0),
        bpm: tags?.bpm,
        isrc: tags?.isrc?.at(0),
        mbTrackId: tags?.musicbrainzTrackId?.at(0),
        mbArtistId: tags?.musicbrainzArtistId?.at(0),
        mbReleaseGroupId: tags?.musicbrainzReleaseGroupId?.at(0),
        lyrics: tags?.lyrics?.at(0)?.text,
        pictures: tags?.pictures,
      } as ITagData;
    } catch {
      return null;
    }
  }

  async readProperties(file: File): Promise<IAudioProperties | null> {
    try {
      const props: AudioProperties = await taglibReadProps(file);

      return {
        length: props.duration,
        bitrate: props.bitrate,
        sampleRate: props.sampleRate,
        channels: props.channels,
      };
    } catch {
      return null;
    }
  }

  async readMetadata(file: File): Promise<IMetadata | null> {
    try {
      const { tags, properties } = await taglibReadMetadata(file);

      return {
        title: tags?.title?.at(0) ?? file.name,
        artist: tags?.artist?.at(0),
        album: tags?.album?.at(0),
        albumArtist: tags?.albumArtist?.at(0),
        genre: tags?.genre?.at(0),
        comment: tags?.comment?.at(0),
        composer: tags?.composer?.at(0),
        year: tags?.year,
        track: tags?.track,
        disc: tags?.discNumber,
        lyrics: tags?.lyrics?.at(0)?.text,
        copyright: tags?.copyright?.at(0),
        encodedBy: tags?.encodedBy?.at(0),
        bpm: tags?.bpm,
        isrc: tags?.isrc?.at(0),
        mbTrackId: tags?.musicbrainzTrackId?.at(0),
        mbArtistId: tags?.musicbrainzArtistId?.at(0),
        mbReleaseGroupId: tags?.musicbrainzReleaseGroupId?.at(0),
        length: properties?.duration,
        bitrate: properties?.bitrate,
        sampleRate: properties?.sampleRate,
        channels: properties?.channels,
        pictures: tags?.pictures,
      };
    } catch {
      return null;
    }
  }
}
