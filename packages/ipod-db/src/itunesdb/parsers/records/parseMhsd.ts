import type { MhsdRecord } from "../../../models/records";
import type { BinaryReader } from "../../../readers";

export function parseMhsd(reader: BinaryReader): MhsdRecord {
  const offset = reader.position;
  const tag = reader.readString(4);
  const headerLength = reader.readUInt32LE();
  const totalLength = reader.readUInt32LE();
  const type = reader.readUInt32LE();
  const currentPosition = reader.position;

  reader.seek(offset + headerLength);

  const childTag = reader.readString(4);

  reader.seek(currentPosition);

  return {
    tag,
    headerLength,
    totalLength,
    type,
    offset,
    childTag,
  };
}
