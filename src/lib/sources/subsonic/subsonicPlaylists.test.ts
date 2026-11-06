import { afterEach, describe, expect, it, vi } from "vitest";

import type { SubsonicMusicSource } from "@/models";
import { setPlaylistStoreProvider } from "@/core/ports/playlists";
import type { Playlist } from "@/models";
import {
  collectSubsonicPlaylists,
  removeSubsonicPlaylists,
  subsonicPlaylistId,
  subsonicPlaylistToPlaylist,
} from "./subsonicImport";
import { sourceUri } from "@/core/contracts/sources";

const source = {
  id: "src1",
  uriDomain: "navidrome",
  kind: "subsonic",
  name: "Home",
  config: { baseUrl: "https://music.test", username: "u" },
  capabilities: { playlistWrite: false },
} as unknown as SubsonicMusicSource;

// The catalog store is unused here; avoid loading the app-version global.
vi.mock("@/core/system", () => ({ getStore: () => ({}) }));
vi.mock("./subsonicSecrets", () => ({
  getSubsonicSecret: async () => "pw",
}));

function memoryStore(seed: Playlist[] = []) {
  const rows = new Map(seed.map((p) => [p.id, p]));
  const store = {
    save: async (id: string, p: Playlist) => void rows.set(id, p),
    delete: async (id: string) => void rows.delete(id),
    getAll: async () => [...rows.values()],
  };
  setPlaylistStoreProvider(() => store as never);
  return rows;
}

afterEach(() => vi.unstubAllGlobals());

describe("subsonicPlaylistToPlaylist", () => {
  it("maps entries to source-qualified song ids in server order", () => {
    const playlist = subsonicPlaylistToPlaylist(
      source,
      {
        id: "7",
        name: "Road Trip",
        created: "2024-01-01T00:00:00Z",
        changed: "2024-02-01T00:00:00Z",
      },
      [{ id: "b" }, { title: "no id" }, { id: "a" }]
    );

    expect(playlist.id).toBe(subsonicPlaylistId(source, "7"));
    expect(playlist.sourceId).toBe("src1");
    expect(playlist.name).toBe("Road Trip");
    expect(playlist.songs.map((e) => e.songId)).toEqual([
      sourceUri(source, "b"),
      sourceUri(source, "a"),
    ]);
    expect(playlist.updatedAt).toBe(Date.parse("2024-02-01T00:00:00Z"));
  });
});

describe("collectSubsonicPlaylists", () => {
  function fakeServer(playlists: Array<{ id: string; name: string }>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const u = new URL(url);
        const ok = (extra: object) => ({
          ok: true,
          json: async () => ({
            "subsonic-response": { status: "ok", version: "1.16.1", ...extra },
          }),
        });
        if (u.pathname.endsWith("getPlaylists")) {
          return ok({ playlists: { playlist: playlists } });
        }
        if (u.pathname.endsWith("getPlaylist")) {
          return ok({
            playlist: { entry: [{ id: `song-${u.searchParams.get("id")}` }] },
          });
        }
        throw new Error(`unexpected ${u.pathname}`);
      })
    );
  }

  it("fetches and maps every server playlist without storing them", async () => {
    const rows = memoryStore();
    fakeServer([
      { id: "1", name: "One" },
      { id: "2", name: "Two" },
    ]);
    const progress: number[] = [];

    const playlists = await collectSubsonicPlaylists(
      source,
      { username: "u", password: "pw" },
      (resolved) => progress.push(resolved)
    );

    expect(playlists?.map((p) => p.name)).toEqual(["One", "Two"]);
    expect(playlists?.every((p) => p.sourceId === "src1")).toBe(true);
    expect(progress.sort()).toEqual([1, 2]);
    expect(rows.size).toBe(0);
  });

  it("removeSubsonicPlaylists drops only that source's playlists", async () => {
    const rows = memoryStore([
      {
        id: "a",
        name: "A",
        sourceId: "src1",
        songs: [],
        createdAt: 1,
        updatedAt: 1,
      },
      { id: "b", name: "B", songs: [], createdAt: 1, updatedAt: 1 },
    ]);
    await removeSubsonicPlaylists(source);
    expect([...rows.keys()]).toEqual(["b"]);
  });
});
