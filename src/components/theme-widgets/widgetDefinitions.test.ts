import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ElementCategory, LAYOUT_ELEMENTS } from "@/lib/themes/componentModel";
import registrySource from "./index.ts?raw";

const WIDGET_KIT_SOURCES = [
  "../../core/themes/widgetKit/index.ts",
  "../../core/themes/widgetKit/defineWidget.ts",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

const DEFINITION_SOURCES = import.meta.glob("./*/*/definition.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const WIDGET_COMPONENTS = import.meta.glob("./*/*/*.tsx", { eager: false });

const COMPONENT_SOURCES = import.meta.glob("../**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const ALLOWED_LIB_THEMES = [
  "@/lib/themes/render/browser",
  "@/lib/themes/runtime",
  "@/lib/themes/runtime/browser",
  "@/lib/themes/getThemeManager",
];

const FORBIDDEN_LEAVES = ["layoutElements", "themeElements", "getElementDef"];

const SPECIFIER = /(?:from|import)\s+"([^"]+)"/g;
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;

function specifiersOf(source: string): string[] {
  return [...source.replace(BLOCK_COMMENT, "").matchAll(SPECIFIER)].map(
    (match) => match[1]
  );
}

describe("theme widget definitions", () => {
  it("imports only the widget kit barrel", () => {
    const paths = Object.keys(DEFINITION_SOURCES);
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      for (const specifier of specifiersOf(DEFINITION_SOURCES[path])) {
        expect(specifier, path).toBe("@/core/themes/widgetKit");
      }
    }
  });

  it("keeps the widget kit clear of the element tables", () => {
    for (const source of WIDGET_KIT_SOURCES) {
      const specifiers = specifiersOf(source);
      expect(specifiers.length).toBeGreaterThan(0);
      for (const specifier of specifiers) {
        if (specifier === "./defineWidget") continue;
        expect(specifier).toMatch(/^@\/lib\/themes\/componentModel\/\w+$/);
        expect(specifier).not.toBe("@/lib/themes/componentModel");
        expect(specifier).not.toBe("@/core/themes");
        for (const leaf of FORBIDDEN_LEAVES) {
          expect(specifier).not.toContain(leaf);
        }
        expect(specifier).not.toBe("@/lib/themes/componentModel/index");
      }
    }
  });

  it("keeps components off the lower-level theme modules", () => {
    const paths = Object.keys(COMPONENT_SOURCES).filter(
      (path) => !path.endsWith(".test.ts") && !path.endsWith(".test.tsx")
    );
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      for (const specifier of specifiersOf(COMPONENT_SOURCES[path])) {
        if (!specifier.startsWith("@/lib/themes")) continue;
        expect(ALLOWED_LIB_THEMES, path).toContain(specifier);
      }
    }
  });

  it("keeps each widget's component beside its definition", () => {
    const components = Object.keys(WIDGET_COMPONENTS);
    for (const path of Object.keys(DEFINITION_SOURCES)) {
      const folder = path.slice(0, path.lastIndexOf("/"));
      const name = folder.slice(folder.lastIndexOf("/") + 1);
      expect(components, path).toContain(`${folder}/${name}.tsx`);
    }
  });

  it("has one folder and one registration per widget element", () => {
    const folders = Object.keys(DEFINITION_SOURCES)
      .map((path) => path.split("/").at(-2) ?? "")
      .sort();
    const declared = Object.entries(LAYOUT_ELEMENTS)
      .filter(([, def]) => def.category === ElementCategory.Widget)
      .map(([name]) => name)
      .sort();
    expect(folders).toEqual(declared);
    for (const name of declared) {
      expect(registrySource, name).toContain(`${name}: Theme${name},`);
    }
  });
});
