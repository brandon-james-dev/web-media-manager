import type { MhlpRecord } from "../../../models/records";
import type { BinaryReader } from "../../../readers";

export function parseMhlp(reader: BinaryReader, offset: number): MhlpRecord {
  reader.seek(offset);

  const tag = reader.readString(4);
  const headerLength = reader.readUInt32LE();
  const totalLength = reader.readUInt32LE();

  return {
    tag,
    headerLength,
    totalLength,
    offset,
  };
}
