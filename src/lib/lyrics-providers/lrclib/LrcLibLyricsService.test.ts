import { afterEach, describe, expect, it, vi } from "vitest";
import { LyricsProvider } from "../LyricsProvider";
import { LrcLibLyricsService } from "./LrcLibLyricsService";

function stubFetch(response: {
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
}) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LrcLibLyricsService", () => {
  it("maps search results and identifies the client", async () => {
    const fetchMock = stubFetch({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: 1,
          trackName: "Song",
          artistName: "Artist",
          albumName: "Album",
          duration: 200,
          plainLyrics: "la la",
          syncedLyrics: "[00:01.00] la la",
          hasWordSync: true,
          instrumental: false,
        },
      ],
    });

    const results = await new LrcLibLyricsService().search({
      title: "Song",
      artist: "Artist",
    });

    expect(results).toEqual([
      {
        source: LyricsProvider.LrcLib,
        id: 1,
        title: "Song",
        artist: "Artist",
        album: "Album",
        duration: 200,
        plainLyrics: "la la",
        syncedLyrics: "[00:01.00] la la",
        hasWordSync: true,
        instrumental: false,
      },
    ]);

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(url).toBe(
      "https://lrclib.net/api/search?track_name=Song&artist_name=Artist"
    );
    expect(init.headers["Lrclib-Client"]).toContain("web-media-manager");
    expect(init.headers["Lrclib-App-Id"]).toBeUndefined();
  });

  it("sends the registered application id when configured", async () => {
    const fetchMock = stubFetch({ ok: true, status: 200, json: async () => [] });

    await new LrcLibLyricsService({ applicationId: "app-123" }).search({
      title: "Song",
      artist: "Artist",
    });

    const [, init] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(init.headers["Lrclib-App-Id"]).toBe("app-123");
  });

  it("returns null without a track name", async () => {
    const fetchMock = stubFetch({ ok: true, status: 200, json: async () => [] });

    const results = await new LrcLibLyricsService().search({
      title: "",
      artist: "Artist",
    });

    expect(results).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null when nothing matches", async () => {
    stubFetch({ ok: true, status: 200, json: async () => [] });

    const results = await new LrcLibLyricsService().search({
      title: "Song",
      artist: "Artist",
    });

    expect(results).toBeNull();
  });

  it("throws on a failed request", async () => {
    stubFetch({ ok: false, status: 429 });

    await expect(
      new LrcLibLyricsService().search({ title: "Song", artist: "Artist" })
    ).rejects.toThrow("LRCLIB search failed (429)");
  });
});
