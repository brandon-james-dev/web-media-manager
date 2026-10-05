import type { MhniRecord } from "@/lib/sync/ipod";
import type { BinaryReader } from "../../../readers";

export function parseMhni(reader: BinaryReader, offset: number): MhniRecord {
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
