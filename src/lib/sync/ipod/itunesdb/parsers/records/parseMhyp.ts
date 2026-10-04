import type { MhypRecord } from "../..";
import type { BinaryReader } from "../../readers";

export function parseMhyp(reader: BinaryReader, offset: number): MhypRecord {
  reader.seek(offset);

  const tag = reader.readString(4);
  const headerLength = reader.readUInt32LE();
  const totalLength = reader.readUInt32LE();
  const numMhod = reader.readUInt32LE();
  const numItems = reader.readUInt32LE();
  const hidden = reader.readUInt32LE();
  const timestamp = reader.readUInt32LE();
  const playlistId = reader.readUInt32LE();
  const unknown3 = reader.readUInt32LE();
  const unknown4 = reader.readUInt32LE();
  const unknown5 = reader.readUInt32LE();

  return {
    tag,
    headerLength,
    totalLength,

    numMhod,
    numItems,

    hidden,

    timestamp,

    playlistId,

    unknown3,
    unknown4,
    unknown5,
  };
}
