import type { MhodRecord, StringMhodRecord } from "../../../models/records";
import { BinaryWriter } from "../../../writers/BinaryWriter";

export function serializeMhod(record: MhodRecord): Uint8Array {
  if (record.type >= 50) {
    throw new Error(`MHOD type ${record.type} is not yet supported.`);
  }

  return serializeStringMhod(record as StringMhodRecord);
}

function serializeStringMhod(record: StringMhodRecord): Uint8Array {
  const writer = new BinaryWriter();

  const stringBytes = encodeUtf16Le(record.value);

  writer.writeAscii(record.tag);

  writer.writeUint32(record.headerLength);

  writer.writeUint32(record.totalLength);

  writer.writeUint32(record.type);

  writer.writeUint32(record.unknown1);

  writer.writeUint32(record.unknown2);

  writer.writeUint32(record.position);

  writer.writeUint32(record.stringLength);

  writer.writeUint32(record.unknown3);

  writer.writeUint32(record.unknown4);

  writer.writeBytes(stringBytes);

  return writer.toUint8Array();
}

function encodeUtf16Le(value: string): Uint8Array {
  const buffer = new ArrayBuffer(value.length * 2);

  const view = new DataView(buffer);

  for (let i = 0; i < value.length; i++) {
    view.setUint16(i * 2, value.charCodeAt(i), true);
  }

  return new Uint8Array(buffer);
}
