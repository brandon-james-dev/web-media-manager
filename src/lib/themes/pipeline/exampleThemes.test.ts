import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { IssueSeverity } from "../issues";
import { validateThemePackage } from "./validateThemePackage";

const PACKAGE_DIRECTORY = fileURLToPath(
  new URL("../../../../examples/themes/classic-blue/", import.meta.url)
);

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

function readPackage(): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const file of walk(PACKAGE_DIRECTORY, PACKAGE_DIRECTORY)) {
    entries[file] = new Uint8Array(readFileSync(join(PACKAGE_DIRECTORY, file)));
  }
  return zipSync(entries);
}

describe("examples/themes/classic-blue", () => {
  it("validates and compiles the shipped example package", () => {
    const result = validateThemePackage(readPackage());
    const reported = result.issues.filter(
      (issue) => issue.severity !== IssueSeverity.Info
    );

    expect(reported, JSON.stringify(reported)).toEqual([]);
    expect(result.ir).toBeDefined();
    expect(result.ir?.fonts.ui?.faces.length ?? 0).toBeGreaterThan(0);
    expect(result.files?.has(result.manifest?.thumbnail ?? "")).toBe(true);
  });
});
