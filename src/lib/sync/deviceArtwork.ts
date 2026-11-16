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

/** Register a device track's cover art under its namespaced song id. */
export function setDeviceArtwork(songId: string, blob: Blob): void {
  artwork.set(songId, blob);
}

/** A device track's cover art, when the device is connected and has one. */
export function getDeviceArtwork(songId: string): Blob | undefined {
  return artwork.get(songId);
}

/** Drop every registered image, e.g. when no device is connected. */
export function clearDeviceArtwork(): void {
  artwork.clear();
}

/** Test seam: the number of registered images. */
export function deviceArtworkCount(): number {
  return artwork.size;
}
