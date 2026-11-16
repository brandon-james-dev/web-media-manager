import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A device's covers live in its own ArtworkDB, not in the app's artwork table,
 * so the library's lookup returned nothing and every device track rendered a
 * blank tile. These cover the in-memory registry and the fallback that makes
 * the existing lookup find a device's art.
 */

const { getBySongAndType } = vi.hoisted(() => ({
  getBySongAndType: vi.fn(
    async (): Promise<
      { artworkType?: string; full?: Blob; thumb512?: Blob } | undefined
    > => undefined
  ),
}));

vi.mock("@/lib/persistence/songArtworkStore", () => ({
  getSongArtworkStore: () => ({ getBySongAndType }),
}));

const {
  clearDeviceArtwork,
  deviceArtworkCount,
  getDeviceArtwork,
  setDeviceArtwork,
} = await import("./deviceArtwork");

const { getPicturesForSongOfType } = await import(
  "@/lib/metadata/artwork/getPicturesForSongOfType"
);

const png = () =>
  new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
    type: "image/png",
  });

describe("device artwork registry", () => {
  beforeEach(() => {
    clearDeviceArtwork();
  });

  it("returns the art registered for a song id", () => {
    const blob = png();
    setDeviceArtwork("dev-1:42", blob);

    expect(getDeviceArtwork("dev-1:42")).toBe(blob);
    expect(deviceArtworkCount()).toBe(1);
  });

  it("returns nothing for an unregistered song", () => {
    expect(getDeviceArtwork("dev-1:99")).toBeUndefined();
  });

  it("drops every image when cleared", () => {
    setDeviceArtwork("dev-1:42", png());
    setDeviceArtwork("dev-1:43", png());

    clearDeviceArtwork();

    expect(deviceArtworkCount()).toBe(0);
  });
});

describe("artwork lookup for a device track", () => {
  beforeEach(() => {
    clearDeviceArtwork();
    getBySongAndType.mockClear();
  });

  it("falls back to the device's art when the table has no row", async () => {
    setDeviceArtwork("dev-1:42", png());

    const picture = await getPicturesForSongOfType("dev-1:42");

    expect(picture?.data).toHaveLength(8);
    expect(picture?.mimeType).toBe("image/png");
  });

  it("returns nothing when neither the table nor the device has art", async () => {
    await expect(getPicturesForSongOfType("dev-1:99")).resolves.toBeUndefined();
  });

  it("prefers the stored row over the device's art", async () => {
    setDeviceArtwork("dev-1:42", png());
    getBySongAndType.mockResolvedValueOnce({
      artworkType: "FrontCover",
      full: new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }),
    });

    const picture = await getPicturesForSongOfType("dev-1:42");

    expect(picture?.data).toHaveLength(3);
  });
});
