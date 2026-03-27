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
  thumbnailSize: "sm" | "md" | "lg" | "xl" | "original",
): Promise<{
  thumbSmall?: string;
  thumbMedium?: string;
  thumbLarge?: string;
  thumbXLarge?: string;
  original?: string;
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
      [inputSize]: null,
      revoke: voidFn,
    };
  }

  if (!inputSize)
    return {
      [inputSize]: null,
      revoke: voidFn,
    };

  const entryAsAnyWithInput: Blob = (entry as any)[inputSize];

  const thumb = URL.createObjectURL(entryAsAnyWithInput);

  return {
    [inputSize]: thumb,
    revoke: () => URL.revokeObjectURL(thumb),
  };
}
