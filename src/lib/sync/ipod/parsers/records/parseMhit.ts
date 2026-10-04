import type { MhitRecord } from "../../models";
import type { BinaryReader } from "../../readers";

const MHIT_TRACK_ID_OFFSET = 16;
const MHIT_SIZE_BYTES_OFFSET = 36;
const MHIT_DURATION_MS_OFFSET = 40;
const MHIT_YEAR_OFFSET = 52;

export function parseMhit(reader: BinaryReader, offset: number): MhitRecord {
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

    trackId: view.getUint32(MHIT_TRACK_ID_OFFSET, true),
    sizeBytes: view.getUint32(MHIT_SIZE_BYTES_OFFSET, true),
    durationMs: view.getUint32(MHIT_DURATION_MS_OFFSET, true),
    year: view.getUint32(MHIT_YEAR_OFFSET, true),
  };
}
