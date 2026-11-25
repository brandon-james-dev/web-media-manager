import { describe, expect, it } from "vitest";
import { isPluginMetadataProvider } from "@/core/plugins";
import itunes from "../../../../examples/metadata/itunes/manifest.json";
import { validatePluginManifest } from "./validateManifest";

const visualizerManifest = {
  id: "aurora",
  name: "Aurora",
  version: "0.1.1",
  runtime: "webgl-shader",
  entry: "shader.frag",
};

const lyricsManifest = {
  id: "example-lyrics",
  name: "Example Lyrics",
  version: "1.0.0",
  kind: "lyrics",
  provider: {
    id: "example-lyrics",
    name: "Example Lyrics",
    search: {
      url: "https://lyrics.example.test/api/search",
      params: { title: "track_name", artist: "artist_name" },
      fields: { title: "trackName", artist: "artistName" },
    },
  },
};

function codes(result: ReturnType<typeof validatePluginManifest>): string[] {
  return result.issues
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.code);
}

describe("validatePluginManifest", () => {
  it("accepts a visualizer manifest with a runtime and entry", () => {
    const result = validatePluginManifest(visualizerManifest, ["shader.frag"]);

    expect(result.valid).toBe(true);
    expect(result.manifest?.kind).toBe("visualizer");
    expect(result.manifest?.runtime).toBe("webgl-shader");
  });

  it("still requires a runtime and entry for visualizer plugins", () => {
    const result = validatePluginManifest(
      { id: "aurora", name: "Aurora", version: "1.0.0" },
      []
    );

    expect(result.valid).toBe(false);
    expect(codes(result)).toEqual(
      expect.arrayContaining(["runtime-unknown", "entry-missing"])
    );
  });

  it("accepts a lyrics manifest without a runtime or entry", () => {
    const result = validatePluginManifest(lyricsManifest, []);

    expect(result.valid).toBe(true);
    expect(result.manifest?.kind).toBe("lyrics");
    expect(result.manifest?.runtime).toBeUndefined();
    expect(result.manifest?.entry).toBeUndefined();
    expect(result.manifest?.provider?.id).toBe("example-lyrics");
  });

  it("requires a provider for a lyrics plugin", () => {
    const result = validatePluginManifest(
      { id: "example", name: "Example", version: "1.0.0", kind: "lyrics" },
      []
    );

    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("provider-missing");
  });

  it("rejects a provider endpoint that is not https", () => {
    const result = validatePluginManifest(
      {
        ...lyricsManifest,
        provider: {
          ...lyricsManifest.provider,
          search: {
            ...lyricsManifest.provider.search,
            url: "http://lyrics.example.test/api/search",
          },
        },
      },
      []
    );

    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("provider-invalid");
  });

  it("requires title and artist field mappings", () => {
    const result = validatePluginManifest(
      {
        ...lyricsManifest,
        provider: {
          ...lyricsManifest.provider,
          search: {
            ...lyricsManifest.provider.search,
            fields: { title: "trackName" },
          },
        },
      },
      []
    );

    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("provider-invalid");
  });

  it("rejects an unknown query field in the parameter map", () => {
    const result = validatePluginManifest(
      {
        ...lyricsManifest,
        provider: {
          ...lyricsManifest.provider,
          search: {
            ...lyricsManifest.provider.search,
            params: { genre: "genre" },
          },
        },
      },
      []
    );

    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("provider-invalid");
  });

  it("rejects an unknown plugin kind", () => {
    const result = validatePluginManifest(
      { ...visualizerManifest, kind: "widget" },
      ["shader.frag"]
    );

    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("kind-invalid");
  });

  it("accepts a declarative source provider", () => {
    const result = validatePluginManifest(
      {
        id: "webdav-source",
        name: "WebDAV",
        version: "0.1.0",
        kind: "source",
        provider: {
          id: "webdav",
          name: "WebDAV",
          config: [
            { key: "baseUrl", label: "Server URL", required: true },
            { key: "password", label: "Password", secret: true },
          ],
          library: {
            url: "{baseUrl}",
            method: "PROPFIND",
            body: "<propfind/>",
            recordTag: "d:response",
            fields: { id: "href", title: "displayname", artist: "displayname" },
          },
          stream: { url: "{baseUrl}/{path}" },
        },
      },
      []
    );

    expect(codes(result)).toEqual([]);
    expect(result.valid).toBe(true);
    expect(result.manifest?.provider).toMatchObject({
      id: "webdav",
      library: { method: "PROPFIND", recordTag: "d:response" },
    });
  });

  it("rejects a source provider without the required field mappings", () => {
    const result = validatePluginManifest(
      {
        id: "webdav-source",
        name: "WebDAV",
        version: "0.1.0",
        kind: "source",
        provider: {
          id: "webdav",
          name: "WebDAV",
          library: {
            url: "https://dav.example.test/music",
            fields: { id: "href", title: "displayname" },
          },
        },
      },
      []
    );

    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("provider-invalid");
  });

  it("rejects a source provider whose library URL is not https", () => {
    const result = validatePluginManifest(
      {
        id: "webdav-source",
        name: "WebDAV",
        version: "0.1.0",
        kind: "source",
        provider: {
          id: "webdav",
          name: "WebDAV",
          library: {
            url: "http://dav.example.test/music",
            fields: { id: "href", title: "name", artist: "name" },
          },
        },
      },
      []
    );

    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("provider-invalid");
  });

  it("accepts a metadata manifest with a search endpoint and field map", () => {
    const result = validatePluginManifest(
      {
        id: "example-metadata",
        name: "Example Metadata",
        version: "1.0.0",
        kind: "metadata",
        provider: {
          id: "example-metadata",
          name: "Example Metadata",
          search: {
            url: "https://metadata.example.test/api/search",
            params: { title: "track", artist: "artist" },
            fields: { title: "trackName", artist: "artistName" },
          },
        },
      },
      []
    );

    expect(result.valid).toBe(true);
    expect(result.manifest?.kind).toBe("metadata");
    expect(result.manifest?.provider).toMatchObject({
      role: "metadata",
      id: "example-metadata",
    });
  });

  it("requires a provider for metadata plugins", () => {
    const result = validatePluginManifest(
      {
        id: "example-metadata",
        name: "Example Metadata",
        version: "1.0.0",
        kind: "metadata",
      },
      []
    );

    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("provider-missing");
  });

  it("requires title and artist in a metadata field map", () => {
    const result = validatePluginManifest(
      {
        id: "example-metadata",
        name: "Example Metadata",
        version: "1.0.0",
        kind: "metadata",
        provider: {
          id: "example-metadata",
          name: "Example Metadata",
          search: {
            url: "https://metadata.example.test/api/search",
            fields: { title: "trackName" },
          },
        },
      },
      []
    );

    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("provider-invalid");
  });

  it("rejects a metadata search URL that is not https", () => {
    const result = validatePluginManifest(
      {
        id: "example-metadata",
        name: "Example Metadata",
        version: "1.0.0",
        kind: "metadata",
        provider: {
          id: "example-metadata",
          name: "Example Metadata",
          search: {
            url: "http://metadata.example.test/api/search",
            fields: { title: "trackName", artist: "artistName" },
          },
        },
      },
      []
    );

    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("provider-invalid");
  });

  it("accepts literal query parameters, a method and a token exchange", () => {
    const result = validatePluginManifest(
      {
        id: "spotify-metadata",
        name: "Spotify Metadata",
        version: "0.1.0",
        kind: "metadata",
        provider: {
          role: "metadata",
          id: "spotify-metadata",
          name: "Spotify Metadata",
          search: {
            url: "https://api.spotify.com/v1/search",
            params: { title: "q" },
            query: { type: "track" },
            method: "GET",
            fields: { title: "name", artist: "artists.0.name" },
          },
          auth: {
            url: "https://accounts.spotify.com/api/token",
            method: "POST",
            body: "grant_type=client_credentials",
            tokenPath: "access_token",
          },
        },
      },
      []
    );

    expect(result.valid).toBe(true);
    const provider = result.manifest?.provider;
    expect(
      provider && isPluginMetadataProvider(provider)
        ? provider.search.query
        : undefined
    ).toEqual({ type: "track" });
    expect(
      provider && isPluginMetadataProvider(provider)
        ? provider.auth?.tokenPath
        : undefined
    ).toBe("access_token");
  });

  it("accepts a per-record detail request and keeps its field map", () => {
    const result = validatePluginManifest(
      {
        id: "spotify-metadata",
        name: "Spotify",
        version: "0.1.0",
        kind: "metadata",
        provider: {
          role: "metadata",
          id: "spotify-metadata",
          name: "Spotify",
          search: {
            url: "https://api.spotify.com/v1/search",
            params: { title: "q" },
            query: { type: "track" },
            fields: { title: "name", artist: "artists.0.name" },
            detail: {
              url: "https://api.spotify.com/v1/artists/{artists.0.id}",
              fields: { genre: "genres.0" },
            },
          },
        },
      },
      []
    );

    expect(result.valid).toBe(true);
    const provider = result.manifest?.provider;
    expect(
      provider && isPluginMetadataProvider(provider)
        ? provider.search.detail
        : undefined
    ).toEqual({
      url: "https://api.spotify.com/v1/artists/{artists.0.id}",
      fields: { genre: "genres.0" },
    });
  });

  it("rejects a detail request over plain http", () => {
    const result = validatePluginManifest(
      {
        id: "spotify-metadata",
        name: "Spotify",
        version: "0.1.0",
        kind: "metadata",
        provider: {
          role: "metadata",
          id: "spotify-metadata",
          name: "Spotify",
          search: {
            url: "https://api.spotify.com/v1/search",
            fields: { title: "name", artist: "artistName" },
            detail: {
              url: "http://api.spotify.com/v1/artists/{id}",
              fields: { genre: "genres.0" },
            },
          },
        },
      },
      []
    );

    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("provider-invalid");
  });

  it("rejects a token exchange without a token path", () => {
    const result = validatePluginManifest(
      {
        id: "spotify-metadata",
        name: "Spotify Metadata",
        version: "0.1.0",
        kind: "metadata",
        provider: {
          role: "metadata",
          id: "spotify-metadata",
          name: "Spotify Metadata",
          search: {
            url: "https://api.spotify.com/v1/search",
            fields: { title: "name", artist: "artistName" },
          },
          auth: { url: "https://accounts.spotify.com/api/token" },
        },
      },
      []
    );

    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("provider-invalid");
  });

  it("rejects a token exchange over plain http", () => {
    const result = validatePluginManifest(
      {
        id: "spotify-metadata",
        name: "Spotify Metadata",
        version: "0.1.0",
        kind: "metadata",
        provider: {
          role: "metadata",
          id: "spotify-metadata",
          name: "Spotify Metadata",
          search: {
            url: "https://api.spotify.com/v1/search",
            fields: { title: "name", artist: "artistName" },
          },
          auth: {
            url: "http://accounts.spotify.com/api/token",
            tokenPath: "access_token",
          },
        },
      },
      []
    );

    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("provider-invalid");
  });

  it.each([["itunes", itunes]])(
    "accepts the shipped %s metadata example",
    (_name, manifest) => {
      const result = validatePluginManifest(manifest, []);

      expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(result.valid).toBe(true);
      expect(result.manifest?.kind).toBe("metadata");
    }
  );
});
