import { describe, it, expect } from "vitest";
import { restoreVolume } from "./volume";

describe("restoreVolume", () => {
  it("returns the default when nothing is stored", () => {
    expect(restoreVolume(null)).toBe(0.75);
  });

  it("restores a persisted volume", () => {
    expect(restoreVolume("0.4")).toBe(0.4);
    expect(restoreVolume("1")).toBe(1);
    expect(restoreVolume("0")).toBe(0);
  });

  it("falls back to the default for invalid stored values", () => {
    expect(restoreVolume("abc")).toBe(0.75);
    expect(restoreVolume("1.5")).toBe(0.75);
    expect(restoreVolume("-0.1")).toBe(0.75);
    expect(restoreVolume("")).toBe(0.75);
  });
});
