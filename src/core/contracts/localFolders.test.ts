import { describe, expect, it } from "vitest";
import {
  localSourceFolders,
  localSourceName,
  resolveLocalSongFolder,
} from "./sources";

const dir = (name: string) =>
  ({ name }) as unknown as FileSystemDirectoryHandle;

describe("local source folders", () => {
  const a = dir("A");
  const b = dir("B");

  it("names a source after its first folder plus a count", () => {
    expect(localSourceName([a])).toBe("A");
    expect(localSourceName([a, b])).toBe("A +1");
  });

  it("falls back to handle for older single-folder records", () => {
    expect(localSourceFolders({ handle: a })).toEqual([a]);
    expect(localSourceFolders({ handle: a, handles: [a, b] })).toEqual([a, b]);
  });

  it("resolves a single folder with the full path", () => {
    expect(resolveLocalSongFolder({ handle: a }, "B/x.mp3")).toEqual({
      folder: a,
      path: "B/x.mp3",
    });
  });

  it("routes by folder-name prefix with several folders", () => {
    const src = { handle: a, handles: [a, b] };
    expect(resolveLocalSongFolder(src, "B/x/y.mp3")).toEqual({
      folder: b,
      path: "x/y.mp3",
    });
  });

  it("uses the first folder for unprefixed legacy paths", () => {
    const src = { handle: a, handles: [a, b] };
    expect(resolveLocalSongFolder(src, "x/y.mp3")).toEqual({
      folder: a,
      path: "x/y.mp3",
    });
  });
});
