import type { MhiaRecord } from "../../../models/records";
import type { BinaryReader } from "../../../readers";

const MHIA_ID_OFFSET = 16;
const MHIA_FIELD_20_OFFSET = 20;
const MHIA_FIELD_24_OFFSET = 24;
const MHIA_FIELD_28_OFFSET = 28;

export function parseMhia(reader: BinaryReader, offset: number): MhiaRecord {
  reader.seek(offset);

  const tag = reader.readString(4);
  const headerLength = reader.readUInt32LE();
  const totalLength = reader.readUInt32LE();

  reader.seek(offset);

  const header = reader.readBytes(headerLength);
  const view = new DataView(
    header.buffer,
    header.byteOffset,
    header.byteLength
  );

  return {
    tag,
    headerLength,
    totalLength,
    id: view.getUint32(MHIA_ID_OFFSET, true),
    field20: view.getUint32(MHIA_FIELD_20_OFFSET, true),
    field24: view.getUint32(MHIA_FIELD_24_OFFSET, true),
    field28: view.getUint32(MHIA_FIELD_28_OFFSET, true),
  };
}
