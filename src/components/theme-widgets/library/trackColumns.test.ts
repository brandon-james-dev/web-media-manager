import { describe, expect, it } from "vitest";
import type { Song } from "@/models";
import {
  clampWidth,
  flattenGroups,
  groupByAlbum,
  moveColumn,
  parseColumns,
  reconcileColumnOrder,
  resolveAlbumsLayout,
} from "./trackColumns";

function song(overrides: Partial<Song> & { id: string }): Song {
  return {
    sourceId: "local",
    relativePath: `${overrides.id}.mp3`,
    filename: `${overrides.id}.mp3`,
    filesize: 1024,
    ...overrides,
  } as Song;
}

const labels = {
  unknownArtist: "Unknown Artist",
  unknownAlbum: "Unknown Album",
};

describe("parseColumns", () => {
  it("keeps the named columns in order and drops unknown names", () => {
    expect(parseColumns("track title nope duration", "table")).toEqual([
      "track",
      "title",
      "duration",
    ]);
  });

  it("drops a repeated column after its first place", () => {
    expect(parseColumns("title artist title", "table")).toEqual([
      "title",
      "artist",
    ]);
  });

  it("drops album for the album-grouped variant", () => {
    expect(parseColumns("track album title", "albums")).toEqual([
      "track",
      "title",
    ]);
    expect(parseColumns("track album title", "table")).toEqual([
      "track",
      "album",
      "title",
    ]);
  });
});

describe("resolveAlbumsLayout", () => {
  it("groups the albums variant while it sorts by album", () => {
    expect(resolveAlbumsLayout("albums", "album", ["track", "title"])).toEqual({
      grouped: true,
      columns: ["track", "title"],
    });
  });

  it("drops the album column from the grouped form", () => {
    expect(
      resolveAlbumsLayout("albums", "album", ["track", "album", "title"])
    ).toEqual({ grouped: true, columns: ["track", "title"] });
  });

  it("flattens the albums variant and puts album first for another sort", () => {
    expect(resolveAlbumsLayout("albums", "title", ["track", "title"])).toEqual({
      grouped: false,
      columns: ["album", "track", "title"],
    });
  });

  it("keeps a listed album column where it is in the flat form", () => {
    expect(
      resolveAlbumsLayout("albums", "title", ["track", "album", "title"])
    ).toEqual({ grouped: false, columns: ["track", "album", "title"] });
  });

  it("leaves the table variant alone", () => {
    expect(resolveAlbumsLayout("table", "title", ["track", "title"])).toEqual({
      grouped: false,
      columns: ["track", "title"],
    });
  });
});

describe("clampWidth", () => {
  it("keeps a width inside the draggable range", () => {
    expect(clampWidth(120)).toBe(120);
    expect(clampWidth(10)).toBe(40);
    expect(clampWidth(2000)).toBe(800);
    expect(clampWidth(Number.NaN)).toBe(40);
  });
});

describe("reconcileColumnOrder", () => {
  it("drops stored columns the layout no longer lists", () => {
    expect(
      reconcileColumnOrder(
        ["duration", "gone", "title"],
        ["track", "title", "duration"]
      )
    ).toEqual(["duration", "title", "track"]);
  });

  it("appends layout columns the order is missing, in layout order", () => {
    expect(
      reconcileColumnOrder(["duration"], ["track", "title", "duration"])
    ).toEqual(["duration", "track", "title"]);
  });

  it("returns the layout order for an empty or unknown order", () => {
    expect(reconcileColumnOrder([], ["track", "title"])).toEqual([
      "track",
      "title",
    ]);
    expect(reconcileColumnOrder(["nope"], ["track", "title"])).toEqual([
      "track",
      "title",
    ]);
  });

  it("keeps the first place of a repeated column", () => {
    expect(
      reconcileColumnOrder(["title", "title"], ["track", "title"])
    ).toEqual(["title", "track"]);
  });
});

