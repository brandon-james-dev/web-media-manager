import type { RecordHeader } from "../models/records";
import type { BinaryReader } from "../readers";

export function parseRecordHeader(
  reader: BinaryReader,
  offset: number
): RecordHeader {
  reader.seek(offset);

  return {
    offset,
    tag: reader.readString(4),
    headerLength: reader.readUInt32LE(),
  };
}
