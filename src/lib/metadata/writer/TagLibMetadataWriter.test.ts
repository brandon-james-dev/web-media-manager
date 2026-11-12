import { describe, expect, it } from "vitest";
import { readMetadata } from "taglib-wasm/simple";
import { TagLibMetadataWriter } from "./TagLibMetadataWriter";

import { SILENCE_M4A_BASE64 } from "./fixtures/silenceM4a";

function fixture() {
  const bytes = Uint8Array.from(atob(SILENCE_M4A_BASE64), (c) =>
    c.charCodeAt(0)
  );
  return new File([bytes], "silence.m4a");
}

async function ratingAfter(rating: number) {
  const bytes = await new TagLibMetadataWriter().writeRatings(fixture(), [
    { rating },
  ]);
  const { tags } = await readMetadata(new File([bytes.slice()], "out.m4a"));
  return tags.ratings?.[0]?.rating;
}

describe("TagLibMetadataWriter.writeRatings", () => {
  it("stores five stars as a full rating", async () => {
    expect(await ratingAfter(1)).toBe(1);
  });

  it("stores unrated as zero", async () => {
    expect(await ratingAfter(0)).toBe(0);
  });

  it("keeps in-between ratings", async () => {
    expect(await ratingAfter(0.6)).toBeCloseTo(0.6, 2);
  });
});
