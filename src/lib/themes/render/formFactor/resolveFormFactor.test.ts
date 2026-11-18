import { describe, expect, it } from "vitest";
import { resolveFormFactor, type FormFactorInputs } from "./resolveFormFactor";

const base: FormFactorInputs = {
  width: 1440,
  height: 900,
  coarsePointer: false,
  noPointer: false,
  tvUserAgent: false,
  tvOverride: false,
};

function resolve(overrides: Partial<FormFactorInputs>): string {
  return resolveFormFactor({ ...base, ...overrides });
}

describe("resolveFormFactor", () => {
  it("returns the pin before any other rule", () => {
    expect(resolve({ pin: "mobile", width: 1920, tvOverride: true })).toBe(
      "mobile"
    );
  });

  it("returns tv for the manual override", () => {
    expect(resolve({ tvOverride: true, width: 390, height: 844 })).toBe("tv");
  });

  it("returns tv for a television user agent", () => {
    expect(resolve({ tvUserAgent: true })).toBe("tv");
  });

  it("returns tv for no pointer at 960 px and wider", () => {
    expect(resolve({ noPointer: true, width: 960, height: 540 })).toBe("tv");
    expect(resolve({ noPointer: true, width: 959, height: 540 })).toBe(
      "tablet"
    );
  });

  it("returns mobile below 640 px", () => {
    expect(resolve({ width: 639, height: 900 })).toBe("mobile");
    expect(resolve({ width: 640, height: 900 })).toBe("tablet");
  });

  it("returns mobile for a coarse pointer in short landscape", () => {
    expect(resolve({ width: 800, height: 500, coarsePointer: true })).toBe(
      "mobile"
    );
    expect(resolve({ width: 800, height: 501, coarsePointer: true })).toBe(
      "tablet"
    );
  });

  it("returns tablet from 640 to 1023 px", () => {
    expect(resolve({ width: 1023, height: 900 })).toBe("tablet");
    expect(resolve({ width: 1024, height: 900 })).toBe("desktop");
  });

  it("returns tablet for a coarse pointer from 1024 to 1366 px", () => {
    expect(resolve({ width: 1024, height: 900, coarsePointer: true })).toBe(
      "tablet"
    );
    expect(resolve({ width: 1366, height: 900, coarsePointer: true })).toBe(
      "tablet"
    );
    expect(resolve({ width: 1367, height: 900, coarsePointer: true })).toBe(
      "desktop"
    );
  });

  it("returns desktop for a wide fine-pointer viewport", () => {
    expect(resolve({ width: 1440, height: 900 })).toBe("desktop");
  });
});
