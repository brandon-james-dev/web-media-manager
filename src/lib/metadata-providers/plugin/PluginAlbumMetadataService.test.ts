import { afterEach, describe, expect, it, vi } from "vitest";
import type { PluginMetadataProviderDescriptor } from "@/core/plugins";
import { PluginAlbumMetadataService } from "./PluginAlbumMetadataService";

const descriptor: PluginMetadataProviderDescriptor = {
  role: "metadata",
  id: "example-metadata",
  name: "Example Metadata",
  search: {
    url: "https://metadata.example.test/api/search",
    params: { title: "q" },
    fields: { title: "name", artist: "artistName" },
  },
  albumSearch: {
    url: "https://metadata.example.test/api/search",
    params: { album: "q" },
    query: { type: "album" },
    resultsPath: "albums.items",
    fields: {
      id: "id",
      title: "name",
      artist: "artists.0.name",
      albumArtist: "artists.0.name",
      year: "release_date",
      trackCount: "total_tracks",
      coverArtUrl: "images.0.url",
    },
    tracks: {
      url: "https://metadata.example.test/api/albums/{id}/tracks",
      query: { limit: "50" },
      resultsPath: "items",
      fields: { title: "name", track: "track_number", discNumber: "disc_number" },
    },
  },
};

function stubFetch(body: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => body,
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const albumRecord = {
  id: "album-1",
  name: "Thompson Square",
  artists: [{ id: "artist-1", name: "Thompson Square" }],
  release_date: "2011-02-08",
  total_tracks: 12,
  images: [{ url: "https://images.example.test/cover.jpg" }],
};

describe("PluginAlbumMetadataService", () => {
  it("maps an album search response through the field map", async () => {    const fetchMock = stubFetch({
      albums: {
        items: [
          {
            id: "album-1",
            name: "A Fever You Can't Sweat Out",
            artists: [{ name: "Panic! at the Disco" }],
            release_date: "2005-09-27",
            total_tracks: 13,
            images: [{ url: "https://images.example.test/cover.jpg" }],
          },
        ],
      },
    });

    const service = new PluginAlbumMetadataService(descriptor);
    const albums = await service.searchAlbums(
      "|Panic! at the Disco|A Fever You Can't Sweat Out"
    );

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get("q")).toBe("A Fever You Can't Sweat Out");
    expect(url.searchParams.get("type")).toBe("album");

    expect(albums).toEqual([
      {
        source: "example-metadata",
        id: "album-1",
        title: "A Fever You Can't Sweat Out",
        artist: "Panic! at the Disco",
        albumArtist: "Panic! at the Disco",
        year: 2005,
        trackCount: 13,
        pictures: [
          {
            mimeType: "image/jpeg",
            url: "https://images.example.test/cover.jpg",
            type: "FrontCover",
            description: "Front Cover",
          },
        ],
      },
    ]);
  });

  it("fetches the track list with the album id substituted", async () => {
    const fetchMock = stubFetch({
      items: [
        { name: "Introduction", track_number: 1, disc_number: 1 },
        { name: "The Only Difference", track_number: 2, disc_number: 1 },
      ],
    });

    const service = new PluginAlbumMetadataService(descriptor);
    const album = await service.lookupAlbumTracks({
      source: "example-metadata",
      id: "album-1",
      title: "A Fever You Can't Sweat Out",
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/api/albums/album-1/tracks");
    expect(url.searchParams.get("limit")).toBe("50");

    expect(album?.tracks).toEqual([
      { title: "Introduction", track: 1, discNumber: 1 },
      { title: "The Only Difference", track: 2, discNumber: 1 },
    ]);
  });

  it("returns null when the descriptor declares no album search", async () => {
    const service = new PluginAlbumMetadataService({
      ...descriptor,
      albumSearch: undefined,
    });

    expect(await service.searchAlbums("|artist|")).toBeNull();
  });

  it("falls back to the other fields when the mapped field is blank", async () => {
    const fetchMock = stubFetch({
      albums: { items: [albumRecord] },
    });
    const service = new PluginAlbumMetadataService(descriptor);

    await service.searchAlbums("Are You Gonna Kiss Me or Not|Thompson Square|");

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get("q")).toBe(
      "Are You Gonna Kiss Me or Not Thompson Square"
    );
  });

  it("fills omitted fields from the detail request", async () => {
    const fetchMock = vi.fn(async (input: string) => ({
      ok: true,
      status: 200,
      json: async () =>
        String(input).includes("/artists/")
          ? { genres: ["texas country"] }
          : { albums: { items: [albumRecord] } },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const service = new PluginAlbumMetadataService({
      ...descriptor,
      albumSearch: {
        ...descriptor.albumSearch!,
        detail: {
          url: "https://metadata.example.test/api/artists/{artists.0.id}",
          fields: { genre: "genres.0" },
        },
      },
    });

    const albums = await service.searchAlbums("|Thompson Square|Thompson Square");

    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "https://metadata.example.test/api/artists/artist-1"
    );
    expect(albums?.[0]?.genre).toBe("texas country");
    expect(albums?.[0]?.year).toBe(2011);
  });

  it("keeps the search result when the detail request fails", async () => {
    const fetchMock = vi.fn(async (input: string) => ({
      ok: !String(input).includes("/artists/"),
      status: String(input).includes("/artists/") ? 500 : 200,
      json: async () => ({ albums: { items: [albumRecord] } }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const service = new PluginAlbumMetadataService({
      ...descriptor,
      albumSearch: {
        ...descriptor.albumSearch!,
        detail: {
          url: "https://metadata.example.test/api/artists/{artists.0.id}",
          fields: { genre: "genres.0" },
        },
      },
    });

    const albums = await service.searchAlbums("|Thompson Square|Thompson Square");

    expect(albums?.[0]?.title).toBe("Thompson Square");
    expect(albums?.[0]?.genre).toBeUndefined();
  });
});
