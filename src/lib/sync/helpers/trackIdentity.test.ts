import { describe, expect, it } from "vitest";
import type { Song } from "@/models";
import {
  deviceTrackIdentities,
  isSongOnEveryDevice,
  isSongOnDevice,
  trackIdentity,
} from "./trackIdentity";

/**
 * A song is only unqueueable when no connected device lacks it. Testing
 * against one merged set meant a song on the Zune 8 could never be queued for
 * a Zune 120 that did not have it, so the sync copied nothing.
 */

const song = {
  id: "song-1",
  title: "Higher",
  album: "Human Clay",
  artist: "Creed",
} as unknown as Song;

function identitiesFor(
  tracks: { title: string; album: string; artist: string }[]
): Set<string> {
  return new Set(
    tracks.map((track) =>
      trackIdentity(track.title, track.album, track.artist)
    )
  );
}

describe("isSongOnEveryDevice", () => {
  it("is false when one connected device lacks the song", () => {
    const zune8 = identitiesFor([
      { title: "Higher", album: "Human Clay", artist: "Creed" },
    ]);
    const zune120 = identitiesFor([]);

    expect(isSongOnDevice(song, zune8)).toBe(true);
    expect(isSongOnEveryDevice(song, [zune8, zune120])).toBe(false);
  });

  it("is true when every connected device holds the song", () => {
    const zune8 = identitiesFor([
      { title: "Higher", album: "Human Clay", artist: "Creed" },
    ]);
    const zune120 = identitiesFor([
      { title: "Higher", album: "Human Clay", artist: "Creed" },
    ]);

    expect(isSongOnEveryDevice(song, [zune8, zune120])).toBe(true);
  });

  it("is false when no device is connected", () => {
    expect(isSongOnEveryDevice(song, [])).toBe(false);
  });

  it("reads a device's tracks through deviceTrackIdentities", () => {
    const device = {
      media: {
        tracks: [{ title: "Higher", album: "Human Clay", artist: "Creed" }],
      },
    } as never;

    expect(isSongOnEveryDevice(song, [deviceTrackIdentities(device)])).toBe(
      true
    );
  });
});
