import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { PluginArchiveError, readZipArchive } from "./readZipArchive";

function buildZip(files: Record<string, string>): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [path, contents] of Object.entries(files)) {
    entries[path] = strToU8(contents);
  }
  return zipSync(entries);
}

describe("readZipArchive", () => {
  it("reads files and normalizes their paths", () => {
    const entries = readZipArchive(
      buildZip({
        "manifest.json": "{}",
        "shaders/fragment.glsl": "void main() {}",
      })
    );

    expect(entries.map((entry) => entry.path)).toEqual([
      "manifest.json",
      "shaders/fragment.glsl",
    ]);
    expect(new TextDecoder().decode(entries[1].bytes)).toBe("void main() {}");
  });

  it("strips a single wrapping folder", () => {
    const entries = readZipArchive(
      buildZip({
        "alchemy/manifest.json": "{}",
        "alchemy/fragment.glsl": "void main() {}",
      })
    );

    expect(entries.map((entry) => entry.path)).toEqual([
      "fragment.glsl",
      "manifest.json",
    ]);
  });

  it("keeps the folder when entries are not all under one root", () => {
    const entries = readZipArchive(
      buildZip({
        "manifest.json": "{}",
        "shaders/fragment.glsl": "void main() {}",
      })
    );

    expect(entries.map((entry) => entry.path)).toEqual([
      "manifest.json",
      "shaders/fragment.glsl",
    ]);
  });

  it("rejects path traversal", () => {
    expect(() => readZipArchive(buildZip({ "../escape.js": "" }))).toThrow(
      PluginArchiveError
    );
  });

  it("rejects an empty archive", () => {
    expect(() => readZipArchive(new Uint8Array())).toThrow(PluginArchiveError);
  });

  it("rejects unreadable bytes", () => {
    expect(() => readZipArchive(strToU8("not a zip"))).toThrow(
      PluginArchiveError
    );
  });

  it("enforces the per-file size limit", () => {
    expect(() =>
      readZipArchive(buildZip({ "big.bin": "0123456789" }), {
        maxEntryBytes: 4,
      })
    ).toThrow(/per-file limit/);
  });

  it("enforces the total size limit", () => {
    expect(() =>
      readZipArchive(buildZip({ "a.txt": "0123456789" }), {
        maxTotalBytes: 4,
      })
    ).toThrow(/expands to/);
  });
});
