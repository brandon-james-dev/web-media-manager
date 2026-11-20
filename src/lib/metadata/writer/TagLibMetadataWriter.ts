import {
  applyPictures,
  applyTags,
  getTagLib,
  type Picture,
  type TagInput,
} from "taglib-wasm/simple";
import type { Song } from "@/models/Song";
import type { MetadataRating } from "@/lib/metadata/Metadata";
import type { ITagData } from "@/lib/contracts/ITagData";
import type { IMetadataWriter } from "@/lib/contracts/IMedataWriter";
import { resizeBitmap } from "@/lib/metadata/artwork/resizeBitmap";
import { toId3v23 } from "./toId3v23";

const TAGLIB_RAW_TOP_RATING = 255;

function toTaglibRating(rating: MetadataRating): MetadataRating {
  return rating.rating >= 1
    ? { ...rating, rating: TAGLIB_RAW_TOP_RATING }
    : rating;
}

/**
 * Projects the app's flattened tag fields onto taglib-wasm's `TagInput`.
 *
 * Typed as `Partial<TagInput>` rather than cast, so a field the library drops
 * or renames fails the build instead of being silently ignored on write.
 * Structured fields (pictures, ratings, lyrics) ride their own accessors and
 * are handled separately.
 */
function toTagInput(tags: Partial<ITagData>): Partial<TagInput> {
  return {
    title: tags.title,
    artist: tags.artist,
    album: tags.album,
    comment: tags.comment,
    genre: tags.genre,
    year: tags.year,
    date: tags.date,
    track: tags.track,
    trackNumber: tags.trackNumber,
    discNumber: tags.discNumber,
    totalTracks: tags.totalTracks,
    totalDiscs: tags.totalDiscs,
    bpm: tags.bpm,
    compilation: tags.compilation,

    albumArtist: tags.albumArtist,
    composer: tags.composer,
    conductor: tags.conductor,
    copyright: tags.copyright,
    encodedBy: tags.encodedBy,
    isrc: tags.isrc,
    lyricist: tags.lyricist,
    label: tags.label,
    subtitle: tags.subtitle,
    producer: tags.producer,
    originalArtist: tags.originalArtist,
    originalAlbum: tags.originalAlbum,
    originalDate: tags.originalDate,
    releaseType: tags.releaseType,
    releaseCountry: tags.releaseCountry,
    releaseStatus: tags.releaseStatus,

    titleSort: tags.titleSort,
    artistSort: tags.artistSort,
    albumSort: tags.albumSort,
    albumArtistSort: tags.albumArtistSort,
    composerSort: tags.composerSort,

    acoustidFingerprint: tags.acoustidFingerprint,
    acoustidId: tags.acoustidId,
    musicbrainzTrackId: tags.musicbrainzTrackId,
    musicbrainzReleaseId: tags.musicbrainzReleaseId,
    musicbrainzArtistId: tags.musicbrainzArtistId,
    musicbrainzReleaseGroupId: tags.musicbrainzReleaseGroupId,

    itunesAdvisory: tags.itunesAdvisory,
    advisory: tags.advisory,
    appleSoundCheck: tags.appleSoundCheck,
    appleGaplessInfo: tags.appleGaplessInfo,

    replayGainTrackGain: tags.replayGainTrackGain,
    replayGainTrackPeak: tags.replayGainTrackPeak,
    replayGainAlbumGain: tags.replayGainAlbumGain,
    replayGainAlbumPeak: tags.replayGainAlbumPeak,
    r128TrackGain: tags.r128TrackGain,
    r128AlbumGain: tags.r128AlbumGain,
  };
}

export class TagLibMetadataWriter implements IMetadataWriter {
  async writeTags(file: File, tags: Partial<ITagData>): Promise<Uint8Array> {
    const pictures = await this.toTaglibPictures(tags.pictures);

    const textBytes = await applyTags(file, toTagInput(tags));

    let updatedFile = new File([textBytes.slice().buffer], file.name, {
      type: file.type,
    });

    // Lyrics and ratings are structured properties: `applyTags` only carries
    // text fields, so they have to go through their own accessors. Timed lyrics
    // are stored as LRC in the same accessor, so they win when present: the LRC
    // text already carries every plain line.
    if (
      tags.lyrics !== undefined ||
      tags.syncedLyrics !== undefined ||
      tags.ratings !== undefined
    ) {
      const structuredBytes = await this.writeStructured(updatedFile, {
        lyrics: tags.syncedLyrics?.trim() ? tags.syncedLyrics : tags.lyrics,
        ratings: tags.ratings,
      });

      updatedFile = new File([structuredBytes.slice().buffer], file.name, {
        type: file.type,
      });
    }

    // Replaces the whole picture set, so an empty list clears it.
    return toId3v23(await applyPictures(updatedFile, pictures));
  }

  async writeRatings(
    file: File,
    ratings: MetadataRating[]
  ): Promise<Uint8Array> {
    return toId3v23(await this.writeStructured(file, { ratings }));
  }

  /**
   * Writes the properties that ride their own accessors. One open/save pass
   * covers both, so a save that changes lyrics and ratings rewrites the file
   * once rather than twice.
   */
  private async writeStructured(
    file: File,
    updates: { lyrics?: string; ratings?: MetadataRating[] }
  ): Promise<Uint8Array> {
    const taglib = await getTagLib();
    const audioFile = await taglib.open(file, { partial: false });

    try {
      if (!audioFile.isValid()) throw new Error("Unsupported audio file");

      if (updates.lyrics !== undefined) {
        audioFile.setLyrics(
          updates.lyrics ? [{ text: updates.lyrics }] : []
        );
      }

      if (updates.ratings !== undefined) {
        audioFile.setRatings(updates.ratings.map(toTaglibRating));
      }

      if (!audioFile.save()) throw new Error("Could not save the metadata");
      return audioFile.getFileBuffer();
    } finally {
      audioFile.dispose();
    }
  }

  /** Resizes the front and back covers to the embedded 512px size. */
  private async toTaglibPictures(
    pictures: Song["pictures"]
  ): Promise<Picture[]> {
    if (!pictures || pictures.length === 0) return [];

    const seen = new Map<string, Picture>();

    for (const pic of pictures) {
      const type = pic.type === "FrontCover" ? "FrontCover" : "BackCover";

      if (seen.has(type)) continue;

      const sourceBlob = new Blob([pic.data!.slice()], {
        type: pic.mimeType,
      });

      const bitmap = await createImageBitmap(sourceBlob);

      try {
        const resizedBlob = await resizeBitmap(bitmap, 512, "image/jpeg");

        seen.set(type, {
          mimeType: resizedBlob.type,
          data: new Uint8Array(await resizedBlob.arrayBuffer()),
          type,
          description: type === "FrontCover" ? "Front Cover" : "Back Cover",
        });
      } finally {
        bitmap.close();
      }
    }

    return [...seen.values()];
  }
}
