import { describe, expect, it } from "vitest";
import {
  appendStaticLine,
  formatTimecode,
  formatTimestamp,
  parseLrc,
  parseTimecode,
  serializeLrc,
  splitTimedLyrics,
  staticLines,
  trimPlacementsToLyrics,
  validateSync,
} from "./lrc";

describe("parseLrc", () => {
  it("reads timestamps and text", () => {
    expect(parseLrc("[00:12.34] Hello\n[00:15.00] World")).toEqual([
      { timeMs: 12_340, text: "Hello" },
      { timeMs: 15_000, text: "World" },
    ]);
  });

  it("sorts by time regardless of source order", () => {
    expect(parseLrc("[00:20.00] B\n[00:10.00] A").map((l) => l.text)).toEqual([
      "A",
      "B",
    ]);
  });

  it("expands a repeated timestamp into one placement each", () => {
    expect(parseLrc("[00:01.00][00:30.00] Chorus")).toEqual([
      { timeMs: 1_000, text: "Chorus" },
      { timeMs: 30_000, text: "Chorus" },
    ]);
  });

  it("ignores lines without a timestamp", () => {
    expect(parseLrc("plain line\n[00:05.00] timed")).toEqual([
      { timeMs: 5_000, text: "timed" },
    ]);
  });

  it("treats a one-digit fraction as tenths", () => {
    expect(parseLrc("[00:01.5] x")[0].timeMs).toBe(1_500);
  });

  it("returns an empty list for empty input", () => {
    expect(parseLrc(undefined)).toEqual([]);
    expect(parseLrc("")).toEqual([]);
  });
});

describe("serializeLrc", () => {
  it("round-trips through parseLrc", () => {
    const lines = [
      { timeMs: 1_000, text: "one" },
      { timeMs: 61_500, text: "two" },
    ];

    expect(parseLrc(serializeLrc(lines))).toEqual(lines);
  });

  it("sorts by time", () => {
    expect(
      serializeLrc([
        { timeMs: 5_000, text: "b" },
        { timeMs: 1_000, text: "a" },
      ])
    ).toBe("[00:01.00] a\n[00:05.00] b");
  });
});

describe("formatting", () => {
  it("formats an LRC timestamp", () => {
    expect(formatTimestamp(61_230)).toBe("[01:01.23]");
  });

  it("formats a display timecode", () => {
    expect(formatTimecode(61_234)).toBe("1:01.234");
  });
});

describe("parseTimecode", () => {
  it("parses the display format", () => {
    expect(parseTimecode("1:26.500")).toBe(86_500);
  });

  it("parses centiseconds", () => {
    expect(parseTimecode("0:42.25")).toBe(42_250);
  });

  it("parses plain seconds", () => {
    expect(parseTimecode("86.5")).toBe(86_500);
  });

  it("rejects text that is not a time", () => {
    expect(parseTimecode("abc")).toBeNull();
    expect(parseTimecode("")).toBeNull();
    expect(parseTimecode("1:75.000")).toBeNull();
  });

  it("round-trips with formatTimecode", () => {
    expect(parseTimecode(formatTimecode(61_234))).toBe(61_234);
  });
});

