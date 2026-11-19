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

async function tagsAfter(updates: Parameters<TagLibMetadataWriter["writeTags"]>[1]) {
  const bytes = await new TagLibMetadataWriter().writeTags(fixture(), updates);
  const { tags } = await readMetadata(new File([bytes.slice()], "out.m4a"));
  return tags;
}

describe("TagLibMetadataWriter.writeTags", () => {
  it("writes lyrics through their own accessor", async () => {
    const tags = await tagsAfter({ lyrics: "first line\nsecond line" });

    expect(tags.lyrics?.[0]?.text).toBe("first line\nsecond line");
  });

  it("clears lyrics when the field is emptied", async () => {
    const withLyrics = await new TagLibMetadataWriter().writeTags(fixture(), {
      lyrics: "first line",
    });

    const cleared = await new TagLibMetadataWriter().writeTags(
      new File([withLyrics.slice()], "out.m4a"),
      { lyrics: "" }
    );

    const { tags } = await readMetadata(new File([cleared.slice()], "out.m4a"));
    expect(tags.lyrics ?? []).toEqual([]);
  });

  it("writes the raw track number and release fields", async () => {
    const tags = await tagsAfter({
      trackNumber: "03/12",
      releaseCountry: "US",
      releaseStatus: "official",
    });

    // MP4 stores the track as a numeric trkn pair, so the zero padding is not
    // preserved; the "/total" suffix and the release fields round-trip.
    expect(tags.track).toBe(3);
    expect(tags.trackNumber).toContain("/12");
    expect(tags.releaseCountry?.[0]).toBe("US");
    expect(tags.releaseStatus?.[0]).toBe("official");
  });

  it("writes the advisory tri-state", async () => {
    const tags = await tagsAfter({ advisory: "explicit" });

    expect(tags.advisory).toBe("explicit");
    expect(tags.itunesAdvisory?.[0]).toBe("1");
  });

  it("writes ReplayGain and R128 gains", async () => {
    const tags = await tagsAfter({
      replayGainTrackGain: "-6.54 dB",
      replayGainAlbumGain: "-7.10 dB",
      r128TrackGain: -512,
    });

    expect(tags.replayGainTrackGain?.[0]).toBe("-6.54 dB");
    expect(tags.replayGainAlbumGain?.[0]).toBe("-7.10 dB");
    // R128 gains are stored as Q7.8 fixed point and read back divided by 256.
    expect(tags.r128TrackGain).toBeCloseTo(-512, 2);
  });
});
