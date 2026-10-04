import type { IpodRecord } from "../models/records/IpodRecord";
import type { BinaryReader } from "../readers";

export function parseRecordHeader(reader: BinaryReader): IpodRecord {
  const offset = reader.position;
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
