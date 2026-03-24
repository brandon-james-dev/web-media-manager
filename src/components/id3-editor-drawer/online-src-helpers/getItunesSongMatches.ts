"use client";

import fuzzysearch from "fuzzysearch-ts";
import { getSong, type MusicResult } from "itunes-web-api";

export async function getItunesSongMatches(
  title: string,
  artist: string | undefined,
  album: string | undefined,
): Promise<MusicResult[]> {
  const queryParts = [title];
  if (artist) queryParts.push(artist);
  if (album) queryParts.push(album);

  const query = queryParts.join(" ").trim();

  const results = await getSong(query, {
    language: "en",
    country: "US",
    limit: 25,
  });

  let matches: MusicResult[] = [];

  try {
    const filterableTitle = title.toLowerCase().replace(/[^A-Za-z]/g, "");
    const filtered = results.results.filter((r) =>
      fuzzysearch(
        filterableTitle,
        r.trackName.toLowerCase().replace(/[^A-Za-z]/g, ""),
      ),
    );

    if (!filtered || filtered.length === 0) {
      throw new Error("No iTunes results found");
    }

    matches = filtered;
  } catch {
    matches = results.results;
  }

  return matches;
}
