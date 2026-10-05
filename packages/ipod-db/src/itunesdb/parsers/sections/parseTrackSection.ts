import type { IpodTrack } from "../../../models/entities";
import type { MhsdRecord } from "../../../models/records";
import { MHSD_TYPES } from "../../../constants/mhsd-types";
import type { BinaryReader } from "../../../readers";
import { parseMhlt } from "../records";
import { parseTrack } from "../track";

export function parseTrackSection(
  reader: BinaryReader,
  sections: MhsdRecord[]
): IpodTrack[] {
  const tracksSection = sections.find(
    (section) => section.type === MHSD_TYPES.TrackList
  );

  if (!tracksSection) {
    throw new Error("Track section not found.");
  }

  const mhltOffset = tracksSection.offset + tracksSection.headerLength;
  const mhlt = parseMhlt(reader, mhltOffset);
  const tracks: IpodTrack[] = [];

  let trackOffset = mhltOffset + mhlt.headerLength;

  const tracksEnd = tracksSection.offset + tracksSection.totalLength;

  while (trackOffset < tracksEnd) {
    reader.seek(trackOffset);

    const tag = reader.readString(4);

    if (tag !== "mhit") {
      break;
    }

    tracks.push(parseTrack(reader, trackOffset));

    reader.seek(trackOffset + 8);

    trackOffset += reader.readUInt32LE();
  }

  return tracks;
}
