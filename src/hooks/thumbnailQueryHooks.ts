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

export async function getStaticThumbnail(
  songId: string,
  thumbnailSize: "sm" | "md" | "lg" | "xl" | "original" = "sm",
): Promise<{
  thumbnail?: string;
  revoke: () => void;
}> {
  const inputSizeToDbSize: Map<string, string> = new Map<string, string>([
    ["sm", "thumbSmall"],
    ["md", "thumbMedium"],
    ["lg", "thumbLarge"],
    ["xl", "thumbXLarge"],
    ["original", "original"],
  ]);

  const inputSize = inputSizeToDbSize.get(thumbnailSize)!;
  const entry = await mediaDb.thumbnails.get(songId);
  const voidFn = () => {};

  if (!entry) {
    return {
      thumbnail: undefined,
      revoke: voidFn,
    };
  }

  const entryAsAnyWithInput: Blob = (entry as any)[inputSize];

  if (!entryAsAnyWithInput) {
    return {
      thumbnail: undefined,
      revoke: voidFn,
    };
  }

  const thumbnail = URL.createObjectURL(entryAsAnyWithInput);

  return {
    thumbnail,
    revoke: () => URL.revokeObjectURL(thumbnail),
  };
}
