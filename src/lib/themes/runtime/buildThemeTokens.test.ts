import { describe, expect, it } from "vitest";
import { THEME_IR_VERSION, derivePalette } from "../ir";
import type { ThemeIR } from "../ir";
import {
  PALETTE_VARIABLES,
  buildThemeTokens,
  resolveColorScheme,
  themeFontFaces,
  themeFontFamilyName,
} from "./buildThemeTokens";

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

const fontIr = themeIr({
  fonts: {
    ui: {
      fallback: "sansSerif",
      faces: [
        { src: "assets/fonts/body.woff2", weight: 400, style: "normal" },
        { src: "assets/fonts/body-bold.woff2", weight: 700, style: "normal" },
      ],
    },
  },
  textStyles: { body: { font: { ref: "font", id: "ui" } } },
  defaults: { text: "body" },
});

describe("resolveColorScheme", () => {
  it("keeps a supported preference", () => {
    expect(resolveColorScheme(themeIr(), "dark")).toBe("dark");
  });

  it("falls back to the first scheme", () => {
    expect(resolveColorScheme(themeIr(), "light")).toBe("dark");
    expect(
      resolveColorScheme(themeIr({ colorSchemes: ["light", "dark"] }), "dark")
    ).toBe("dark");
  });
});

describe("buildThemeTokens", () => {
  it("maps the derived palette onto the kit variables", () => {
    const ir = themeIr();
    const tokens = buildThemeTokens(ir, { scheme: "dark" });
    const palette = derivePalette(ir.palettes.dark ?? {});

    expect(tokens.scheme).toBe("dark");
    expect(tokens.variables["--background"]).toBe(palette.background);
    expect(tokens.variables["--foreground"]).toBe(palette.foreground);
    expect(tokens.variables["--accent"]).toBe(palette.accent);
    expect(tokens.variables["--ring"]).toBe(palette.ring);
  });

  it("mirrors sidebar and theme-only slots", () => {
    const tokens = buildThemeTokens(themeIr(), { scheme: "dark" });

    expect(tokens.variables["--sidebar"]).toBe(tokens.variables["--card"]);
    expect(tokens.variables["--sidebar-foreground"]).toBe(
      tokens.variables["--card-foreground"]
    );
    expect(tokens.variables["--sidebar-accent"]).toBe(
      tokens.variables["--secondary"]
    );
    expect(tokens.variables["--sidebar-border"]).toBe(
      tokens.variables["--border"]
    );
    expect(tokens.variables["--wmm-selection"]).toBeDefined();
    expect(tokens.variables["--wmm-selection-foreground"]).toBeDefined();
    expect(tokens.variables["--wmm-progress-track"]).toBeDefined();
    expect(tokens.variables["--wmm-progress-fill"]).toBe(
      tokens.variables["--accent"]
    );
    expect(Object.keys(tokens.variables)).toHaveLength(
      Object.values(PALETTE_VARIABLES).flat().length
    );
  });

  it("ignores the user accent when the theme does not honor it", () => {
    const tokens = buildThemeTokens(themeIr(), {
      scheme: "dark",
      userAccent: "#3b82f6",
    });

    expect(tokens.variables["--accent"]).toBe("#3d7beaff");
  });

  it("applies the user accent when the theme honors it", () => {
    const tokens = buildThemeTokens(themeIr({ honorsUserAccent: true }), {
      scheme: "dark",
      userAccent: "#3b82f6",
    });

    expect(tokens.variables["--accent"]).toBe("#3b82f6ff");
    expect(tokens.variables["--primary"]).toBe("#3b82f6ff");
  });

  it("names the root font family with a host hash", () => {
    const tokens = buildThemeTokens(fontIr, { scheme: "dark" });

    expect(tokens.fontFamily).toMatch(/^"wmm-t-[0-9a-f]{8}", sans-serif$/);
    expect(tokens.fontFamily).not.toContain("ui");
    expect(buildThemeTokens(fontIr, { scheme: "dark" }).fontFamily).toBe(
      tokens.fontFamily
    );
  });

  it("uses only the generic family when the font has no faces", () => {
    const ir = themeIr({
      fonts: { ui: { fallback: "serif", faces: [] } },
      textStyles: { body: { font: { ref: "font", id: "ui" } } },
      defaults: { text: "body" },
    });

    expect(buildThemeTokens(ir, { scheme: "dark" }).fontFamily).toBe("serif");
  });

  it("has no font family without a default text style", () => {
    expect(
      buildThemeTokens(themeIr(), { scheme: "dark" }).fontFamily
    ).toBeUndefined();
  });
});

describe("themeFontFamilyName", () => {
  it("is stable and depends on both ids", () => {
    expect(themeFontFamilyName("classic-blue", "ui")).toBe(
      themeFontFamilyName("classic-blue", "ui")
    );
    expect(themeFontFamilyName("classic-blue", "ui")).not.toBe(
      themeFontFamilyName("classic-blue", "body")
    );
    expect(themeFontFamilyName("classic-blue", "ui")).toMatch(
      /^wmm-t-[0-9a-f]{8}$/
    );
  });
});

describe("themeFontFaces", () => {
  it("lists every face with its host family name", () => {
    const faces = themeFontFaces(fontIr);

    expect(faces).toHaveLength(2);
    expect(faces[0]).toEqual({
      family: themeFontFamilyName("classic-blue", "ui"),
      src: "assets/fonts/body.woff2",
      weight: 400,
      style: "normal",
    });
  });

  it("is empty without a theme", () => {
    expect(themeFontFaces(undefined)).toEqual([]);
  });
});
