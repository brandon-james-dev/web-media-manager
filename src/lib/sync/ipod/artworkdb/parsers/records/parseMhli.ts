import type { MhliRecord } from "../../../models/records";
import type { BinaryReader } from "../../../readers";

export function parseMhli(reader: BinaryReader, offset: number): MhliRecord {
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
