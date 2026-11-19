import { describe, expect, it } from "vitest";
import type { Song } from "@/models";
import {
  filterLibrarySongs,
  songsForSelection,
  summarize,
} from "./filterSongs";
import { EMPTY_LIBRARY_PAGE_STATE } from "./librarySelection";
import type { LibraryPageState } from "./librarySelection";

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
    year: 2005,
    duration: 287,
  }),
  song({
    id: "2",
    title: "Speed of Sound",
    artist: "Coldplay",
    albumArtist: "Coldplay",
    album: "X&Y",
    genre: "Rock",
    year: 2005,
    duration: 288,
  }),
  song({
    id: "3",
    title: "Blue Monday",
    artist: "New Order",
    albumArtist: "New Order",
    album: "Power, Corruption & Lies",
    genre: "Electronic",
    year: 1983,
    duration: 450,
  }),
  song({
    id: "4",
    title: "Guest Spot",
    artist: "A Guest",
    albumArtist: "New Order",
    album: "Power, Corruption & Lies",
    genre: "Electronic",
    duration: 200,
    sourceId: "server",
  }),
];

function state(patch: Partial<LibraryPageState> = {}): LibraryPageState {
  return { ...EMPTY_LIBRARY_PAGE_STATE, ...patch };
}

describe("filterLibrarySongs", () => {
  it("keeps every song for the all selection", () => {
    expect(filterLibrarySongs(songs, state()).map((s) => s.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("matches an artist through albumArtist or artist", () => {
    expect(
      filterLibrarySongs(
        songs,
        state({ selection: { kind: "artist", value: "New Order" } })
      ).map((s) => s.id)
    ).toEqual(["3", "4"]);
    expect(
      filterLibrarySongs(
        songs,
        state({ selection: { kind: "artist", value: "A Guest" } })
      ).map((s) => s.id)
    ).toEqual(["4"]);
  });

  it("keeps every song for a view selection", () => {
    expect(
      filterLibrarySongs(
        songs,
        state({ selection: { kind: "view", view: "artists" } })
      ).map((s) => s.id)
    ).toEqual(["1", "2", "3", "4"]);
  });

  it("matches an album and a genre by value", () => {
    expect(
      filterLibrarySongs(
        songs,
        state({ selection: { kind: "album", value: "X&Y" } })
      ).map((s) => s.id)
    ).toEqual(["1", "2"]);
    expect(
      filterLibrarySongs(
        songs,
        state({ selection: { kind: "genre", value: "Electronic" } })
      ).map((s) => s.id)
    ).toEqual(["3", "4"]);
  });

  it("matches a year by its string value and skips songs without one", () => {
    expect(
      filterLibrarySongs(
        songs,
        state({ selection: { kind: "year", value: "2005" } })
      ).map((s) => s.id)
    ).toEqual(["1", "2"]);
    expect(
      filterLibrarySongs(
        songs,
        state({ selection: { kind: "year", value: "1983" } })
      ).map((s) => s.id)
    ).toEqual(["3"]);
    expect(
      filterLibrarySongs(
        songs,
        state({ selection: { kind: "year", value: "1999" } })
      )
    ).toEqual([]);
  });

  it("keeps a playlist's own order and drops ids it does not hold", () => {
    expect(
      filterLibrarySongs(
        songs,
        state({ selection: { kind: "playlist", id: "p1" } }),
        ["3", "missing", "1"]
      ).map((s) => s.id)
    ).toEqual(["3", "1"]);
  });

  it("shows nothing for a playlist whose songs are not loaded yet", () => {
    expect(
      filterLibrarySongs(
        songs,
        state({ selection: { kind: "playlist", id: "p1" } })
      )
    ).toEqual([]);
  });

  it("matches the query on title, album, artist and genre, ignoring case", () => {
    expect(
      filterLibrarySongs(songs, state({ query: "BLUE" })).map((s) => s.id)
    ).toEqual(["3"]);
    expect(
      filterLibrarySongs(songs, state({ query: "x&y" })).map((s) => s.id)
    ).toEqual(["1", "2"]);
    expect(
      filterLibrarySongs(songs, state({ query: "electronic" })).map((s) => s.id)
    ).toEqual(["3", "4"]);
    expect(filterLibrarySongs(songs, state({ query: "  " })).length).toBe(4);
  });

  it("narrows by source before the selection", () => {
    expect(
      filterLibrarySongs(songs, state({ sourceIds: ["server"] })).map(
        (s) => s.id
      )
    ).toEqual(["4"]);
    expect(
      filterLibrarySongs(
        songs,
        state({
          sourceIds: ["local"],
          selection: { kind: "artist", value: "New Order" },
        })
      ).map((s) => s.id)
    ).toEqual(["3"]);
  });
});

describe("songsForSelection", () => {
  it("keeps a group's songs whatever the page's source filter says", () => {
    expect(
      songsForSelection(songs, { kind: "artist", value: "New Order" }).map(
        (s) => s.id
      )
    ).toEqual(["3", "4"]);
    expect(
      songsForSelection(songs, { kind: "album", value: "X&Y" }).map((s) => s.id)
    ).toEqual(["1", "2"]);
    expect(
      songsForSelection(songs, { kind: "genre", value: "Electronic" }).map(
        (s) => s.id
      )
    ).toEqual(["3", "4"]);
  });

  it("keeps every song for the all selection", () => {
    expect(songsForSelection(songs, { kind: "all" }).map((s) => s.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("holds no songs for a playlist whose entries are not passed in", () => {
    expect(songsForSelection(songs, { kind: "playlist", id: "p1" })).toEqual(
      []
    );
  });
});

describe("summarize", () => {
  it("counts the songs and adds their lengths", () => {
    expect(summarize(songs)).toEqual({ count: 4, totalSeconds: 1225 });
  });

  it("reports an empty list as zero", () => {
    expect(summarize([])).toEqual({ count: 0, totalSeconds: 0 });
  });

  it("treats a missing length as zero", () => {
    expect(summarize([song({ id: "5" })])).toEqual({
      count: 1,
      totalSeconds: 0,
    });
  });
});
