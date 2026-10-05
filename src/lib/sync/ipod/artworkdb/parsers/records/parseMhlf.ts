import type { MhlfRecord } from "../../../models/records";
import type { BinaryReader } from "../../../readers";

export function parseMhlf(reader: BinaryReader, offset: number): MhlfRecord {
  reader.seek(offset);

  const tag = reader.readString(4);
  const headerLength = reader.readUInt32LE();
  const childCount = reader.readUInt32LE();

  return {
    tag,
    headerLength,
    childCount,
    offset,
  };
}
