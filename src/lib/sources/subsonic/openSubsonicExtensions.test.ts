import { afterEach, describe, expect, it, vi } from "vitest";

import { SubsonicClient } from "./SubsonicClient";
import { probeSubsonicServer } from "./openSubsonicExtensions";

const creds = { username: "u", password: "pw" };

function fakeServer(
  ping: Record<string, unknown>,
  extensions?: Record<string, unknown>[] | "error",
  options: { authFailed?: boolean } = {}
) {
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
          "subsonic-response": { status: "ok", version: "1.16.1", ...body },
        }),
      });

      if (endpoint.startsWith("ping")) {
        // A rejected request still carries the wrapper fields; only `status`
        // and `error` differ.
        if (options.authFailed) {
          return {
            ok: true,
            json: async () => ({
              "subsonic-response": {
                status: "failed",
                version: "1.16.1",
                error: { code: 40, message: "Wrong username or password" },
                ...ping,
              },
            }),
          };
        }
        return respond(ping);
      }

      if (endpoint.startsWith("getOpenSubsonicExtensions")) {
        if (extensions === "error") {
          return {
            ok: true,
            json: async () => ({
              "subsonic-response": {
                status: "failed",
                version: "1.16.1",
                error: { code: 0, message: "not implemented" },
              },
            }),
          };
        }
        return respond({ openSubsonicExtensions: extensions });
      }

      throw new Error(`unexpected endpoint ${endpoint}`);
    })
  );

  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("probeSubsonicServer", () => {
  it("reports a plain Subsonic server without asking for extensions", async () => {
    const calls = fakeServer({});

    const probe = await probeSubsonicServer(
      new SubsonicClient({ baseUrl: "https://music.test" }),
      creds
    );

    expect(probe).toEqual({ openSubsonic: false, extensions: [] });
    expect(calls).toHaveLength(1);
  });

  it("lists extensions and marks the ones the app can use", async () => {
    fakeServer(
      { openSubsonic: true, type: "Navidrome", serverVersion: "0.52.5" },
      [
        { name: "songLyrics", versions: [1, 2] },
        { name: "transcodeOffset", versions: [1] },
      ]
    );

    const probe = await probeSubsonicServer(
      new SubsonicClient({ baseUrl: "https://music.test" }),
      creds
    );

    expect(probe?.openSubsonic).toBe(true);
    expect(probe?.serverType).toBe("Navidrome");
    expect(probe?.serverVersion).toBe("0.52.5");
    expect(probe?.extensions).toEqual([
      {
        name: "songLyrics",
        versions: [1, 2],
        supported: true,
        descriptionKey: "source.extensionSongLyrics",
      },
      {
        name: "transcodeOffset",
        versions: [1],
        supported: false,
      },
    ]);
  });

  it("identifies the server from its URL alone, without credentials", async () => {
    const calls = fakeServer(
      { openSubsonic: true, type: "Navidrome", serverVersion: "0.52.5" },
      [{ name: "songLyrics", versions: [1] }],
      { authFailed: true }
    );

    const probe = await probeSubsonicServer(
      new SubsonicClient({ baseUrl: "https://music.test" }),
      { username: "", password: "" }
    );

    expect(probe?.openSubsonic).toBe(true);
    expect(probe?.serverType).toBe("Navidrome");
    expect(probe?.serverVersion).toBe("0.52.5");
    // The extension list is an endpoint result, so it needs a valid login.
    expect(probe?.extensions).toEqual([]);
    expect(calls).toEqual(["ping"]);
  });

  it("detects a plain Subsonic server without credentials", async () => {
    fakeServer({}, undefined, { authFailed: true });

    const probe = await probeSubsonicServer(
      new SubsonicClient({ baseUrl: "https://music.test" }),
      { username: "", password: "" }
    );

    expect(probe).toEqual({ openSubsonic: false, extensions: [] });
  });

  it("returns null when the URL is not a Subsonic server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ hello: "world" }),
      }))
    );

    const probe = await probeSubsonicServer(
      new SubsonicClient({ baseUrl: "https://music.test" }),
      creds
    );

    expect(probe).toBeNull();
  });

  it("returns null when the host is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const probe = await probeSubsonicServer(
      new SubsonicClient({ baseUrl: "https://music.test" }),
      creds
    );

    expect(probe).toBeNull();
  });

  it("treats an unimplemented extension endpoint as unknown, not empty", async () => {
    fakeServer({ openSubsonic: true, type: "Older" }, "error");

    const probe = await probeSubsonicServer(
      new SubsonicClient({ baseUrl: "https://music.test" }),
      creds
    );

    expect(probe?.openSubsonic).toBe(true);
    expect(probe?.extensions).toEqual([]);
  });

  it("drops malformed extension entries instead of failing", async () => {
    fakeServer({ openSubsonic: true }, [
      { name: "songLyrics", versions: [1] },
      { versions: [1] },
    ]);

    const probe = await probeSubsonicServer(
      new SubsonicClient({ baseUrl: "https://music.test" }),
      creds
    );

    expect(probe?.extensions.map((e) => e.name)).toEqual(["songLyrics"]);
  });
});
