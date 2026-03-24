import { downloadImageBytes } from "@/lib/albumArt";
import { arrayBufferToBase64 } from "@/lib/utils";
import type { Id3FormValues } from "@/models";
import type { MusicResult } from "itunes-web-api";

export async function extractItunesMetadata(
  result: MusicResult,
): Promise<Id3FormValues> {
  const year = result.releaseDate
    ? new Date(result.releaseDate).getFullYear()
    : undefined;

  const bestQualityAlbumArt = result.artworkUrl100.replace(
    "100x100bb",
    "2160x2160bb",
  );

  const imageBytes = await downloadImageBytes(bestQualityAlbumArt);
  const imageBlob = new Blob([imageBytes] as BlobPart[], {
    type: "image/jpeg",
  });

  const albumArtBase64 = arrayBufferToBase64(await imageBlob.arrayBuffer());

  return {
    title: result.trackName ?? "",
    artist: result.artistName ?? "",
    album: result.collectionName ?? "",
    genre: result.primaryGenreName ?? "",
    track: `${result.trackNumber}/${result.trackCount}`,
    disc: `${result.discNumber}/${result.discCount}`,
    year,
    picture: [albumArtBase64],
  } as Id3FormValues;
}
