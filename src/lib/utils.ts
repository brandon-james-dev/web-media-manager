import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Id3FormValues, Song } from "@/models";
import type { ICommonTagsResult } from "music-metadata";
import { TAG_MAP } from "./tagMap";
import { ID3Writer } from "browser-id3-writer";
import type { SongTags } from "@/models/SongTags";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string) {
  let binaryString;

  if (typeof atob === "function") {
    binaryString = atob(base64);
  } else {
    throw new Error("No Base64 decoding method available in this environment");
  }

  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

export function mapCommonTagsToSongTags(
  tags: ICommonTagsResult,
): Partial<SongTags> {
  const result: any = {};

  for (const key in TAG_MAP) {
    const formKey = key as keyof SongTags;
    const tagKey = TAG_MAP[formKey];

    if (!tagKey) continue;

    const value = tags[tagKey];

    if (value == null) continue;

    if (Array.isArray(value)) {
      result[formKey] = String(value[0] ?? "");
    } else {
      result[formKey] = String(value);
    }
  }

  if (tags.track) {
    const { no, of } = tags.track;
    result.track = [no, of].filter(Boolean).join("/") || "";
  }

  if (tags.disk) {
    const { no, of } = tags.disk;
    result.disc = [no, of].filter(Boolean).join("/") || "";
  }

  return result as SongTags;
}

export function stripExistingId3v2Tag(arrayBuffer: ArrayBuffer): ArrayBuffer {
  const bytes = new Uint8Array(arrayBuffer);

  // Check for "ID3" header
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const size =
      (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9];

    const startOfAudio = 10 + size;
    return arrayBuffer.slice(startOfAudio);
  }

  return arrayBuffer; // no tag found
}

export async function writeUpdatedTagsToFile(
  song: Song,
  updatedTags: Partial<Id3FormValues>,
) {
  const { fileHandle } = song;

  const file = await fileHandle.getFile();
  const originalBuffer = await file.arrayBuffer();
  const audioOnlyBuffer = stripExistingId3v2Tag(originalBuffer);
  const writer = new ID3Writer(audioOnlyBuffer);

  if (updatedTags.title) writer.setFrame("TIT2", updatedTags.title);
  if (updatedTags.artist) writer.setFrame("TPE1", [updatedTags.artist]);
  if (updatedTags.album) writer.setFrame("TALB", updatedTags.album);
  if (updatedTags.albumArtist) writer.setFrame("TPE2", updatedTags.albumArtist);
  if (updatedTags.track) writer.setFrame("TRCK", updatedTags.track);
  if (updatedTags.disc) writer.setFrame("TPOS", updatedTags.disc);
  if (updatedTags.year) writer.setFrame("TYER", updatedTags.year);
  if (updatedTags.genre) writer.setFrame("TCON", [updatedTags.genre]);
  if (updatedTags.picture) {
    const firstImageAsB64Url = updatedTags.picture.at(0);
    let firstImage = new ArrayBuffer();

    if (firstImageAsB64Url) {
      firstImage = base64ToArrayBuffer(firstImageAsB64Url);
    }
    writer.setFrame("APIC", {
      type: 3,
      data: firstImage,
      description: "Cover Art",
      useUnicodeEncoding: false,
    });
  }
  if (updatedTags.comment) {
    writer.setFrame("COMM", {
      description: "",
      text: updatedTags.comment,
    });
  }
  if (updatedTags.composer) writer.setFrame("TCOM", [updatedTags.composer]);
  if (updatedTags.bpm) writer.setFrame("TBPM", updatedTags.bpm);
  if (updatedTags.lyrics) {
    writer.setFrame("USLT", {
      description: "",
      lyrics: updatedTags.lyrics,
    });
  }
  if (updatedTags.copyright) writer.setFrame("TCOP", updatedTags.copyright);
  // if (updatedTags.encoder) writer.setFrame("TENC", updatedTags.encoder);

  writer.addTag();

  const updatedBlob = writer.getBlob();

  const writable = await fileHandle.createWritable();
  await writable.write(updatedBlob);
  await writable.close();
}

export function getUniqueValues(
  key: keyof Song["tags"],
  songs: Song[],
): string[] {
  const set = new Set<string>();
  for (const s of songs) {
    const v = (s.tags as any)[key];
    if (v !== undefined && v !== null && v !== "") {
      set.add(String(v));
    }
  }
  return Array.from(set);
}
