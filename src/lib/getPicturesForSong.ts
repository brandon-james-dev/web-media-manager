import { ArtworkType, type IPicture } from "@/lib/metadata-utils";
import { getArtworkForSong } from ".";

export async function getPicturesForSong(songId: string): Promise<IPicture[]> {
  const artwork = await getArtworkForSong(songId);

  return Promise.all(
    artwork.map(async (art) => ({
      type: art.artworkType ?? ArtworkType.Other,
      mimeType: "image/jpeg",
      description: "",
      data: new Uint8Array(await art.full!.arrayBuffer()),
    }))
  );
}
