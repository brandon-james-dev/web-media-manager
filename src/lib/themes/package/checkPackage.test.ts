import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { checkArchive, checkManifest } from "./checkPackage";

const baseManifest = {
  kind: "theme",
  spec: "1.0",
  id: "classic-blue",
  name: "Classic Blue",
  version: "1.2.0",
  formFactors: ["desktop"],
  colorSchemes: ["dark"],
};

function zip(files: Record<string, string | Uint8Array>): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [path, contents] of Object.entries(files)) {
    entries[path] = typeof contents === "string" ? strToU8(contents) : contents;
  }
  return zipSync(entries, { level: 0 });
}

function packageFiles(
  extra: Record<string, string | Uint8Array> = {}
): Record<string, string | Uint8Array> {
  return {
    "manifest.json": JSON.stringify(baseManifest),
    "theme.xml": "<Theme />",
    "layouts/desktop.xml": "<Layout />",
    ...extra,
  };
}

function manifestFiles(
  manifest: Record<string, unknown>,
  extra: Record<string, string> = {}
): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>([
    ["manifest.json", strToU8(JSON.stringify(manifest))],
    ["theme.xml", strToU8("<Theme />")],
    ["layouts/desktop.xml", strToU8("<Layout />")],
  ]);
  for (const [path, contents] of Object.entries(extra)) {
    files.set(path, strToU8(contents));
  }
  return files;
}

function manifestCodes(
  manifest: Record<string, unknown>,
  extra: Record<string, string> = {},
  appVersion?: string
): string[] {
  return checkManifest(manifestFiles(manifest, extra), appVersion).issues.map(
    (issue) => issue.code
  );
}

describe("checkArchive", () => {
  it("stores a minimal package with no issues", () => {
    const { files, issues } = checkArchive(zip(packageFiles()));
    expect(issues).toEqual([]);
    expect([...files.keys()].sort()).toEqual([
      "layouts/desktop.xml",
      "manifest.json",
      "theme.xml",
    ]);
  });

  it("strips a single wrapping folder", () => {
    const wrapped = Object.fromEntries(
      Object.entries(packageFiles()).map(([path, value]) => [
        `classic-blue/${path}`,
        value,
      ])
    );
    const { files, issues } = checkArchive(zip(wrapped));
    expect(issues).toEqual([]);
    expect(files.has("theme.xml")).toBe(true);
  });

  it("reports an unreadable archive", () => {
    const { issues } = checkArchive(strToU8("not a zip"));
    expect(issues.map((issue) => issue.code)).toEqual(["E1001"]);
  });

  it("drops unknown files with a warning", () => {
    const { files, issues } = checkArchive(
      zip(packageFiles({ "notes.txt": "hi", "layouts/extra.xml": "<x/>" }))
    );
    expect(issues.map((issue) => [issue.code, issue.file])).toEqual([
      ["W1003", "layouts/extra.xml"],
      ["W1003", "notes.txt"],
    ]);
    expect(files.has("notes.txt")).toBe(false);
  });

  it("rejects disallowed asset extensions", () => {
    const { issues } = checkArchive(
      zip(
        packageFiles({
          "assets/images/logo.png": "png",
          "assets/images/run.js": "x",
          "assets/fonts/body.png": "x",
          "assets/readme.txt": "x",
          "previews/thumb.gif": "x",
        })
      )
    );
    expect(issues.map((issue) => [issue.code, issue.file])).toEqual([
      ["E1004", "assets/fonts/body.png"],
      ["E1004", "assets/images/run.js"],
      ["E1004", "assets/readme.txt"],
      ["E1004", "previews/thumb.gif"],
    ]);
  });

  it("rejects case-insensitive path collisions", () => {
    const { issues } = checkArchive(
      zip(
        packageFiles({
          "assets/images/Logo.png": "a",
          "assets/images/logo.png": "b",
        })
      )
    );
    expect(issues.map((issue) => issue.code)).toEqual(["E1006"]);
  });

  it("rejects paths that are too deep", () => {
    const { issues } = checkArchive(
      zip(packageFiles({ "assets/images/a/b/c/d/e.png": "x" }))
    );
    expect(issues.map((issue) => issue.code)).toEqual(["E1007"]);
  });

  it("applies per-type size limits", () => {
    const { issues } = checkArchive(
      zip(
        packageFiles({
          "manifest.json": " ".repeat(64 * 1024 + 1),
          "assets/fonts/body.woff2": new Uint8Array(2 * 1024 * 1024 + 1),
        })
      )
    );
    expect(issues.map((issue) => [issue.code, issue.file])).toEqual([
      ["E1002", "assets/fonts/body.woff2"],
      ["E1002", "manifest.json"],
    ]);
  });

  it("reports missing required files", () => {
    const { issues } = checkArchive(zip({ "manifest.json": "{}" }));
    expect(issues.map((issue) => [issue.code, issue.file])).toEqual([
      ["E1008", "theme.xml"],
    ]);
  });

  it("stores a palette-only package without layouts", () => {
    const { files, issues } = checkArchive(
      zip({
        "manifest.json": JSON.stringify({ ...baseManifest, formFactors: [] }),
        "theme.xml": "<Theme />",
      })
    );
    expect(issues).toEqual([]);
    expect([...files.keys()].sort()).toEqual(["manifest.json", "theme.xml"]);
  });
});

