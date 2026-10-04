import type { IpodDatabase, MhsdRecord } from "../models";
import { BinaryReader } from "../readers";
import {
  parseMhbd,
  parseMhsd,
  parsePlaylistsSection,
  parseTrackSection,
} from "..";

export async function parseITunesDb(
  root: FileSystemDirectoryHandle
): Promise<Partial<IpodDatabase>> {
  const control = await root.getDirectoryHandle("iPod_Control");
  const iTunes = await control.getDirectoryHandle("iTunes");
  const fileHandle = await iTunes.getFileHandle("iTunesDB");
  const file = await fileHandle.getFile();
  const buffer = await file.arrayBuffer();
  const reader = new BinaryReader(new DataView(buffer));
  const mhbd = parseMhbd(reader);
  const sections: MhsdRecord[] = [];

  let offset = mhbd.headerLength;

  while (offset < buffer.byteLength) {
    reader.seek(offset);

    const section = parseMhsd(reader);

    sections.push(section);

    offset += section.totalLength;
  }

  const tracks = parseTrackSection(reader, sections);
  const playlists = parsePlaylistsSection(reader, sections, tracks);

  return {
    tracks,
    playlists,
  };
}
