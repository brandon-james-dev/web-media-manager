import { describe, expect, it } from "vitest";

import { SEMVER_PATTERN, compareVersions } from "./semver";

describe("compareVersions", () => {
  it("orders by major, minor and patch", () => {
    expect(compareVersions("1.2.0", "1.10.0")).toBeLessThan(0);
    expect(compareVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });

  it("ignores pre-release and build parts", () => {
    expect(compareVersions("1.2.3-beta.1", "1.2.3")).toBe(0);
    expect(compareVersions("1.2.3+build.5", "1.2.3")).toBe(0);
  });
});

describe("SEMVER_PATTERN", () => {
  it("accepts three-part versions with a pre-release", () => {
    expect(SEMVER_PATTERN.test("1.2.3")).toBe(true);
    expect(SEMVER_PATTERN.test("1.2.3-beta.1")).toBe(true);
  });

  it("rejects versions without a patch part", () => {
    expect(SEMVER_PATTERN.test("1.2")).toBe(false);
  });
});
