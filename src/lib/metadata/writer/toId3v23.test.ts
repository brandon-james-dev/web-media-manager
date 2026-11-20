import { describe, expect, it } from "vitest";
import { toId3v23 } from "./toId3v23";

function syncSafe(value: number): number[] {
  return [
    (value >>> 21) & 0x7f,
    (value >>> 14) & 0x7f,
    (value >>> 7) & 0x7f,
    value & 0x7f,
  ];
}

function frame24(id: string, body: number[]): number[] {
  return [
    ...new TextEncoder().encode(id),
    ...syncSafe(body.length),
    0,
    0,
    ...body,
  ];
}

function tag24(frames: number[][], audio: number[] = [0xff, 0xfb, 0x90, 0x00]) {
  const body = frames.flat();

  return new Uint8Array([
    0x49,
    0x44,
    0x33,
    4,
    0,
    0,
    ...syncSafe(body.length),
    ...body,
    ...audio,
  ]);
}

/** Reads the frames of a 2.3 tag back out. */
function readFrames(bytes: Uint8Array) {
  const size =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);

  const frames: { id: string; size: number; body: Uint8Array }[] = [];

  let at = 10;
  while (at + 10 <= 10 + size) {
    const id = String.fromCharCode(
      bytes[at],
      bytes[at + 1],
      bytes[at + 2],
      bytes[at + 3]
    );

    if (!/^[A-Z0-9]{4}$/.test(id)) break;

    const length =
      (bytes[at + 4] << 24) |
      (bytes[at + 5] << 16) |
      (bytes[at + 6] << 8) |
      bytes[at + 7];

    frames.push({
      id,
      size: length,
      body: bytes.subarray(at + 10, at + 10 + length),
    });

    at += 10 + length;
  }

  return { size, frames };
}

describe("toId3v23", () => {
  it("rewrites the header version from 4 to 3", () => {
    const out = toId3v23(tag24([frame24("TIT2", [0, 0x41])]));

    expect(out[3]).toBe(3);
    expect(out[4]).toBe(0);
  });

  it("writes frame sizes as plain big-endian rather than syncsafe", () => {
    // 200 bytes needs the high bit set in a syncsafe byte, which a 2.3 reader
    // would misread as part of the size.
    const body = [0, ...Array.from({ length: 199 }, () => 0x41)];
    const out = toId3v23(tag24([frame24("TIT2", body)]));
    const { frames } = readFrames(out);

    expect(frames[0].size).toBe(200);
    expect(out[14]).toBe(0);
    expect(out[15]).toBe(0);
    expect(out[16]).toBe(0);
    expect(out[17]).toBe(200);
  });

  it("keeps the APIC image bytes intact", () => {
    const image = [0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4];
    const body = [
      0,
      ...new TextEncoder().encode("image/jpeg"),
      0,
      3,
      ...new TextEncoder().encode("Front Cover"),
      0,
      ...image,
    ];

    const out = toId3v23(tag24([frame24("APIC", body)]));
    const apic = readFrames(out).frames.find((f) => f.id === "APIC")!;

    expect(apic).toBeDefined();
    expect(apic.body.subarray(apic.body.length - image.length)).toEqual(
      new Uint8Array(image)
    );
  });

  it("re-encodes UTF-8 text as UTF-16 for 2.3 readers", () => {
    const text = new TextEncoder().encode("Café");
    const out = toId3v23(tag24([frame24("TIT2", [3, ...text])]));
    const tit2 = readFrames(out).frames.find((f) => f.id === "TIT2")!;

    expect(tit2.body[0]).toBe(1);
    expect(tit2.body[1]).toBe(0xff);
    expect(tit2.body[2]).toBe(0xfe);
    expect(new TextDecoder("utf-16").decode(tit2.body.subarray(1))).toBe("Café");
  });

  it("renames 2.4-only frames to their 2.3 equivalent", () => {
    const out = toId3v23(
      tag24([frame24("TDRC", [0, 0x32, 0x30, 0x32, 0x34])])
    );

    expect(readFrames(out).frames.map((f) => f.id)).toEqual(["TYER"]);
  });

  it("drops frames that have no 2.3 counterpart", () => {
    const out = toId3v23(
      tag24([frame24("TMOO", [0, 0x41]), frame24("TIT2", [0, 0x41])])
    );

    expect(readFrames(out).frames.map((f) => f.id)).toEqual(["TIT2"]);
  });

  it("leaves the audio after the tag untouched", () => {
    const audio = [0xff, 0xfb, 0x90, 0x00, 7, 7, 7];
    const out = toId3v23(tag24([frame24("TIT2", [0, 0x41])], audio));

    expect(out.subarray(out.length - audio.length)).toEqual(
      new Uint8Array(audio)
    );
  });

  it("returns non-ID3 input unchanged", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

    expect(toId3v23(bytes)).toBe(bytes);
  });

  it("returns an existing 2.3 tag unchanged", () => {
    const bytes = tag24([frame24("TIT2", [0, 0x41])]);
    bytes[3] = 3;

    expect(toId3v23(bytes)).toBe(bytes);
  });
});