describe("checkManifest", () => {
  it("returns the manifest with defaults", () => {
    const { manifest, issues } = checkManifest(manifestFiles(baseManifest));
    expect(issues).toEqual([]);
    expect(manifest).toEqual({
      ...baseManifest,
      honorsUserAccent: false,
      previews: [],
      tags: [],
    });
  });

  it("strips a BOM and rejects invalid JSON", () => {
    const files = manifestFiles(baseManifest);
    files.set(
      "manifest.json",
      strToU8(`\uFEFF${JSON.stringify(baseManifest)}`)
    );
    expect(checkManifest(files).issues).toEqual([]);
    files.set("manifest.json", strToU8("{ nope"));
    expect(checkManifest(files).issues.map((issue) => issue.code)).toEqual([
      "E2001",
    ]);
    files.set("manifest.json", strToU8("[]"));
    expect(checkManifest(files).issues.map((issue) => issue.code)).toEqual([
      "E2001",
    ]);
  });

  it("flags reserved and unknown fields", () => {
    const { manifest, issues } = checkManifest(
      manifestFiles({ ...baseManifest, future: 1, "x-tool": 1 })
    );
    expect(issues.map((issue) => [issue.code, issue.path])).toEqual([
      ["I2001", "/future"],
    ]);
    expect(manifest).toBeDefined();
    expect(manifestCodes({ ...baseManifest, scripts: [] })).toEqual(["E2002"]);
  });

  it("checks the spec version against the host", () => {
    expect(manifestCodes({ ...baseManifest, spec: "1.1" })).toEqual(["E2010"]);
    expect(manifestCodes({ ...baseManifest, spec: "2.0" })).toEqual(["E2011"]);
    expect(manifestCodes({ ...baseManifest, spec: "1" })).toEqual(["E2005"]);
  });

  it("checks id format and the reserved prefix", () => {
    expect(manifestCodes({ ...baseManifest, id: "wmm-default" })).toEqual([
      "E2003",
    ]);
    expect(manifestCodes({ ...baseManifest, id: "Classic_Blue" })).toEqual([
      "E2005",
    ]);
    expect(manifestCodes({ ...baseManifest, id: "ab" })).toEqual(["E2005"]);
  });

  it("requires fields with the right types", () => {
    const { kind: _kind, name: _name, ...rest } = baseManifest;
    expect(manifestCodes({ ...rest, version: 1 })).toEqual([
      "E2004",
      "E2004",
      "E2004",
    ]);
    expect(manifestCodes({ ...baseManifest, kind: "visualizer" })).toEqual([
      "E2005",
    ]);
  });

  it("validates optional fields", () => {
    expect(
      manifestCodes({
        ...baseManifest,
        version: "1.2",
        description: "x".repeat(281),
        author: { name: "Jane", url: "http://example.com" },
        homepage: "ftp://example.com",
        previews: ["shots/a.png"],
        thumbnail: "thumb.png",
        tags: ["Retro"],
        honorsUserAccent: "yes",
      })
    ).toEqual([
      "E2005",
      "E2005",
      "E2005",
      "E2005",
      "E2004",
      "E2005",
      "E2005",
      "E2005",
    ]);
  });

  it("matches formFactors to layout files", () => {
    expect(
      manifestCodes({ ...baseManifest, formFactors: ["desktop", "tv"] })
    ).toEqual(["E2006"]);
    expect(
      manifestCodes(baseManifest, { "layouts/mobile.xml": "<Layout />" })
    ).toEqual(["W2006"]);
    expect(manifestCodes({ ...baseManifest, formFactors: ["mobile"] })).toEqual(
      ["W2006", "E2006"]
    );
    expect(
      manifestCodes(
        { ...baseManifest, formFactors: ["mobile"] },
        { "layouts/mobile.xml": "<Layout />" }
      )
    ).toEqual(["W2006"]);
    expect(manifestCodes({ ...baseManifest, formFactors: ["watch"] })).toEqual([
      "E2005",
      "W2006",
    ]);
  });

  it("accepts an empty formFactors list for a palette-only theme", () => {
    const files = manifestFiles({ ...baseManifest, formFactors: [] });
    files.delete("layouts/desktop.xml");
    const { manifest, issues } = checkManifest(files);
    expect(issues).toEqual([]);
    expect(manifest?.formFactors).toEqual([]);
  });

  it("checks colorSchemes", () => {
    expect(manifestCodes({ ...baseManifest, colorSchemes: [] })).toEqual([
      "E2005",
    ]);
    expect(
      manifestCodes({ ...baseManifest, colorSchemes: ["dark", "sepia"] })
    ).toEqual(["E2005"]);
  });

  it("warns when the app is older than app.min", () => {
    const manifest = { ...baseManifest, app: { min: "0.9.0" } };
    expect(manifestCodes(manifest, {}, "0.8.5")).toEqual(["W2008"]);
    expect(manifestCodes(manifest, {}, "0.9.0")).toEqual([]);
    const { manifest: result } = checkManifest(
      manifestFiles(manifest),
      "0.8.5"
    );
    expect(result?.app).toEqual({ min: "0.9.0" });
  });
});
