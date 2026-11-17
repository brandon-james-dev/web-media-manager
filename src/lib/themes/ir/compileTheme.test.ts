import { describe, expect, it } from "vitest";
import { parseThemeXml } from "../parser";
import type { ThemeManifest } from "../package";
import {
  CLASSIC_BLUE_THEME_FILE,
  classicBlueTheme,
} from "../testing/classicBlueTheme";
import { DESKTOP_SONGS_FILE, desktopSongs } from "../testing/desktopSongs";
import { compileTheme } from "./compileTheme";

const manifest: ThemeManifest = {
  kind: "theme",
  spec: "1.0",
  id: "classic-blue",
  name: "Classic Blue",
  version: "1.2.0",
  formFactors: ["desktop"],
  colorSchemes: ["dark"],
  honorsUserAccent: false,
  previews: [],
  tags: [],
};

function parse(xml: string, file: string, root: "Theme" | "Layout") {
  const result = parseThemeXml(xml, { file, root, spec: "1.0" });
  if (result.root === undefined) throw new Error(`${file} did not parse`);
  return result.root;
}

const theme = parse(classicBlueTheme, CLASSIC_BLUE_THEME_FILE, "Theme");
const desktop = parse(desktopSongs, DESKTOP_SONGS_FILE, "Layout");

function compile(overrides: Partial<ThemeManifest> = {}) {
  return compileTheme({
    manifest: { ...manifest, ...overrides },
    theme,
    layouts: [{ formFactor: "desktop", root: desktop }],
  });
}

describe("compileTheme", () => {
  const { ir, issues } = compile();

  it("compiles classic blue without issues", () => {
    expect(issues).toEqual([]);
    expect(ir?.themeId).toBe("classic-blue");
    expect(ir?.irVersion).toBe(1);
  });

  it("resolves palette colors through @color chains", () => {
    expect(ir?.palettes.dark).toMatchObject({
      background: "#0b1a3aff",
      accent: "#3d7beaff",
      card: "#12285aff",
      selection: "#3d7bea55",
    });
  });

  it("flattens text style basedOn and keeps slot references", () => {
    expect(ir?.textStyles.caption).toEqual({
      font: { ref: "font", id: "ui" },
      size: 11,
      color: { kind: "slot", slot: "mutedForeground" },
    });
  });

  it("flattens button styles with inherited states", () => {
    const style = ir?.buttonStyles["transport-touch"];
    expect(style?.base).toMatchObject({
      background: { kind: "brush", id: "chrome-gloss" },
      foreground: { kind: "literal", value: "#ffffffff" },
      minWidth: 44,
      cornerRadius: [22, 22, 22, 22],
    });
    expect(style?.states.map((state) => state.name)).toEqual([
      "hover",
      "pressed",
      "disabled",
    ]);
  });

  it("compiles brushes, shadows, panel styles and defaults", () => {
    expect(ir?.brushes["chrome-gloss"]).toMatchObject({
      type: "linear",
      angle: 180,
    });
    expect(ir?.shadows.inset).toEqual([
      {
        x: 0,
        y: 1,
        blur: 3,
        spread: 0,
        color: { kind: "literal", value: "#00000080" },
        inset: true,
      },
    ]);
    expect(ir?.panelStyles["title-strip"]?.base.padding).toEqual([
      4, 10, 4, 10,
    ]);
    expect(ir?.defaults).toEqual({
      button: "standard",
      panel: "content",
      text: "body",
    });
  });

  it("turns the layout into an element tree", () => {
    const root = ir?.layouts.desktop;
    expect(root?.element).toBe("Layout");
    expect(root?.children.map((child) => child.element)).toEqual([
      "Shell",
      "Page",
      "Page",
      "Page",
      "Page",
      "Page",
    ]);
  });

  it("reports a manifest scheme with no palette", () => {
    const result = compile({ colorSchemes: ["light", "dark"] });
    expect(result.ir).toBeUndefined();
    expect(result.issues.map((issue) => issue.code)).toEqual(["E2007"]);
  });

  it("warns about a palette the manifest does not list", () => {
    const result = compile({ colorSchemes: ["light"] });
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "E2007",
      "W2007",
    ]);
  });
});
