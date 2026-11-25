import type { MetadataPicture } from "@/core/contracts";

/**
 * Resolve a search result's cover picture into image bytes. Search results
 * carry only a thumbnail `url`; the full-size image is downloaded here, at
 * Apply time, never during search.
 */
export async function fetchCoverBlob(
  picture?: MetadataPicture
): Promise<Blob | undefined> {
  if (!picture) return undefined;

  let coverData: Uint8Array | undefined;
  if (picture.data && picture.data.length > 0) {
    coverData = picture.data;
  } else if (picture.url) {
    try {
      // iTunes: swap the thumbnail size for the full 1000x1000 URL.
      let fullUrl = picture.url;
      if (fullUrl.includes("100x100")) {
        fullUrl = fullUrl.replace("100x100", "1000x1000");
      }
      const res = await fetch(fullUrl);
      if (res.ok) {
        coverData = new Uint8Array(await res.arrayBuffer());
      }
    } catch {
      // ignore artwork download failures at apply time
    }
  }

  if (!coverData || coverData.length === 0) return undefined;
  return new Blob([coverData.slice()]);
}
