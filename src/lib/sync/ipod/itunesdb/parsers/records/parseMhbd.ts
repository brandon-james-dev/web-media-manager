import type { BinaryReader } from "../../readers";

export function parseMhbd(reader: BinaryReader) {
  const tag = reader.readString(4);

  const headerLength = reader.readUInt32LE();

  const totalLength = reader.readUInt32LE();

  return {
    tag,
    headerLength,
    totalLength,
  };
}
