import { afterEach, describe, expect, it, vi } from "vitest";

import type { SubsonicMusicSource } from "@/models";
import { collectSubsonicSongs } from "./subsonicImport";

const source = {
  id: "src1",
  uriDomain: "navidrome",
  kind: "subsonic",
  name: "Home",
  config: {
    baseUrl: "https://music.test",
    username: "u",
    // The probe records this when the source is added; the import only asks
    // for lyrics when it is present.
    extensions: [{ name: "songLyrics", versions: [1], supported: true }],
  },
} as unknown as SubsonicMusicSource;

vi.mock("@/core/system", () => ({ getStore: () => ({}) }));
vi.mock("./subsonicSecrets", () => ({
  getSubsonicSecret: async () => "pw",
}));

/**
 * Minimal server: one artist, one album, one song, plus the lyrics endpoint.
 * `lyricsList` mirrors the Open Subsonic shape, where the array is named
 * `line` — reading `lines` silently produced no lyrics at all.
 */
function fakeServer(lyricsList?: object) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = new URL(String(input));
      const endpoint = url.pathname.split("/").pop() ?? "";
      const respond = (body: object) => ({
        ok: true,
        json: async () => ({
          "subsonic-response": { status: "ok", ...body },
        }),
      });

      if (endpoint.startsWith("getIndexes")) {
        return respond({
          indexes: {
            lastModified: 1,
            index: [{ name: "A", artist: [{ id: "ar1", name: "Artist" }] }],
          },
        });
      }
      if (endpoint.startsWith("getArtist")) {
        return respond({ artist: { name: "Artist", album: [{ id: "al1" }] } });
      }
      if (endpoint.startsWith("getLyricsBySongId")) {
        return respond(lyricsList ? { lyricsList } : {});
      }
      return respond({
        album: { name: "Album", song: [{ id: "s1", title: "Song" }] },
      });
    })
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("collectSubsonicSongs lyrics", () => {
  it("stores synced lyrics as LRC plus plain text", async () => {
    fakeServer({
      structuredLyrics: [
        {
          synced: true,
          offset: 100,
          line: [
            { start: 0, value: "First line" },
            { start: 2000, value: "Second line" },
          ],
        },
      ],
    });

    const songs = await collectSubsonicSongs(source);

    expect(songs).toHaveLength(1);
    expect(songs[0].lyrics).toBe("First line\nSecond line");
    // offset is added to every timestamp
    expect(songs[0].syncedLyrics).toBe(
      "[00:00.10] First line\n[00:02.10] Second line"
    );
  });

  it("stores plain lyrics when the record is not synced", async () => {
    fakeServer({
      structuredLyrics: [
        { synced: false, line: [{ value: "Only line" }] },
      ],
    });

    const songs = await collectSubsonicSongs(source);

    expect(songs[0].lyrics).toBe("Only line");
    expect(songs[0].syncedLyrics).toBeUndefined();
  });

  it("leaves the song untouched when the server has no lyrics", async () => {
    fakeServer(undefined);

    const songs = await collectSubsonicSongs(source);

    expect(songs[0].lyrics).toBeUndefined();
    expect(songs[0].syncedLyrics).toBeUndefined();
  });

  it("does not ask for lyrics when the source never advertised the extension", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = new URL(String(input));
        const endpoint = url.pathname.split("/").pop() ?? "";
        calls.push(endpoint);
        const respond = (body: object) => ({
          ok: true,
          json: async () => ({
            "subsonic-response": { status: "ok", ...body },
          }),
        });
        if (endpoint.startsWith("getIndexes")) {
          return respond({
            indexes: {
              lastModified: 1,
              index: [{ name: "A", artist: [{ id: "ar1", name: "Artist" }] }],
            },
          });
        }
        if (endpoint.startsWith("getArtist")) {
          return respond({
            artist: { name: "Artist", album: [{ id: "al1" }] },
          });
        }
        return respond({
          album: { name: "Album", song: [{ id: "s1", title: "Song" }] },
        });
      })
    );

    const plainSource = {
      ...source,
      config: { baseUrl: "https://music.test", username: "u" },
    } as unknown as SubsonicMusicSource;

    await collectSubsonicSongs(plainSource);

    expect(calls.some((c) => c.startsWith("getLyricsBySongId"))).toBe(false);
  });
});
