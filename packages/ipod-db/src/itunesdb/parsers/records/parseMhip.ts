import type { MhipRecord } from "../../../models/records";
import type { BinaryReader } from "../../../readers";

const MHIP_ID_OFFSET = 8;
const MHIP_TRACK_ID_OFFSET = 12;

export function parseMhip(reader: BinaryReader, offset: number): MhipRecord {
  reader.seek(offset);

  const tag = reader.readString(4);
  const headerLength = reader.readUInt32LE();
  const totalLength = reader.readUInt32LE();

  reader.seek(offset);

  const rawHeader = reader.readBytes(headerLength);

  const view = new DataView(
    rawHeader.buffer,
    rawHeader.byteOffset,
    rawHeader.byteLength
  );

  return {
    tag,
    headerLength,
    totalLength,

    playlistItemId: view.getUint32(MHIP_ID_OFFSET, true),

    trackIndex: view.getUint32(MHIP_TRACK_ID_OFFSET, true),
  };
}
