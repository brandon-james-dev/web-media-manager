import { afterEach, describe, expect, it, vi } from "vitest";
import type { PluginMetadataProviderDescriptor } from "@/core/visualizers";
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
});
