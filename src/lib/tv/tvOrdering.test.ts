import { describe, expect, it } from "vitest";
import {
  buildRecencyMap,
  mostRecentPlay,
  orderCollections,
} from "./tvOrdering";
import type { PlayHistoryEntry } from "@/models";

function entry(songId: string, playedAt: number): PlayHistoryEntry {
  return { id: `${songId}-${playedAt}`, songId, playedAt, listenedSeconds: 30 };
}

interface Item {
  name: string;
  songIds: string[];
}

const nameOf = (item: Item) => item.name;
const songIdsOf = (item: Item) => item.songIds;

describe("buildRecencyMap", () => {
  it("keeps the latest play per song", () => {
    const map = buildRecencyMap([entry("a", 10), entry("a", 40), entry("b", 20)]);
    expect(map.get("a")).toBe(40);
    expect(map.get("b")).toBe(20);
  });

  it("is empty for no history", () => {
    expect(buildRecencyMap([]).size).toBe(0);
  });
});

describe("mostRecentPlay", () => {
  it("returns the latest timestamp among the songs", () => {
    const map = buildRecencyMap([entry("a", 10), entry("b", 90)]);
    expect(mostRecentPlay(["a", "b"], map)).toBe(90);
  });

  it("returns 0 when nothing in the collection was played", () => {
    const map = buildRecencyMap([entry("a", 10)]);
    expect(mostRecentPlay(["x", "y"], map)).toBe(0);
  });
});

describe("orderCollections", () => {
  const items: Item[] = [
    { name: "Charlie", songIds: ["c"] },
    { name: "Alpha", songIds: ["a"] },
    { name: "Bravo", songIds: ["b"] },
  ];

  it("sorts alphabetically with no history", () => {
    const ordered = orderCollections(items, songIdsOf, nameOf, new Map());
    expect(ordered.map(nameOf)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorts by most recent play once there is history", () => {
    const recency = buildRecencyMap([
      entry("a", 100),
      entry("c", 300),
      entry("b", 200),
    ]);
    const ordered = orderCollections(items, songIdsOf, nameOf, recency);
    expect(ordered.map(nameOf)).toEqual(["Charlie", "Bravo", "Alpha"]);
  });

  it("puts unplayed collections last, alphabetically", () => {
    const recency = buildRecencyMap([entry("b", 50)]);
    const ordered = orderCollections(items, songIdsOf, nameOf, recency);
    expect(ordered.map(nameOf)).toEqual(["Bravo", "Alpha", "Charlie"]);
  });

  it("does not mutate the input", () => {
    const input = [...items];
    orderCollections(input, songIdsOf, nameOf, new Map());
    expect(input.map(nameOf)).toEqual(["Charlie", "Alpha", "Bravo"]);
  });
});