describe("trimPlacementsToLyrics", () => {
  const lyrics = "one\ntwo\nthree\nfour";
  const lines = [
    { timeMs: 1000, text: "one" },
    { timeMs: 2000, text: "two" },
    { timeMs: 3000, text: "three" },
    { timeMs: 4000, text: "four" },
  ];

  it("keeps every placement when nothing changed", () => {
    expect(trimPlacementsToLyrics(lyrics, lines)).toEqual(lines);
  });

  it("keeps every placement when lines are only appended", () => {
    expect(trimPlacementsToLyrics(`${lyrics}\nfive`, lines)).toEqual(lines);
  });

  it("drops placements from the first changed line onward", () => {
    const result = trimPlacementsToLyrics("one\ntwo\nTHREE\nfour", lines);

    expect(result.map((line) => line.text)).toEqual(["one", "two"]);
  });

  it("drops a placement whose line was deleted", () => {
    const result = trimPlacementsToLyrics("one\nthree\nfour", lines);

    expect(result.map((line) => line.text)).toEqual(["one"]);
  });

  it("drops every placement when the lyrics are cleared", () => {
    expect(trimPlacementsToLyrics("", lines)).toEqual([]);
  });

  it("keeps a multi-line placement only while all its parts survive", () => {
    const merged = [
      { timeMs: 1000, text: "one" },
      { timeMs: 2000, text: "two\nthree" },
      { timeMs: 4000, text: "four" },
    ];

    expect(
      trimPlacementsToLyrics("one\ntwo\nTHREE\nfour", merged).map(
        (line) => line.text
      )
    ).toEqual(["one"]);
  });
});

describe("splitTimedLyrics", () => {
  it("returns nothing for an absent tag", () => {
    expect(splitTimedLyrics(undefined)).toEqual({});
    expect(splitTimedLyrics("")).toEqual({});
  });

  it("leaves plain lyrics alone and sets no timed field", () => {
    expect(splitTimedLyrics("one\ntwo")).toEqual({ lyrics: "one\ntwo" });
  });

  it("splits LRC into plain lyrics and timed lyrics", () => {
    const result = splitTimedLyrics("[00:10.00] one\n[00:20.50] two");

    expect(result.lyrics).toBe("one\ntwo");
    expect(result.syncedLyrics).toBe("[00:10.00] one\n[00:20.50] two");
  });

  it("round-trips a multi-line placement at one timestamp", () => {
    const result = splitTimedLyrics("[00:10.00] one\n[00:10.00] two");

    expect(result.lyrics).toBe("one\ntwo");
    expect(parseLrc(result.syncedLyrics)).toEqual([
      { timeMs: 10_000, text: "one\ntwo" },
    ]);
  });
});

describe("validateSync", () => {
  const lyrics = "one\ntwo\nthree";

  it("accepts timed lines that follow the lyrics in order", () => {
    expect(
      validateSync(lyrics, [
        { timeMs: 1_000, text: "one" },
        { timeMs: 2_000, text: "three" },
      ])
    ).toEqual([]);
  });

  it("accepts partial timing", () => {
    expect(validateSync(lyrics, [{ timeMs: 1_000, text: "two" }])).toEqual([]);
  });

  it("flags a line the lyrics do not contain", () => {
    expect(
      validateSync(lyrics, [{ timeMs: 1_000, text: "nope" }])
    ).toEqual([{ lineIndex: 0, text: "nope", reason: "missing" }]);
  });

  it("flags a line that appears before an earlier one", () => {
    expect(
      validateSync(lyrics, [
        { timeMs: 1_000, text: "three" },
        { timeMs: 2_000, text: "one" },
      ])
    ).toEqual([{ lineIndex: 1, text: "one", reason: "out-of-order" }]);
  });

  it("accepts repeated lines in order", () => {
    expect(
      validateSync("chorus\nverse\nchorus", [
        { timeMs: 1_000, text: "chorus" },
        { timeMs: 2_000, text: "verse" },
        { timeMs: 3_000, text: "chorus" },
      ])
    ).toEqual([]);
  });
});

describe("appendStaticLine", () => {
  it("appends a new line", () => {
    expect(appendStaticLine("one", "two")).toBe("one\ntwo");
  });

  it("does not duplicate an existing line", () => {
    expect(appendStaticLine("one\ntwo", "two")).toBe("one\ntwo");
  });

  it("starts from empty", () => {
    expect(appendStaticLine("", "one")).toBe("one");
  });

  it("ignores blank input", () => {
    expect(appendStaticLine("one", "   ")).toBe("one");
  });
});

describe("staticLines", () => {
  it("drops blank lines and trims", () => {
    expect(staticLines(" one \n\n two \n")).toEqual(["one", "two"]);
  });
});
