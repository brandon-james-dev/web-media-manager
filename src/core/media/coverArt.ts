import { getArtworkForSong } from "@/lib/metadata/getArtworkForSong";
import type { IPicture } from "@/lib/contracts/IPicture";
import type { ArtworkType } from "@/lib/contracts/ArtworkType";

export interface CoverArtResult {
  songId: string;
  pictures: IPicture[];
}

/**
 * Domain: Media.
 * Open Subsonic equivalent: getCoverArt(bySongId).
 *
 * Returns all artwork attachments for a song, as raw picture bytes
 * (JSON-safe Uint8Array in the IPicture.data field).
 */
export async function getCoverArt(songId: string): Promise<CoverArtResult> {
  const artwork = await getArtworkForSong(songId);

  const pictures = await Promise.all(
    artwork.map(async (art) => {
      const full = art.full ?? art.thumb512 ?? art.thumb256;
      return {
        type: art.artworkType ?? ("Other" as ArtworkType),
        mimeType: "image/jpeg",
        description: "",
        data: new Uint8Array(await full!.arrayBuffer()),
      };
    })
  );

  return { songId, pictures };
}
