import { describe, expect, it } from "vitest";
import { buildLetterIndex, firstLetter } from "./alphabet";

describe("alphabet index", () => {
  it("folds case and diacritics and buckets non-letters under #", () => {
    expect(firstLetter("abba")).toBe("A");
    expect(firstLetter("Édith")).toBe("E");
    expect(firstLetter("21 Guns")).toBe("#");
    expect(firstLetter("")).toBeNull();
  });

  it("records the first position of each letter", () => {
    const index = buildLetterIndex(["Abba", "Adele", "Beck", null, "9"]);
    expect(index.get("A")).toBe(0);
    expect(index.get("B")).toBe(2);
    expect(index.get("#")).toBe(4);
    expect(index.has("C")).toBe(false);
  });
});
