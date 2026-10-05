import type { MhiiRecord } from "@/lib/sync/ipod";
import type { BinaryReader } from "../../../readers";

export function parseMhii(reader: BinaryReader, offset: number): MhiiRecord {
  reader.seek(offset);

  const tag = reader.readString(4);
  const headerLength = reader.readUInt32LE();
  const totalLength = reader.readUInt32LE();
  const childCount = reader.readUInt32LE();

  return {
    tag,
    headerLength,
    totalLength,
    childCount,
    offset,
  };
}
