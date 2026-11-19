import { describe, expect, it } from "vitest";
import type { UseTranslationResult } from "@/i18n";
import type { Song } from "@/models";
import {
  buildLibraryTree,
  defaultExpandedIds,
  flattenVisible,
} from "./libraryTreeModel";

const t = ((key: string) => key) as unknown as UseTranslationResult["t"];

function song(overrides: Partial<Song> & { id: string }): Song {
  return {
    sourceId: "local",
    relativePath: `${overrides.id}.mp3`,
    filename: `${overrides.id}.mp3`,
    filesize: 1024,
    ...overrides,
  } as Song;
}

const songs: Song[] = [
  song({
    id: "1",
    title: "Square One",
    artist: "Coldplay",
    albumArtist: "Coldplay",
    album: "X&Y",
    genre: "Rock",
  }),
  song({
    id: "2",
    title: "Blue Monday",
    artist: "New Order",
    albumArtist: "New Order",
    album: "Power, Corruption & Lies",
    genre: "Electronic",
  }),
];

const playlists = [
  { id: "p1", name: "Morning", songs: [{ songId: "1" }] },
  { id: "p2", name: "Evening", songs: [] },
];

describe("buildLibraryTree", () => {
  it("follows the order of views", () => {
    const tree = buildLibraryTree({
      views: ["playlists", "artists", "albums", "songs", "genres"],
      songs,
      playlists,
      t,
    });

    expect(tree.map((node) => node.id)).toEqual([
      "group:library",
      "group:playlists",
    ]);
    expect(tree[0]?.children.map((node) => node.id)).toEqual([
      "view:artists",
      "view:albums",
      "view:songs",
      "view:genres",
    ]);
  });

  it("sorts the top level by label", () => {
    const labels: Record<string, string> = {
      "navigation.playlists": "A playlists",
      "navigation.library": "Z library",
    };
    const sorted = ((key: string) =>
      labels[key] ?? key) as unknown as UseTranslationResult["t"];

    const tree = buildLibraryTree({
      views: ["playlists", "songs"],
      songs,
      playlists,
      t: sorted,
    });

    expect(tree.map((node) => node.id)).toEqual([
      "group:playlists",
      "group:library",
    ]);
  });

  it("omits the playlists node when playlists is not a view", () => {
    const tree = buildLibraryTree({
      views: ["artists", "songs"],
      songs,
      playlists,
      t,
    });

    expect(tree.map((node) => node.id)).toEqual(["group:library"]);
    expect(tree[0]?.children.map((node) => node.id)).toEqual([
      "view:artists",
      "view:songs",
    ]);
  });

  it("lists each playlist as a leaf that selects it", () => {
    const tree = buildLibraryTree({
      views: ["playlists"],
      songs,
      playlists,
      t,
    });

    const children = tree[1]?.children ?? [];
    expect(children.map((node) => node.label)).toEqual([
      "playlist.new",
      "Morning",
      "Evening",
    ]);
    expect(children[1]?.selection).toEqual({ kind: "playlist", id: "p1" });
    expect(children[1]?.children).toEqual([]);
  });

  it("puts a create-playlist action first under the playlists node", () => {
    const tree = buildLibraryTree({
      views: ["playlists"],
      songs,
      playlists,
      t,
    });

    const action = tree[1]?.children[0];
    expect(action?.id).toBe("action:createPlaylist");
    expect(action?.kind).toBe("action");
    expect(action?.selection).toBeUndefined();
    expect(action?.depth).toBe(1);
    expect(action?.children).toEqual([]);
  });

  it("groups a view's values under it and selects them", () => {
    const tree = buildLibraryTree({
      views: ["artists"],
      songs,
      playlists,
      t,
    });

    const artists = tree[0]?.children[0];
    expect(artists?.children.map((node) => node.label)).toEqual([
      "Coldplay",
      "New Order",
    ]);
    expect(artists?.children[0]?.selection).toEqual({
      kind: "artist",
      value: "Coldplay",
    });
    expect(artists?.children[0]?.depth).toBe(2);
  });

  it("makes songs a leaf that selects everything", () => {
    const tree = buildLibraryTree({
      views: ["songs"],
      songs,
      playlists,
      t,
    });

    const node = tree[0]?.children[0];
    expect(node?.selection).toEqual({ kind: "all" });
    expect(node?.children).toEqual([]);
  });

  it("gives each view node the selection that lists its entries", () => {
    const tree = buildLibraryTree({
      views: ["artists", "albums", "genres", "songs"],
      songs,
      playlists,
      t,
    });

    const library = tree[0];
    expect(library?.selection).toEqual({ kind: "all" });
    expect(library?.children.map((node) => node.selection)).toEqual([
      { kind: "view", view: "artists" },
      { kind: "view", view: "albums" },
      { kind: "view", view: "genres" },
      { kind: "all" },
    ]);
  });

  it("gives the playlists group the selection that lists the playlists", () => {
    const tree = buildLibraryTree({
      views: ["playlists", "songs"],
      songs,
      playlists,
      t,
    });

    expect(tree[1]?.selection).toEqual({ kind: "view", view: "playlists" });
  });
});

describe("defaultExpandedIds", () => {
  it("opens both groups and no view", () => {
    const tree = buildLibraryTree({
      views: ["playlists", "artists", "songs"],
      songs,
      playlists,
      t,
    });

    expect([...defaultExpandedIds(tree)]).toEqual([
      "group:library",
      "group:playlists",
    ]);
  });

  it("opens only the library group when playlists is not a view", () => {
    const tree = buildLibraryTree({
      views: ["songs"],
      songs,
      playlists,
      t,
    });

    expect([...defaultExpandedIds(tree)]).toEqual(["group:library"]);
  });
});

describe("flattenVisible", () => {
  it("hides the children of a collapsed node", () => {
    const tree = buildLibraryTree({
      views: ["playlists", "artists", "songs"],
      songs,
      playlists,
      t,
    });

    expect(
      flattenVisible(tree, new Set(["group:library"])).map((node) => node.id)
    ).toEqual([
      "group:library",
      "view:artists",
      "view:songs",
      "group:playlists",
    ]);
  });

  it("shows a view's values once the view is open", () => {
    const tree = buildLibraryTree({
      views: ["artists"],
      songs,
      playlists,
      t,
    });

    expect(
      flattenVisible(tree, new Set(["group:library", "view:artists"])).map(
        (node) => node.id
      )
    ).toEqual([
      "group:library",
      "view:artists",
      "value:artists:Coldplay",
      "value:artists:New Order",
    ]);
  });

  it("shows only the two top-level nodes when nothing is open", () => {
    const tree = buildLibraryTree({
      views: ["playlists", "artists"],
      songs,
      playlists,
      t,
    });

    expect(flattenVisible(tree, new Set()).map((node) => node.id)).toEqual([
      "group:library",
      "group:playlists",
    ]);
  });
});
