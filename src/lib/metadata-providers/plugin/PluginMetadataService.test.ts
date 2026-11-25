import { afterEach, describe, expect, it, vi } from "vitest";
import type { PluginMetadataProviderDescriptor } from "@/core/plugins";
import { PluginMetadataService } from "./PluginMetadataService";

const descriptor: PluginMetadataProviderDescriptor = {
  role: "metadata",
  id: "example-metadata",
  name: "Example Metadata",
  search: {
    url: "https://metadata.example.test/api/search",
    params: { title: "track", artist: "artist", album: "release" },
    headers: { "X-Client": "web-media-manager" },
    resultsPath: "data.results",
    fields: {
      title: "trackName",
      artist: "artistName",
      album: "collectionName",
      albumArtist: "collectionArtistName",
      genre: "genre",
      year: "year",
      date: "releaseDate",
      track: "trackNumber",
      discNumber: "discNumber",
      duration: "duration",
      isrc: "isrc",
      label: "label",
      composer: "composer",
      coverArtUrl: "artworkUrl",
    },
  },
};

function stubFetch(response: {
  ok?: boolean;
  status?: number;
  body?: unknown;
}): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => ({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.body,
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PluginMetadataService", () => {
  it("builds the request from the descriptor and maps the response", async () => {
    const fetchMock = stubFetch({
      body: {
        data: {
          results: [
            {
              trackName: "Amarillo by Morning",
              artistName: "George Strait",
              collectionName: "Strait from the Heart",
              collectionArtistName: "George Strait",
              genre: "Country",
              year: 1982,
              releaseDate: "1982-04-14",
              trackNumber: 1,
              discNumber: 1,
              duration: 173,
              isrc: "USMC18200001",
              label: "MCA Records",
              composer: "Terry Stafford",
              artworkUrl: "https://art.example.test/cover.jpg",
            },
          ],
        },
      },
    });

    const service = new PluginMetadataService(descriptor);
    const results = await service.lookup("Amarillo by Morning|George Strait|");

    expect(service.provider).toBe("example-metadata");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://metadata.example.test/api/search?track=Amarillo+by+Morning&artist=George+Strait"
    );
    expect(init.headers).toEqual({ "X-Client": "web-media-manager" });

    expect(results).toHaveLength(1);
    expect(results?.[0]).toMatchObject({
      source: "example-metadata",
      title: "Amarillo by Morning",
      artist: "George Strait",
      album: "Strait from the Heart",
      albumArtist: "George Strait",
      genre: "Country",
      year: 1982,
      date: "1982-04-14",
      track: 1,
      discNumber: 1,
      duration: 173,
      isrc: "USMC18200001",
      label: "MCA Records",
      composer: "Terry Stafford",
    });
    expect(results?.[0].pictures?.[0]).toMatchObject({
      url: "https://art.example.test/cover.jpg",
      type: "FrontCover",
    });
  });

  it("keeps an existing query string on the endpoint", async () => {
    const fetchMock = stubFetch({ body: { data: { results: [] } } });

    const service = new PluginMetadataService({
      ...descriptor,
      search: {
        ...descriptor.search,
        url: "https://metadata.example.test/api/search?entity=song&limit=10",
      },
    });

    await service.lookup("Kept|Artist|");

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(
      "https://metadata.example.test/api/search?entity=song&limit=10&track=Kept&artist=Artist"
    );
  });

  it("drops a record without a title or artist", async () => {
    stubFetch({
      body: {
        data: {
          results: [
            { trackName: "No Artist" },
            { artistName: "No Title" },
            { trackName: "Kept", artistName: "Artist" },
          ],
        },
      },
    });

    const service = new PluginMetadataService(descriptor);
    const results = await service.lookup("Kept|Artist|");

    expect(results).toHaveLength(1);
    expect(results?.[0].title).toBe("Kept");
  });

  it("returns null when the response has no records", async () => {
    stubFetch({ body: { data: { results: [] } } });

    const service = new PluginMetadataService(descriptor);

    await expect(service.lookup("nothing|nobody|")).resolves.toBeNull();
  });

  it("returns null on 404 instead of throwing", async () => {
    stubFetch({ ok: false, status: 404, body: {} });

    const service = new PluginMetadataService(descriptor);

    await expect(service.lookup("nothing|nobody|")).resolves.toBeNull();
  });

  it("throws with the provider name and status on a failed request", async () => {
    stubFetch({ ok: false, status: 503, body: {} });

    const service = new PluginMetadataService(descriptor);

    await expect(service.lookup("x|y|")).rejects.toThrow(
      "Example Metadata search failed (503)"
    );
  });

  it("sends literal query parameters the provider requires", async () => {
    const fetchMock = stubFetch({
      body: { data: { results: [{ trackName: "T", artistName: "A" }] } },
    });

    const service = new PluginMetadataService({
      ...descriptor,
      search: { ...descriptor.search, query: { types: "songs", limit: "10" } },
    });

    await service.lookup("t|a|");

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get("types")).toBe("songs");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("track")).toBe("t");
  });

  it("exchanges credentials for a token and sends it on the search", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      const url = String(input);
      if (url.startsWith("https://auth.example.test/token")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: "tok-123" }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: { results: [{ trackName: "T", artistName: "A" }] },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const service = new PluginMetadataService({
      ...descriptor,
      auth: {
        url: "https://auth.example.test/token",
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials",
        tokenPath: "access_token",
      },
    });

    await service.lookup("t|a|");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(calls[0]?.url).toBe("https://auth.example.test/token");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.body).toBe("grant_type=client_credentials");

    const headers = calls[1]?.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok-123");
  });

  it("fails when the token response has no token at the declared path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ nope: true }),
      }))
    );

    const service = new PluginMetadataService({
      ...descriptor,
      auth: {
        url: "https://auth.example.test/token",
        tokenPath: "access_token",
      },
    });

    await expect(service.lookup("t|a|")).rejects.toThrow(
      'Example Metadata token response has no "access_token".'
    );
  });

  it("fills a missing field from the per-record detail request", async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () =>
        url.includes("/artists/")
          ? { genres: ["texas country", "country"] }
          : {
              data: {
                results: [
                  {
                    trackName: "Amarillo by Morning",
                    artistName: "George Strait",
                    artists: [{ id: "artist-1" }],
                  },
                ],
              },
            },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const service = new PluginMetadataService({
      ...descriptor,
      search: {
        ...descriptor.search,
        fields: { title: "trackName", artist: "artistName" },
        detail: {
          url: "https://api.example.test/v1/artists/{artists.0.id}",
          fields: { genre: "genres.0" },
        },
      },
    });

    const results = await service.lookup("Amarillo by Morning|George Strait|");

    expect(results?.[0]?.genre).toBe("texas country");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.example.test/v1/artists/artist-1"
    );
  });

  it("keeps the search value when the detail request also maps it", async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () =>
        url.includes("/artists/")
          ? { genres: ["detail genre"] }
          : {
              data: {
                results: [
                  {
                    trackName: "Amarillo by Morning",
                    artistName: "George Strait",
                    genre: "search genre",
                    artists: [{ id: "artist-1" }],
                  },
                ],
              },
            },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const service = new PluginMetadataService({
      ...descriptor,
      search: {
        ...descriptor.search,
        fields: {
          title: "trackName",
          artist: "artistName",
          genre: "genre",
        },
        detail: {
          url: "https://api.example.test/v1/artists/{artists.0.id}",
          fields: { genre: "genres.0" },
        },
      },
    });

    const results = await service.lookup("Amarillo by Morning|George Strait|");

    expect(results?.[0]?.genre).toBe("search genre");
  });

  it("keeps the search result when the detail request fails", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/artists/")) {
        throw new Error("network down");
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            results: [
              {
                trackName: "Amarillo by Morning",
                artistName: "George Strait",
                artists: [{ id: "artist-1" }],
              },
            ],
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const service = new PluginMetadataService({
      ...descriptor,
      search: {
        ...descriptor.search,
        fields: { title: "trackName", artist: "artistName" },
        detail: {
          url: "https://api.example.test/v1/artists/{artists.0.id}",
          fields: { genre: "genres.0" },
        },
      },
    });

    const results = await service.lookup("Amarillo by Morning|George Strait|");

    expect(results?.[0]?.title).toBe("Amarillo by Morning");
    expect(results?.[0]?.genre).toBeUndefined();
  });

  it("maps a year from a release date and an album artist", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          tracks: {
            items: [
              {
                name: "All My Ex's Live In Texas",
                artists: [{ name: "George Strait" }],
                album: {
                  name: "Ocean Front Property",
                  release_date: "1987-01-01",
                  artists: [{ name: "George Strait" }],
                },
              },
            ],
          },
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const service = new PluginMetadataService({
      ...descriptor,
      search: {
        ...descriptor.search,
        resultsPath: "tracks.items",
        fields: {
          title: "name",
          artist: "artists.0.name",
          album: "album.name",
          albumArtist: "album.artists.0.name",
          year: "album.release_date",
        },
      },
    });

    const results = await service.lookup(
      "All My Ex's Live In Texas|George Strait|Ocean Front Property"
    );

    expect(results?.[0]?.albumArtist).toBe("George Strait");
    expect(results?.[0]?.year).toBe(1987);
  });

  it("maps total tracks and total discs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            tracks: {
              items: [
                {
                  name: "Alright",
                  artists: [{ name: "Darius Rucker" }],
                  album: { name: "Learn To Live", total_tracks: 12 },
                  total_discs: 2,
                },
              ],
            },
          })
        );
      })
    );

    const service = new PluginMetadataService({
      ...descriptor,
      search: {
        ...descriptor.search,
        resultsPath: "tracks.items",
        fields: {
          title: "name",
          artist: "artists.0.name",
          totalTracks: "album.total_tracks",
          totalDiscs: "total_discs",
        },
      },
    });

    const results = await service.lookup("Alright|Darius Rucker|");

    expect(results?.[0]?.totalTracks).toBe(12);
    expect(results?.[0]?.totalDiscs).toBe(2);
  });
});
