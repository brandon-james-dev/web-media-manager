import { describe, expect, it } from "vitest";
import { extractPlaceholders, formatTemplate } from "./format";

describe("formatTemplate", () => {
  it("fills placeholders positionally", () => {
    expect(formatTemplate("{0} - {1}", ["Artist", "Title"])).toBe(
      "Artist - Title"
    );
    expect(formatTemplate("{1}/{0}", [1, 2])).toBe("2/1");
  });

  it("leaves a placeholder with no matching argument untouched", () => {
    expect(formatTemplate("{0} - {1}", ["Artist"])).toBe("Artist - {1}");
    expect(formatTemplate("{2}", [])).toBe("{2}");
  });

  it("treats doubled braces as literal braces", () => {
    expect(formatTemplate("{{0}}", ["x"])).toBe("{0}");
    expect(formatTemplate("{{{0}}}", ["x"])).toBe("{x}");
    expect(formatTemplate("{{}}", [])).toBe("{}");
  });

  it("keeps text without placeholders unchanged", () => {
    expect(formatTemplate("Nothing is playing", [])).toBe(
      "Nothing is playing"
    );
    expect(formatTemplate("", [])).toBe("");
  });
});

describe("extractPlaceholders", () => {
  it("returns sorted unique indices", () => {
    expect(extractPlaceholders("{1} {0} {1}")).toEqual([0, 1]);
    expect(extractPlaceholders("no placeholders")).toEqual([]);
  });

  it("ignores escaped braces", () => {
    expect(extractPlaceholders("{{0}}")).toEqual([]);
    expect(extractPlaceholders("{{{0}}}")).toEqual([0]);
  });
});
