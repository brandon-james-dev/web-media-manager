import { describe, expect, it } from "vitest";
import { TagLibMetadataReader } from "./TagLibMetadataReader";
import { TagLibMetadataWriter } from "../writer/TagLibMetadataWriter";

import { SILENCE_M4A_BASE64 } from "../writer/fixtures/silenceM4a";

function fixture(name: string) {
  const bytes = Uint8Array.from(atob(SILENCE_M4A_BASE64), (c) =>
    c.charCodeAt(0)
  );
  return new File([bytes], name);
}

describe("TagLibMetadataReader.readMetadataMany", () => {
  it("returns one entry per file, in input order", async () => {
    const files = [fixture("a.m4a"), fixture("b.m4a"), fixture("c.m4a")];

    const results = await new TagLibMetadataReader().readMetadataMany(files);

    expect(results).toHaveLength(3);
    expect(results.map((result) => result?.title)).toEqual([
      "a.m4a",
      "b.m4a",
      "c.m4a",
    ]);
  });

  it("reads audio properties alongside the tags", async () => {
    const [result] = await new TagLibMetadataReader().readMetadataMany([
      fixture("a.m4a"),
    ]);

    expect(result?.codec).toBe("AAC");
    expect(result?.containerFormat).toBe("MP4");
    expect(result?.durationMs).toBeGreaterThan(0);
  });

  it("keeps a corrupt file in its own slot without failing the batch", async () => {
    const files = [
      fixture("a.m4a"),
      new File([new Uint8Array([1, 2, 3, 4])], "broken.mp3"),
      fixture("c.m4a"),
    ];

    const results = await new TagLibMetadataReader().readMetadataMany(files);

    expect(results).toHaveLength(3);
    expect(results[0]?.title).toBe("a.m4a");
    expect(results[1]).toBeNull();
    expect(results[2]?.title).toBe("c.m4a");
  });

  it("returns an empty list for no files", async () => {
    expect(await new TagLibMetadataReader().readMetadataMany([])).toEqual([]);
  });

  it("pulls timed lyrics out of the lyrics tag on import", async () => {
    const written = await new TagLibMetadataWriter().writeTags(
      fixture("a.m4a"),
      { syncedLyrics: "[00:10.00] one\n[00:20.50] two" }
    );

    const [result] = await new TagLibMetadataReader().readMetadataMany([
      new File([written.slice().buffer], "a.m4a"),
    ]);

    expect(result?.lyrics).toBe("one\ntwo");
    expect(result?.syncedLyrics).toBe("[00:10.00] one\n[00:20.50] two");
  });
});
