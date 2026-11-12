import { afterEach, describe, expect, it, vi } from "vitest";

import type { SubsonicMusicSource } from "@/models";
import { collectSubsonicSongChanges } from "./subsonicImport";

const source = {
  id: "src1",
  uriDomain: "navidrome",
  kind: "subsonic",
  name: "Home",
  config: { baseUrl: "https://music.test", username: "u" },
} as unknown as SubsonicMusicSource;

vi.mock("@/core/system", () => ({ getStore: () => ({}) }));
vi.mock("./subsonicSecrets", () => ({
  getSubsonicSecret: async () => "pw",
}));

const SINCE = 2_000_000;

function fakeServer(lastModified: number) {
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
      if (endpoint === "getIndexes.view" || endpoint === "getIndexes") {
        return respond({
          indexes: {
            lastModified,
            index: [{ name: "A", artist: [{ id: "ar1", name: "Artist" }] }],
          },
        });
      }
      if (endpoint.startsWith("getArtist")) {
        return respond({ artist: { name: "Artist", album: [{ id: "al1" }] } });
      }
      return respond({
        album: { name: "Album", song: [{ id: "s1", title: "Song" }] },
      });
    })
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("collectSubsonicSongChanges", () => {
  it("skips the walk when the server reports no change but still lists the library", async () => {
    const calls = fakeServer(SINCE - 1);

    const result = await collectSubsonicSongChanges(source, SINCE);

    expect(result?.unchanged).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it("walks the library when the server reports a newer change", async () => {
    const calls = fakeServer(SINCE + 1);

    const result = await collectSubsonicSongChanges(source, SINCE);

    expect(result?.unchanged).toBe(false);
    expect(result?.songs).toHaveLength(1);
    expect(calls.length).toBeGreaterThan(1);
  });
});
