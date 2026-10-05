import type { MhodRecord } from "../../../models/records";
import type { BinaryReader } from "../../../readers";

export function parseMhod(reader: BinaryReader, offset: number): MhodRecord {
  reader.seek(offset);

  const tag = reader.readString(4);
  const headerLength = reader.readUInt32LE();
  const totalLength = reader.readUInt32LE();
  const type = reader.readUInt32LE();
  const unknown1 = reader.readUInt32LE();
  const unknown2 = reader.readUInt32LE();

  if (type < 50) {
    const position = reader.readUInt32LE();
    const stringLength = reader.readUInt32LE();
    const unknown3 = reader.readUInt32LE();
    const unknown4 = reader.readUInt32LE();

    reader.seek(offset + 40);

    const value = reader.readUtf16String(stringLength).replace(/\0+$/u, "");

    return {
      tag,

      headerLength,
      totalLength,

      type: type as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 12 | 13,

      unknown1,
      unknown2,

      position,

      stringLength,

      unknown3,
      unknown4,

      value,
    };
  }

  if (type === 50) {
    reader.seek(offset + headerLength);

    const liveUpdate = reader.readUInt8();
    const rulesEnabled = reader.readUInt8();
    const limitEnabled = reader.readUInt8();
    const limitType = reader.readUInt8();
    const limitSort = reader.readUInt8();

    reader.skip(3);

    const limit = reader.readUInt32LE();
    const matchCheckedOnly = reader.readUInt8();
    const reverseLimitSort = reader.readUInt8();

    return {
      tag,

      headerLength,
      totalLength,

      type: 50,

      unknown1,
      unknown2,

      liveUpdate,
      rulesEnabled,
      limitEnabled,

      limitType,
      limitSort,

      limit,

      matchCheckedOnly,
      reverseLimitSort,
    };
  }

  if (type === 51) {
    reader.seek(offset + headerLength);

    const rulesId = reader.readString(4);
    const unknown5 = reader.readUInt32BE();
    const numberOfRules = reader.readUInt32BE();
    const rulesOperator = reader.readUInt32BE();

    return {
      tag,
      headerLength,
      totalLength,

      type: 51,

      unknown1,
      unknown2,

      rulesId,
      unknown5,

      numberOfRules,
      rulesOperator,
    };
  }

  if (type === 52) {
    reader.seek(offset + headerLength);

    const fieldId = reader.readUInt32LE();

    return {
      tag,

      headerLength,
      totalLength,

      type: 52,

      unknown1,
      unknown2,

      fieldId,
    };
  }

  if (type === 53) {
    reader.seek(offset + headerLength);

    const fieldId = reader.readUInt32LE();

    reader.readUInt32LE();
    reader.readUInt32LE();
    reader.readUInt32LE();

    const value = reader.readUInt32LE();

    return {
      tag,

      headerLength,
      totalLength,

      type: 53,

      unknown1,
      unknown2,

      fieldId,
      value,
    };
  }

  return {
    tag,

    headerLength,
    totalLength,

    type,

    unknown1,
    unknown2,
  };
}
