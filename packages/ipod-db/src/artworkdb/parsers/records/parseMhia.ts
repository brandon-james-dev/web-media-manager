import type { MhiaRecord } from "@/lib/sync/ipod";
import type { BinaryReader } from "../../../readers";

export function parseMhia(reader: BinaryReader, offset: number): MhiaRecord {
  reader.seek(offset);

  const tag = reader.readString(4);
  const headerLength = reader.readUInt32LE();
  const totalLength = reader.readUInt32LE();

  return {
    tag,
    headerLength,
    totalLength,
  };
}