describe("moveColumn", () => {
  const order = ["track", "title", "duration"] as const;

  it("moves a column to the end edge of a later column", () => {
    expect(moveColumn(order, "track", "duration")).toEqual([
      "title",
      "track",
      "duration",
    ]);
  });

  it("moves a column to the start edge of an earlier column", () => {
    expect(moveColumn(order, "duration", "track")).toEqual([
      "duration",
      "track",
      "title",
    ]);
  });

  it("does nothing when the column moves onto itself", () => {
    expect(moveColumn(order, "title", "title")).toEqual([
      "track",
      "title",
      "duration",
    ]);
  });

  it("does nothing when the target is not in the order", () => {
    expect(moveColumn(order, "title", "album")).toEqual([
      "track",
      "title",
      "duration",
    ]);
  });
});

describe("groupByAlbum", () => {
  const songs: Song[] = [
    song({
      id: "1",
      title: "Square One",
      artist: "Coldplay",
      albumArtist: "Coldplay",
      album: "X&Y",
      genre: "Rock",
      year: 2005,
      discNumber: 1,
      track: 2,
      pictures: [
        {
          mimeType: "image/jpeg",
          data: new Uint8Array(),
          type: "FrontCover",
        },
      ],
    }),
    song({
      id: "2",
      title: "White Shadows",
      artist: "Coldplay",
      albumArtist: "Coldplay",
      album: "X&Y",
      genre: "Rock",
      year: 2005,
      discNumber: 1,
      track: 1,
    }),
    song({
      id: "3",
      title: "Blue Monday",
      artist: "New Order",
      albumArtist: "New Order",
      album: "Power, Corruption & Lies",
      genre: "Electronic",
      year: 1983,
      discNumber: 1,
      track: 1,
    }),
    song({ id: "4", title: "Loose", artist: "Nobody", track: 1 }),
  ];

  it("orders groups by album then artist", () => {
    const groups = groupByAlbum(songs, undefined, false, labels);
    expect(groups.map((group) => group.album)).toEqual([
      "Power, Corruption & Lies",
      "X&Y",
      "Unknown Album",
    ]);
  });

  it("breaks an album name tie by album artist", () => {
    const groups = groupByAlbum(
      [
        song({ id: "1", album: "Greatest Hits", albumArtist: "Queen" }),
        song({ id: "2", album: "Greatest Hits", albumArtist: "ABBA" }),
      ],
      undefined,
      false,
      labels
    );
    expect(groups.map((group) => group.albumArtist)).toEqual(["ABBA", "Queen"]);
  });

  it("puts the unknown album last", () => {
    const groups = groupByAlbum(songs, undefined, false, labels);
    const loose = groups[2];
    expect(loose?.album).toBe("Unknown Album");
    expect(loose?.albumArtist).toBe("Nobody");
  });

  it("orders each album's songs by disc then track", () => {
    const groups = groupByAlbum(songs, undefined, false, labels);
    expect(groups[1]?.songs.map((entry) => entry.id)).toEqual(["2", "1"]);
  });

  it("sorts within a group by the given column instead", () => {
    const groups = groupByAlbum(songs, (entry) => entry.title, false, labels);
    expect(groups[1]?.songs.map((entry) => entry.id)).toEqual(["1", "2"]);
  });

  it("reverses the in-group sort when descending", () => {
    const groups = groupByAlbum(songs, (entry) => entry.title, true, labels);
    expect(groups[1]?.songs.map((entry) => entry.id)).toEqual(["2", "1"]);
  });

  it("carries the album cell values and the song whose artwork it shows", () => {
    const groups = groupByAlbum(songs, undefined, false, labels);
    expect(groups[1]).toMatchObject({
      album: "X&Y",
      albumArtist: "Coldplay",
      genre: "Rock",
      year: 2005,
      pictureSongId: "1",
    });
    expect(groups[0]?.pictureSongId).toBe("3");
  });
});

describe("flattenGroups", () => {
  it("lists every song id in display order", () => {
    const groups = groupByAlbum(
      [
        song({ id: "1", album: "B", albumArtist: "A", track: 1 }),
        song({ id: "2", album: "A", albumArtist: "A", track: 1 }),
      ],
      undefined,
      false,
      labels
    );
    expect(flattenGroups(groups)).toEqual(["2", "1"]);
  });
});
