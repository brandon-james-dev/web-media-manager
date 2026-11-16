import { describe, expect, it } from "vitest";
import { parseCsv, serializeCsv } from "./csv";

describe("parseCsv", () => {
  it("splits rows and fields", () => {
    expect(parseCsv("a,b,c\nd,e,f")).toEqual([
      ["a", "b", "c"],
      ["d", "e", "f"],
    ]);
  });

  it("returns no rows for empty text", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("ignores the empty line a trailing newline leaves behind", () => {
    expect(parseCsv("a,b\n")).toEqual([["a", "b"]]);
    expect(parseCsv("a,b\r\n")).toEqual([["a", "b"]]);
  });

  it("accepts CRLF and LF line endings", () => {
    expect(parseCsv("a,b\r\nc,d\r\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(parseCsv("a,b\nc,d\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("strips a leading byte-order mark", () => {
    expect(parseCsv("\uFEFFkey,value\n")).toEqual([["key", "value"]]);
  });

  it("keeps a comma inside a quoted field", () => {
    expect(parseCsv('"Closes a panel, dialog or view.",x')).toEqual([
      ["Closes a panel, dialog or view.", "x"],
    ]);
  });

  it("unescapes a doubled quote inside a quoted field", () => {
    expect(parseCsv('"He said ""hi""",x')).toEqual([['He said "hi"', "x"]]);
  });

  it("keeps a line break inside a quoted field", () => {
    expect(parseCsv('"one\ntwo",x\r\ny,z')).toEqual([
      ["one\ntwo", "x"],
      ["y", "z"],
    ]);
  });

  it("keeps an empty quoted field empty", () => {
    expect(parseCsv('"",b')).toEqual([["", "b"]]);
  });

  it("pads nothing: a ragged row keeps the cells it has", () => {
    expect(parseCsv("a,b,c\nd")).toEqual([["a", "b", "c"], ["d"]]);
    expect(parseCsv("a,")).toEqual([["a", ""]]);
  });
});

describe("serializeCsv", () => {
  it("writes LF line endings and a trailing newline", () => {
    expect(serializeCsv([["a", "b"], ["c", "d"]])).toBe("a,b\nc,d\n");
  });

  it("quotes only the fields that need it", () => {
    expect(serializeCsv([["plain", "a,b", 'say "hi"', "two\nlines"]])).toBe(
      'plain,"a,b","say ""hi""","two\nlines"\n'
    );
  });

  it("writes nothing for no rows", () => {
    expect(serializeCsv([])).toBe("");
  });

  it("round-trips every field through parseCsv", () => {
    const rows = [
      ["key", "description", "en-US", "es-MX"],
      ["playback.next", "Skips to the next track.", "Next", "Siguiente"],
      ["common.close", 'Closes a panel, dialog or "view".', "Close", "Cerrar"],
      ["playlist.deleteDescription", "Line one\nline two", "a", "b"],
      ["empty", "", "", ""],
    ];

    expect(parseCsv(serializeCsv(rows))).toEqual(rows);
  });
});
