// Shared by scripts/seed-dummy.mjs and scripts/clear-dummy.mjs.
// Everything "dummy" is recognisable by these markers, so it can be removed exactly.

import { deflateSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** Generated posters live here. The folder is in .gitignore, so it is never committed or deployed. */
export const POSTER_DIR = path.join(ROOT, "public", "dummy-posters");
export const POSTER_URL = "/dummy-posters";

/** SQL LIKE patterns that identify dummy rows. */
export const DUMMY_PARTICIPANT_EMAIL = "dummy-%@example.com";
export const DUMMY_JURY_EMAIL = "dummy-jury%@example.com";

/* ------------------------------------------------------------------------ */
/* A tiny PNG writer (no dependencies): flat shapes and block lettering     */
/* ------------------------------------------------------------------------ */

export const COLOURS = {
  paper: [239, 236, 230],
  ink: [10, 10, 10],
  blue: [31, 59, 255],
  yellow: [255, 210, 31],
};

/** 5 x 7 block letters. */
const FONT = {
  A: "01110,10001,10001,11111,10001,10001,10001",
  B: "11110,10001,10001,11110,10001,10001,11110",
  C: "01110,10001,10000,10000,10000,10001,01110",
  D: "11110,10001,10001,10001,10001,10001,11110",
  E: "11111,10000,10000,11110,10000,10000,11111",
  F: "11111,10000,10000,11110,10000,10000,10000",
  G: "01110,10001,10000,10111,10001,10001,01111",
  H: "10001,10001,10001,11111,10001,10001,10001",
  I: "11111,00100,00100,00100,00100,00100,11111",
  J: "00111,00010,00010,00010,00010,10010,01100",
  K: "10001,10010,10100,11000,10100,10010,10001",
  L: "10000,10000,10000,10000,10000,10000,11111",
  M: "10001,11011,10101,10101,10001,10001,10001",
  N: "10001,11001,10101,10011,10001,10001,10001",
  O: "01110,10001,10001,10001,10001,10001,01110",
  P: "11110,10001,10001,11110,10000,10000,10000",
  Q: "01110,10001,10001,10001,10101,10010,01101",
  R: "11110,10001,10001,11110,10100,10010,10001",
  S: "01111,10000,10000,01110,00001,00001,11110",
  T: "11111,00100,00100,00100,00100,00100,00100",
  U: "10001,10001,10001,10001,10001,10001,01110",
  V: "10001,10001,10001,10001,10001,01010,00100",
  W: "10001,10001,10001,10101,10101,10101,01010",
  X: "10001,10001,01010,00100,01010,10001,10001",
  Y: "10001,10001,01010,00100,00100,00100,00100",
  Z: "11111,00001,00010,00100,01000,10000,11111",
};

export class Canvas {
  constructor(width, height, colour) {
    this.width = width;
    this.height = height;
    this.pixels = Buffer.alloc(width * height * 3);
    this.rect(0, 0, width, height, colour);
  }

  rect(x, y, w, h, [r, g, b]) {
    const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.width, Math.round(x + w)), y1 = Math.min(this.height, Math.round(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const at = (py * this.width + px) * 3;
        this.pixels[at] = r;
        this.pixels[at + 1] = g;
        this.pixels[at + 2] = b;
      }
    }
  }

  circle(cx, cy, radius, colour) {
    for (let py = Math.max(0, cy - radius); py < Math.min(this.height, cy + radius); py++) {
      const half = Math.sqrt(radius * radius - (py - cy) * (py - cy));
      this.rect(cx - half, py, half * 2, 1, colour);
    }
  }

  /** Block lettering. `scale` is the size of one font cell in pixels. Returns the width drawn. */
  text(value, x, y, scale, colour) {
    let cursor = x;
    for (const letter of value.toUpperCase()) {
      const glyph = FONT[letter];
      if (glyph) {
        glyph.split(",").forEach((row, gy) => {
          [...row].forEach((cell, gx) => {
            if (cell === "1") this.rect(cursor + gx * scale, y + gy * scale, scale, scale, colour);
          });
        });
      }
      cursor += (glyph ? 6 : 4) * scale;
    }
    return cursor - x - scale;
  }

  static textWidth(value, scale) {
    return [...value.toUpperCase()].reduce((sum, letter) => sum + (FONT[letter] ? 6 : 4) * scale, 0) - scale;
  }

  /** Encodes the canvas as a PNG file (8-bit RGB). */
  png() {
    const stride = this.width * 3;
    const raw = Buffer.alloc((stride + 1) * this.height);
    for (let y = 0; y < this.height; y++) {
      raw[y * (stride + 1)] = 0; // filter: none
      this.pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(this.width, 0);
    header.writeUInt32BE(this.height, 4);
    header.set([8, 2, 0, 0, 0], 8); // bit depth 8, colour type 2 (RGB)
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  }
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}
