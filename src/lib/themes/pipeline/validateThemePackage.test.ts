import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createThemeMirror } from "../runtime/themeMirror";
import { classicBlueDesktop } from "../testing/classicBlueDesktop";
import { classicBlueTheme } from "../testing/classicBlueTheme";
import { validateThemePackage } from "./validateThemePackage";

const manifest = {
  kind: "theme",
  spec: "1.0",
  id: "classic-blue",
  name: "Classic Blue",
  version: "1.2.0",
  formFactors: ["desktop"],
  colorSchemes: ["dark"],
};

function zip(
  overrides: Record<string, unknown> = {},
  theme = classicBlueTheme
): Uint8Array {
  return zipSync({
    "manifest.json": strToU8(JSON.stringify({ ...manifest, ...overrides })),
    "theme.xml": strToU8(theme),
    "layouts/desktop.xml": strToU8(classicBlueDesktop),
  });
}

function codes(input: Uint8Array): string[] {
  return validateThemePackage(input).issues.map((issue) => issue.code);
}

describe("validateThemePackage", () => {
  it("validates and compiles the classic blue package", () => {
    const result = validateThemePackage(zip());
    expect(result.issues.filter((issue) => issue.severity === "error")).toEqual(
      []
    );
    expect(result.manifest?.id).toBe("classic-blue");
    expect(result.files?.has("theme.xml")).toBe(true);
    expect(result.ir?.layouts.desktop?.element).toBe("Layout");
    expect(result.ir?.palettes.dark?.background).toBe("#0b1a3aff");
  });

  it("compiles a palette-only package with no layouts", () => {
    const result = validateThemePackage(
      zipSync({
        "manifest.json": strToU8(
          JSON.stringify({ ...manifest, formFactors: [] })
        ),
        "theme.xml": strToU8(classicBlueTheme),
      })
    );
    expect(result.issues.filter((issue) => issue.severity !== "info")).toEqual(
      []
    );
    expect(result.ir?.formFactors).toEqual([]);
    expect(result.ir?.layouts).toEqual({});
    expect(createThemeMirror(result.ir!).layouts).toEqual([]);
  });

  it("stops at the archive stage", () => {
    expect(codes(strToU8("not a zip"))).toEqual(["E1001"]);
  });

  it("stops at the manifest stage", () => {
    expect(codes(zip({ spec: "1.3" }))).toEqual(["E2010"]);
  });

  it("stops at the XML stage", () => {
    const result = validateThemePackage(zip({}, "<Theme"));
    expect(result.ir).toBeUndefined();
    expect(result.issues.every((issue) => issue.code === "E3001")).toBe(true);
  });

  it("reports a non-UTF-8 file", () => {
    const input = zipSync({
      "manifest.json": strToU8(JSON.stringify(manifest)),
      "theme.xml": new Uint8Array([0x3c, 0xff, 0xfe]),
      "layouts/desktop.xml": strToU8(classicBlueDesktop),
    });
    expect(codes(input)).toEqual(["E3001"]);
  });

  it("reports a manifest scheme with no palette", () => {
    const result = validateThemePackage(
      zip({ colorSchemes: ["light", "dark"] })
    );
    expect(result.ir).toBeUndefined();
    expect(result.issues.map((issue) => issue.code)).toContain("E2007");
  });
});
