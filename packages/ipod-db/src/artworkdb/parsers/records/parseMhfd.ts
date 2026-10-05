import type { MhfdRecord } from "../../../models/records";
import type { BinaryReader } from "../../../readers";

export function parseMhfd(reader: BinaryReader, offset: number): MhfdRecord {
  reader.seek(offset);

  const tag = reader.readString(4);
  const headerLength = reader.readUInt32LE();
  const totalLength = reader.readUInt32LE();
  const childCount = reader.readUInt32LE();
  const field0 = reader.readUInt32LE();
  const field1 = reader.readUInt32LE();
  const field2 = reader.readUInt32LE();
  const field3 = reader.readUInt32LE();

  return {
    tag,
    headerLength,
    totalLength,
    offset,

    childCount,

    field0,
    field1,
    field2,
    field3,
  };
}
