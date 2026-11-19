import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ElementCategory, LAYOUT_ELEMENTS } from "@/lib/themes/componentModel";
import registrySource from "./index.ts?raw";

const WIDGET_KIT_SOURCE = readFileSync(
  new URL("../../lib/themes/widgetKit/index.ts", import.meta.url),
  "utf8"
);

const DEFINITION_SOURCES = import.meta.glob("./*/*/definition.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const WIDGET_COMPONENTS = import.meta.glob("./*/*/*.tsx", { eager: false });

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
        expect(specifier, path).toBe("@/lib/themes/widgetKit");
      }
    }
  });

  it("keeps the widget kit clear of the element tables", () => {
    const specifiers = specifiersOf(WIDGET_KIT_SOURCE);
    expect(specifiers.length).toBeGreaterThan(0);
    for (const specifier of specifiers) {
      expect(specifier).toMatch(/^\.\.\/componentModel\//);
      expect(specifier).not.toBe("../componentModel");
      expect(specifier).not.toContain("layoutElements");
      expect(specifier).not.toContain("themeElements");
      expect(specifier).not.toContain("getElementDef");
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
