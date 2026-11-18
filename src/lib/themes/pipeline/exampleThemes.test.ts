import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { IssueSeverity } from "../issues";
import { validateThemePackage } from "./validateThemePackage";

const EXAMPLE_THEMES = ["classic-blue"] as const;

function packageDirectory(id: string): string {
  return fileURLToPath(
    new URL(`../../../../examples/themes/${id}/`, import.meta.url)
  );
}

function walk(directory: string, base: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(path, base));
    } else {
      found.push(relative(base, path).split(sep).join("/"));
    }
  }
  return found.sort();
}

function readPackage(directory: string): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const file of walk(directory, directory)) {
    entries[file] = new Uint8Array(readFileSync(join(directory, file)));
  }
  return zipSync(entries);
}

describe.each(EXAMPLE_THEMES)("examples/themes/%s", (id) => {
  it("validates and compiles the shipped example package", () => {
    const result = validateThemePackage(readPackage(packageDirectory(id)));
    const reported = result.issues.filter(
      (issue) => issue.severity !== IssueSeverity.Info
    );

    expect(reported, JSON.stringify(reported)).toEqual([]);
    expect(result.ir).toBeDefined();
    expect(result.ir?.fonts.ui).toBeDefined();
    expect(result.files?.has(result.manifest?.thumbnail ?? "")).toBe(true);
  });
});
