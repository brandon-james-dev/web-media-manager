import { mediaDb } from "@/data";

export async function useCountPendingArtwork() {
  return mediaDb.pendingArt.count();
}

export async function sortPendingArtworkByCol(
  colName: string,
  direction: "asc" | "desc" = "asc",
) {
  let query = mediaDb.pendingArt.orderBy(colName);
  if (direction == "asc") {
    query = query.reverse();
  }
  return await query.toArray();
}

export async function getStaticThumbnail(songId: string) {
  const entry = await mediaDb.thumbnails.get(songId);
  if (!entry) {
    return {
      thumbSmall: null,
      thumbMedium: null,
      thumbLarge: null,
      thumbXLarge: null,
      originalUrl: null,
    };
  }

  const urls: string[] = [];

  const thumbSmall = entry.thumbSmall
    ? URL.createObjectURL(entry.thumbSmall)
    : null;

  if (thumbSmall) urls.push(thumbSmall);

  const thumbXLarge = entry.thumbLarge
    ? URL.createObjectURL(entry.thumbLarge)
    : null;

  if (thumbXLarge) urls.push(thumbXLarge);

  const thumbLarge = entry.thumbLarge
    ? URL.createObjectURL(entry.thumbLarge)
    : null;

  if (thumbLarge) urls.push(thumbLarge);

  const thumbMedium = entry.thumbMedium
    ? URL.createObjectURL(entry.thumbMedium)
    : null;

  if (thumbLarge) urls.push(thumbLarge);

  const originalUrl = entry.original
    ? URL.createObjectURL(entry.original)
    : null;

  if (originalUrl) urls.push(originalUrl);

  return {
    thumbSmall,
    thumbMedium,
    thumbLarge,
    thumbXLarge,
    originalUrl,
    revoke: () => urls.forEach((u) => URL.revokeObjectURL(u)),
  };
}
