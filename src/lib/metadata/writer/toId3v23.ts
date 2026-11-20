/**
 * Rewrites an ID3v2.4 tag as ID3v2.3.
 *
 * Apple's Music app and iTunes fail to render artwork carried in an ID3v2.4
 * tag: the APIC frame is present and every other player reads it, but the cover
 * shows as missing. TagLib always writes 2.4 and exposes no version switch, so
 * the tag is converted after the write. Anything that is not an ID3v2.4 tag is
 * returned untouched.
 */

const UTF8 = 3;
const UTF16 = 1;

/** Frames that exist in 2.4 but not in 2.3, mapped to their 2.3 equivalent. */
const RENAMED: Record<string, string> = {
  TDRC: "TYER",
  TDOR: "TORY",
  TIPL: "IPLS",
  TMCL: "IPLS",
};

/** 2.4-only frames with no 2.3 counterpart; dropped rather than left invalid. */
const DROPPED = new Set([
  "ASPI",
  "EQU2",
  "RVA2",
  "SEEK",
  "SIGN",
  "TDEN",
  "TDRL",
  "TDTG",
  "TMOO",
  "TPRO",
  "TSST",
]);

function syncSafe(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at] & 0x7f) << 21) |
    ((bytes[at + 1] & 0x7f) << 14) |
    ((bytes[at + 2] & 0x7f) << 7) |
    (bytes[at + 3] & 0x7f)
  );
}

function syncSafeBytes(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 21) & 0x7f,
    (value >>> 14) & 0x7f,
    (value >>> 7) & 0x7f,
    value & 0x7f,
  ]);
}

/** 2.3 frame sizes are plain 32-bit big-endian; only the header size is syncsafe. */
function uint32Bytes(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
}

function utf16WithBom(text: string): Uint8Array {
  const out = new Uint8Array(2 + text.length * 2);
  out[0] = 0xff;
  out[1] = 0xfe;

  const view = new DataView(out.buffer);

  for (let i = 0; i < text.length; i++) {
    view.setUint16(2 + i * 2, text.charCodeAt(i), true);
  }

  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);

  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }

  return out;
}

/** Reads a null-terminated string of the given encoding, returning its length. */
function readTerminated(
  body: Uint8Array,
  at: number,
  encoding: number
): { text: string; next: number } {
  const wide = encoding === UTF16 || encoding === 2;

  if (wide) {
    let end = at;
    while (end + 1 < body.length && !(body[end] === 0 && body[end + 1] === 0)) {
      end += 2;
    }

    return {
      text: new TextDecoder("utf-16").decode(body.subarray(at, end)),
      next: Math.min(end + 2, body.length),
    };
  }

  let end = at;
  while (end < body.length && body[end] !== 0) end++;

  return {
    text: new TextDecoder("latin1").decode(body.subarray(at, end)),
    next: Math.min(end + 1, body.length),
  };
}

/**
 * Converts a frame body from UTF-8 to UTF-16, which 2.3 readers understand.
 *
 * The layout differs per frame, so the encoding byte is rewritten in place and
 * every string the frame carries is re-encoded; binary payloads such as the
 * APIC image data are copied through untouched.
 */
function convertEncoding(id: string, body: Uint8Array): Uint8Array {
  if (body.length === 0 || body[0] !== UTF8) return body;

  const rest = body.subarray(1);

  if (id === "APIC") {
    const mime = readTerminated(rest, 0, 0);
    const typeAt = mime.next;
    const type = rest[typeAt];
    const desc = readTerminated(rest, typeAt + 1, UTF8);

    return concat([
      new Uint8Array([UTF16]),
      rest.subarray(0, mime.next),
      new Uint8Array([type]),
      utf16WithBom(desc.text),
      new Uint8Array([0, 0]),
      rest.subarray(desc.next),
    ]);
  }

  if (id === "TXXX" || id === "COMM" || id === "USLT") {
    const head = id === "TXXX" ? 0 : 3;
    const desc = readTerminated(rest, head, UTF8);

    return concat([
      new Uint8Array([UTF16]),
      rest.subarray(0, head),
      utf16WithBom(desc.text),
      new Uint8Array([0, 0]),
      utf16WithBom(new TextDecoder("utf-8").decode(rest.subarray(desc.next))),
    ]);
  }

  if (id.startsWith("T")) {
    return concat([
      new Uint8Array([UTF16]),
      utf16WithBom(new TextDecoder("utf-8").decode(rest)),
    ]);
  }

  return body;
}

/** Maps a 2.4 status/format flag pair onto the 2.3 bit layout. */
function convertFlags(flags: Uint8Array): Uint8Array {
  const status = flags[0];
  const format = flags[1];

  const status23 =
    (status & 0x40 ? 0x80 : 0) |
    (status & 0x20 ? 0x40 : 0) |
    (status & 0x10 ? 0x20 : 0);

  const format23 =
    (format & 0x08 ? 0x80 : 0) |
    (format & 0x04 ? 0x40 : 0) |
    (format & 0x40 ? 0x20 : 0);

  return new Uint8Array([status23, format23]);
}

export function toId3v23(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 10) return bytes;
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return bytes;
  if (bytes[3] !== 4) return bytes;

  const end = Math.min(10 + syncSafe(bytes, 6), bytes.length);
  const frames: Uint8Array[] = [];
  const renamed = new Set<string>();

  let at = 10;
  while (at + 10 <= end) {
    const id = String.fromCharCode(
      bytes[at],
      bytes[at + 1],
      bytes[at + 2],
      bytes[at + 3]
    );

    if (!/^[A-Z0-9]{4}$/.test(id)) break;

    const size = syncSafe(bytes, at + 4);
    if (size === 0 || at + 10 + size > end) break;

    const flags = bytes.subarray(at + 8, at + 10);
    const body = bytes.subarray(at + 10, at + 10 + size);
    at += 10 + size;

    if (DROPPED.has(id)) continue;

    // A 2.4 tag may carry frame-level unsynchronisation or a data-length
    // indicator. Neither can be expressed in 2.3 without rewriting the body, so
    // the frame is skipped instead of being written as garbage.
    if (flags[1] & 0x02 || flags[1] & 0x01) continue;

    const mapped = RENAMED[id] ?? id;

    // TIPL and TMCL both fold into IPLS, which 2.3 allows only once.
    if (mapped !== id) {
      if (renamed.has(mapped)) continue;
      renamed.add(mapped);
    }

    const converted = convertEncoding(id, body);
    const next = convertFlags(flags);

    frames.push(
      concat([
        new TextEncoder().encode(mapped),
        uint32Bytes(converted.length),
        next,
        converted,
      ])
    );
  }

  const tagBody = concat(frames);
  const header = concat([
    new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0]),
    syncSafeBytes(tagBody.length),
  ]);

  return concat([header, tagBody, bytes.subarray(end)]);
}
