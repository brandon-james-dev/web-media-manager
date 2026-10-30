import { getStore } from "@/core/system";
import { songsToAlbums } from "@/core/contracts";
import type { AlbumID3 } from "@/core/contracts";
import type { AlbumListParams } from "./types";

/**
 * Domain: Browsing.
 * Open Subsonic equivalent: getAlbumList2().
 */
export async function getAlbumList(params: AlbumListParams): Promise<AlbumID3[]> {
  const store = getStore();
  const songs = await store.getAll();

  let albums = songsToAlbums(songs);

  switch (params.type) {
    case "newest":
      albums = [...albums].sort((a, b) =>
        (b.created ?? "") < (a.created ?? "") ? -1 : 1
      );
      break;
    case "recent":
      albums = [...albums].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      break;
    case "random":
      albums = [...albums].sort(() => Math.random() - 0.5);
      break;
    case "alphabeticalByName":
      albums = [...albums].sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "alphabeticalByArtist":
      albums = [...albums].sort((a, b) =>
        (a.artist ?? "").localeCompare(b.artist ?? "")
      );
      break;
    case "byGenre":
      albums = albums.filter((a) => a.genre === params.genre);
      break;
    case "byYear":
      albums = albums.filter(
        (a) =>
          (a.year ?? 0) >= (params.fromYear ?? 0) &&
          (a.year ?? 0) <= (params.toYear ?? 0)
      );
      break;
    case "frequent":
      // no play-count tracking yet; fall through to search-order.
      break;
  }

  const start = params.offset ?? 0;
  const end = params.size != null ? start + params.size : undefined;

  return albums.slice(start, end);
}
