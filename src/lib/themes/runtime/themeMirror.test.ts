import { describe, expect, it } from "vitest";
import { THEME_IR_VERSION } from "../ir";
import type { ThemeIR } from "../ir";
import {
  THEME_MIRROR_KEY,
  createThemeMirror,
  mirrorTokens,
  readThemeMirror,
  writeThemeMirror,
} from "./themeMirror";
import type { MirrorStorage } from "./themeMirror";

function themeIr(overrides: Partial<ThemeIR> = {}): ThemeIR {
  return {
    irVersion: THEME_IR_VERSION,
    spec: "1.0",
    themeId: "classic-blue",
    themeVersion: "1.2.0",
    name: "Classic Blue",
    colorSchemes: ["dark"],
    honorsUserAccent: false,
    formFactors: ["desktop"],
    palettes: {
      dark: {
        background: "#0b1a3aff",
        foreground: "#e8eefcff",
        accent: "#3d7beaff",
        border: "#2a4a8aff",
      },
    },
    fonts: {},
    textStyles: {},
    images: {},
    brushes: {},
    shadows: {},
    buttonStyles: {},
    sliderStyles: {},
    panelStyles: {},
    defaults: {},
    layouts: {},
    ...overrides,
  };
}

function memoryStorage(initial?: string): MirrorStorage & {
  entries: Map<string, string>;
} {
  const entries = new Map<string, string>();
  if (initial !== undefined) entries.set(THEME_MIRROR_KEY, initial);
  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
  };
}

describe("createThemeMirror", () => {
  it("precomputes the tokens of every supported scheme", () => {
    const mirror = createThemeMirror(
      themeIr({ colorSchemes: ["light", "dark"] }),
      "#3b82f6"
    );

    expect(mirror.themeId).toBe("classic-blue");
    expect(mirror.themeVersion).toBe("1.2.0");
    expect(mirror.irVersion).toBe(THEME_IR_VERSION);
    expect(Object.keys(mirror.tokens).sort()).toEqual(["dark", "light"]);
    expect(mirror.tokens.dark?.scheme).toBe("dark");
  });

  it("records the form factors the theme has a layout for", () => {
    const node = { element: "Shell", attributes: {}, children: [] };
    const mirror = createThemeMirror(
      themeIr({ layouts: { desktop: node, mobile: node } })
    );

    expect(mirror.layouts?.sort()).toEqual(["desktop", "mobile"]);
  });
});

describe("writeThemeMirror and readThemeMirror", () => {
  it("round-trips through storage", () => {
    const storage = memoryStorage();
    const mirror = createThemeMirror(themeIr());

    writeThemeMirror(storage, mirror);

    expect(readThemeMirror(storage)).toEqual(mirror);
  });

  it("rejects a stale IR version", () => {
    const storage = memoryStorage();
    writeThemeMirror(storage, createThemeMirror(themeIr()));
    const raw = JSON.parse(storage.getItem(THEME_MIRROR_KEY) ?? "{}");
    storage.setItem(
      THEME_MIRROR_KEY,
      JSON.stringify({ ...raw, irVersion: THEME_IR_VERSION + 1 })
    );

    expect(readThemeMirror(storage)).toBeUndefined();
  });

  it("rejects garbage JSON", () => {
    expect(readThemeMirror(memoryStorage("not json"))).toBeUndefined();
    expect(readThemeMirror(memoryStorage("null"))).toBeUndefined();
    expect(readThemeMirror(memoryStorage("{}"))).toBeUndefined();
  });

  it("removes the entry when there is no theme", () => {
    const storage = memoryStorage();
    writeThemeMirror(storage, createThemeMirror(themeIr()));

    writeThemeMirror(storage, undefined);

    expect(storage.entries.has(THEME_MIRROR_KEY)).toBe(false);
    expect(readThemeMirror(storage)).toBeUndefined();
  });

  it("swallows a storage failure", () => {
    const storage: MirrorStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("quota");
      },
    };

    expect(() =>
      writeThemeMirror(storage, createThemeMirror(themeIr()))
    ).not.toThrow();
    expect(() => writeThemeMirror(storage, undefined)).not.toThrow();
  });
});

describe("mirrorTokens", () => {
  it("prefers the requested scheme", () => {
    const mirror = createThemeMirror(
      themeIr({ colorSchemes: ["light", "dark"] })
    );

    expect(mirrorTokens(mirror, "light")?.scheme).toBe("light");
  });

  it("falls back to the first scheme", () => {
    const mirror = createThemeMirror(themeIr());

    expect(mirrorTokens(mirror, "light")?.scheme).toBe("dark");
  });
});
