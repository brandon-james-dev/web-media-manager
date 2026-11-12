import {
  applyPictures,
  applyTags,
  type Picture,
  type TagInput,
} from "taglib-wasm";
import { getTagLib } from "taglib-wasm/simple";
import type { Song } from "@/models/Song";
import type { MetadataRating } from "@/lib/metadata/Metadata";
import type { IMetadataWriter } from "@/lib/contracts/IMedataWriter";
import { resizeBitmap } from "@/lib/metadata/artwork/resizeBitmap";

const TAGLIB_RAW_TOP_RATING = 255;

function toTaglibRating(rating: MetadataRating): MetadataRating {
  return rating.rating >= 1
    ? { ...rating, rating: TAGLIB_RAW_TOP_RATING }
    : rating;
}

export class TagLibMetadataWriter implements IMetadataWriter {
  async writeTags(file: File, tags: Partial<Song>): Promise<Uint8Array> {
    const taglibPictures: Picture[] = [];

    if (tags.pictures && tags.pictures.length > 0) {
      const seen = new Map<string, Picture>();

      for (const pic of tags.pictures) {
        const type = pic.type === "FrontCover" ? "FrontCover" : "BackCover";

        if (!seen.has(type)) {
          const sourceBlob = new Blob([pic.data!.slice()], {
            type: pic.mimeType,
          });

          const bitmap = await createImageBitmap(sourceBlob);

          try {
            const resizedBlob = await resizeBitmap(bitmap, 512);

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
      }

      taglibPictures.push(...seen.values());
    }

    delete tags.pictures;

    const tagFields: Partial<Song> = {
      title: tags.title,
      artist: tags.artist,
      album: tags.album,
      albumArtist: tags.albumArtist,
      genre: tags.genre,
      comment: tags.comment,
      composer: tags.composer,
      year: tags.year,
      track: tags.track,
      totalTracks: tags.totalTracks,
      discNumber: tags.discNumber,
      lyrics: tags.lyrics,
      copyright: tags.copyright,
      encodedBy: tags.encodedBy,
      bpm: tags.bpm,
      isrc: tags.isrc,
      date: tags.date,
      conductor: tags.conductor,
      lyricist: tags.lyricist,
      label: tags.label,
      subtitle: tags.subtitle,
      producer: tags.producer,
      originalArtist: tags.originalArtist,
      originalAlbum: tags.originalAlbum,
      originalDate: tags.originalDate,
      releaseType: tags.releaseType,
      titleSort: tags.titleSort,
      artistSort: tags.artistSort,
      albumSort: tags.albumSort,
      albumArtistSort: tags.albumArtistSort,
      composerSort: tags.composerSort,
      totalDiscs: tags.totalDiscs,
      compilation: tags.compilation,
      musicbrainzTrackId: tags.musicbrainzTrackId,
      musicbrainzReleaseId: tags.musicbrainzReleaseId,
      musicbrainzArtistId: tags.musicbrainzArtistId,
      musicbrainzReleaseGroupId: tags.musicbrainzReleaseGroupId,
    };

    const textUpdatedBytes = await applyTags(
      file,
      tagFields as Partial<TagInput>
    );

    let updatedFile = new File([textUpdatedBytes.slice().buffer], file.name, {
      type: file.type,
    });

    const clearedBytes = await applyPictures(updatedFile, []);

    updatedFile = new File([clearedBytes.slice().buffer], file.name, {
      type: file.type,
    });

    let finalBytes = clearedBytes;

    if (taglibPictures.length > 0) {
      finalBytes = await applyPictures(updatedFile, taglibPictures);
    }

    return finalBytes;
  }

  async writeRatings(
    file: File,
    ratings: MetadataRating[]
  ): Promise<Uint8Array> {
    const taglib = await getTagLib();
    const audioFile = await taglib.open(file, { partial: false });

    try {
      if (!audioFile.isValid()) throw new Error("Unsupported audio file");
      audioFile.setRatings(ratings.map(toTaglibRating));
      if (!audioFile.save()) throw new Error("Could not save the rating");
      return audioFile.getFileBuffer();
    } finally {
      audioFile.dispose();
    }
  }
}
