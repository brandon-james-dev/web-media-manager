import type { BinaryReader } from "../../../readers";

export function parseMhif(reader: BinaryReader, offset: number): void {
  reader.seek(offset);

  const tag = reader.readString(4);
  const recordLength = reader.readUInt32LE();
  const totalLength = reader.readUInt32LE();
  const values: number[] = [];
  const remainingBytes = totalLength - 12;
  const dwordCount = remainingBytes / 4;

  for (let i = 0; i < dwordCount; i++) {
    values.push(reader.readUInt32LE());
  }

  console.log({
    tag,
    recordLength,
    totalLength,
    values,
  });
}
