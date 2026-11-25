/**
 * Cover art read off a connected sync device, held in memory only.
 *
 * A device's artwork lives in its own ArtworkDB as `.ithmb` thumbnails, not in
 * the app's `songArtwork` table, so the library's artwork lookup found nothing
 * and every device track rendered a blank tile. The detector decodes each
 * device image once per scan and registers it here, keyed by the same
 * namespaced song id the library uses (`<deviceId>:<trackId>`).
 *
 * Nothing is persisted: the bytes belong to the device and are dropped when it
 * is disconnected, matching how its track list is handled.
 */
const artwork = new Map<string, Blob>();

/**
 * Loaders for artwork that has not been read yet, keyed the same way.
 *
 * Reading every cover during a device scan is what made a Zune with a large
 * library take minutes to appear: each album's art is an MTP round trip. A
 * loader defers that cost until something actually renders the tile, and the
 * result is cached in `artwork` so a second render is free.
 */
const loaders = new Map<string, () => Promise<Blob | undefined>>();

/** Register a device track's cover art under its namespaced song id. */
export function setDeviceArtwork(songId: string, blob: Blob): void {
  artwork.set(songId, blob);
}

/**
 * Register how to read a device track's cover art later. Nothing is fetched
 * until {@link resolveDeviceArtwork} is called for that song.
 */
export function setDeviceArtworkLoader(
  songId: string,
  load: () => Promise<Blob | undefined>
): void {
  loaders.set(songId, load);
}

/** A device track's cover art, when the device is connected and has one. */
export function getDeviceArtwork(songId: string): Blob | undefined {
  return artwork.get(songId);
}

/**
 * A device track's cover art, reading it on first use when it was registered
 * lazily. Resolves `undefined` when the device has none, or when the read
 * fails — a missing tile must not break the view that asked for it.
 */
export async function resolveDeviceArtwork(
  songId: string
): Promise<Blob | undefined> {
  const cached = artwork.get(songId);
  if (cached) return cached;

  const load = loaders.get(songId);
  if (!load) return undefined;

  // Drop the loader before awaiting so two tiles rendering at once do not both
  // start the same device read.
  loaders.delete(songId);

  try {
    const blob = await load();
    if (blob) artwork.set(songId, blob);
    return blob;
  } catch {
    return undefined;
  }
}

/** Drop every registered image, e.g. when no device is connected. */
export function clearDeviceArtwork(): void {
  artwork.clear();
  loaders.clear();
}

/** Test seam: the number of registered images. */
export function deviceArtworkCount(): number {
  return artwork.size;
}

/** Test seam: the number of pending lazy loaders. */
export function deviceArtworkLoaderCount(): number {
  return loaders.size;
}
