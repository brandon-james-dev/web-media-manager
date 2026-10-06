export class BinaryWriter {
  private chunks: Uint8Array[] = [];

  writeUint8(value: number) {
    const buffer = new Uint8Array(1);

    buffer[0] = value;

    this.chunks.push(buffer);
  }

  writeUint16(value: number) {
    const buffer = new ArrayBuffer(2);

    new DataView(buffer).setUint16(
      0,
      value,
      true,
    );

    this.chunks.push(
      new Uint8Array(buffer),
    );
  }

  writeUint32(value: number) {
    const buffer = new ArrayBuffer(4);

    new DataView(buffer).setUint32(
      0,
      value,
      true,
    );

    this.chunks.push(
      new Uint8Array(buffer),
    );
  }

  writeBytes(
    bytes: Uint8Array,
  ) {
    this.chunks.push(bytes);
  }

  writeAscii(
    value: string,
  ) {
    const bytes =
      new TextEncoder().encode(
        value,
      );

    this.chunks.push(bytes);
  }

  writeUtf16Le(
    value: string,
  ) {
    const buffer =
      new Uint8Array(
        value.length * 2,
      );

    const view =
      new DataView(
        buffer.buffer,
      );

    for (
      let i = 0;
      i < value.length;
      i++
    ) {
      view.setUint16(
        i * 2,
        value.charCodeAt(i),
        true,
      );
    }

    this.chunks.push(buffer);
  }

  toUint8Array() {
    const totalLength =
      this.chunks.reduce(
        (sum, chunk) =>
          sum + chunk.length,
        0,
      );

    const output =
      new Uint8Array(
        totalLength,
      );

    let offset = 0;

    for (const chunk of this.chunks) {
      output.set(
        chunk,
        offset,
      );

      offset += chunk.length;
    }

    return output;
  }
}
