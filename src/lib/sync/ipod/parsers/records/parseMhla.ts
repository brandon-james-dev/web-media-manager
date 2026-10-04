import type { MhlaRecord } from "../../models";
import type { BinaryReader } from "../../readers";

export function parseMhla(reader: BinaryReader, offset: number): MhlaRecord {
  reader.seek(offset);

  const tag = reader.readString(4);
  const headerLength = reader.readUInt32LE();
  const artworkCount = reader.readUInt32LE();
  const mhiaOffset = offset + headerLength;

  reader.seek(mhiaOffset);

  const childTag = reader.readString(4);

  return {
    tag,
    headerLength,
    artworkCount,
    mhiaOffset,
    childTag,
  };
}
