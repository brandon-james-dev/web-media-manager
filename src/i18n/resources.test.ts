import { describe, expect, it } from "vitest";
import {
  WMM_RESOURCES,
  WMM_RESOURCE_KEYS,
  WMM_RESOURCE_KEY_PATTERN,
  WMM_RESOURCE_NAMESPACES,
  exportResourceManifest,
  getResourceArity,
  getResourceNamespace,
  isTemplateResource,
  isWmmResourceKey,
} from "./resources";
import { i18n } from "./instance";

describe("resources", () => {
  it("derives the key list exactly from the resource record", () => {
    expect(WMM_RESOURCE_KEYS).toEqual(Object.keys(WMM_RESOURCES));
    expect(WMM_RESOURCE_KEYS.length).toBeGreaterThan(0);
  });

  it("gives every key a known namespace and a pattern-conforming name", () => {
    for (const key of WMM_RESOURCE_KEYS) {
      expect(key).toMatch(WMM_RESOURCE_KEY_PATTERN);
      expect(WMM_RESOURCE_NAMESPACES).toContain(getResourceNamespace(key));
    }
  });

  it("accepts every registered key and rejects everything else", () => {
    for (const key of WMM_RESOURCE_KEYS) {
      expect(isWmmResourceKey(key)).toBe(true);
    }
    expect(isWmmResourceKey("wmm.playback.next")).toBe(false);
    expect(isWmmResourceKey("playback.bogus")).toBe(false);
    expect(isWmmResourceKey("")).toBe(false);
  });

  it("reports template arity from the declared params", () => {
    expect(isTemplateResource("playback.nowPlayingFormat")).toBe(true);
    expect(getResourceArity("playback.nowPlayingFormat")).toBe(2);
    expect(getResourceArity("playback.next")).toBe(0);
  });

  it("exports a JSON-serializable manifest", () => {
    const manifest = exportResourceManifest();
    expect(manifest).toHaveLength(WMM_RESOURCE_KEYS.length);
    expect(JSON.parse(JSON.stringify(manifest))).toEqual(manifest);

    const nowPlaying = manifest.find(
      (entry) => entry.key === "playback.nowPlayingFormat"
    );
    expect(nowPlaying).toMatchObject({
      kind: "template",
      namespace: "playback",
      params: ["artist", "title"],
    });

    const next = manifest.find((entry) => entry.key === "playback.next");
    expect(next).toMatchObject({ kind: "text", params: [] });
  });
});

// Compile-time assertions: `npx tsc -b` fails if any of these stop erroring.
function typeChecks(): void {
  i18n.t("playback.next");
  i18n.t("playback.nowPlayingFormat", ["artist", "title"]);
  i18n.t("library.songCount", [3]);

  // @ts-expect-error a text resource takes no arguments
  i18n.t("playback.next", ["x"]);
  // @ts-expect-error a template requires its argument tuple
  i18n.t("playback.nowPlayingFormat");
  // @ts-expect-error the tuple must match the declared params
  i18n.t("playback.nowPlayingFormat", ["a"]);
  // @ts-expect-error a plural requires its count
  i18n.t("library.songCount");
  // @ts-expect-error unknown keys are rejected
  i18n.t("bogus.key");
}

void typeChecks;
