import { describe, expect, it } from "vitest";
import { matchAlbumTracks } from "./matchAlbumTracks";

const tracks = [
  { title: "One", track: 1 },
  { title: "Two", track: 2 },
  { title: "Three", track: 3 },
];

describe("matchAlbumTracks", () => {
  it("matches numbered rows by track number", () => {
    const rows = [{ track: 3 }, { track: 1 }, { track: 2 }];

    expect(matchAlbumTracks(rows, tracks).map((track) => track?.title)).toEqual(
      ["Three", "One", "Two"]
    );
  });

  it("falls back to position when the rows have no track numbers", () => {
    expect(
      matchAlbumTracks([{}, {}, {}], tracks).map((track) => track?.title)
    ).toEqual(["One", "Two", "Three"]);
  });

  it("falls back to position for an unnumbered row", () => {
    const rows = [{ track: 1 }, {}, { track: 3 }];

    expect(matchAlbumTracks(rows, tracks).map((track) => track?.title)).toEqual(
      ["One", "Two", "Three"]
    );
  });

  it("returns no match for every row when the lookup has no tracks", () => {
    expect(matchAlbumTracks([{ track: 1 }], [])).toEqual([undefined]);
  });
});
