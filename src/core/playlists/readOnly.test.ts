import { describe, expect, it } from "vitest";

import { isPlaylistReadOnly } from "@/core/playlists/readOnly";

const writable = { id: "local", capabilities: { playlistWrite: true } };
const readOnly = { id: "remote", capabilities: { playlistWrite: false } };
const sources = [writable, readOnly] as Parameters<
  typeof isPlaylistReadOnly
>[1];

describe("isPlaylistReadOnly", () => {
  it("allows app-created playlists", () => {
    expect(isPlaylistReadOnly({}, sources)).toBe(false);
  });

  it("allows playlists from a source that can write them", () => {
    expect(isPlaylistReadOnly({ sourceId: "local" }, sources)).toBe(false);
  });

  it("locks playlists from a source that cannot write them", () => {
    expect(isPlaylistReadOnly({ sourceId: "remote" }, sources)).toBe(true);
  });

  it("locks playlists whose source is gone", () => {
    expect(isPlaylistReadOnly({ sourceId: "missing" }, sources)).toBe(true);
  });
});
