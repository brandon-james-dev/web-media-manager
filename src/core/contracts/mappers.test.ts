import { describe, it, expect } from "vitest";
import type { Song } from "@/models";
import type { ITagData, IAudioProperties } from "@/lib/contracts";
import {
  applyTagDataToSong,
  songToChild,
  artistId,
  albumId,
  musicSourceToMusicFolder,
  songsToAlbums,
} from "./mappers";
import type { MusicSource } from "./sources";

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    id: "song-1",
    sourceId: "src-1",
    relativePath: "/music/a.mp3",
    filename: "a.mp3",
    filesize: 1024,
    title: "Title",
    artist: "Artist",
    album: "Album",
    genre: "Pop",
    year: 2021,
    track: 2,
    discNumber: 1,
    length: 180,
    ...overrides,
  };
}

const tags: ITagData = {
  title: "New Title",
  artist: "New Artist",
  album: "New Album",
  genre: "Rock",
  year: 1999,
  track: 1,
};

const audioProps: Partial<IAudioProperties> = {
  sampleRate: 44100,
  channels: 2,
  length: 240,
  bitrate: 320,
};

describe("applyTagDataToSong", () => {
  it("spreads tag + audio properties over the song, keeping structural fields", () => {
    const out = applyTagDataToSong(makeSong(), tags, audioProps);
    expect(out.title).toBe("New Title");
    expect(out.artist).toBe("New Artist");
    expect(out.genre).toBe("Rock");
    expect(out.year).toBe(1999);
    expect(out.track).toBe(1);
    expect(out.sampleRate).toBe(44100);
    expect(out.channels).toBe(2);
    expect(out.length).toBe(240);
    expect(out.bitrate).toBe(320);
    // structural / identity fields survive untouched
    expect(out.id).toBe("song-1");
    expect(out.sourceId).toBe("src-1");
    expect(out.relativePath).toBe("/music/a.mp3");
    expect(out.filename).toBe("a.mp3");
    expect(out.filesize).toBe(1024);
  });

  it("tolerates null/undefined tags and props", () => {
    const song = makeSong();
    expect(applyTagDataToSong(song, null, null)).toEqual(song);
    expect(applyTagDataToSong(song, undefined, undefined)).toEqual(song);
  });

  it("does not mutate the input song", () => {
    const song = makeSong();
    applyTagDataToSong(song, tags, audioProps);
    expect(song.title).toBe("Title");
    expect(song.artist).toBe("Artist");
  });
});

describe("songToChild", () => {
  it("maps a stored song to the Open Subsonic Child view", () => {
    const child = songToChild(makeSong());
    expect(child).toMatchObject({
      id: "song-1",
      title: "Title",
      artist: "Artist",
      artistId: artistId("Artist"),
      album: "Album",
      albumId: albumId("Album"),
      coverArt: "song-1",
      genre: "Pop",
      year: 2021,
      track: 2,
      discNumber: 1,
      duration: 180,
      suffix: "mp3",
      isDir: false,
      isVideo: false,
    });
    expect(child.path).toBe("/music/a.mp3");
    expect(child.size).toBe(1024);
  });

  it("treats missing tags as empty strings/undefined", () => {
    const child = songToChild(
      makeSong({ title: undefined, artist: undefined, album: undefined })
    );
    expect(child.title).toBe("");
    expect(child.artist).toBe(undefined);
    expect(child.artistId).toBe(undefined);
    expect(child.album).toBe(undefined);
    expect(child.albumId).toBe(undefined);
  });
});

describe("artistId / albumId", () => {
  it("normalizes names into stable slugs", () => {
    expect(artistId("The Beatles")).toBe("artist-the-beatles");
    expect(albumId("Abbey Road")).toBe("album-abbey-road");
    expect(artistId("  A  B ")).toBe("artist-a-b");
  });
});

describe("musicSourceToMusicFolder", () => {
  it("maps a source id+name to a MusicFolder", () => {
    const source = makeSource();
    expect(musicSourceToMusicFolder(source)).toEqual({
      id: source.id,
      name: source.name,
    });
  });
});

describe("songsToAlbums", () => {
  it("groups songs by album with aggregates", () => {
    const albums = songsToAlbums([
      makeSong({ album: "A", year: 2001, length: 100 }),
      makeSong({ album: "A", year: 2002, length: 200 }),
      makeSong({ album: "B", year: 2010, length: 50 }),
    ]);
    expect(albums).toHaveLength(2);
    const a = albums.find((x) => x.name === "A")!;
    expect(a.songCount).toBe(2);
    expect(a.duration).toBe(300);
    expect(a.year).toBe(2002);
    const b = albums.find((x) => x.name === "B")!;
    expect(b.songCount).toBe(1);
  });

  it("handles empty input", () => {
    expect(songsToAlbums([])).toEqual([]);
  });
});

function makeSource(): MusicSource {
  return {
    id: "src-9",
    uriDomain: "local",
    name: "On Device",
    enabled: true,
    createdAt: new Date("2026-01-01"),
    priority: 50,
    capabilities: {
      streaming: true,
      browsing: true,
      searching: false,
      metadataWrite: true,
      libraryScanning: true,
      playlistWrite: true,
    },
    kind: "subsonic",
    config: { baseUrl: "http://example.test" },
  };
}

