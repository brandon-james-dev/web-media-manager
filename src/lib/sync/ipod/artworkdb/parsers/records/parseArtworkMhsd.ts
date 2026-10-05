import type { ArtworkMhsdRecord } from "../../../models/records";
import type { BinaryReader } from "../../../readers";

export function parseArtworkMhsd(
  reader: BinaryReader,
  offset: number
): ArtworkMhsdRecord {
  reader.seek(offset);

  const tag = reader.readString(4);
  const headerLength = reader.readUInt32LE();
  const totalLength = reader.readUInt32LE();
  const type = reader.readUInt32LE();

  return {
    tag,
    headerLength,
    totalLength,
    type,
  };
}
