export class BinaryReader {
  private readonly view: DataView;

  private offset = 0;

  constructor(view: DataView) {
    this.view = view;
  }

  get position() {
    return this.offset;
  }

  seek(offset: number) {
    this.offset = offset;
  }

  skip(length: number) {
    this.offset += length;
  }

  readUInt8() {
    const value = this.view.getUint8(this.offset);

    this.offset += 1;

    return value;
  }

  readUInt16LE() {
    const value = this.view.getUint16(this.offset, true);

    this.offset += 2;

    return value;
  }

  readUInt32LE() {
    const value = this.view.getUint32(this.offset, true);

    this.offset += 4;

    return value;
  }

  readUInt32BE(): number {
    const value = this.view.getUint32(this.position, false);

    this.offset += 4;

    return value;
  }

  readString(length: number) {
    const bytes = new Uint8Array(this.view.buffer, this.offset, length);

    this.offset += length;

    return new TextDecoder().decode(bytes);
  }

  readUtf16String(length: number) {
    const bytes = this.readBytes(length);

    return new TextDecoder("utf-16le").decode(bytes);
  }

  readBytes(length: number) {
    const bytes = new Uint8Array(this.view.buffer, this.offset, length);

    this.offset += length;

    return bytes;
  }
}
