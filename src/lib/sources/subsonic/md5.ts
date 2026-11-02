/**
 * Pure-JS MD5 (RFC 1321) over UTF-8 bytes.
 *
 * WebCrypto's subtle.digest does not support MD5, and the Open Subsonic
 * token auth scheme (t = md5(password + salt)) requires it. This operates
 * on the UTF-8 byte encoding of the input, matching how servers compute the
 * token, and returns the canonical lowercase hex digest.
 *
 * Algorithm structure follows the classic public-domain JavaScript
 * implementation (Joseph Myers), adapted to byte-oriented input.
 */

/** One round: x[i] is the message word, s the rotate amount, t a constant. */
function cmn(
  q: number,
  a: number,
  b: number,
  x: number,
  s: number,
  t: number
): number {
  a = (a + q + x + t) | 0;
  return ((a << s) | (a >>> (32 - s))) + b;
}

function ff(
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number,
  t: number
): number {
  return cmn((b & c) | (~b & d), a, b, x, s, t);
}

function gg(
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number,
  t: number
): number {
  return cmn((b & d) | (c & ~d), a, b, x, s, t);
}

function hh(
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number,
  t: number
): number {
  return cmn(b ^ c ^ d, a, b, x, s, t);
}

function ii(
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number,
  t: number
): number {
  return cmn(c ^ (b | ~d), a, b, x, s, t);
}

/** One 64-byte pass over the 16 message words in `k`. */
function md5cycle(state: number[], k: number[]): void {
  let a = state[0];
  let b = state[1];
  let c = state[2];
  let d = state[3];

  a = ff(a, b, c, d, k[0], 7, -680876936);
  d = ff(d, a, b, c, k[1], 12, -389564586);
  c = ff(c, d, a, b, k[2], 17, 606105819);
  b = ff(b, c, d, a, k[3], 22, -1044525330);
  a = ff(a, b, c, d, k[4], 7, -176418897);
  d = ff(d, a, b, c, k[5], 12, 1200080426);
  c = ff(c, d, a, b, k[6], 17, -1473231341);
  b = ff(b, c, d, a, k[7], 22, -45705983);
  a = ff(a, b, c, d, k[8], 7, 1770035416);
  d = ff(d, a, b, c, k[9], 12, -1958414417);
  c = ff(c, d, a, b, k[10], 17, -42063);
  b = ff(b, c, d, a, k[11], 22, -1990404162);
  a = ff(a, b, c, d, k[12], 7, 1804603682);
  d = ff(d, a, b, c, k[13], 12, -40341101);
  c = ff(c, d, a, b, k[14], 17, -1502002290);
  b = ff(b, c, d, a, k[15], 22, 1236535329);

  a = gg(a, b, c, d, k[1], 5, -165796510);
  d = gg(d, a, b, c, k[6], 9, -1069501632);
  c = gg(c, d, a, b, k[11], 14, 643717713);
  b = gg(b, c, d, a, k[0], 20, -373897302);
  a = gg(a, b, c, d, k[5], 5, -701558691);
  d = gg(d, a, b, c, k[10], 9, 38016083);
  c = gg(c, d, a, b, k[15], 14, -660478335);
  b = gg(b, c, d, a, k[4], 20, -405537848);
  a = gg(a, b, c, d, k[9], 5, 568446438);
  d = gg(d, a, b, c, k[14], 9, -1019803690);
  c = gg(c, d, a, b, k[3], 14, -187363961);
  b = gg(b, c, d, a, k[8], 20, 1163531501);
  a = gg(a, b, c, d, k[13], 5, -1444681467);
  d = gg(d, a, b, c, k[2], 9, -51403784);
  c = gg(c, d, a, b, k[7], 14, 1735328473);
  b = gg(b, c, d, a, k[12], 20, -1926607734);

  a = hh(a, b, c, d, k[5], 4, -378558);
  d = hh(d, a, b, c, k[8], 11, -2022574463);
  c = hh(c, d, a, b, k[11], 16, 1839030562);
  b = hh(b, c, d, a, k[14], 23, -35309556);
  a = hh(a, b, c, d, k[1], 4, -1530992060);
  d = hh(d, a, b, c, k[4], 11, 1272893353);
  c = hh(c, d, a, b, k[7], 16, -155497632);
  b = hh(b, c, d, a, k[10], 23, -1094730640);
  a = hh(a, b, c, d, k[13], 4, 681279174);
  d = hh(d, a, b, c, k[0], 11, -358537222);
  c = hh(c, d, a, b, k[3], 16, -722521979);
  b = hh(b, c, d, a, k[6], 23, 76029189);
  a = hh(a, b, c, d, k[9], 4, -640364487);
  d = hh(d, a, b, c, k[12], 11, -421815835);
  c = hh(c, d, a, b, k[15], 16, 530742520);
  b = hh(b, c, d, a, k[2], 23, -995338651);

  a = ii(a, b, c, d, k[0], 6, -198630844);
  d = ii(d, a, b, c, k[7], 10, 1126891415);
  c = ii(c, d, a, b, k[14], 15, -1416354905);
  b = ii(b, c, d, a, k[5], 21, -57434055);
  a = ii(a, b, c, d, k[12], 6, 1700485571);
  d = ii(d, a, b, c, k[3], 10, -1894986606);
  c = ii(c, d, a, b, k[10], 15, -1051523);
  b = ii(b, c, d, a, k[1], 21, -2054922799);
  a = ii(a, b, c, d, k[8], 6, 1873313359);
  d = ii(d, a, b, c, k[15], 10, -30611744);
  c = ii(c, d, a, b, k[6], 15, -1560198380);
  b = ii(b, c, d, a, k[13], 21, 1309151649);
  a = ii(a, b, c, d, k[4], 6, -145523070);
  d = ii(d, a, b, c, k[11], 10, -1120210379);
  c = ii(c, d, a, b, k[2], 15, 718787259);
  b = ii(b, c, d, a, k[9], 21, -343485551);

  state[0] = (state[0] + a) | 0;
  state[1] = (state[1] + b) | 0;
  state[2] = (state[2] + c) | 0;
  state[3] = (state[3] + d) | 0;
}

/** Read 16 little-endian 32-bit words starting at `offset` bytes. */
function md5blkFromBytes(buf: Uint8Array, offset: number): number[] {
  const blocks: number[] = [];
  for (let i = 0; i < 16; i++) {
    const o = offset + i * 4;
    blocks.push(
      buf[o] + (buf[o + 1] << 8) + (buf[o + 2] << 16) + (buf[o + 3] << 24)
    );
  }
  return blocks;
}

const HEX = "0123456789abcdef";

/** Hex of one word, emitted little-endian (byte order of the digest). */
function rhex(n: number): string {
  let s = "";
  for (let j = 0; j < 4; j++) {
    s += HEX[(n >> (j * 8 + 4)) & 0x0f] + HEX[(n >> (j * 8)) & 0x0f];
  }
  return s;
}

/** MD5 of the UTF-8 bytes of `input`, lowercase hex. */
export function md5(input: string): string {
  const bytes = new TextEncoder().encode(input);

  // Padded message: original bytes + 0x80 + zeros + 64-bit little-endian
  // bit length, total multiple of 64 bytes.
  const bitLen = bytes.length * 8;
  const paddedLen = ((bytes.length + 72) >> 6) << 6;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, bitLen, true);
  view.setUint32(paddedLen - 4, 0, true);

  const state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  for (let offset = 0; offset < paddedLen; offset += 64) {
    md5cycle(state, md5blkFromBytes(padded, offset));
  }

  return state.map(rhex).join("");
}
