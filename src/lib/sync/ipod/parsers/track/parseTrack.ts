import type { IpodTrack } from "../..";
import { MHOD_TYPES } from "../../constants";
import type { BinaryReader } from "../../readers";
import { parseMhit, parseMhod } from "../records";

export function parseTrack(reader: BinaryReader, offset: number): IpodTrack {
  const mhit = parseMhit(reader, offset);

  if (mhit.tag !== "mhit") {
    throw new Error(`Expected mhit but found ${mhit.tag}`);
  }

  const track: IpodTrack = {
    id: mhit.trackId,
    durationMs: mhit.durationMs,
    sizeBytes: mhit.sizeBytes,
    year: mhit.year,
  };

  const mhitEnd = offset + mhit.totalLength;

  let childOffset = offset + mhit.headerLength;

  while (childOffset < mhitEnd) {
    const mhod = parseMhod(reader, childOffset);

    switch (mhod.type) {
      case MHOD_TYPES.Title:
        track.title = mhod.value;
        break;

      case MHOD_TYPES.Path:
        track.dbPath = mhod.value;
        track.filePath = mhod.value.replace(/^:/, "").replaceAll(":", "/");
        break;

      case MHOD_TYPES.Album:
        track.album = mhod.value;
        break;

      case MHOD_TYPES.Artist:
        track.artist = mhod.value;
        break;

      case MHOD_TYPES.Genre:
        track.genre = mhod.value;
        break;

      case MHOD_TYPES.FileType:
        track.fileType = mhod.value;
        break;
    }

    childOffset += mhod.totalLength;
  }

  return track;
}
