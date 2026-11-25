import { describe, expect, it } from "vitest";
import {
  activePlacementAt,
  appendStaticLine,
  formatTimecode,
  formatTimestamp,
  mapPlacementsToLines,
  parseLrc,
  parseTimecode,
  serializeLrc,
  splitTimedLyrics,
  staticLines,
  trimPlacementsAfterInsertion,
  syncPlacementsToLyrics,
  canPlaceAt,
  isInsideWindow,
  placementWindow,
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

describe("parseLrc empty timestamps", () => {
  it("drops a timestamp that carries no text", () => {
    expect(
      parseLrc("[00:01.00] one\n[00:02.00]\n[00:03.00] three")
    ).toEqual([
      { timeMs: 1000, text: "one" },
      { timeMs: 3000, text: "three" },
    ]);
  });
});

describe("trimPlacementsAfterInsertion", () => {
  const lyrics = "one\ntwo\nthree\nfour";
  const lines = [
    { timeMs: 1000, text: "one" },
    { timeMs: 2000, text: "two" },
    { timeMs: 3000, text: "three" },
    { timeMs: 4000, text: "four" },
  ];

  it("keeps every placement when nothing changed", () => {
    expect(trimPlacementsAfterInsertion(lyrics, lyrics, lines)).toEqual(lines);
  });

  it("keeps every placement when lines are only appended", () => {
    expect(
      trimPlacementsAfterInsertion(lyrics, `${lyrics}\nfive`, lines)
    ).toEqual(lines);
  });

  it("keeps every placement when a line is rewritten", () => {
    expect(
      trimPlacementsAfterInsertion(lyrics, "one\ntwo\nTHREE\nfour", lines)
    ).toEqual(lines);
  });

  it("keeps every placement when a line is deleted", () => {
    expect(
      trimPlacementsAfterInsertion(lyrics, "one\nthree\nfour", lines)
    ).toEqual(lines);
  });

  it("keeps every placement when the lyrics are cleared", () => {
    expect(trimPlacementsAfterInsertion(lyrics, "", lines)).toEqual(lines);
  });

  it("drops the placements after an inserted line", () => {
    const result = trimPlacementsAfterInsertion(
      lyrics,
      "one\ntwo\ninserted\nthree\nfour",
      lines
    );

    expect(result.map((line) => line.text)).toEqual(["one", "two"]);
  });

  it("keeps the placements before an insertion at the top", () => {
    const result = trimPlacementsAfterInsertion(
      lyrics,
      "zero\none\ntwo\nthree\nfour",
      lines
    );

    expect(result).toEqual([]);
  });

  it("maps repeated lines to their own occurrence", () => {
    const repeated = "one\ntwo\none\ntwo";
    const placed = [
      { timeMs: 1000, text: "one" },
      { timeMs: 2000, text: "two" },
      { timeMs: 3000, text: "one" },
      { timeMs: 4000, text: "two" },
    ];

    const result = trimPlacementsAfterInsertion(
      repeated,
      "one\ntwo\none\ninserted\ntwo",
      placed
    );

    expect(result).toEqual([
      { timeMs: 1000, text: "one" },
      { timeMs: 2000, text: "two" },
      { timeMs: 3000, text: "one" },
    ]);
  });

  it("drops an unmatched placement that sits after the insertion", () => {
    const stale = [
      { timeMs: 1000, text: "one" },
      { timeMs: 2000, text: "two" },
      { timeMs: 3000, text: "rewritten" },
    ];

    expect(
      trimPlacementsAfterInsertion(
        lyrics,
        "one\ntwo\ninserted\nthree\nfour",
        stale
      ).map((line) => line.text)
    ).toEqual(["one", "two"]);
  });

  it("keeps an unmatched placement that sits before the insertion", () => {
    const stale = [
      { timeMs: 1000, text: "rewritten" },
      { timeMs: 2000, text: "two" },
    ];

    expect(
      trimPlacementsAfterInsertion(
        lyrics,
        "one\ntwo\ninserted\nthree\nfour",
        stale
      ).map((line) => line.text)
    ).toEqual(["rewritten", "two"]);
  });

  it("drops a multi-line placement that the insertion pushed past", () => {
    const merged = [
      { timeMs: 1000, text: "one" },
      { timeMs: 2000, text: "two\nthree" },
      { timeMs: 4000, text: "four" },
    ];

    expect(
      trimPlacementsAfterInsertion(
        lyrics,
        "one\ninserted\ntwo\nthree\nfour",
        merged
      ).map((line) => line.text)
    ).toEqual(["one"]);
  });
});

describe("canPlaceAt", () => {
  const lines = [
    { timeMs: 1000, text: "one" },
    { timeMs: 3000, text: "three" },
  ];

  it("allows a moment between two placements", () => {
    expect(canPlaceAt(2000, lines)).toBe(true);
  });

  it("allows a moment before the first placement", () => {
    expect(canPlaceAt(500, lines)).toBe(true);
  });

  it("allows a moment after the last placement", () => {
    expect(canPlaceAt(9000, lines)).toBe(true);
  });

  it("refuses a moment that is already taken", () => {
    expect(canPlaceAt(3000, lines)).toBe(false);
  });

  it("refuses a moment within a millisecond of a placement", () => {
    expect(canPlaceAt(3000.5, lines)).toBe(false);
  });

  it("allows any moment when nothing is placed yet", () => {
    expect(canPlaceAt(0, [])).toBe(true);
  });
});

describe("syncPlacementsToLyrics", () => {
  const lyrics = "one\ntwo\nthree\nfour";
  const lines = [
    { timeMs: 1000, text: "one" },
    { timeMs: 2000, text: "two" },
    { timeMs: 3000, text: "three" },
    { timeMs: 4000, text: "four" },
  ];

  it("adopts the new text when a line is rewritten", () => {
    expect(syncPlacementsToLyrics(lyrics, "one\ntwo\nTHREE\nfour", lines)).toEqual(
      [
        { timeMs: 1000, text: "one" },
        { timeMs: 2000, text: "two" },
        { timeMs: 3000, text: "THREE" },
        { timeMs: 4000, text: "four" },
      ]
    );
  });

  it("keeps the timings when a line is rewritten", () => {
    const result = syncPlacementsToLyrics(lyrics, "one\nTWO\nthree\nfour", lines);

    expect(result.map((line) => line.timeMs)).toEqual([1000, 2000, 3000, 4000]);
  });

  it("drops the placements after an inserted line", () => {
    const result = syncPlacementsToLyrics(
      lyrics,
      "one\ntwo\ninserted\nthree\nfour",
      lines
    );

    expect(result.map((line) => line.text)).toEqual(["one", "two"]);
  });

  it("drops the placements after a deleted line", () => {
    const result = syncPlacementsToLyrics(lyrics, "one\nthree\nfour", lines);

    expect(result.map((line) => line.text)).toEqual(["one"]);
  });

  it("keeps every placement when the lyrics are cleared", () => {
    expect(syncPlacementsToLyrics(lyrics, "", lines)).toEqual([]);
  });

  it("keeps repeated lines on their own timings when one is deleted", () => {    const repeated = "one\ntwo\none\ntwo";
    const placed = [
      { timeMs: 1000, text: "one" },
      { timeMs: 2000, text: "two" },
      { timeMs: 3000, text: "one" },
      { timeMs: 4000, text: "two" },
    ];

    expect(syncPlacementsToLyrics(repeated, "one\ntwo\none", placed)).toEqual([
      { timeMs: 1000, text: "one" },
      { timeMs: 2000, text: "two" },
      { timeMs: 3000, text: "one" },
    ]);
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

describe("mapPlacementsToLines", () => {
  const lyrics = [
    "The way you look",
    "The way you love",
    "The way you move",
    "The way you look",
    "The way you love",
  ].join("\n");

  const lines = [
    { timeMs: 47_270, text: "The way you look" },
    { timeMs: 49_720, text: "The way you love" },
    { timeMs: 59_510, text: "The way you move" },
    { timeMs: 147_180, text: "The way you look" },
    { timeMs: 149_970, text: "The way you love" },
  ];

  it("gives each repeated line its own timing", () => {
    const mapped = mapPlacementsToLines(lyrics, lines);

    expect(mapped.map((entry) => entry?.timeMs)).toEqual([
      47_270, 49_720, 59_510, 147_180, 149_970,
    ]);
  });

  it("leaves an untimed line undefined", () => {
    const mapped = mapPlacementsToLines(lyrics, [lines[0], lines[2]]);

    expect(mapped[0]?.timeMs).toBe(47_270);
    expect(mapped[1]).toBeUndefined();
    expect(mapped[2]?.timeMs).toBe(59_510);
    expect(mapped[3]).toBeUndefined();
  });

  it("maps a multi-line placement onto every line it covers", () => {
    const mapped = mapPlacementsToLines(lyrics, [
      { timeMs: 1000, text: "The way you look\nThe way you love" },
    ]);

    expect(mapped[0]?.timeMs).toBe(1000);
    expect(mapped[1]?.timeMs).toBe(1000);
    expect(mapped[2]).toBeUndefined();
  });
});

describe("placementWindow", () => {
  const lyrics = [
    "The way you move when you walk by",
    "There's ain't nothing bout you",
    "That don't do something for me",
    "The way you look, the way you laugh",
    "The way you love with all you have",
    "Your dance, your drive",
  ].join("\n");

  const lines = [
    { timeMs: 159_450, text: "The way you move when you walk by" },
    { timeMs: 162_070, text: "There's ain't nothing bout you" },
    { timeMs: 164_150, text: "That don't do something for me" },
    { timeMs: 169_180, text: "The way you love with all you have" },
    { timeMs: 172_330, text: "Your dance, your drive" },
  ];

  it("bounds an untimed line by the placements around it", () => {
    const window = placementWindow(lyrics, lines, [
      "The way you look, the way you laugh",
    ]);

    expect(window).toEqual({ minMs: 164_150, maxMs: 169_180 });
  });

  it("refuses a time outside the window and accepts one inside", () => {
    const window = placementWindow(lyrics, lines, [
      "The way you look, the way you laugh",
    ]);

    expect(isInsideWindow(5_000, window)).toBe(false);
    expect(isInsideWindow(210_000, window)).toBe(false);
    expect(isInsideWindow(164_150, window)).toBe(false);
    expect(isInsideWindow(169_180, window)).toBe(false);
    expect(isInsideWindow(166_000, window)).toBe(true);
  });

  it("bounds an already-timed line by the placements either side of it", () => {
    const window = placementWindow(lyrics, lines, [
      "That don't do something for me",
    ]);

    expect(window).toEqual({ minMs: 162_070, maxMs: 169_180 });
    expect(isInsideWindow(5_000, window)).toBe(false);
    expect(isInsideWindow(166_000, window)).toBe(true);
  });

  it("leaves the lower bound open for an untimed first line", () => {
    const openLyrics = [
      "Never timed",
      "The way you move when you walk by",
      "Your dance, your drive",
    ].join("\n");

    const openLines = [
      { timeMs: 159_450, text: "The way you move when you walk by" },
      { timeMs: 172_330, text: "Your dance, your drive" },
    ];

    const window = placementWindow(openLyrics, openLines, ["Never timed"]);

    expect(window).toEqual({ minMs: null, maxMs: 159_450 });
    expect(isInsideWindow(1_000, window)).toBe(true);
  });

  it("leaves the upper bound open for an untimed last line", () => {
    const tailLyrics = [
      "The way you move when you walk by",
      "Your dance, your drive",
      "Never timed",
    ].join("\n");

    const tailLines = [
      { timeMs: 159_450, text: "The way you move when you walk by" },
      { timeMs: 172_330, text: "Your dance, your drive" },
    ];

    const window = placementWindow(tailLyrics, tailLines, ["Never timed"]);

    expect(window).toEqual({ minMs: 172_330, maxMs: null });
    expect(isInsideWindow(199_000, window)).toBe(true);
  });

  it("is unbounded for a line that is not in the lyrics", () => {
    expect(placementWindow(lyrics, lines, ["Not in the lyrics"])).toEqual({
      minMs: null,
      maxMs: null,
    });
  });

  it("bounds a repeated line by its own occurrence", () => {
    const repeated = [
      "The way you look, the way you laugh",
      "The way you love with all you have",
      "The way you look, the way you laugh",
      "Your dance, your drive",
    ].join("\n");

    const repeatedLines = [
      { timeMs: 169_180, text: "The way you love with all you have" },
      { timeMs: 172_330, text: "Your dance, your drive" },
    ];

    const window = placementWindow(repeated, repeatedLines, [
      "The way you look, the way you laugh",
    ]);

    expect(window).toEqual({ minMs: null, maxMs: 169_180 });
  });
});

describe("activePlacementAt", () => {
  const lines = [
    { timeMs: 5_000, text: "first" },
    { timeMs: 10_000, text: "second" },
    { timeMs: 20_000, text: "third" },
  ];

  it("returns null before the first placement", () => {
    expect(activePlacementAt(lines, 0)).toBeNull();
    expect(activePlacementAt(lines, 4_999)).toBeNull();
  });

  it("returns the placement whose time has been reached", () => {
    expect(activePlacementAt(lines, 5_000)?.text).toBe("first");
    expect(activePlacementAt(lines, 9_999)?.text).toBe("first");
    expect(activePlacementAt(lines, 10_000)?.text).toBe("second");
    expect(activePlacementAt(lines, 19_999)?.text).toBe("second");
    expect(activePlacementAt(lines, 20_000)?.text).toBe("third");
  });

  it("keeps the last placement active past the end of the song", () => {
    expect(activePlacementAt(lines, 600_000)?.text).toBe("third");
  });

  it("reads unsorted placements by time, not by list order", () => {
    const shuffled = [
      { timeMs: 20_000, text: "third" },
      { timeMs: 5_000, text: "first" },
      { timeMs: 10_000, text: "second" },
    ];
    expect(activePlacementAt(shuffled, 12_000)?.text).toBe("second");
  });

  it("returns null for an empty list", () => {
    expect(activePlacementAt([], 1_000)).toBeNull();
  });
});
