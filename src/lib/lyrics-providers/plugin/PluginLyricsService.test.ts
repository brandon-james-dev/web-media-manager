import { afterEach, describe, expect, it, vi } from "vitest";
import type { PluginLyricsProviderDescriptor } from "@/core/visualizers";
import { PluginLyricsService } from "./PluginLyricsService";

const descriptor: PluginLyricsProviderDescriptor = {
  id: "example-lyrics",
  name: "Example Lyrics",
  search: {
    url: "https://lyrics.example.test/api/search",
    params: { title: "track_name", artist: "artist_name", duration: "duration" },
    headers: { "X-Client": "web-media-manager" },
    resultsPath: "data.results",
    fields: {
      id: "id",
      title: "trackName",
      artist: "artistName",
      album: "albumName",
      duration: "duration",
      plainLyrics: "plainLyrics",
      syncedLyrics: "syncedLyrics",
      instrumental: "instrumental",
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

describe("PluginLyricsService", () => {
  it("builds the request from the descriptor and maps the response", async () => {
    const fetchMock = stubFetch({
      body: {
        data: {
          results: [
            {
              id: 7,
              trackName: "Amarillo by Morning",
              artistName: "George Strait",
              albumName: "Strait from the Heart",
              duration: 173,
              plainLyrics: "Amarillo by morning",
              syncedLyrics: "[00:00.00]Amarillo by morning",
              instrumental: false,
            },
          ],
        },
      },
    });

    const service = new PluginLyricsService(descriptor);
    const results = await service.search({
      title: "Amarillo by Morning",
      artist: "George Strait",
      duration: 173,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://lyrics.example.test/api/search?track_name=Amarillo+by+Morning&artist_name=George+Strait&duration=173"
    );
    expect(init.headers).toEqual({ "X-Client": "web-media-manager" });
    expect(results).toEqual([
      {
        source: "example-lyrics",
        id: 7,
        title: "Amarillo by Morning",
        artist: "George Strait",
        album: "Strait from the Heart",
        duration: 173,
        plainLyrics: "Amarillo by morning",
        syncedLyrics: "[00:00.00]Amarillo by morning",
        instrumental: false,
      },
    ]);
  });

  it("omits query parameters the query does not supply", async () => {
    const fetchMock = stubFetch({ body: { data: { results: [] } } });

    await new PluginLyricsService(descriptor).search({
      title: "Amarillo by Morning",
      artist: "George Strait",
    });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(
      "https://lyrics.example.test/api/search?track_name=Amarillo+by+Morning&artist_name=George+Strait"
    );
  });

  it("returns null when the endpoint has no record", async () => {
    stubFetch({ status: 404, ok: false });

    await expect(
      new PluginLyricsService(descriptor).search({ title: "x", artist: "y" })
    ).resolves.toBeNull();
  });

  it("throws with the provider name on a failed request", async () => {
    stubFetch({ status: 503, ok: false });

    await expect(
      new PluginLyricsService(descriptor).search({ title: "x", artist: "y" })
    ).rejects.toThrow("Example Lyrics search failed (503)");
  });

  it("drops records without a title or artist", async () => {
    stubFetch({
      body: {
        data: {
          results: [
            { trackName: "No artist", artistName: "" },
            { trackName: "Kept", artistName: "Artist" },
          ],
        },
      },
    });

    const results = await new PluginLyricsService(descriptor).search({
      title: "x",
      artist: "y",
    });

    expect(results?.map((entry) => entry.title)).toEqual(["Kept"]);
  });

  it("returns null when the response is not an array", async () => {
    stubFetch({ body: { data: { results: null } } });

    await expect(
      new PluginLyricsService(descriptor).search({ title: "x", artist: "y" })
    ).resolves.toBeNull();
  });

  it("stops before reading the body when the lookup is cancelled", async () => {
    stubFetch({ body: { data: { results: [] } } });

    await expect(
      new PluginLyricsService(descriptor).search(
        { title: "x", artist: "y" },
        { isCancelled: () => true }
      )
    ).resolves.toBeNull();
  });
});
